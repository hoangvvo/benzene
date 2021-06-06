import { parseGraphQLBody } from "../src/utils";

test("parses application/graphql+json", () => {
  expect(
    parseGraphQLBody(
      `{"query":"query test { test }"}`,
      "application/graphql+json"
    )
  ).toEqual({ query: "query test { test }" });
  expect(
    parseGraphQLBody(
      `{"query":"query test { test }"}`,
      "application/graphql+json; charset=utf-8"
    )
  ).toEqual({ query: "query test { test }" });
});

test("throws errors on invalid json for application/graphql+json", () => {
  expect(() => parseGraphQLBody("test", "application/graphql+json")).toThrow(
    "POST body sent invalid JSON."
  );
});

test("parses application/json (legacy)", () => {
  expect(
    parseGraphQLBody(`{"query":"query test { test }"}`, "application/json")
  ).toEqual({ query: "query test { test }" });
  expect(
    parseGraphQLBody(
      `{"query":"query test { test }"}`,
      "application/json; charset=utf-8"
    )
  ).toEqual({ query: "query test { test }" });
});

test("throws errors on invalid json for application/json (legacy)", () => {
  expect(() => parseGraphQLBody("test", "application/json")).toThrow(
    "POST body sent invalid JSON."
  );
});

test("parses application/graphql", () => {
  expect(
    parseGraphQLBody(`query test { test }`, "application/graphql")
  ).toEqual({
    query: `query test { test }`,
  });
});

test("does not parse on unrecognized or missing content-type", () => {
  expect(parseGraphQLBody(`query test { test }`, undefined)).toBeNull();
  expect(parseGraphQLBody(`query test { test }`, "")).toBeNull();
  expect(parseGraphQLBody(`query test { test }`, "wut")).toBeNull();
});
