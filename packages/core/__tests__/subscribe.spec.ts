import Benzene from "@benzene/core/src/core";
import { ExecutionResult, parse } from "graphql";
import { SimpleSchema } from "./_schema";

test("allows call without `compiled`", async () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });

  const payload = (await GQL.subscribe({
    document: parse(`subscription { bar }`),
  })) as AsyncIterableIterator<ExecutionResult>;

  expect(await payload.next()).toEqual({
    value: { data: { bar: "BarValue" } },
    done: false,
  });

  expect(await payload.next()).toEqual({
    value: undefined,
    done: true,
  });
});

test("returns errors if compilation fails", async () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });

  const payload = (await GQL.subscribe({
    document: parse(`subscription { barr }`),
  })) as ExecutionResult;

  expect(payload).toEqual({
    errors: [
      {
        message:
          'Cannot query field "barr" on type "Subscription". Did you mean "bar"?',
        locations: [{ line: 1, column: 16 }],
      },
    ],
  });
});
