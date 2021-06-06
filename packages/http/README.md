# @benzene/http

[![npm](https://badgen.net/npm/v/@benzene/http)](https://www.npmjs.com/package/@benzene/http)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Fast and simple framework-agnostic GraphQL HTTP Server

## Installation

```bash
npm i graphql @benzene/http
```

## Usage

```js
import { createServer } from "http";
import { Benzene, makeHandler, parseGraphQLBody } from "@benzene/http";

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL, options);

createServer(async (req, res) => {
  const rawBody = await readBody(req);
  const result = await graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers["content-type"]),
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
}).listen(3000);
```

## Documentation

Documentation is available at [benzene.vercel.app](https://benzene.vercel.app/).
Check out [examples](https://benzene.vercel.app/examples) for integrations with different server libraries and tools.
