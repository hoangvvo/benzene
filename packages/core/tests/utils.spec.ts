import { getGraphQLParams, parseBodyByContentType } from '../src/utils';
import { strict as assert } from 'assert';

describe('core/utils: parseBodyByContentType', () => {
  it('parses application/json properly', () => {
    assert.deepStrictEqual(
      parseBodyByContentType(
        JSON.stringify({ query: 'query { helloWorld }' }),
        'application/json '
      ),
      { query: 'query { helloWorld }' }
    );
  });
  it('parses application/graphql properly', () => {
    assert.deepStrictEqual(
      parseBodyByContentType('query { helloWorld }', 'application/graphql; '),
      { query: 'query { helloWorld }' }
    );
  });
  it('does not parse other content types', () => {
    assert.deepStrictEqual(
      parseBodyByContentType('query { helloWorld }', '???'),
      null
    );
  });
});
describe('core/utils: getGraphQLParams', () => {
  describe('gets query from', () => {
    it('queryParams', () => {
      const { query } = getGraphQLParams({
        queryParams: { query: 'ok' },
        body: null,
      });
      assert.deepStrictEqual(query, 'ok');
    });
    it('body', () => {
      const { query } = getGraphQLParams({
        queryParams: {},
        body: { query: 'ok' },
      });
      assert.deepStrictEqual(query, 'ok');
    });
  });
  describe('gets variables from', () => {
    it('queryParams', () => {
      const { variables } = getGraphQLParams({
        queryParams: { variables: `{ "ok": "no" }` },
        body: null,
      });
      assert.deepStrictEqual(variables?.ok, 'no');
    });
    it('body', () => {
      const { variables } = getGraphQLParams({
        queryParams: {},
        body: { variables: { ok: 'no' } },
      });
      assert.deepStrictEqual(variables?.ok, 'no');
    });
  });
  describe('gets operationName from', () => {
    it('queryParams', () => {
      const { operationName } = getGraphQLParams({
        queryParams: { operationName: `hey` },
        body: null,
      });
      assert.deepStrictEqual(operationName, 'hey');
    });
    it('body', () => {
      const { operationName } = getGraphQLParams({
        queryParams: {},
        body: { operationName: `hey` },
      });
      assert.deepStrictEqual(operationName, 'hey');
    });
  });
  describe('gets extensions from', () => {
    it('queryParams', () => {
      const { extensions } = getGraphQLParams({
        queryParams: { extensions: `{"ilu": 3000}` },
        body: null,
      });
      assert.deepStrictEqual(extensions, { ilu: 3000 });
    });
    it('body', () => {
      const { extensions } = getGraphQLParams({
        queryParams: {},
        body: { extensions: { ilu: 3000 } },
      });
      assert.deepStrictEqual(extensions, { ilu: 3000 });
    });
  });
});
