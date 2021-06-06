# GraphQL over HTTP

GraphQL over HTTP is supported by the [@benzene/http](https://www.npmjs.com/package/@benzene/http) package.

It implements the server according to the [official GraphQL over HTTP specification](https://github.com/graphql/graphql-over-http).

## Create handler function

Use `makeHandler` from `@benzene/http` to create a handler from a [Benzene instance](/reference/benzene).

```js
import { Benzene, makeHandler } from "@benzene/http";
import schema from "./schema";

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL, options);
```

## Configuration

`makeHandler` allows a custom `options` param, containing the following field:

- `onParams`: A function that is called when `GraphQLParams` is resolved from request query and body. Can be used to override the `GraphQLParams` or returns an early response. See [Override GraphQLParams](#override-graphqlparams).

## Request handling

Being framework-agnostic, `@benzene/http` does not automatically handle the request and response for us. However, it is easy to do so using your framework-specific APIs.

### Body parsing

The [graphql-over-http spec](https://github.com/graphql/graphql-over-http) allows different incoming [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type), each must be parsed differently.

The most popular [content types](https://github.com/graphql/graphql-over-http/blob/main/spec/GraphQLOverHTTP.md#content-types) in real-world GraphQL application are `application/graphql+json` and the legacy `application/json`.

While `application/json` is parsed by framework with built-in body parser like [express](https://expressjs.com/en/4x/api.html#express.json), other content types may not be supported/be parsed incorrectly.

In those cases, we must first parse it into appropriate representation using the `parseGraphQLBody` export.

```js
import { parseGraphQLBody } from "@benzene/http";

async function onRequest(req) {
  const rawBody = await getRawBody(req);
  const body = parseGraphQLBody(rawBody, req.headers["content-type"]);
}
```

Behind the scene, `parseGraphQLBody` will call [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) or apply special transformations based on the received content type according to _the graphql-over-http spec_.

### Handle incoming HTTP request

`graphqlHTTP` is a framework-agnostic function that accepts a generic request object with the following shape:

```ts
interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any>;
  headers: Headers;
}

type Headers = Record<string, string | string[] | undefined>;
```

Regardless of frameworks and runtimes, we simply need to call it using an object with:

- `method` (The HTTP method),
- `query` (an object with query parameters - optional)
- `body` (an object of the request body - can be retrieved using `parseGraphQLBody` - optional)
- `headers` (an object of all headers, but an object containing only `content-type` should be sufficient)

```js
async function onRequest(req, res) {
  const rawBody = await getRawBody(req);
  const result = await graphqlHTTP({
    method: req.method,
    body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    headers: req.headers,
    query: parseQueryString(req.url),
  })
}
```

A [`GraphQLParams`](/reference/terminology#graphqlparams) will constructed using values from `body` and `query`.

### Respond with GraphQL result

`graphqlHTTP` will resolve into a generic response object:

```js
interface HTTPResponse {
  status: number;
  headers: Headers;
  payload: FormattedExecutionResult;
}
```

We will use values in this object the send back the HTTP response:

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

From the example above, we can see that **Benzene** gives us full control over how we send the HTTP response after the GraphQL execution. It also allows us to plug the library into any HTTP libraries without needing a binding package.

## Passing `extra`

It is possible to pass `extra` as the second argument to `graphqlHTTP`. See [The extra argument](/reference/handler#the-extra-argument).

## Override GraphQLParams

It is possible to override the [GraphQLParams](/reference/terminology#graphqlparams) by setting a function to `options.onParams`.

The function will receive the params resolved from the request query and body, which you can override by returning a new one. If a value is not returned from `onParams`, the original `params` is used.

```js
makeHandler(GQL, {
  onParams(params) {
    return {
      query: "query Foo { myGraphQLQuery }",
      variables: {
        someVariable: "foo",
      },
      operationName: "Foo",
      extensions: {},
    };
  },
});
```

This is useful if we need to implement things like persisted queries:

```js
makeHandler(GQL, {
  onParams(params) {
    const query = findQueryFromHash(params.extensions.queryHash);
    return {
      ...params,
      query,
    };
  },
});
```

Optionally, you can also return an [ExecutionResult](/reference/terminology#executionresult) early.

```js
makeHandler(GQL, {
  onParams(params) {
    if (params.query.includes("evilGraphQLQuery")) {
      return {
        errors: [new GraphQLError("Query is forbidden")],
      };
    }
    // returning nothing to use the original params
  },
});
```
