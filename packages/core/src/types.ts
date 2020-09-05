import {
  GraphQLError,
  GraphQLSchema,
  DocumentNode,
  GraphQLFormattedError,
} from 'graphql';
import { CompiledQuery } from '@hoangvvo/graphql-jit';

export type TContext = { [key: string]: any };

export interface Config {
  schema: GraphQLSchema;
  formatError?: (error: GraphQLError) => GraphQLFormattedError;
  persisted?: GraphQLPersisted;
}

export interface GraphQLParams {
  // https://github.com/graphql/graphql-over-http/blob/master/spec/GraphQLOverHTTP.md#request-parameters
  query?: string | null;
  variables?: Record<string, any> | null;
  operationName?: string | null;
  extensions?: Record<string, any> | null;
}

export interface HttpQueryRequest {
  context: TContext;
  httpMethod: string;
  queryParams: Record<string, string> | null;
  body: string | Record<string, any> | null;
  headers: Record<string, string | null>;
}

export interface HttpQueryResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export interface QueryCache {
  operation: string;
  document: DocumentNode;
  jit: CompiledQuery;
}

// Can be replaced with `FormattedExecutionResult` from 5.3.0
export interface FormattedExecutionResult<
  TData = { [key: string]: any },
  TExtensions = { [key: string]: any }
> {
  errors?: ReadonlyArray<GraphQLFormattedError>;
  data?: TData | null;
  extensions?: TExtensions;
}

export abstract class GraphQLPersisted {
  abstract isPersistedQuery: (params: GraphQLParams) => boolean;
  abstract getQuery: (
    params: GraphQLParams
  ) => ValueOrPromise<string | undefined>;
}

export type ValueOrPromise<T> = T | Promise<T>;
