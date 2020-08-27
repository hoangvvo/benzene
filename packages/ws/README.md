# @benzene/ws

[![npm](https://badgen.net/npm/v/@benzene/ws)](https://www.npmjs.com/package/@benzene/ws)
![ci](https://github.com/hoangvvo/benzene/workflows/Test%20&%20Coverage/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> GraphQL over WebSocket using [`ws`](https://github.com/websockets/ws)

```js
const { GraphQL, wsHandler } = require('@benzene/ws');
const WebSocket = require('ws');

const GQL = new GraphQL({ schema });

const wss = new WebSocket.Server({ path: '/graphql', port: 3000 });

wss.on('connection', wsHandler(GQL, options));
```

Documentation is available at [hoangvvo.github.io/benzene/#/ws](https://hoangvvo.github.io/benzene/#/ws/)