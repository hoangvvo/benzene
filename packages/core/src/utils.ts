import { execute, subscribe } from "graphql";
import { CompileQuery } from "../types";

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
