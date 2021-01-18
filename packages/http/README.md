# @benzene/http

[![npm](https://badgen.net/npm/v/@benzene/http)](https://www.npmjs.com/package/@benzene/http)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Fast and simple GraphQL HTTP Server for Node.js

```js
const { Benzene, makeHandler } = require('@benzene/server');
const { createServer } = require('http');

const GQL = new Benzene({ schema });

const httpHandle = makeHandler(GQL, options);

createServer((req, res) => {
  httpHandle()
}).listen(3000);
```

Documentation is available at [hoangvvo.github.io/benzene/#/http](https://hoangvvo.github.io/benzene/#/http/)