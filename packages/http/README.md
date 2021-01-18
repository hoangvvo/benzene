# @benzene/http

[![npm](https://badgen.net/npm/v/@benzene/http)](https://www.npmjs.com/package/@benzene/http)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Fast and simple GraphQL HTTP Server for Node.js

```js
import { Benzene, makeHandler, parseGraphQLBody } from '@benzene/http';
import { createServer } from 'http';
import querystring from 'querystring';

const GQL = new Benzene({ schema });

const httpHandle = makeHandler(GQL, options);

createServer(async (req, res) => {
  const rawBody = await readRawBody(req);
  const result = await httpHandle({
    method: req.method,
    query: querystring.parse(request.url.split('?')[1]),
    body: parseGraphQLBody(rawBody, req.headers['content-type']),
    headers: req.headers
  }, { anything: req.something });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
}).listen(3000);
```

Documentation is available at [hoangvvo.github.io/benzene/#/http](https://hoangvvo.github.io/benzene/#/http/)