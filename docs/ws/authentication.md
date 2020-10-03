# Authentication

`@benzene/ws` does not implement `onConnect` (due to [security & memory leak issues](https://github.com/apollographql/subscriptions-transport-ws/issues/349) on the upstream implementation). 

There are two methods for authentication its place:

- `options.context`
- [`ws` approach](https://github.com/websockets/ws#client-authentication) (more recommended)

Let's peek into a sample `getUserFromReq` function.

```js
import { parse as parseCookie } from 'cookie';

async function getUserFromReq(req) {
  const cookies = parseCookie(req.headers.cookie);
  const { userId } = await redis.get(`session:${cookies.sid}`);
  return userId ? findByUserId(userId) : null;
}
```

## Add `user` to `options.context`

Often, you will have `user` set to `options.context` so it will be accessible to resolvers. Do so simply by:

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, request) => {
    const user = await getUserFromReq(request);
    return { user };
  },
});
```

You can then do something like not allowing a user to listen to message room they are not in:

```js
const resolvers = {
  Subscription: {
    onMessage: {
      subscribe: withFilter(() => pubsub.asyncIterator(MESSAGE_TOPIC), (payload, variables, context) => {
        if (!context.user || !(userIsInRoom(variables.roomId, context.user.id))) {
          // This user is not in room, should not allow them to receive message
          return false;
        }
        return payload.onMessage.id === variables.roomId;
      }),
    },
  },
}
```

## Block unauthorized request

It is possible to forcibly close the connection if the user is not authenticated:

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, req) => {
    const user = await getUserFromReq(req);
    if (!user) throw new Error('Not authenticated!!')
    return { user };
  },
});
```

If an error is thrown in `options.context`, `@benzene/ws` will send a `{ type = 'connection_error' }` with a payload with the shape of a regular GraphQL response and close the connection. For example,

```json
{
  "payload": {
    "errors": [
      { "message": "Context creation failed: You are not authenticated!" }
    ]
  },
  "type": "connection_error"
}
```

This, however, only occurs after the handshake, so to be more efficient, you can choose to reject it even before that by [using the approach suggested by `ws`](https://github.com/websockets/ws#client-authentication):

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, request) => {
    // See code below to see where this comes from
    const user = request.user;
    return { user };
  },
});

// Make sure you set up WebSocket.Server with noServer = true
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', wsHandle);

server.on('upgrade', async function upgrade(request, socket, head) {
  const user = await getUserFromReq(request);

  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // We attach it to `request` so we don't have to do it again
  // It will be available in `request` in `options.context`
  request.user = user;

  // handle upgrade as usual
  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request);
  });
});

server.listen(8080);
```

