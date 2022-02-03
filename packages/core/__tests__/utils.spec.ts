import { execute, GraphQLError, parse, Source, subscribe } from "graphql";
import { CompiledQuery } from "../src/types";
import {
  formatError,
  isAsyncIterator,
  isExecutionResult,
  makeCompileQuery,
  validateOperationName,
} from "../src/utils";
import { SimpleSchema } from "./_schema";
import { dedent } from "./__testUtils__/dedent";

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
    expect(validateOperationName(undefined, null)).toMatchObject([
      {
        message:
          "Must provide operation name if query contains multiple operations.",
        // location: undefined,
        path: undefined,
      },
    ]);
  });

  test("return unknown errors if operation name does not match", () => {
    expect(validateOperationName(undefined, "Invalid")).toMatchObject([
      {
        message: 'Unknown operation named "Invalid".',
        // location: undefined,
        path: undefined,
      },
    ]);
  });
});

// Based on https://github.com/graphql/graphql-js/blob/main/src/error/__tests__/GraphQLError-test.ts#L324
describe("formatError", () => {
  it("includes path", () => {
    const error = new GraphQLError("msg", null, null, null, [
      "path",
      3,
      "to",
      "field",
    ]);

    expect(formatError(error)).toMatchObject({
      message: "msg",
      path: ["path", 3, "to", "field"],
    });
  });

  it("includes extension fields", () => {
    const error = new GraphQLError("msg", null, null, null, null, null, {
      foo: "bar",
    });

    expect(formatError(error)).toMatchObject({
      message: "msg",
      extensions: { foo: "bar" },
    });
  });

  it("can be created with the all arguments", () => {
    const source = new Source(dedent`
    {
      field
    }
`);
    const ast = parse(source);
    const operationNode = ast.definitions[0];
    const error = new GraphQLError(
      "msg",
      [operationNode],
      source,
      [6],
      ["path", 2, "a"],
      new Error("I like turtles"),
      { hee: "I like turtles" }
    );

    expect(formatError(error)).toMatchObject({
      message: "msg",
      locations: [{ column: 5, line: 2 }],
      path: ["path", 2, "a"],
      extensions: { hee: "I like turtles" },
    });
  });
});
