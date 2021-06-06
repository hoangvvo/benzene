import { GraphQLError } from "graphql";
import Benzene from "../src/core";
import { SimpleSchema } from "./_schema";

test("returns GraphQL result", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  expect(GQL.graphql({ source: `query { foo }` })).resolves.toEqual({
    data: {
      foo: "FooValue",
    },
  });
});

test("returns execution result if compilation fail", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
    compileQuery() {
      return { errors: [new GraphQLError("Test failure")] };
    },
  });
  expect(GQL.graphql({ source: `query { foo }` })).resolves.toEqual({
    errors: [
      {
        message: "Test failure",
      },
    ],
  });
});
