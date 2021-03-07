# Benzene Extras

The collection of helpful utilities for a GraphQL Server. Not limited to [benzene libraries](https://github.com/hoangvvo/benzene)!

## Introduction

The GraphQL specification is meant to be extensible. For this reasons, there are many extensions to the specification such as:

- [Automatic persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq/)

**Benzene** is written to be unopinionated, so it avoids including such extensions. However, its extensibility enables us to integrate those ourselves. This way, Benzene can stay lightweight while supporting wide ranges of use case.

Most of the modules in this package is written to be framework-agnostic, and most are usable outside of **Benzene**.

## Modules

### Errors

```js
import { HTTPError } from "@benzene/extra";

throw new HTTPError(statusCode, "Some message", extensions);
```

### Automatic persisted queries

See [Automatic Persisted Queries with @benzene/extra](/recipes/persisted-queries#automatic-persisted-queries-with-benzeneextra).

```js
import { makeAPQHandler } from "@benzene/extra";

const apqHTTP = makeAPQHandler();
// or use a custom cache
const apqHTTP = makeAPQHandler({
  cache: lru(1024),
});

await appHTTP(bodyOrQueryObject); // `appHTTP` mutates and returns `bodyOrQueryObject`
```


