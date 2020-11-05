import Benzene from './core';
import { HTTPRequest, HTTPResponse, GraphQLParams } from './types';
import flatstr from 'flatstr';
import { ExecutionResult, GraphQLError } from 'graphql';

function parseBodyByContentType(
  rawBody: string,
  oCtype: string
): Record<string, any> | null {
  const semiIndex = oCtype.indexOf(';');
  const ctype = (semiIndex !== -1
    ? oCtype.substring(0, semiIndex)
    : oCtype
  ).trim();

  // Parse body
  switch (ctype) {
    case 'application/graphql':
      return { query: rawBody };
    case 'application/json':
      try {
        return JSON.parse(rawBody);
      } catch (e) {
        throw new Error('POST body sent invalid JSON.');
      }
    case 'application/x-www-form-urlencoded': {
      const queryParams: Record<string, any> = {};
      new URLSearchParams(rawBody).forEach(
        (value, key) => (queryParams[key] = value)
      );
      return queryParams;
    }
    default:
      // If no Content-Type header matches, parse nothing.
      return null;
  }
}

function getGraphQLParams({
  queryParams,
  body,
}: {
  queryParams: Record<string, string | null | undefined> | null;
  body: Record<string, any> | null;
}): GraphQLParams {
  return {
    query: body?.query || queryParams?.query,
    variables:
      body?.variables ||
      (queryParams?.variables && JSON.parse(queryParams.variables)),
    operationName:
      body?.operationName ||
      (queryParams?.operationName as string | null | undefined),
    extensions:
      body?.extensions ||
      (queryParams?.extensions && JSON.parse(queryParams.extensions)),
  };
}

function createResponse(
  gql: Benzene,
  code: number,
  obj: ExecutionResult
): HTTPResponse {
  return {
    body: flatstr(JSON.stringify(gql.formatExecutionResult(obj))),
    status: code,
    headers: { 'content-type': 'application/json' },
  };
}

export async function runHttpQuery(
  gql: Benzene,
  request: HTTPRequest
): Promise<HTTPResponse> {
  let body: Record<string, any> | null;
  try {
    body =
      typeof request.body === 'object'
        ? request.body
        : request.body && request.headers['content-type']
        ? parseBodyByContentType(request.body, request.headers['content-type'])
        : null;
  } catch (e) {
    return createResponse(gql, 400, {
      errors: [e],
    });
  }

  const params = getGraphQLParams({
    queryParams: request.queryParams,
    body,
  });

  if (gql.persisted?.isPersistedQuery(params)) {
    try {
      params.query = await gql.persisted.getQuery(params);
    } catch (error) {
      return createResponse(gql, error.status || 500, { errors: [error] });
    }
  }

  if (!params.query) {
    return createResponse(gql, 400, {
      errors: [new GraphQLError('Must provide query string.')],
    });
  }

  const cachedOrResult = gql.getCachedGQL(params.query, params.operationName);

  if (!('document' in cachedOrResult)) {
    return createResponse(gql, 400, cachedOrResult);
  }

  if (request.httpMethod !== 'POST' && request.httpMethod !== 'GET')
    return createResponse(gql, 405, {
      errors: [
        new GraphQLError('GraphQL only supports GET and POST requests.'),
      ],
    });
  if (request.httpMethod === 'GET' && cachedOrResult.operation !== 'query')
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
    await gql.execute(
      {
        document: cachedOrResult.document,
        contextValue: request.context,
        variableValues: params.variables,
      },
      cachedOrResult.jit
    )
  );
}
