import { GraphQLSchema } from "graphql";
import Benzene from "../src/core";

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
