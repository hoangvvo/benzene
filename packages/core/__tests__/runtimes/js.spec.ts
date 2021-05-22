import { execute, parse, subscribe } from "graphql";
import { makeCompileQuery } from "../../src/runtimes/js";
import { CompiledQuery } from "../../src/types";
import { SimpleSchema } from "../utils/schema";

const compileQuery = makeCompileQuery();

test("returns execute function that calls `execute` from graphql-js`", () => {
  const document = parse(`query { foo }`);
  const compiled = compileQuery(SimpleSchema, document) as CompiledQuery;
  expect(compiled.execute({ document })).toEqual(
    execute({ document, schema: SimpleSchema })
  );
});

test("returns subscribe function that calls `subscribe` from graphql-js`", async () => {
  const document = parse(`subscription { bar }`);
  const compiled = compileQuery(SimpleSchema, document) as CompiledQuery;
  // @ts-ignore
  expect((await compiled.subscribe!({ document })).next()).toEqual(
    // @ts-ignore
    (await subscribe({ document, schema: SimpleSchema })).next()
  );
});
