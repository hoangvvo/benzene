import { GraphQLParams } from "@benzene/core";
import { HTTPRequest } from "./types";

/**
 * Extract GraphQLParams from query string and body
 * @param request An object contains the body object and query object
 */
export function getGraphQLParams({
  query,
  body,
}: Pick<HTTPRequest, "query" | "body">): GraphQLParams {
  return {
    query: body?.query || query?.query,
    variables:
      body?.variables ||
      (query?.variables && JSON.parse(query.variables as string)),
    operationName:
      body?.operationName ||
      (query?.operationName as string | null | undefined),
    extensions:
      body?.extensions ||
      (query?.extensions && JSON.parse(query.extensions as string)),
  };
}

/**
 * Parse the string body based on content-type according to the graphql-over-http spec
 * @param rawBody
 * @param oCtype
 * @see {@link https://graphql.org/learn/serving-over-http}
 */
export function parseGraphQLBody(
  rawBody: string,
  oCtype: string = ""
): Record<string, any> | null {
  const semiIndex = oCtype.indexOf(";");
  const ctype = (
    semiIndex !== -1 ? oCtype.substring(0, semiIndex) : oCtype
  ).trim();

  switch (ctype) {
    case "application/graphql+json":
      try {
        return JSON.parse(rawBody);
      } catch (e) {
        throw new Error("POST body sent invalid JSON.");
      }
    case "application/json":
      try {
        return JSON.parse(rawBody);
      } catch (e) {
        throw new Error("POST body sent invalid JSON.");
      }
    case "application/graphql":
      return { query: rawBody };

    default:
      // If no Content-Type header matches, parse nothing.
      return null;
  }
}
