import { GraphQLParams, ValueOrPromise } from '../types';

export abstract class GraphQLPersisted {
  abstract isPersistedQuery: (params: GraphQLParams) => boolean;
  abstract getQuery: (
    params: GraphQLParams
  ) => ValueOrPromise<string | undefined>;
}

export interface KeyValueStore<V = string> {
  get(key: string): ValueOrPromise<V | undefined | null>;
  set(key: string, value: V): ValueOrPromise<any>;
  delete(key: string): ValueOrPromise<any>;
}
