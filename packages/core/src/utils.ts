import { ExecutionResult } from 'graphql';
import { GraphQLParams } from './types';

export function parseBodyByContentType(
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
    default:
      // If no Content-Type header matches, parse nothing.
      return null;
  }
}

export function getGraphQLParams({
  queryParams,
  body,
}: {
  queryParams: Record<string, string | null | undefined>;
  body: Record<string, any> | null;
}): GraphQLParams {
  return {
    query: (body?.query || queryParams.query) as string | undefined | null,
    variables:
      body?.variables ||
      (queryParams.variables && JSON.parse(queryParams.variables)),
    operationName:
      body?.operationName ||
      (queryParams.operationName as string | null | undefined),
    extensions:
      body?.extensions ||
      (queryParams.extensions && JSON.parse(queryParams.extensions)),
  };
}

export function isExecutionResult<C, E extends ExecutionResult>(
  mayResult: C | E
): mayResult is E {
  return 'error' in mayResult;
}
