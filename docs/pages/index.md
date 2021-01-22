# Benzene

> A fast and minimal JavaScript GraphQL Server

## Overview

```js
import express from "express";
import { Benzene, makeHandler } from "@benzene/http";

const app = express();

const GQL = new Benzene();

const graphqlHTTP = makeHandler(GQL);

app.use("/graphql", async (req, res) => {
  const result = await graphqlHTTP({
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers,
  });
  res.writeHead(result.status, result.headers).send(res.payload);
});

app.listen(4000);
```

In this example, we create a GraphQL handler `graphqlHTTP` using a `Benzene` instance. The `Benzene` instance will also be used in other libraries like `@benzene/ws`, allowing us to unify pipelines like error formatting in one place.

`graphqlHTTP` accepts a generic request object containing `method`, `query`, `body`, and `headers` and returns a generic response object containing `status`, `headers`, and `payload`. This allows it to work with any frameworks (or even runtimes).

As you can see, `graphqlHTTP` does nothing but executing the GraphQL request as it is, giving us full control in aspects like [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) or body parsing.

## Features

`@benzene/http` and `@benzene/ws` allows us to build a full-featured GraphQL server, featuring:

- **Super minimal and [performant](/benchmarks)**. `@benzene/server` and `@benzene/ws` purely wrap `@benzene/core`, which includes minimal dependencies and features no third-party integrations, thus avoiding unnecessary overheads.
- **Transport & Framework agnostic**. Each package features generic Request, Response, or WebSocket interfaces to easily plug into any JavaScript frameworks or runtimes.
- **Unopinionated and observable APIs**. Benzene does not include any middleware or configurations, so you can be in total control of logging, parsing, and error handling.
- **Unified pipeline**. Write error handling or context creation function only once. Every transport handler inherits the same `Benzene` instance and takes advantage of its shared configuration.

We are taking an approach opposite to [Apollo Server](https://github.com/apollographql/apollo-server), which abstracts everything behind its `applyMiddleware` function that includes unexpected and hard-to-customized "defaults".
While our approach requires a bit more boilerplate, we achieve an observable and customizable server integration.