import {
  GraphQLParams,
  PersistedOptions,
  KeyValueStore,
} from '../types';
import { Lru } from 'tiny-lru';
import { sha256 } from 'crypto-hash';
import { BenzeneHTTPError } from '../error';
import { GraphQLPersisted } from './types';

const APQ_CACHE_PREFIX = 'apq:'

export class PersistedAutomatic implements GraphQLPersisted {
  cache: KeyValueStore;

  constructor(options?: { cache?: KeyValueStore }) {
    this.cache = options?.cache || new Lru(1024);
  }

  isPersistedQuery(params: GraphQLParams) {
    return params.extensions?.persistedQuery?.version === 1
  }

  async getQuery(
    params: GraphQLParams
  ): Promise<string> {
    const queryHash = params.extensions!.persistedQuery.sha256Hash;
    if (!params.query) {
      // Try get persisted query from store
      const query = await this.cache.get(queryHash);
      if (query) return query;
      throw new BenzeneHTTPError(200, 'PersistedQueryNotFound', 'PERSISTED_QUERY_NOT_FOUND');
    }
    // Save persited query
    const computedQueryHash = await sha256(params.query)
    if (computedQueryHash !== queryHash) throw new BenzeneHTTPError(400, 'provided sha does not match query');
    await this.cache.set(`${APQ_CACHE_PREFIX}${computedQueryHash}`, params.query);
    return params.query;
  }
}
