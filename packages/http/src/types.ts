import { FormattedExecutionResult } from "graphql";
import { ValueOrPromise } from "@benzene/core";

interface RequestContext<TExtra> {
  extra: TExtra;
}

export interface HandlerOptions<TContext, TExtra> {
  /**
   * A function to create an object used by all the resolvers of a specific GraphQL execution
   * @param ctx The ConnectionContext
   */
  contextFn?: (ctx: RequestContext<TExtra>) => ValueOrPromise<TContext>;
}

type Headers = Record<string, string | undefined>;

export interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any>;
  headers: Headers;
}

export interface HTTPResponse {
  status: number;
  headers: Headers;
  payload:
    | FormattedExecutionResult
    | AsyncIterableIterator<FormattedExecutionResult>;
}
