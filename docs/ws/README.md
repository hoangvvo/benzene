# @benzene/ws

Add WebSocket support for GraphQL implementing [GraphQL over WebSocket Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md). You can used it with the client from [graphql-ws](https://github.com/enisdenjo/graphql-ws).

## Install

Install `@benzene/ws` and `graphql` dependencies.

```bash
npm i @benzene/ws graphql
```
## Usage

`@benzene/ws` can be used with any WebSocket server library that implement its WebSocket interface compliant with the [JavaScript WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket). At its minimum, it requires to have the following:

```ts
interface WebSocket {
  protocol: string;
  send(data: string): void;
  close(code?: number | undefined, data?: string | undefined): void;
  onclose: (event: CloseEvent) => void;
  onmessage: (event: MessageEvent) => void;
}
```

[`ws`](https://github.com/websockets/ws) is one of the compatible WebSocket server library.



```js
import * as WebSocket from 'ws';
import { Benzene, makeHandler } from '@benzene/ws';
// Benzene instance
const GQL = new Benzene({ schema });

// Craete WebSocket.Server from `ws`.
// Refer to https://github.com/websockets/ws#usage-examples for more info.
const wss = new WebSocket.Server({ path: '/graphql', server });

// Attach makeHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', makeHandler(GQL, options));
```

## API

### makeHandler(GQL, options)

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

`options.context` in `makeHandler` can be used to build a context for GraphQL execution layer.

This can either be an object or a function. In the case of function, it is called with `ConnectionContext` `ctx`.

```js
const wsHandle = makeHandler(GQL, {
  context: async (ctx) => {
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
