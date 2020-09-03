# Integration with different frameworks

`@benzene/ws` does nothing but returning a listener handler for [`ws connection event`](https://github.com/websockets/ws/blob/master/doc/ws.md#event-connection). Therefore, when it comes to integration, the question is not *~~How to use `@benzene/ws` with framework X~~* but *How to use `ws` with framework X*. However, for your convenience, I added several ones below.

## Express

Since `app.listen` [returns an http.Server object](http://expressjs.com/de/4x/api.html#app.listen), we can use that in `Websocket.Server`.

```js
const express = require('express');
const { GraphQL, wsHandler } = require('@benzene/ws');

const app = express();
// Define routes
const server = app.listen(3000);

const wss = new WebSocket.Server({ path: '/graphql', server });
wss.on('connection', wsHandler(GQL, options));
```

## Micro

You need to [use Micro programmatically](https://www.npmjs.com/package/micro#programmatic-use) for WebSocket support since only by using `micro()` that you get the `http.Server`instance.

```js
const micro = require('micro');

const { GraphQL, wsHandler } = require('@benzene/ws');

const server = micro(async (req, res) => {
  // handler
});

const wss = new WebSocket.Server({ path: '/graphql', server });
wss.on('connection', wsHandler(GQL, options));

server.listen(3000);
```