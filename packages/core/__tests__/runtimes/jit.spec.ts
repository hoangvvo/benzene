import {
  CompiledQuery as CompiledQueryJit,
  compileQuery as compileQueryJit,
} from "@hoangvvo/graphql-jit";
import { parse } from "graphql";
import { makeCompileQuery } from "../../src/runtimes/jit";
import { CompiledQuery } from "../../src/types";
import { SimpleSchema } from "../_schema";

const compileQuery = makeCompileQuery();

test("returns execute function that calls `query` from jit compiled query`", () => {
  const document = parse(`query { foo }`);
  const compiled = compileQuery(SimpleSchema, document) as CompiledQuery;
  const compiledJit = compileQueryJit(
    SimpleSchema,
    document
  ) as CompiledQueryJit;
  expect(compiled.execute({ document })).toEqual(
    compiledJit.query(undefined, undefined, undefined)
  );
});

test("returns subscribe function that calls `subscribe` from graphql-js`", async () => {
  const document = parse(`subscription { bar }`);
  const compiled = compileQuery(SimpleSchema, document) as CompiledQuery;
  const compiledJit = compileQueryJit(
    SimpleSchema,
    document
  ) as CompiledQueryJit;
  // @ts-ignore
  expect((await compiled.subscribe!({ document })).next()).toEqual(
    // @ts-ignore
    (await compiledJit.subscribe({ document, schema: SimpleSchema })).next()
  );
});
