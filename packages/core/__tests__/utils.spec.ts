import { CompiledQuery } from "@benzene/core/src/types";
import { isAsyncIterator, makeCompileQuery } from "@benzene/core/src/utils";
import { execute, parse, subscribe } from "graphql";
import { SimpleSchema } from "./_schema";

describe("isAsyncIterator", () => {
  test("returns false if value is not", () => {
    expect(isAsyncIterator(undefined)).toBe(false);
    expect(isAsyncIterator(null)).toBe(false);
    expect(isAsyncIterator(true)).toBe(false);
    expect(isAsyncIterator(1)).toBe(false);
    expect(isAsyncIterator("")).toBe(false);
    expect(isAsyncIterator({})).toBe(false);
    expect(isAsyncIterator([])).toBe(false);
  });

  test("returns true if value is", () => {
    expect(
      isAsyncIterator({
        [Symbol.asyncIterator]() {
          return this;
        },
      })
    ).toBe(true);

    async function* asyncGeneratorFunc() {}

    expect(isAsyncIterator(asyncGeneratorFunc())).toBe(true);

    // But async generator function itself is not iterable
    expect(isAsyncIterator(asyncGeneratorFunc)).toBe(false);
  });
});

describe("makeCompileQuery", () => {
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
});
