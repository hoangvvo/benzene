import { FormattedExecutionResult } from "graphql";

// @ts-ignore
export interface HandlerOptions<TExtra> {}

type Headers = Record<string, string | string[] | undefined> & {
  'accept'?: string;
  'accept-language'?: string;
  'accept-patch'?: string;
  'accept-ranges'?: string;
  'access-control-allow-credentials'?: string;
  'access-control-allow-headers'?: string;
  'access-control-allow-methods'?: string;
  'access-control-allow-origin'?: string;
  'access-control-expose-headers'?: string;
  'access-control-max-age'?: string;
  'access-control-request-headers'?: string;
  'access-control-request-method'?: string;
  'age'?: string;
  'allow'?: string;
  'alt-svc'?: string;
  'authorization'?: string;
  'cache-control'?: string;
  'connection'?: string;
  'content-disposition'?: string;
  'content-encoding'?: string;
  'content-language'?: string;
  'content-length'?: string;
  'content-location'?: string;
  'content-range'?: string;
  'content-type'?: string;
  'cookie'?: string;
  'date'?: string;
  'etag'?: string;
  'expect'?: string;
  'expires'?: string;
  'forwarded'?: string;
  'from'?: string;
  'host'?: string;
  'if-match'?: string;
  'if-modified-since'?: string;
  'if-none-match'?: string;
  'if-unmodified-since'?: string;
  'last-modified'?: string;
  'location'?: string;
  'origin'?: string;
  'pragma'?: string;
  'proxy-authenticate'?: string;
  'proxy-authorization'?: string;
  'public-key-pins'?: string;
  'range'?: string;
  'referer'?: string;
  'retry-after'?: string;
  'sec-websocket-accept'?: string;
  'sec-websocket-extensions'?: string;
  'sec-websocket-key'?: string;
  'sec-websocket-protocol'?: string;
  'sec-websocket-version'?: string;
  'set-cookie'?: string[];
  'strict-transport-security'?: string;
  'tk'?: string;
  'trailer'?: string;
  'transfer-encoding'?: string;
  'upgrade'?: string;
  'user-agent'?: string;
  'vary'?: string;
  'via'?: string;
  'warning'?: string;
  'www-authenticate'?: string;
};

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
