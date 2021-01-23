import { Benzene } from "@benzene/core";
import { ExecutionResult, GraphQLError } from "graphql";
import { getGraphQLParams } from "./utils";
import { HandlerOptions, HTTPRequest, HTTPResponse } from "./types";

function createResponse(
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

export function makeHandler<TExtra = unknown>(
  GQL: Benzene,
  // @ts-ignore
  options: HandlerOptions<TExtra> = {}
) {
  return async function graphqlHTTP(
    request: HTTPRequest,
    extra: TExtra
  ): Promise<HTTPResponse> {
    const params = getGraphQLParams(request);

    if (!params.query) {
      return createResponse(GQL, 400, {
        errors: [new GraphQLError("Must provide query string.")],
      });
    }

    const cachedOrResult = GQL.getCachedGQL(params.query, params.operationName);

    if (!("document" in cachedOrResult)) {
      return createResponse(GQL, 400, cachedOrResult);
    }

    if (request.method !== "POST" && request.method !== "GET") {
      return createResponse(GQL, 405, {
        errors: [
          new GraphQLError("GraphQL only supports GET and POST requests."),
        ],
      });
    }

    if (request.method === "GET" && cachedOrResult.operation !== "query") {
      return createResponse(GQL, 405, {
        errors: [
          new GraphQLError(
            `Can only perform a ${cachedOrResult.operation} operation from a POST request.`
          ),
        ],
      });
    }

    return createResponse(
      GQL,
      200,
      await GQL.execute(
        {
          document: cachedOrResult.document,
          contextValue: GQL.contextFn
            ? await GQL.contextFn({ extra })
            : undefined,
          variableValues: params.variables,
        },
        cachedOrResult.jit
      )
    );
  };
}
