import lru from 'tiny-lru';
import { BenzeneHTTPError } from '../error';
import { GraphQLPersisted, KeyValueStore, ValueOrPromise } from '../types';

const APQ_CACHE_PREFIX = 'apq:';

export default function persistedAutomatic(options: {
  cache?: KeyValueStore;
  sha256: (query: string) => ValueOrPromise<string>;
}): GraphQLPersisted {
  const cache = options?.cache || lru(1024);
  return {
    isPersistedQuery(params) {
      return params.extensions?.persistedQuery?.version === 1;
    },
    async getQuery(params) {
      const queryHash = params.extensions!.persistedQuery.sha256Hash;
      if (!params.query) {
        // Try get persisted query from store
        const query = await cache.get(`${APQ_CACHE_PREFIX}${queryHash}`);
        if (query) return query;
        throw new BenzeneHTTPError(
          200,
          'PersistedQueryNotFound',
          'PERSISTED_QUERY_NOT_FOUND'
        );
      }
      // Save persited query
      const computedQueryHash = await options.sha256(params.query);
      if (computedQueryHash !== queryHash)
        throw new BenzeneHTTPError(400, 'provided sha does not match query');
      await cache.set(`${APQ_CACHE_PREFIX}${computedQueryHash}`, params.query);
      return params.query;
    },
  };
}
