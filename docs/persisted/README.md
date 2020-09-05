# Persisted queries

*Persisted queries* is a technique to improves network performance for GraphQL by sending an ID or hash instead of a long GraphQL query string.

Benzene allows flexible persisted query implementation (not just limited to the popular [APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/))

## Usage

Add `options.persisted` when create a [GraphQL instance](/core#graphql)

```js
import { GraphQL } from '@benzene/<package>';

const GQL = new GraphQL({
  persisted: GraphQLPersisted,
});
```

## Implementation

```ts
interface GraphQLPersisted {
  isPersistedQuery: (params: GraphQLParams) => boolean;
  getQuery: (params: GraphQLParams) => ValueOrPromise<string | undefined>;
}
```

A `GraphQLPersisted` is an object or instance that contains two methods:

- `isPersistedQuery` that takes `GraphQLParams`, where `GraphQLParams` is an object containing `query`, `variables`, `operationName`, and `extensions`, and returns a boolean determining if the query is a persisted query.
- `getQuery`, that takes the same `GraphQLParams` object and returns the `query` string or `undefined`. It can also throw an error to return a response early, with status code set to `error.status`.

To learn about the implementation, see [PersistedAutomatic](https://github.com/hoangvvo/benzene/blob/persisted/packages/core/src/persisted/automatic.ts), which implements [Apollo APQ](https://www.apollographql.com/docs/apollo-server/performance/apq/), or the example below.

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

The query is huge and not efficient to be sent over the network. We solve this by enabling the server to identify the query with a `hash` or `id`, without having the client to send over the query.

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

const GQL = new GraphQL({
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

A workaround is that the server rejects any arbitrary `query` and instead only allows known persisted queries.

```js
const queryMap = {
  '<hash>': '<query>'
}

const GQL = new GraphQL({
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

`getQuery` would look up the `query` using a prepared map object `queryMap`. If the query is not found, it throws an error (with a `status` key set to `400` to be used as the HTTP status code) and the request is not rejected.