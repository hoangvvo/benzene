# GraphQL over HTTP

GraphQL over HTTP is supported by the `@benzene/http` package.

It implements the server according to the [official GraphQL over HTTP specification](https://github.com/graphql/graphql-over-http).

## Create handler function

Use `makeHandler` from `@benzene/http` to create a handler from a [Benzene instance](/reference/benzene).

```js
import { Benzene, makeHandler } from "@benzene/http";
import schema from "./schema";

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);
```

## Body parsing

The [graphql-over-http spec](https://github.com/graphql/graphql-over-http) allows different incoming [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type), each must be parsed differently.

The most popular `content-type` in real-world GraphQL application is `application/json`, which is often parsed by framework with built-in body parser like [express](https://expressjs.com/en/4x/api.html#express.json).

However, if you are dealing have the string representation of the incoming request data, you can parse it into appropriate object representation using the `parseGraphQLBody` export.

```js
import { parseGraphQLBody } from "@benzene/http";

async function onRequest(req) {
  const rawBody = await getRawBody(req);
  const body = parseGraphQLBody(rawBody, req.headers["content-type"]);
}
```

Behind the scene, `parseGraphQLBody` will call [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) or apply special transformations based on the received content type according to the spec.

## Handle incoming HTTP request

`graphqlHTTP` is a framework-agnostic function that accepts a generic request object with the following shape:

```ts
interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any>;
  headers: Headers;
}
```

Regardless of frameworks and runtimes, we simply need to call it using an object with:

- `method` (The HTTP method),
- `query` (an object with query parameters - optional)
- `body` (an object of the request body - can be retrieved using `parseGraphQLBody` - optional)
- `headers` (an object of all headers, but an object containing only `content-type` should be sufficient)

```js
async function onRequest(req, res) {
  const rawBody = await getRawBody()
  const result = await graphqlHTTP({
    method: req.method,
    body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    headers: req.headers,
    // We can omit `query` if we are sure that all GraphQL params are in the body
  })
}
```

## Respond GraphQL execution result

`graphqlHTTP` will resolve into a generic response object:

```js
interface HTTPResponse {
  status: number;
  headers: Headers;
  payload: FormattedExecutionResult;
}
```

We will use values in this object the create the respond accordingly:

```js
// Node.js
res
  .writeHead(result.status, result.headers)
  .end(JSON.stringify(result.payload));

// Deno
req.respond({
  body: JSON.stringify(result.payload),
  status: result.status,
  headers: new Headers(result.headers), // headers in deno must be a Header instance
});
```

From the example above, we can see that **Benzene** gives you full control over how you send the HTTP response after the GraphQL execution. It also allows us to plug the library into any HTTP libraries without needing a binding package.

## Passing `extra`

It is possible to pass `extra` as the second argument to `graphqlHTTP`. See [The extra argument](http://localhost:3000/reference/packages#the-extra-argument).