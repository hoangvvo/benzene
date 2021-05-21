import {
  CompiledQuery,
  compileQuery as compileQueryJit,
} from "@hoangvvo/graphql-jit";
import { parse } from "graphql";
import { makeCompileQuery } from "../../src/runtimes/jit";
import { GraphQLCompiled } from "../../src/types";
import { SimpleSchema } from "../utils/schema";

const compileQuery = makeCompileQuery();

test("returns execute function that calls `query` from compiledQuery`", () => {
  const document = parse(`query { foo }`);
  const compiled = compileQuery(SimpleSchema, document) as GraphQLCompiled;
  const compiledJit = compileQueryJit(SimpleSchema, document) as CompiledQuery;
  expect(compiled.execute({ document })).toEqual(
    compiledJit.query(undefined, undefined, undefined)
  );
});

test("returns subscribe function that calls `subscribe` from graphql-js`", async () => {
  const document = parse(`subscription { bar }`);
  const compiled = compileQuery(SimpleSchema, document) as GraphQLCompiled;
  const compiledJit = compileQueryJit(SimpleSchema, document) as CompiledQuery;
  // @ts-ignore
  expect((await compiled.subscribe!({ document })).next()).toEqual(
    // @ts-ignore
    (await compiledJit.subscribe({ document, schema: SimpleSchema })).next()
  );
});
