import { FormattedExecutionResult } from "graphql";

// @ts-ignore
export interface HandlerOptions<TExtra> {}

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
