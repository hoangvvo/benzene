# GraphQL over WebSockets

GraphQL over WebSockets is supported by the [@benzene/ws](https://www.npmjs.com/package/@benzene/ws) package. It implements the upcoming [GraphQL over WebSocket Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md).

We would need a spec-compliant client like [graphql-ws](https://github.com/enisdenjo/graphql-ws#use-the-client) to connect from the browser.

## Create handler function

Use `makeHandler` from `@benzene/ws` to create a handler from a [Benzene instance](/reference/benzene).

```js
import { Benzene, makeHandler } from "@benzene/ws";
import schema from "./schema";

const GQL = new Benzene({ schema });

const graphqlWS = makeHandler(GQL);
```

## WebSocket generic interface

In order to work with any WebSocket server library, **Benzene** defines a generic interface to be passed into the `graphqlWS` function.

```js
interface CloseEvent {
  code?: number;
  reason?: string;
}

interface MessageEvent {
  data: any;
}

interface WebSocket {
  protocol: string;
  send(data: string): void;
  close(code?: number | undefined, reason?: string | undefined): void;
  onclose: (event: CloseEvent) => void;
  onmessage: (event: MessageEvent) => void;
}
```

This interface is a partial version of the [JavaScript WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) since **Benzene** does not require all the methods in `WebSocket` nor all the fields in the two events.

## Usage in a WebSocket server

The `graphqlWS` is to be called with a [compatible WebSocket instance](#websocket-generic-interface) and it will handle everything (receive/send messages, close connections) automatically. (this is in contrast to `@benzene/http`).

[ws](https://github.com/websockets/ws) is a library that implements its WebSocket class compliant to the Web API (evidently in its [API documentation](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket)), so `@benzene/ws` will work with it naturally.

```js
import { Benzene, makeHandler } from "@benzene/ws";
import WebSocket from "ws";
import schema from "./schema";

const GQL = new Benzene({ schema });

const graphqlWS = makeHandler(GQL);

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  graphqlWS(ws);
});
```

## Working with non-compatible WebSocket object

In most cases, the WebSocket object we are working with on the server-side will not be similar to the one from the JavaScript Web API. However, we can still work with it by understanding ways that `graphqlWS` use the object:

1. Verify whether the protocol is supported via `socket.protocol` (must be `"graphql-transport-ws"`)

2. Attach a message listener function to `socket.onmessage`:

```js
socket.onmessage = (event) => {
  const message = JSON.parse(String(event.data));
  // Handle message object...
};
```

3. Use `socket.send` to send a message to the client:

```js
socket.send(JSON.stringify(data));
```

4. Attach a closure listener function to `socket.onclose`:

```js
socket.onclose = ({ code, reason }) => {
  // do some cleanup
};
```

5. Call `socket.close` when needed (upon fatal error, rogue client, etc):

```js
socket.close(4401, "Some message");
```

It also expects the socket to call `onclose` as in step 4.

We can create a custom object with the `protocol` field and the `send` and `close` functions. Passing that object through `graphqlWS` will augment it with `onmessage` and `onclose`. On message or closure, we will then call the attached `onmessage` and `onclose` functions from that custom object.

Let's try to work with [Deno ws standard library](https://deno.land/std@0.84.0/ws):

```js
async function handleWs(sock: WebSocket): Promise<void> {
  const customSocket = {
    protocol: sock.protocol,
    send: sock.send.bind(sock), // this is similar to browser API, use as it is
    close: sock.close.bind(sock), // this is similar to browser API, use as it is
  };
  graphqlWS(customSocket); // at this point customSocket has onmessage and onclose
  try {
    for await (const ev of sock) {
      // note: Deno actually implement the message and close event
      // similar to  the browser API - use as it is
      if (typeof ev === "string") {
        customSocket.onmessage(ev);
      } else if (isWebSocketCloseEvent(ev)) {
        customSocket.onclose(ev);
      }
    }
  } catch (err) {
    if (!sock.isClosed) {
      await sock.close(1000).catch(console.error);
    }
  }
}
```

## Passing `extra`

It is possible to pass `extra` as the second argument to `graphqlWS`. See [The extra argument](/reference/handler#the-extra-argument).
