import { CompileQuery } from "@benzene/core";
import {
  compileQuery as jitCompileQuery,
  isCompiledQuery as jitIsCompiledQuery,
} from "@hoangvvo/graphql-jit";

/**
 * Create a compileQuery function using graphql-jit
 * @returns CompileQuery
 */
export function makeCompileQuery(): CompileQuery {
  return function compileQuery(schema, document, operationName) {
    const jit = jitCompileQuery(schema, document, operationName || undefined);

    if (!jitIsCompiledQuery(jit)) return jit;

    return {
      execute(args) {
        return jit.query(
          args.rootValue,
          args.contextValue,
          args.variableValues
        );
      },
      subscribe(args) {
        return jit.subscribe!(
          args.rootValue,
          args.contextValue,
          args.variableValues
        );
      },
    };
  };
}
