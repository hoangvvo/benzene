# @benzene/server

[![npm](https://badgen.net/npm/v/@benzene/server)](https://www.npmjs.com/package/@benzene/server)
![ci](https://github.com/hoangvvo/benzene/workflows/Test%20&%20Coverage/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Fast and simple GraphQL Server for Node.js

```js
const { GraphQL, httpHandler } = require('@benzene/server');
const { createServer } = require('http');

const GQL = new GraphQL({ schema });

createServer(httpHandler(GQL, options)).listen(3000);

// Or Express.js and friends
const express = require('express');

app.all(httpHandler(GQL, options)).listen(3000);
```

Documentation is available at [hoangvvo.github.io/benzene/#/server](https://hoangvvo.github.io/benzene/#/server/)