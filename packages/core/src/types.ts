import {
  GraphQLError,
  GraphQLSchema,
  DocumentNode,
  GraphQLFormattedError,
} from "graphql";
import { CompiledQuery } from "@hoangvvo/graphql-jit";
export interface Config {
  schema: GraphQLSchema;
  formatErrorFn?: (error: GraphQLError) => GraphQLFormattedError;
}

export interface GraphQLParams {
  // https://github.com/graphql/graphql-over-http/blob/master/spec/GraphQLOverHTTP.md#request-parameters
  query?: string | null;
  variables?: Record<string, any> | null;
  operationName?: string | null;
  extensions?: Record<string, any> | null;
}
export interface QueryCache {
  operation: string;
  document: DocumentNode;
  jit: CompiledQuery;
}

export type ValueOrPromise<T> = T | Promise<T>;
