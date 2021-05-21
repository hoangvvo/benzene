import { execute, subscribe } from "graphql";
import { CompileQuery } from "../types";

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
