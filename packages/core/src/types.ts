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
  rootValue?: ((parsedQuery: DocumentNode) => any) | any;
  formatError?: (error: GraphQLError) => GraphQLFormattedError;
}

export interface GraphQLParams {
  // https://github.com/graphql/graphql-over-http/blob/master/spec/GraphQLOverHTTP.md#request-parameters
  query?: string | null;
  variables?: Record<string, any> | null;
  operationName?: string | null;
  extensions?: Record<string, any> | null;
}

export interface HttpQueryRequest extends GraphQLParams {
  context: TContext;
  httpMethod: string;
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

export type ValueOrPromise<T> = T | Promise<T>;
