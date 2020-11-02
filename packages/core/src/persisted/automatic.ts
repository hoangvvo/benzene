import { GraphQLError } from 'graphql';
import lru from 'tiny-lru';
import { GraphQLPersisted, KeyValueStore, ValueOrPromise } from '../types';

const APQ_CACHE_PREFIX = 'apq:';

export default function persistedAutomatic(options: {
  cache?: KeyValueStore;
  sha256: (query: string) => ValueOrPromise<string>;
}): GraphQLPersisted {
  const cache = options.cache || lru(1024);
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
        const error = new GraphQLError(
          'PersistedQueryNotFound',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { code: 'PERSISTED_QUERY_NOT_FOUND' }
        );
        (error as any).status = 200;
        throw error;
      }
      // Save persited query
      const computedQueryHash = await options.sha256(params.query);
      if (computedQueryHash !== queryHash) {
        const error = new GraphQLError('provided sha does not match query');
        (error as any).status = 400;
        throw error;
      }
      await cache.set(`${APQ_CACHE_PREFIX}${computedQueryHash}`, params.query);
      return params.query;
    },
  };
}
