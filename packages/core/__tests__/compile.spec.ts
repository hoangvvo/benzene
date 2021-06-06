import Benzene from "@benzene/core/src/core";
import { CompiledCache } from "@benzene/core/src/types";
import { ExecutionResult, parse, print } from "graphql";
import { SimpleSchema } from "./_schema";

test("allows passing in DocumentNode", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  const query = `query { foo }`;
  const document = parse(query);

  const result = GQL.compile(document) as CompiledCache;

  expect(result.document).toEqual(document);

  // @ts-ignore
  expect(GQL.lru.get(print(document))).toBe(result);
});

test("allows execute() without `compiled`", () => {
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

test("returns error for execute() without `compiled` failure", () => {
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

test("allows subscribe() without `compiled`", async () => {
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

test("returns error for subscribe() without `compiled` failure", async () => {
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
