import { ExecutionResult } from "graphql";
import { Benzene, GraphQLParams } from "@benzene/core";
import { HTTPRequest, HTTPResponse } from "./types";

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

export function createResponse(
  GQL: Benzene,
  code: number,
  result: ExecutionResult
): HTTPResponse {
  return {
    payload: GQL.formatExecutionResult(result),
    status: code,
    headers: { "content-type": "application/json" },
  };
}

export function parseGraphQLBody(
  rawBody: string,
  oCtype: string = ""
): Record<string, any> | null {
  const semiIndex = oCtype.indexOf(";");
  const ctype = (semiIndex !== -1
    ? oCtype.substring(0, semiIndex)
    : oCtype
  ).trim();

  switch (ctype) {
    case "application/graphql":
      return { query: rawBody };
    case "application/json":
      try {
        return JSON.parse(rawBody);
      } catch (e) {
        throw new Error("POST body sent invalid JSON.");
      }
    default:
      // If no Content-Type header matches, parse nothing.
      return null;
  }
}
