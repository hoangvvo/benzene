import { parseGraphQLBody } from '../src/utils';

test('parses application/json', () => {
  expect(
    parseGraphQLBody(`{"query":"query test { test }"}`, 'application/json')
  ).toEqual({ query: 'query test { test }' });
  expect(
    parseGraphQLBody(
      `{"query":"query test { test }"}`,
      'application/json; charset=utf-8'
    )
  ).toEqual({ query: 'query test { test }' });
});

test('errors application/json on invalid json', () => {
  expect(() => parseGraphQLBody('test', 'application/json')).toThrow(
    'POST body sent invalid JSON.'
  );
});

test('parses application/graphql', () => {
  expect(
    parseGraphQLBody(`query test { test }`, 'application/graphql')
  ).toEqual({
    query: `query test { test }`,
  });
});

test('does not parse on unrecognized or missing content-type', () => {
  expect(parseGraphQLBody(`query test { test }`, '')).toBeNull();
  expect(parseGraphQLBody(`query test { test }`, 'wut')).toBeNull();
});
