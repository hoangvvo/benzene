import { Benzene, ExtractExtraType } from "@benzene/core";
import { ExecutionResult, GraphQLError } from "graphql";
import { HandlerOptions, HTTPRequest, HTTPResponse } from "./types";
import { getGraphQLParams } from "./utils";

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

/**
 * Create a handler to handle incoming request
 * @param GQL A Benzene instance
 * @param options Handler options
 */
export function makeHandler<TBenzene extends Benzene>(
  GQL: TBenzene,
  // @ts-ignore
  options: HandlerOptions<ExtractExtraType<TBenzene>> = {}
) {
  type TExtra = ExtractExtraType<TBenzene>;
  /**
   * A function that handles incoming request
   * @param socket The incoming request
   * @param extra An extra field to store anything that needs to be accessed later
   */
  return async function graphqlHTTP(
    request: HTTPRequest,
    extra?: TExtra
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
