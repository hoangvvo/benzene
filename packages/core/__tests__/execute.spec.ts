import { parse } from "graphql";
import Benzene from "../src/core";
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
  ).toMatchObject({ data: { foo: "FooValue" } });
});

test("throws error if not providing both `compiled` and `document`", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });

  expect(() => GQL.execute({})).toThrow("Must provide document.");
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
  ).toMatchObject({
    errors: [
      {
        message:
          'Cannot query field "fooo" on type "Query". Did you mean "foo"?',
        locations: [{ line: 1, column: 9 }],
      },
    ],
  });
});
