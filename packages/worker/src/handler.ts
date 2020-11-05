import { Benzene, runHttpQuery, TContext } from '@benzene/core';
import { HandlerConfig } from './types';

export function createHandler(gql: Benzene, options: HandlerConfig = {}) {
  async function handleRequest(request: Request) {
    const queryParams: { [key: string]: string } = {};

    new URLSearchParams(request.url.slice(request.url.indexOf('?'))).forEach(
      (value, key) => (queryParams[key] = value)
    );

    let context: TContext | undefined;
    if (options.context)
      try {
        context =
          typeof options.context === 'function'
            ? await options.context(request)
            : options.context;
      } catch (error) {
        error.message = `Context creation failed: ${error.message}`;
        return new Response(
          JSON.stringify(gql.formatExecutionResult({ errors: [error] })),
          {
            status: error.status || 500,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

    const { status, body, headers } = await runHttpQuery(gql, {
      httpMethod: request.method,
      body: request.method === 'POST' ? await request.text() : null,
      queryParams,
      context: context || {},
      headers: {
        'content-type': request.headers.get('content-type'),
      },
    });

    return new Response(body, { status, headers });
  }

  return function handler(event: FetchEvent) {
    if (options.path && options.path !== new URL(event.request.url).pathname)
      return;
    event.respondWith(handleRequest(event.request));
  };
}
