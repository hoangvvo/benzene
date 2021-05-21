import { execute, parse, subscribe } from "graphql";
import { makeCompileQuery } from "../../src/runtimes/js";
import { GraphQLCompiled } from "../../src/types";
import { SimpleSchema } from "./schema";

const compileQuery = makeCompileQuery();

test("returns execute function that calls `execute` from graphql-js`", () => {
  const document = parse(`query { foo }`);
  const compiled = compileQuery(SimpleSchema, document) as GraphQLCompiled;
  expect(compiled.execute({ document })).toEqual(
    execute({ document, schema: SimpleSchema })
  );
});

test("returns subscribe function that calls `subscribe` from graphql-js`", async () => {
  const document = parse(`subscription { bar }`);
  const compiled = compileQuery(SimpleSchema, document) as GraphQLCompiled;
  // @ts-ignore
  expect((await compiled.subscribe!({ document })).next()).toEqual(
    // @ts-ignore
    (await subscribe({ document, schema: SimpleSchema })).next()
  );
});
