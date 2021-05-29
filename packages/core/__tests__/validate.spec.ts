import Benzene from "@benzene/core/src/core";
import { GraphQLError, validate, ValidationRule } from "graphql";
import { TestSchema } from "./_schema";

test("defaults to validate function", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  expect(GQL.validateFn).toBe(validate);
});

test("allows custom validate function", async () => {
  const validateFn = jest.fn(() => [new GraphQLError("Validate error")]);
  const GQL = new Benzene({
    schema: TestSchema,
    validateFn,
  });
  expect(GQL.validateFn).toBe(validateFn);
  expect(
    await GQL.graphql({
      source: `{ test }`,
    })
  ).toEqual({
    errors: [{ message: "Validate error" }],
  });

  expect(validateFn).toHaveBeenCalled();
});

test("allows custom validation rules", async () => {
  const AlwaysInvalidRule: ValidationRule = (context) => {
    return {
      Document() {
        context.reportError(
          new GraphQLError("AlwaysInvalidRule was really invalid!")
        );
      },
    };
  };
  const GQL = new Benzene({
    schema: TestSchema,
    validationRules: [AlwaysInvalidRule],
  });
  expect(GQL.validationRules).toEqual([AlwaysInvalidRule]);
  expect(
    await GQL.graphql({
      source: `{ test }`,
    })
  ).toEqual({
    errors: [{ message: "AlwaysInvalidRule was really invalid!" }],
  });
});
