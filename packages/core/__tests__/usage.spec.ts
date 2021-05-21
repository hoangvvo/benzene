import { GraphQLSchema } from "graphql";
import Benzene from "../src/core";
import { makeCompileQuery } from "../src/runtimes/js";
import { SimpleSchema } from "./utils/schema";

test("throws if initializing instance with no option", () => {
  expect(() => {
    // @ts-expect-error
    new Benzene();
  }).toThrowError("GQL must be initialized with options");
});

test("throws if schema is invalid", () => {
  expect(() => {
    new Benzene({
      schema: new GraphQLSchema({ directives: [null] }),
    });
  }).toThrow();
});

test("defaults to graphql-js makeCompileQuery()", () => {
  // @ts-ignore
  expect(new Benzene({ schema: SimpleSchema }).compileQuery.toString()).toEqual(
    makeCompileQuery().toString()
  );
});
