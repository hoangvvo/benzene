# Benzene WebSocket

WebSocket support implementing [GraphQL over WebSocket Protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

## Install

Install `@benzene/ws` and `graphql` dependencies.

```bash
yarn add @benzene/ws graphql
```

Since `@benzene/ws` is to be used in [`ws`](https://github.com/websockets/ws), you must also install it if you haven't already.

```bash
yarn add ws
```

## Usage

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-ws)

Create a [WebSocket.Server](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver) instance and uses `wsHandler` to handle its `connection` event.

### With `@benzene/server` :id=use-with-server

```javascript
const http = require('http');
const WebSocket = require('ws');
const { GraphQL, httpHandler } = require('@benzene/server');
const { wsHandler } = require('@benzene/ws');

// Create a GraphQL instance
const GQL = new GraphQL({ schema });
const server = http.createServer(httpHandler(GQL));

// Create a WebSocket.Server from the `ws` package
const wss = new WebSocket.Server({ path: '/graphql', server });

// Attach wsHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', wsHandler(GQL, options));

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/graphql`);
});
```

### Without `@benzene/server` :id=use-standalone

`@benzene/ws` also exports `GraphQL` constructor if you did not start with `@benzene/server`.

```javascript
const { GraphQL, wsHandler } = require('@benzene/ws');
const WebSocket = require('ws');

// Create a GraphQL instance
const GQL = new GraphQL(options);

// Create a WebSocket.Server from the `ws` package (options.port creates a HTTP server internally)
const wss = new WebSocket.Server({ path: '/graphql', port: 3000 }, () => {
  console.log(`🚀  WebSocket Server ready at ws://localhost:3000/graphql`);
})

// Attach wsHandler to WebSocket.Server `connection` event
// See https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection
wss.on('connection', wsHandler(GQL, options));
```

## API

### wsHandler(GQL, options)

Create a handler for incoming WebSocket connection (from `wss.on('connection')`) and execute GraphQL based on [GraphQL over WebSocket Protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md).

`GQL` in an instance [Benzene GraphQL instance](/core/).

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| context | An object or function called to creates a context shared across resolvers per connection. The function is called the arguments [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage), and `connectionParams` | `{}` |

## Building Context :id=context

`options.context` in `wsHandler` can be used to build a context for GraphQL execution layer. It can either be an object or a function. In the case of function, it is called with three arguements [socket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket), [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage), and `connectionParams`.

`connectionParams` is an object that is sent from the client. See an [example in `apollo-client`](https://www.apollographql.com/docs/react/data/subscriptions/#4-authenticate-over-websocket-optional)

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, req, connectionParams) => {
    const user = await getUserFromAuthToken(connectionParams.authToken);
    return { user }
  }
});
```
