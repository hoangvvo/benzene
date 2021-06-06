import { execute, parse, subscribe } from "graphql";
import { CompiledQuery } from "../src/types";
import {
  isAsyncIterator,
  isExecutionResult,
  makeCompileQuery,
  validateOperationName,
} from "../src/utils";
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

describe("isExecutionResult", () => {
  test("returns true if errors field is an array", () => {
    expect(
      isExecutionResult({
        errors: [],
      })
    ).toBe(true);
  });

  test("returns true if data field is an object or null", () => {
    expect(
      isExecutionResult({
        data: {},
      })
    ).toBe(true);

    expect(
      isExecutionResult({
        data: null,
      })
    ).toBe(true);
  });

  test("returns false if errors field is not an array", () => {
    expect(
      isExecutionResult({
        errors: "",
      })
    ).toBe(false);
    expect(
      isExecutionResult({
        errors: {},
      })
    ).toBe(false);
  });

  test("returns false if data field is not an object or is an array", () => {
    expect(
      isExecutionResult({
        data: 12,
      })
    ).toBe(false);
    expect(
      isExecutionResult({
        data: [],
      })
    ).toBe(false);
  });
});

describe("validateOperationName", () => {
  test("return empty array if operation is found", () => {
    expect(validateOperationName("dummy", "dummy")).toEqual([]);
    expect(validateOperationName("dummy", null)).toEqual([]);
  });

  test("return missing errors if query contains multiple operations", () => {
    expect(validateOperationName(undefined, null)).toEqual([
      {
        message:
          "Must provide operation name if query contains multiple operations.",
        location: undefined,
        path: undefined,
      },
    ]);
  });

  test("return unknown errors if operation name does not match", () => {
    expect(validateOperationName(undefined, "Invalid")).toEqual([
      {
        message: 'Unknown operation named "Invalid".',
        location: undefined,
        path: undefined,
      },
    ]);
  });
});
