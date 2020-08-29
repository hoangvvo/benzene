import { GraphQL } from './core';
import { HttpQueryRequest, HttpQueryResponse } from './types';
import flatstr from 'flatstr';
import { ExecutionResult, GraphQLError } from 'graphql';

function createResponse(
  gql: GraphQL,
  code: number,
  obj: ExecutionResult
): HttpQueryResponse {
  return {
    body:
      typeof obj === 'string'
        ? obj
        : flatstr(JSON.stringify(gql.formatExecutionResult(obj))),
    status: code,
    headers: { 'content-type': 'application/json' },
  };
}

export async function runHttpQuery(
  gql: GraphQL,
  { query, variables, operationName, context, httpMethod }: HttpQueryRequest
): Promise<HttpQueryResponse> {
  if (!query) {
    return createResponse(gql, 400, {
      errors: [new GraphQLError('Must provide query string.')],
    });
  }

  const cachedOrResult = gql.getCachedGQL(query, operationName);

  if (!('document' in cachedOrResult)) {
    return createResponse(gql, 400, cachedOrResult);
  }

  if (httpMethod !== 'POST' && httpMethod !== 'GET')
    return createResponse(gql, 405, {
      errors: [
        new GraphQLError('GraphQL only supports GET and POST requests.'),
      ],
    });
  if (httpMethod === 'GET' && cachedOrResult.operation !== 'query')
    return createResponse(gql, 405, {
      errors: [
        new GraphQLError(
          `Can only perform a ${cachedOrResult.operation} operation from a POST request.`
        ),
      ],
    });

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
