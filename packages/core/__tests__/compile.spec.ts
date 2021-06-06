import Benzene from "@benzene/core/src/core";
import { CompiledResult } from "@benzene/core/src/types";
import { parse, print } from "graphql";
import { SimpleSchema } from "./_schema";

test("allows passing in query", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  const query = `query { foo }`;

  const result = GQL.compile(query) as CompiledResult;
  expect(Object.keys(result)).toEqual([
    "execute",
    "subscribe",
    "document",
    "operation",
  ]);

  // @ts-ignore
  expect(GQL.lru.get(query)).toBe(result);
});

test("allows passing in DocumentNode", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });
  const query = `query { foo }`;
  const document = parse(query);

  const result = GQL.compile(document) as CompiledResult;
  expect(Object.keys(result)).toEqual([
    "execute",
    "subscribe",
    "document",
    "operation",
  ]);

  expect(result.document).toEqual(document);

  // @ts-ignore
  expect(GQL.lru.get(print(document))).toBe(result);
});

test("throws errors if neither query not DocumentNode is provided", () => {
  const GQL = new Benzene({
    schema: SimpleSchema,
  });

  expect(() => {
    // @ts-ignore
    GQL.compile(undefined);
  }).toThrow("Must provide document.");
});
