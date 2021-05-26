import Benzene from "@benzene/core/src/core";
import { makeCompileQuery } from "@benzene/core/src/utils";
import { GraphQLSchema } from "graphql";
import { SimpleSchema } from "./_schema";

test("throws if initializing instance with no option", () => {
  expect(() => {
    // @ts-expect-error
    new Benzene();
  }).toThrowError("GQL must be initialized with options");
});

test("throws if schema is invalid", () => {
  expect(() => {
    new Benzene({
      // @ts-ignore
      schema: new GraphQLSchema({ directives: [null] }),
    });
  }).toThrow();
});

test("defaults to graphql-js makeCompileQuery() with warning", () => {
  const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
  // @ts-ignore
  expect(new Benzene({ schema: SimpleSchema }).compileQuery.toString()).toEqual(
    makeCompileQuery().toString()
  );
  expect(console.warn)
    .toHaveBeenCalledWith(`The default GraphQL implementation of Benzene has been changed from graphql-jit to graphql-js.
To remove this message, explicitly specify the desired runtime.
Learn more at: https://benzene.vercel.app/reference/runtime#built-in-implementations.`);
  consoleSpy.mockClear();
});
