import { GraphQLSchema, DocumentNode, formatError } from "graphql";
import { CompiledQuery } from "@hoangvvo/graphql-jit";

export interface Options<TContext, TExtra> {
  /**
   * The GraphQL schema
   * {@link https://graphql.org/graphql-js/type/#graphqlschema}
   */
  schema: GraphQLSchema;
  /**
   * A function to format errors according to the Response format of the spec.
   * Can also be used for logging errors.
   * {@link https://graphql.org/graphql-js/error/#formaterror}
   */
  formatErrorFn?: typeof formatError;
  /**
   * A function to create an object used by all the resolvers of a specific GraphQL execution
   * @param ctx An object contains the "extra" variable supplied by downstream packages
   */
  contextFn?: ContextFn<TContext, TExtra>;
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

export type ContextFn<TContext, TExtra> = (contextInput: {
  extra: TExtra;
}) => ValueOrPromise<TContext>;

export type ValueOrPromise<T> = T | Promise<T>;
