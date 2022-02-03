import { GraphQLError, validate, ValidationRule } from "graphql";
import Benzene from "../src/core";
import { TestSchema } from "./_schema";

test("defaults to validate function", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  // @ts-ignore
  expect(GQL.validateFn).toBe(validate);
});

test("allows custom validate function", async () => {
  const validateFn = jest.fn(() => [new GraphQLError("Validate error")]);
  const GQL = new Benzene({
    schema: TestSchema,
    validateFn,
  });
  // @ts-ignore
  expect(GQL.validateFn).toBe(validateFn);
  expect(
    await GQL.graphql({
      source: `{ test }`,
    })
  ).toMatchObject({
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
  // @ts-ignore
  expect(GQL.validationRules).toEqual([AlwaysInvalidRule]);
  expect(
    await GQL.graphql({
      source: `{ test }`,
    })
  ).toMatchObject({
    errors: [{ message: "AlwaysInvalidRule was really invalid!" }],
  });
});
