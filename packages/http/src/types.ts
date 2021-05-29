import { GraphQLParams, ValueOrPromise } from "@benzene/core";
import { ExecutionResult, FormattedExecutionResult } from "graphql";

// @ts-ignore
export interface HandlerOptions<TExtra> {
  /**
   * A function that accepts the parsed GraphQLParams and returns
   * either the new GraphQLParams or ExecutionResult
   * @param params
   */
  onParams?(
    params: GraphQLParams
  ): ValueOrPromise<GraphQLParams | ExecutionResult | void>;
}

type Headers = Record<string, string | string[] | undefined>;

/**
 * The generic HTTP Request object
 */
export interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any> | null;
  headers: Headers;
}

/**
 * The generic HTTP Response object
 */
export interface HTTPResponse {
  status: number;
  headers: Headers;
  payload:
    | FormattedExecutionResult
    | AsyncIterableIterator<FormattedExecutionResult>;
}
