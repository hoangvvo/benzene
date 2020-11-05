# @benzene/server

[![npm](https://badgen.net/npm/v/@benzene/server)](https://www.npmjs.com/package/@benzene/server)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Fast and simple GraphQL Server for Node.js

```js
const { Benzene, httpHandler } = require('@benzene/server');
const { createServer } = require('http');

const GQL = new Benzene({ schema });

createServer(httpHandler(GQL, options)).listen(3000);

// Or Express.js and friends
const express = require('express');

app.all(httpHandler(GQL, options)).listen(3000);
```

Documentation is available at [hoangvvo.github.io/benzene/#/server](https://hoangvvo.github.io/benzene/#/server/)