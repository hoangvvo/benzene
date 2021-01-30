# @benzene/ws

[![npm](https://badgen.net/npm/v/@benzene/ws)](https://www.npmjs.com/package/@benzene/ws)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> GraphQL over WebSocket implementing the upcoming [GraphQL over WebSocket Protocol](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md).

```js
import * as WebSocket from "ws";
import { Benzene, makeHandler } from "@benzene/ws";

const GQL = new Benzene({ schema });

const wss = new WebSocket.Server({ path: "/graphql", port: 3000 });
wss.on("connection", makeHandler(GQL, options));
```

Check out [examples](https://github.com/hoangvvo/benzene/tree/main/examples) for integrations with different server libraries.