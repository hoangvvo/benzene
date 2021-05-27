import Benzene from "@benzene/core/src/core";
import { QueryCache } from "@benzene/core/src/types";
import { Lru } from "tiny-lru";
import { TestSchema } from "./_schema";

test("saves compiled query to cache", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  const cached = (await GQL.getCached(`{ test }`)) as QueryCache;
  expect(typeof cached.document).toBe("object");
  expect(typeof cached.compiled).toBe("object");
  expect(typeof cached.operation).toBe("string");
  expect(lru.get("{ test }")).toBe(cached);
});

test("uses compiled query from cache", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  lru.set("{ test }", {
    // @ts-ignore
    compiled: {
      execute: () => ({ data: { test: "Goodbye" } }),
      stringify: JSON.stringify,
    },
    operation: "query",
    document: "" as any,
  });

  const result = await GQL.graphql({ source: "{ test }" });
  expect(result).toEqual({ data: { test: "Goodbye" } });
});

test("returns and does not cache syntax-errored query", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  const result = await GQL.getCached("{{");
  expect(result).toEqual({
    errors: [
      {
        message: 'Syntax Error: Expected Name, found "{".',
        locations: [{ line: 1, column: 2 }],
      },
    ],
  });
  expect(lru.has("{{")).toBe(false);
});

test("returns and does not cache invalid query", async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  const result = await GQL.getCached("{ baddd }");
  expect(result).toEqual({
    errors: [
      {
        message: 'Cannot query field "baddd" on type "QueryRoot".',
        locations: [{ line: 1, column: 3 }],
      },
    ],
  });
  expect(lru.has("{ baddd }")).toBe(false);
});
