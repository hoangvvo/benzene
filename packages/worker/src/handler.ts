import {
  GraphQL,
  parseBodyByContentType,
  getGraphQLParams,
  HttpQueryRequest,
  runHttpQuery,
} from '@benzene/core';
import { HandlerConfig } from './types';

export async function handleRequest(
  gql: GraphQL,
  request: Request,
  options: HandlerConfig = {}
): Promise<Response> {
  let requestBody: Record<string, any> | null = null;

  if (request.method === 'POST') {
    const oCtype = request.headers.get('content-type');
    if (oCtype) {
      try {
        requestBody = parseBodyByContentType(await request.text(), oCtype);
      } catch (err) {
        return new Response(err.message, {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
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
