import Benzene from "@benzene/core/src/core";
import { parse } from "graphql";
import { SimpleSchema } from "./_schema";

test("allows call without `compiled`", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  const query = `query { foo }`;
  const document = parse(query);

  expect(
    GQL.execute({
      document,
    })
  ).toEqual({ data: { foo: "FooValue" } });
});

test("returns errors if compilation fails", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  const query = `query { fooo }`;
  const document = parse(query);

  expect(
    GQL.execute({
      document,
    })
  ).toEqual({
    errors: [
      {
        message:
          'Cannot query field "fooo" on type "Query". Did you mean "foo"?',
        locations: [{ line: 1, column: 9 }],
      },
    ],
  });
});
