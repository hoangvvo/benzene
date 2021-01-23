import { Benzene } from "@benzene/core";
import { GraphQLError } from "graphql";
import { getGraphQLParams, createResponse } from "./utils";
import { HandlerOptions, HTTPRequest, HTTPResponse } from "./types";

export function makeHandler<TContext = unknown, TExtra = unknown>(
  GQL: Benzene,
  options: HandlerOptions<TContext, TExtra> = {}
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
          contextValue: options.contextFn
            ? await options.contextFn({ extra })
            : undefined,
          variableValues: params.variables,
        },
        cachedOrResult.jit
      )
    );
  };
}
