import { execute, ExecutionResult, subscribe } from "graphql";
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
