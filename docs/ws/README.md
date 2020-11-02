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

When being called with a [Benzene instance](/core/) instance, `wsHandler` returns a `connection` listener handler function (`(socket, request) => void`).

```js
import * as WebSocket from 'ws';
import { Benzene, wsHandler } from '@benzene/ws';
// Benzene instance
const GQL = new Benzene({ schema });

// Craete WebSocket.Server from `ws`.
// Refer to https://github.com/websockets/ws#usage-examples for more info.
const wss = new WebSocket.Server({ path: '/graphql', server });

// Attach wsHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', wsHandler(GQL, options));
```

?> `ws` tip: If you do not have a `server`, define `port` instead to let `ws` create one internally.

?> If you use `@benzene/ws` with `@benzene/server`, you might already have had a `Benzene` instance that can be reused.

## API

### wsHandler(GQL, options)

Create a handler for incoming WebSocket connection (from `wss.on('connection')`) and execute GraphQL based on the [modified GraphQL over WebSocket Protocol](https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md).

`GQL` is a [Benzene instance](/core/) instance.

?> For error formatting and more, learn about Benzene's `GraphQL` class in [Core](core/).

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| context | An object or function called to creates a context shared across resolvers per connection. The function is called with the arguments [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) | `{}` |
| onStart | (Experimental) A function to be called when a subscription (or query/execution) started (or executed). See [`Hooks`](#hooks). | `undefined` |
| onComplete | (Experimental) A function to be called when a subscription (or query/execution) finished (or after their execution which is immediate). See [`Hooks`](#hooks). | `undefined` |

## Building Context

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

A hook is a function that is called during different phase of a subscription. Each hook is called with `this = SubscriptionConnection` (as long as it is not a [arrow function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)). `SubscriptionConnection` represents WebSocket connection so it stays the same during the course of the connection.

### Subscription Start

When a subscription **have started** (not before, so you cannot mutate the request), `options.onStart` will be called with a unique subscription `id` and an `execArg` object containing `document`, `contextValue`, `variableValues`, and `operationName`.

```js
const CONN_STATE = Symbol('connection#state')

const wsHandle = wsHandler(GQL, {
  onStart(id, { document, contextValue, variableValues, operationName }) {
    // Do whatever you need
  }
});
```

### Subscription Complete

When a subscription have completed/finished, `options.onComplete` will be called with tehe unique subscription `id`.

```js
const wsHandle = wsHandler(GQL, {
  onComplete(id) {
    // Do whatever you need
  }
});
```

### Example: Take advantage of `this` to store states

Since `SubscriptionConnection` instance is the same throughout the connection, you **may** use it to store states. However, you must use [Symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol) to avoid overwriting internal states.

!> While you can set variables to `SubscriptionConnection` instance, be aware that it can lead to memory leaks if not careful.

```js
// Use symbol to avoid overwriting internal keys
const $onComplete = Symbol('connection#onCompleted')
const getOnCompletedObjectFromSC = (sc) => {
  // Initialize an object that can be use to store onComplete listeners
  if (!sc[$onComplete]) sc[$onComplete] = {};
  return sc[$onComplete];
}

const wsHandle = wsHandler(GQL, {
  context: () => {
    return {};
  },
  // NOTE: must not be an arrow function
  onStart(id, { document, contextValue, variableValues, operationName }) {
    const onCompleted = getOnCompletedObjectFromSC(this);
    if (operationName === `onRoomUpdated`) {
      // Someone listens to onRoomUpdated means that they are in the room
      if (contextValue.user.id) {
        setRoomPresence(contextValue.user.id, variableValues.roomId);
        // Set a function to be called on `onComplete`. This will unregister the user
        // when they no longer subscribe to this `onRoomUpdated` operation.
        onCompleted[id] = () => unsetRoomPresence(contextValue.user.id, variableValues.roomId);
      }
    }
  },
  onComplete(id) {
    const onCompleted = getOnCompletedObjectFromSC(this);
    if (typeof onCompleted[id] === "function") onCompleted[id]();
  }
}
```