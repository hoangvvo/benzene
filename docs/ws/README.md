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

Create an instance of `Benzene` and create a handler from it like so:

```js
import * as WebSocket from 'ws';
import { Benzene, makeHandler } from '@benzene/ws';
// Benzene instance
const GQL = new Benzene({ schema });
const wsHandler = makeHandler(GQL, options);

// Craete WebSocket.Server from `ws`.
// Refer to https://github.com/websockets/ws#usage-examples for more info.
const wss = new WebSocket.Server({ path: '/graphql', server });

// Attach makeHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', (socket, request) => {
  wsHandler(socket, { request });
});
```

`makeHandler` returns a function with two arguments, the first being the WebSocket and the second is an optional extra object you can use to store data that persists throughout the connection.
