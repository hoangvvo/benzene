# Persisted queries

*"Persisted queries"* is a technique to improves network performance for GraphQL by sending an ID or hash instead of a long GraphQL query string.

While **Benzene** does not have persisted query built-in, it allows flexible persisted query implementation.

This can be done by modifying the request before passing it to handler functions.

## Automatic Persisted Queries with @benzene/extra

We provide [@benzene/extra](https://www.npmjs.com/package/@benzene/extra) library that includes several utilities for a GraphQL server.

It includes a module to process persisted queries by taking in a body *or* query **object** and adding the query to it based on the provided object.

If the persisted query is not found, it will throw an error that can be used to respond. You should use `formatExecutionResult` method from the [Benzene instance](/reference/benzene) to format the result.

```js
import { Benzene, makeHandler } from "@benzene/http";
import { makeAPQHandler } from "@benzene/extra";

const apqHTTP = makeAPQHandler();

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

async function onRequest(req, res) {
  // make sure req.body and req.query are objects
  try {
    await apqHTTP(req.body || req.query);
  } catch (err) {
    // It may throw `HTTPError` object from `@benzene/extra`
    // It may be `PersistedQueryNotFound`, which asks the client
    // to send back a pair of query and hash to persist
    const result = GQL.formatExecutionResult({
      errors: [err],
    });
    return res
      .writeHead(err.status, { "content-type": "application/json" })
      .end(JSON.stringify(executionResult));
  }
  const result = await graphqlHTTP({
    body: req.body,
    query: req.query,
    method: req.method,
    headers: req.headers,
  });
  res
    .writeHead(result.status, result.headers)
    .end(JSON.stringify(result.payload));
}
```

## Custom implementation

This recipe is not just limited to the popular [APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/).

For example, a middleware like [relay-compiler-plus](https://github.com/yusinto/relay-compiler-plus) can be used to implement [Relay-compatible persisted query](https://relay.dev/docs/en/persisted-queries).

```js
import Express from "express";
import expressGraphql from "express-graphql";
import { matchQueryMiddleware } from "relay-compiler-plus";
import queryMapJson from "./path/to/persisted-queries.json";

const app = Express();

app.use("/graphql", matchQueryMiddleware(queryMapJson), (req, res) => {
  const result = await graphqlHTTP({
    body: req.body,
    query: req.query,
    method: req.method,
    headers: req.headers,
  });
  res.set(result.headers).status(result.status).send(result.payload);
});
```

You can also implement it yourself with something like the below:

```js
const cache = lru();

async function onRequest(req, res) {
  const body = {
    variables: { foo: "bar" },
    documentId: "3be4abb81fa595e25eb725b2c6a87508",
  };

  if (body.documentId) {
    const query = cache.get(body.extensions.persisted);
    if (query) {
      body.query = query; // Add query to body using persisted query
    } else {
      // rejects arbitrary queries for securities
      return res.status(400).send({
        errors: [new GraphQLError("Only allow recognized persisted queries")],
      });
    }
  }

  const result = await graphqlHTTP({
    body: req.body,
  });
}
```