# @benzene/worker

[![npm](https://badgen.net/npm/v/@benzene/worker)](https://www.npmjs.com/package/@benzene/worker)
![ci](https://github.com/hoangvvo/benzene/workflows/Test%20&%20Coverage/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> GraphQL Executor and Server for Web Workers

```js
// sw.js or Cloudflare Workers, with bundler
import { GraphQL, fetchHandler } from '@benzene/worker';

const GQL = new GraphQL({ schema });

self.addEventListener('fetch', fetchHandler(GQL, { path: '/graphql' }));
```

Documentation is available at [hoangvvo.github.io/benzene/#/worker](https://hoangvvo.github.io/benzene/#/worker/)