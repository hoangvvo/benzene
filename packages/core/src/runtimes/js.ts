import { execute, subscribe } from "graphql";
import { CompileQuery } from "../types";

/**
 * Create a compileQuery function using graphql-js
 * @returns CompileQuery
 */
export default function createCompileQuery(): CompileQuery {
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
