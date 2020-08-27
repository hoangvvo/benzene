import { GraphQL } from './core';
import { HttpQueryRequest, HttpQueryResponse } from './types';
import flatstr from 'flatstr';
import { ExecutionResult } from 'graphql';

function createResponse(
  gql: GraphQL,
  code: number,
  obj: ExecutionResult | string,
  stringify = JSON.stringify,
  headers: Record<string, string> = typeof obj === 'string'
    ? { 'content-type': 'text/plain' }
    : { 'content-type': 'application/json' }
): HttpQueryResponse {
  return {
    body:
      typeof obj === 'string'
        ? obj
        : flatstr(stringify(gql.formatExecutionResult(obj))),
    status: code,
    headers,
  };
}

export async function runHttpQuery(
  gql: GraphQL,
  { query, variables, operationName, context, httpMethod }: HttpQueryRequest
): Promise<HttpQueryResponse> {
  if (!query) {
    return createResponse(gql, 400, 'Must provide query string.');
  }

  const cachedOrResult = gql.getCachedGQL(query, operationName);

  if (!('document' in cachedOrResult)) {
    return createResponse(gql, 400, cachedOrResult);
  }

  if (httpMethod !== 'POST' && httpMethod !== 'GET')
    return createResponse(
      gql,
      405,
      `GraphQL only supports GET and POST requests.`
    );
  if (httpMethod === 'GET' && cachedOrResult.operation !== 'query')
    return createResponse(
      gql,
      405,
      `Operation ${cachedOrResult.operation} cannot be performed via a GET request.`
    );

  return createResponse(
    gql,
    200,
    await gql.execute({
      jit: cachedOrResult.jit,
      document: cachedOrResult.document,
      contextValue: context,
      variableValues: variables,
    })
  );
}
