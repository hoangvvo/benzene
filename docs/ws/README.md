# @benzene/ws

WebSocket support via [`ws`](https://github.com/websockets/ws) implementing a [modified GraphQL over WebSocket Protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md). Do not worry, this is still understood by GraphQL WS client implementing the original protocol.

## Install

Install `@benzene/ws` and `graphql` dependencies.

```bash
yarn add @benzene/ws graphql
```

Since `@benzene/ws` is to be used in [`ws`](https://github.com/websockets/ws), you must also install it if you haven't already.

```bash
yarn add ws
```

?> `@benzene/ws` is not limited to `benzene` and can work along with *any* GraphQL Server.

## Usage

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-ws)

Create a [WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver) instance and uses `wsHandler` to handle its `connection` event.

When being called with a [Benzene GraphQL instance](/core/) instance, `wsHandler` returns a `connection` listener handler function (`(socket, request) => void`).

```js
const WebSocket = require('ws');
const { GraphQL, wsHandler } = require('@benzene/ws');
// Benzene GraphQL instance
const GQL = new GraphQL({ schema });

// Craete WebSocket.Server from `ws`.
// Refer to https://github.com/websockets/ws#usage-examples for more info.
const wss = new WebSocket.Server({ path: '/graphql', server });

// Attach wsHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', wsHandler(GQL, options));
```

?> `ws` tip: If you do not have a `server`, define `port` instead to let `ws` create one internally.

### With existed GraphQL instance

If you use `@benzene/ws` with `@benzene/server`, chances are you already have an existing `GraphQL` instance that can be reused.

```js
const http = require('http');
const WebSocket = require('ws');
const { GraphQL, httpHandler } = require('@benzene/server');
const { wsHandler } = require('@benzene/ws');

// @benzene/server section
// This will be reused inside wsHandler
const GQL = new GraphQL({ schema });
// This is the created server, will be used in WebSocket.Server
const server = http.createServer(httpHandler(GQL));
server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/graphql`);
});

// Added @benzene/ws section
const wss = new WebSocket.Server({ path: '/graphql', server });
wss.on('connection', wsHandler(GQL, options));
```

## API

### wsHandler(GQL, options)

Create a handler for incoming WebSocket connection (from `wss.on('connection')`) and execute GraphQL based on [GraphQL over WebSocket Protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

`GQL` in a [Benzene GraphQL instance](/core/) instance.

?> It is recommended to read about `GraphQL` instance in the [Core Section](core/) first.

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| context | An object or function called to creates a context shared across resolvers per connection. The function is called with the arguments [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) | `{}` |

## Building Context :id=context

`options.context` in `wsHandler` can be used to build a context for GraphQL execution layer. It can either be an object or a function. In the case of function, it is called with two arguements [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage).

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, req) => {
    // Get user
    const user = await getUserFromReq(req);
    // Maybe a signal to let resolver knows we are in WebSocket?
    const isWs = true;
    return { user, isWs };
  },
});
```

If an error is thrown in `options.context`, `@benzene/ws` will send a `{ type = 'connection_error' }` with a payload with the shape of a regular GraphQL response. For example,

```json
{
  "payload": {
    "errors": [
      { "message": "Context creation failed: Error Message Blah Blah" }
    ]
  },
  "type": "connection_error"
}
```

See [Authentication](/ws/authentication) on possible authentication mechanism.