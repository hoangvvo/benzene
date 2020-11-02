# Persisted queries

*Persisted queries* is a technique to improves network performance for GraphQL by sending an ID or hash instead of a long GraphQL query string.

Benzene allows flexible persisted query implementation (not just limited to the popular [APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/))

## Config persisted queries

Add `options.persisted` when create a [GraphQL instance](/core#graphql)

```js
import { Benzene } from '@benzene/server';

const GQL = new Benzene({
  persisted: YourGraphQLPersistedInterface,
});
```

`options.persisted` accepts a `GraphQLPersisted` interface:

```ts
interface GraphQLPersisted {
  isPersistedQuery: (params: GraphQLParams) => boolean;
  getQuery: (params: GraphQLParams) => ValueOrPromise<string | undefined>;
}

interface GraphQLParams {
  query?: string | null;
  variables?: Record<string, any> | null;
  operationName?: string | null;
  extensions?: Record<string, any> | null;
}
```

There are two options. You can either use the built in presets  or [create a custom one](#custom-implementation)

## Built-in persisted queries presets

`@benzene/core` contains several persisted queries presets in the `persistedQueryPresets` object, which are reexported in all packages (`@benzene/server`, `@benzene/ws`, `@benzene/worker`).

```js
import { persistedQueryPresets } from '@benzene/server';
// or
import { persistedQueryPresets } from '@benzene/ws';
// or
import { persistedQueryPresets } from '@benzene/worker';
```

### Automatic Persisted Queries

This implements Apollo's [Automatic Persisted Queries](https://www.apollographql.com/docs/apollo-server/performance/apq/).

```js
persistedQueryPresets.automatic(options)
```

| options | description | default |
|---------|-------------|---------|
| sha256 | A function to hash the query using sha256 | (required) |
| cache | An optional cache that implements `get`, `set`, and `delete` methods ([Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)-like) | `tiny-lru` |

```js
import { Benzene, persistedQueryPresets } from '@benzene/server';
import crypto from 'crypto';

const sha256 = (query) => crypto.createHash('sha256').update(query).digest('hex');

const GQL = new Benzene({
  persisted: persistedQueryPresets.automatic({ sha256 }),
});
```

## Custom implementation

A `GraphQLPersisted` is an object or instance that contains two methods:

- `isPersistedQuery` that takes `GraphQLParams`, where `GraphQLParams` is an object containing `query`, `variables`, `operationName`, and `extensions`, and returns a boolean determining if the query is a persisted query.
- `getQuery` that takes the same `GraphQLParams` object and returns the `query` string or `undefined`. It can also throw an error to return a response early, with status code set to `error.status`.

See [PersistedAutomatic](https://github.com/hoangvvo/benzene/blob/main/packages/persisted/src/automatic.ts), which implements [Apollo APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/).

The sections below also explore a custom persisted queries implementation. Note that this implementation is just an example and is not actually used in any GraphQL client.

### Send a hash instead of full queries

Let's say we have the query below:

```
query { 
  aSuperLongRequestThatWouldTakeForeverToSendOverNetwork { 
    yes { 
      really {
        iMeanItIsNotThatBadBut {
          thisIsJustAnExample
        }
      }
    }
  }
}
```

The query is huge and not efficient to be sent over the network. We solve this by enabling the server to identify the query with a `hash` or `id`, without having the client to send over the query. It can be done by something like below:

```js
const queryMap = {
  '83fe07f141c99e18317cf055751944c21e20c44ded682ecfa117103a0443c96a': `
    query { 
      aSuperLongRequestThatWouldTakeForeverToSendOverNetwork { 
        yes { 
          really {
            iMeanItIsNotThatBadBut {
              thisIsJustAnExample
            }
          }
        }
      }
    }`,
};

const GQL = new Benzene({
  persisted: {
    isPersistedQuery: (params) => params.extensions?.isPersisted === true,
    getQuery: (params) => queryMap[params.extensions.hash],
  },
});
```

With the config above, the client can send the request below instead:

```json
{
  "variables": { "foo": "bar" },
  "extensions": {
    "isPersisted": true,
    "hash": "83fe07f141c99e18317cf055751944c21e20c44ded682ecfa117103a0443c96a"
  }
}
```

The request sastifies `isPersistedQuery` because it has `isPersisted` set to `true` in `extensions`. When `getQuery` is called, `query` is look up using `hash` in `extensions` via the `queryMap` object.

The execution goes on as if `query` is provided in the request.

### Send a request without using persisted queries

The client can opt-out of persisted query by not including `isPersisted` in `extensions` or not even the `extensions` object itself.

```json
{
  "query": "query { hello }",
  "variables": { "foo": "bar" },
}
```

`isPersistedQuery` in this case returns `false` and the request is not processed by the persisted query.

### Only allow prepared persisted queries

The nature of GraphQL allows the client to send any GraphQL query it wants. This can be bad because a malicious actor may send a complex query to DDOS the server. 

Beside using tools like cost or depth calculator, a workaround is to reject any arbitrary `query` and instead only allow known persisted queries.

```js
const queryMap = {
  '<hash>': '<query>'
}

const GQL = new Benzene({
  persisted: {
    isPersistedQuery: (params) => true,
    getQuery: (params) => {
      const query = knownQueries[params.extensions.hash];
      if (query) return query;
      // Throw an error otherwise
      const err = new Error('Only known persisted query allowed');
      err.status = 400;
      throw err;
    },
  },
});
```

With the config above, `isPersistedQuery` always returns `true`, thus forcing the `Benzene` to always treat the request as a persisted query and run it through `getQuery`.

`getQuery` would look up the `query` using a prepared map object `queryMap`. If the query is not found, it throws an error (with a `status` key set to `400` to be used as the HTTP status code) and the request is rejected.