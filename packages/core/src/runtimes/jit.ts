import {
  compileQuery as jitCompileQuery,
  isCompiledQuery,
} from "@hoangvvo/graphql-jit";
import { CompileQuery } from "../types";

/**
 * Create a compileQuery function using graphql-jit
 * @returns CompileQuery
 */
export default function createCompileQuery(): CompileQuery {
  return function compileQuery(schema, document, operationName) {
    const jit = jitCompileQuery(schema, document, operationName || undefined);

    if (!isCompiledQuery(jit)) return jit;

    return {
      execute(args) {
        return jit.query(
          args.rootValue,
          args.contextValue,
          args.variableValues
        );
      },

      subscribe: jit.subscribe
        ? (args) =>
            jit.subscribe!(
              args.rootValue,
              args.contextValue,
              args.variableValues
            )
        : undefined,
    };
  };
}
