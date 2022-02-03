import {
  execute,
  ExecutionResult,
  GraphQLError,
  GraphQLFormattedError,
  subscribe,
} from "graphql";
import { CompileQuery } from "./types";

export function isAsyncIterator<T = unknown>(
  val: unknown
): val is AsyncIterableIterator<T> {
  return typeof Object(val)[Symbol.asyncIterator] === "function";
}

/**
 * Create a compileQuery function using graphql-js
 * @returns CompileQuery
 */
export function makeCompileQuery(): CompileQuery {
  return function compileQuery(schema) {
    return {
      execute(args) {
        return execute({ ...args, schema });
      },
      subscribe(args) {
        return subscribe({ ...args, schema });
      },
    };
  };
}

export function isExecutionResult(val: unknown): val is ExecutionResult {
  return (
    typeof val === "object" &&
    val !== null &&
    (Array.isArray((val as ExecutionResult).errors) ||
      (typeof (val as ExecutionResult).data === "object" &&
        !Array.isArray((val as ExecutionResult).data)))
  );
}

/**
 * Validate whether an operation does not exist
 * or operationName is missing. Even though
 * execution will realize this, we need to provide
 * this hint mainly for handlers to avoid execution
 * @param operation
 * @param operationName
 */
export function validateOperationName(
  operation: string | undefined,
  operationName: string | null | undefined
) {
  if (operation) return [];
  if (!operationName) {
    return [
      new GraphQLError(
        "Must provide operation name if query contains multiple operations."
      ),
    ];
  }
  return [new GraphQLError(`Unknown operation named "${operationName}".`)];
}

/**
 * Given a GraphQLError, format it according to the rules described by the
 * Response Format, Errors section of the GraphQL Specification.
 */
export function formatError(error: GraphQLError): GraphQLFormattedError {
  type WritableFormattedError = {
    -readonly [P in keyof GraphQLFormattedError]: GraphQLFormattedError[P];
  };
  const formattedError: WritableFormattedError = {
    message: error.message,
  };
  if (error.locations != null) {
    formattedError.locations = error.locations;
  }
  if (error.path != null) {
    formattedError.path = error.path;
  }
  if (error.extensions != null && Object.keys(error.extensions).length > 0) {
    formattedError.extensions = error.extensions;
  }

  return formattedError;
}
