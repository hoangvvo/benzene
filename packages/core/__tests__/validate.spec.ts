import Benzene from "@benzene/core/src/core";
import { GraphQLError } from "graphql";
import { TestSchema } from "./_schema";

test("allows custom validate function", async () => {
  const validateFn = jest.fn(() => [new GraphQLError("Validate error")]);

  expect(
    await new Benzene({
      schema: TestSchema,
      validateFn,
    }).graphql({
      source: `{ test }`,
    })
  ).toEqual({
    errors: [{ message: "Validate error" }],
  });

  expect(validateFn).toHaveBeenCalled();
});
