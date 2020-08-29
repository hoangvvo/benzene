import {
  GraphQL,
  parseBodyByContentType,
  getGraphQLParams,
  HttpQueryRequest,
  runHttpQuery,
} from '@benzene/core';
import { HandlerConfig } from './types';

export function createHandler(gql: GraphQL, options: HandlerConfig = {}) {
  async function handleRequest(request: Request) {
    let requestBody: Record<string, any> | null = null;

    if (request.method === 'POST') {
      const oCtype = request.headers.get('content-type');
      if (oCtype) {
        try {
          requestBody = parseBodyByContentType(await request.text(), oCtype);
        } catch (err) {
          return new Response(
            JSON.stringify(
              gql.formatExecutionResult({
                errors: [err],
              })
            ),
            {
              status: 400,
              headers: { 'content-type': 'application/json' },
            }
          );
        }
      }
    }

    const queryParams: { [key: string]: string } = {};

    new URLSearchParams(request.url.slice(request.url.indexOf('?'))).forEach(
      (value, key) => (queryParams[key] = value)
    );

    const params = getGraphQLParams({
      queryParams,
      body: requestBody,
    }) as HttpQueryRequest;
    params.httpMethod = request.method;

    try {
      params.context =
        typeof options.context === 'function'
          ? await options.context(request)
          : options.context || {};
    } catch (err) {
      err.message = `Context creation failed: ${err.message}`;
      return new Response(
        JSON.stringify(gql.formatExecutionResult({ errors: [err] })),
        {
          status: err.status || 500,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    const { status, body, headers } = await runHttpQuery(gql, params);

    return new Response(body, { status, headers });
  }

  return function handler(event: FetchEvent) {
    if (options.path && options.path !== new URL(event.request.url).pathname)
      return;
    event.respondWith(handleRequest(event.request));
  };
}
