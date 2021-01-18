# @benzene/http

Fast and simple GraphQL TTP Server for Node.js

## Install

```bash
npm i graphql @benzene/http
```

## Usage

```js
import { Benzene, makeHandler, parseGraphQLBody } from '@benzene/http';
import http from 'http';
import readRawBody from './readBody';

const GQL = new Benzene({ schema });
const httpHandler = makeHandler(GQL, options);

const server = http.createServer(async (req, res) => {
  const rawBody = await readRawBody(req);
  const result = await httpHandler({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers['content-type']),
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
});
server.listen(3000, () => {
  console.log(`🚀  Server ready at :3000`);
});
```

## API

### makeHandler(GQL, options)

`GQL` in an instance [Benzene instance](/core/).

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| contextFn | An object or function called with [RequestContext](#requestcontext) to creates a context shared across resolvers per request. | `undefined` |

The `makeHandler` function returns a function to be called with `HTTPRequest` and optional `extra`. It returns object `HTTPResponse` to be used with specific HTTP server approriate functions.

```ts
async function httpHandler(
  request: HTTPRequest,
  extra: TExtra
): Promise<HTTPResponse>

interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any>;
  headers: Headers;
}

interface HTTPResponse {
  status: number;
  headers: Headers;
  payload:
    | FormattedExecutionResult
    | AsyncIterableIterator<FormattedExecutionResult>;
}
```

### RequestContext

```ts
interface RequestContext<TExtra> {
  extra: TExtra;
}
```

## Building Context

`options.contextFn` in `makeHandler` can be used to build a context for GraphQL execution layer. It will be called with a `RequestContext`

```js
const httpHandler = makeHandler(GQL, {
  context: async ({ extra: { req } }) => {
    // Return the context object
    return { user: req.user };
  },
});

app.post('/graphql', (req, res) => {
  httpHandler({
    method: method,
    headers: req.headers,
    body: req.body
  // req is passed as extra
  }, { req })
    .then((result) => {
      res.writeHead(result.status, result.headers);
      res.send(result.payload);
    })
})
```