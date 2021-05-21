import {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  formatError,
  GraphQLSchema,
  SubscriptionArgs,
} from "graphql";
import Benzene from "./core";

export interface Options<TContext, TExtra> {
  /**
   * The GraphQL schema
   * @see {@link https://graphql.org/graphql-js/type/#graphqlschema}
   */
  schema: GraphQLSchema;
  /**
   * A function to format errors according to the Response format of the spec.
   * Can also be used for logging errors.
   * @see {@link https://graphql.org/graphql-js/error/#formaterror}
   */
  formatErrorFn?: typeof formatError;
  /**
   * A function to create an object used by all the resolvers of a specific GraphQL execution
   * @param ctx An object contains the "extra" variable supplied by downstream packages
   */
  contextFn?: ContextFn<TContext, TExtra>;
  compileQuery?: CompileQuery;
}

/**
 * The parameters used to execute a GraphQL query
 */
export interface GraphQLParams {
  // https://github.com/graphql/graphql-over-http/blob/master/spec/GraphQLOverHTTP.md#request-parameters
  query?: Maybe<string>;
  variables?: Maybe<Record<string, any>>;
  operationName?: Maybe<string>;
  extensions?: Maybe<Record<string, any>>;
}

export interface QueryCache {
  operation: string;
  document: DocumentNode;
  compiled: GraphQLCompiled;
}

export type ContextFn<TContext, TExtra> = (contextInput: {
  extra: TExtra;
}) => ValueOrPromise<TContext>;

export type ValueOrPromise<T> = T | Promise<T>;

export type ExtractExtraType<Type> = Type extends Benzene<any, infer TExtra>
  ? TExtra
  : never;

export type CompileQuery = (
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName?: Maybe<string>
) => GraphQLCompiled | ExecutionResult;

export interface GraphQLCompiled {
  execute(
    args: Pick<
      ExecutionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >
  ): ValueOrPromise<ExecutionResult>;

  subscribe?(
    args: Pick<
      SubscriptionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;

  stringify?(result: ExecutionResult): string;
}

export type Maybe<T> = null | undefined | T;
