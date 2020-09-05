import { GraphQLParams, ValueOrPromise } from '../types';

export abstract class GraphQLPersisted {
  abstract isPersistedQuery: (params: GraphQLParams) => boolean;
  abstract getQuery: (
    params: GraphQLParams
  ) => ValueOrPromise<string | undefined>;
}
