# @benzene/ws

WebSocket support via [`ws`](https://github.com/websockets/ws) implementing a [modified GraphQL over WebSocket Protocol](https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md). Do not worry, this is still understood by GraphQL WS client implementing the original protocol.

## Install

Install `@benzene/ws` and `graphql` dependencies.

```bash
npm i @benzene/ws graphql
```

Since `@benzene/ws` is to be used in [`ws`](https://github.com/websockets/ws), you must also install it if you haven't already.

```bash
npm i ws
```

?> `@benzene/ws` is not limited to `benzene` and can work along with *any* GraphQL Server.

## Usage

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-graphql-subscriptions)

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

Create a handler for incoming WebSocket connection (from `wss.on('connection')`) and execute GraphQL based on the [modified GraphQL over WebSocket Protocol](https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md).

`GQL` is a [Benzene GraphQL instance](/core/) instance.

?> For error formatting and more, learn about Benzene's `GraphQL` class in [Core](core/).

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| context | An object or function called to creates a context shared across resolvers per connection. The function is called with the arguments [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) | `{}` |
| onStart | (Experimental) A function to be called when a subscription (or query/execution) started (or executed). See [`Hooks`](#hooks). | `undefined` |
| onComplete | (Experimental) A function to be called when a subscription (or query/execution) finished (or after their execution which is immediate). See [`Hooks`](#hooks). | `undefined` |

## Building Context :id=context

`options.context` in `wsHandler` can be used to build a context for GraphQL execution layer or even *authentication* (even though we recommend [using this approach](https://github.com/websockets/ws#client-authentication) instead). 

This can either be an object or a function. In the case of function, it is called with two arguements [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket) and [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage).

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, req) => {
    // Get user
    const user = await getUserFromReq(req);
    // You can also close the connection if the request is not authenticated by
    // throw new Error('You are not authenticated!')
    // or simply close the socket
    // socket.close()
    return { user };
  },
});
```

## Authentication

`benzene` recommends seperating authentication from GraphQL layer. See [Authentication](/ws/authentication) on possible authentication mechanism.

## Hooks

!> This API is experimental and may be modified/removed in a future version. See [#9](https://github.com/hoangvvo/benzene/issues/9).

### Subscription Start

When a subscription **have started** (not before, so you cannot mutate the request), `options.onStart` will be called with a unique subscription `id` and an `execArg` object containing `document`, `contextValue`, `variableValues`, and `operationName`.

The function is called with `this = SubscriptionConnection` (except [arrow function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)). 

The `SubscriptionConnection` class is internal and should not be used since its components can be changed without notice. (even though `SubscriptionConnection#socket` (`WebSocket`) is fairly stable). 

> You can use the instance to share states. Be aware that it can lead to memory leaks if not careful.

```js
const CONN_STATE = Symbol('connection#state')

const wsHandle = wsHandler(GQL, {
  onStart(id, { document, contextValue, variableValues, operationName }) {
    // Do whatever you need
    this[CONN_STATE] = this[CONN_STATE] || {};
    if (operationName === `onRoomUpdated`) {
      if (!contextValue.user?.id) return;
      setUserCurrentRoom(contextValue.user.id, variableValues.roomId)
      this[CONN_STATE][`roomPresence`] = { subId: id, roomId: variableValues.roomId };
    }
  }
});
```

### Subscription Complete

When a subscription have completed/finished, `options.onComplete` will be called with tehe unique subscription `id`. Similarly, you have access to `SubscriptionConnection` via `this`.

```js
const wsHandle = wsHandler(GQL, {
  /* Continue the above */
  onComplete(id) {
    const roomPresence = this[CONN_STATE][`roomPresence`];
    if (roomPresence && id === roomPresence.subId) {
      // User unsubscribe from onRoomUpdated, meaning he/she is leaving
      this[CONN_STATE][`roomPresence`] = null;
      setUserCurrentRoom(contextValue.user.id, null)
    }
  }
});
```