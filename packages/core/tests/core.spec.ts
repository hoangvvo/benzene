import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema, GraphQLArgs } from 'graphql';
import { strict as assert, deepStrictEqual } from 'assert';
import {
  GraphQL,
  GraphQLParams,
  FormattedExecutionResult,
  runHttpQuery,
} from '../src';
import { Config, QueryCache, HttpQueryRequest } from '../src/types';
import { Lru } from 'tiny-lru';

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello(who: String!): String
      helloWorld: String
      asyncHelloWorld: String
      helloRoot: String
      throwMe: String
      asyncThrowMe: String
      dangerousThrow: String
      helloContext: String
    }
    type Mutation {
      sayHello(who: String!): String
    }
  `,
  resolvers: {
    Query: {
      hello: (obj, args) => args.who,
      asyncHelloWorld: async (obj, args) => 'world',
      helloWorld: () => 'world',
      helloRoot: ({ name }) => name,
      throwMe: () => {
        throw new Error('im thrown');
      },
      asyncThrowMe: async () => {
        throw new Error('im thrown');
      },
      dangerousThrow: () => {
        const err = new Error('oh no');
        (err as any).systemSecret = '123';
        throw err;
      },
      helloContext: (obj, args, context) => 'Hello ' + context.robot,
    },
    Mutation: {
      sayHello: (obj, args) => 'Hello ' + args.who,
    },
  },
});

describe('core: GraphQL', () => {
  it('throws if initializing instance with no option', () => {
    assert.throws(() => {
      // @ts-expect-error
      new GraphQL();
    });
  });
  it('throws if schema is invalid', () => {
    assert.throws(() => {
      new GraphQL({
        schema: new GraphQLSchema({ directives: [null] }),
      });
    });
  });
});

describe('core: runHttpQuery', () => {
  type ExpectedBodyFn = (str: string) => void;

  async function testHttp(
    queryRequest: GraphQLParams & {
      context?: Record<string, any>;
      httpMethod?: string;
    },
    expected: {
      status?: number;
      body: string | ExpectedBodyFn;
      headers?: Record<string, string>;
    },
    options?: Partial<Config>
  ) {
    if (!queryRequest.context) queryRequest.context = {};
    if (!queryRequest.httpMethod) queryRequest.httpMethod = 'POST';

    const result = await runHttpQuery(
      new GraphQL({
        schema,
        ...options,
      }),
      queryRequest as HttpQueryRequest
    );

    if (typeof expected.body === 'function') {
      // check using custom function
      expected.body(result.body);
      // already check body, no longer need
      delete expected.body;
      delete result.body;
    }

    deepStrictEqual(
      {
        headers: { 'content-type': 'application/json' },
        status: 200,
        ...expected,
      },
      result
    );
  }

  it('allows simple request', () => {
    return testHttp(
      { query: 'query { helloWorld }' },
      { body: `{"data":{"helloWorld":"world"}}` }
    );
  });
  it('allows simple request with async resolver', () => {
    return testHttp(
      { query: 'query { asyncHelloWorld }' },
      { body: `{"data":{"asyncHelloWorld":"world"}}` }
    );
  });
  it('allows request with variables', () => {
    return testHttp(
      {
        query: 'query helloWho($who: String!) { hello(who: $who) }',
        variables: { who: 'John' },
      },
      { body: `{"data":{"hello":"John"}}` }
    );
  });
  it('errors when missing operation name', async () => {
    return testHttp(
      {
        query: `query helloJohn { hello(who: "John") }
      query helloJane { hello(who: "Jane") }
      `,
      },
      {
        status: 400,
        body:
          '{"errors":[{"message":"Must provide operation name if query contains multiple operations."}]}',
      }
    );
  });
  it('allows request with operation name', () => {
    return testHttp(
      {
        query: `query helloJohn { hello(who: "John") }
        query helloJane { hello(who: "Jane") }
        `,
        operationName: 'helloJane',
      },
      { body: '{"data":{"hello":"Jane"}}' }
    );
  });
  it('errors when missing query', () => {
    return testHttp(
      { context: {} },
      {
        status: 400,
        body: 'Must provide query string.',
        headers: { 'content-type': 'text/plain' },
      }
    );
  });
  it('errors when sending a mutation via GET request', () => {
    return testHttp(
      {
        query: `mutation sayHelloWho { sayHello(who: "Jane") }`,
        httpMethod: 'GET',
      },
      {
        status: 405,
        body: 'Operation mutation cannot be performed via a GET request.',
        headers: { 'content-type': 'text/plain' },
      }
    );
  });
  it('errors when sending via neither GET nor POST request', () => {
    return testHttp(
      {
        query: `mutation sayHelloWho { sayHello(who: "Jane") }`,
        httpMethod: 'PUT',
      },
      {
        status: 405,
        body: 'GraphQL only supports GET and POST requests.',
        headers: { 'content-type': 'text/plain' },
      }
    );
  });
  it('allows context value', () => {
    return testHttp(
      {
        query: `{ helloContext }`,
        context: {
          robot: 'R2-D2',
        },
      },
      { body: '{"data":{"helloContext":"Hello R2-D2"}}' }
    );
  });
  describe('allows options.rootValue', () => {
    const rootValue = {
      name: 'Luke',
    };
    // FIXME: need better test
    it('as an object', () => {
      return testHttp(
        { query: 'query { helloRoot }', httpMethod: 'GET' },
        { body: '{"data":{"helloRoot":"Luke"}}' },
        { rootValue }
      );
    });
    it('as a function', () => {
      return testHttp(
        { query: 'query { helloRoot }', httpMethod: 'GET' },
        { body: '{"data":{"helloRoot":"Luke"}}' },
        { rootValue: () => rootValue }
      );
    });
  });
  describe('errors on validation errors', () => {
    it('when there are unknown fields', () => {
      return testHttp(
        { query: `query { xinchao, hola, hello }` },
        {
          status: 400,
          body: (str) => {
            const {
              errors: [err1, err2],
            } = JSON.parse(str);
            assert.deepStrictEqual(
              err1.message,
              `Cannot query field "xinchao" on type "Query".`
            );
            assert.deepStrictEqual(
              err2.message,
              `Cannot query field "hola" on type "Query".`
            );
          },
        }
      );
    });
    it('when missing required arguments', () => {
      return testHttp(
        { query: `query { hello }` },
        {
          status: 400,
          body: (str) => {
            const {
              errors: [err],
            } = JSON.parse(str);
            assert.deepStrictEqual(
              err.message,
              `Field "hello" argument "who" of type "String!" is required, but it was not provided.`
            );
          },
        }
      );
    });
    it('when arguments have incorrect types', async () => {
      return testHttp(
        {
          query: 'query helloWho($who: String!) { hello(who: $who) }',
          variables: { who: 12 },
        },
        {
          status: 200,
          body: (str) => {
            const {
              errors: [err],
            } = JSON.parse(str);
            assert.deepStrictEqual(
              err.message,
              `Variable "$who" got invalid value 12; Expected type String; String cannot represent a non string value: 12`
            );
          },
        }
      );
    });
    it('when query is malformed', () => {
      return testHttp(
        { query: 'query { helloWorld ' },
        {
          status: 400,
          body: (str) => {
            const {
              errors: [err],
            } = JSON.parse(str);
            assert.deepStrictEqual(
              err.message,
              `Syntax Error: Expected Name, found <EOF>.`
            );
          },
        }
      );
    });
  });
  it('catches error in resolver function', () => {
    return testHttp(
      { query: 'query { throwMe }' },
      {
        body: (str) => {
          const {
            errors: [err],
          } = JSON.parse(str);
          assert.deepStrictEqual(err.message, 'im thrown');
        },
      }
    );
  });
  it('catches error in async resolver function', () => {
    return testHttp(
      { query: 'query { asyncThrowMe }' },
      {
        body: (str) => {
          const {
            errors: [err],
          } = JSON.parse(str);
          assert.deepStrictEqual(err.message, 'im thrown');
        },
      }
    );
  });
  describe('allows format errors', () => {
    it('using default formatError', () => {
      return testHttp(
        { query: 'query { dangerousThrow }' },
        {
          body: (str) => {
            const {
              errors: [err],
            } = JSON.parse(str);
            assert.deepStrictEqual(err.message, 'oh no');
            // formatError will filter trivial prop
            assert.deepStrictEqual(err.systemSecret, undefined);
          },
        }
      );
    });
    it('using custom formatError', () => {
      return testHttp(
        { query: 'query { dangerousThrow }' },
        {
          body: (str) => {
            const {
              errors: [err],
            } = JSON.parse(str);
            assert.deepStrictEqual(err.message, 'Internal server error');
          },
        },
        {
          formatError: (err) => {
            return { message: 'Internal server error' };
          },
        }
      );
    });
  });
  it('saves compiled query to cache', async () => {
    const GQL = new GraphQL({
      schema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    await runHttpQuery(GQL, {
      query: '{ helloWorld }',
      httpMethod: 'GET',
      context: {},
    });
    assert(lru.has('{ helloWorld }'));
  });
  it('uses compiled query from cache', async () => {
    const GQL = new GraphQL({
      schema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    lru.set('{ helloWorld }', {
      jit: {
        query: () => ({ data: { cached: true } }),
        stringify: JSON.stringify,
      },
      operation: 'query',
      document: '' as any,
    });
    const { body } = await runHttpQuery(GQL, {
      query: '{ helloWorld }',
      httpMethod: 'GET',
      context: {},
    });
    assert.deepStrictEqual(body, JSON.stringify({ data: { cached: true } }));
  });
  it('does not cache bad query', async () => {
    const GQL = new GraphQL({
      schema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    await runHttpQuery(GQL, {
      query: '{ watt }',
      httpMethod: 'GET',
      context: {},
    });
    assert(lru.has('{ watt }') !== true);
  });
});

describe('core: GraphQL#graphql', () => {
  type ExpectedResultFn = (res: FormattedExecutionResult) => void;
  async function testGQL(
    args: Pick<
      GraphQLArgs,
      'contextValue' | 'variableValues' | 'operationName'
    > & {
      source: string;
    },
    expected: FormattedExecutionResult | ExpectedResultFn,
    options?: Partial<Config>
  ) {
    const result = await new GraphQL({
      schema,
      ...options,
    }).graphql(args);
    if (typeof expected === 'function') return expected(result);
    return deepStrictEqual(result, expected);
  }
  it('allows simple execution', () => {
    return testGQL(
      { source: 'query { helloWorld }' },
      { data: { helloWorld: 'world' } }
    );
  });
  it('allows execution with variables', () => {
    return testGQL(
      {
        source: 'query helloWho($who: String!) { hello(who: $who) }',
        variableValues: { who: 'John' },
      },
      { data: { hello: 'John' } }
    );
  });
  it('errors when missing operation name', () => {
    return testGQL(
      {
        source: `query helloJohn { hello(who: "John") }
        query helloJane { hello(who: "Jane") }
        `,
      },
      (res) => {
        assert.deepStrictEqual(
          res.errors?.[0].message,
          'Must provide operation name if query contains multiple operations.'
        );
      }
    );
  });
  it('allows request with operation name', () => {
    return testGQL(
      {
        source: `query helloJohn { hello(who: "John") }
      query helloJane { hello(who: "Jane") }
      `,
        operationName: 'helloJane',
      },
      {
        data: { hello: 'Jane' },
      }
    );
  });
  it('allows context value', () => {
    return testGQL(
      {
        source: `{ helloContext }`,
        contextValue: {
          robot: 'R2-D2',
        },
      },
      {
        data: {
          helloContext: 'Hello R2-D2',
        },
      }
    );
  });
  describe('allows options.rootValue', () => {
    const rootValue = {
      name: 'Luke',
    };
    // FIXME: need better test
    it('as an object', () => {
      return testGQL(
        { source: 'query { helloRoot }' },
        { data: { helloRoot: 'Luke' } },
        { rootValue }
      );
    });
    it('as a function', () => {
      return testGQL(
        { source: 'query { helloRoot }' },
        { data: { helloRoot: 'Luke' } },
        { rootValue: () => rootValue }
      );
    });
  });
  describe('errors on validation errors', () => {
    it('when there are unknown fields', () => {
      return testGQL({ source: `query { xinchao, hola, hello }` }, (res) => {
        const { errors: [err1, err2] = [] } = res;
        assert.deepStrictEqual(
          err1.message,
          `Cannot query field "xinchao" on type "Query".`
        );
        assert.deepStrictEqual(
          err2.message,
          `Cannot query field "hola" on type "Query".`
        );
      });
    });
    it('when missing required arguments', () => {
      return testGQL({ source: `query { hello }` }, (res) => {
        const { errors: [err] = [] } = res;
        assert.deepStrictEqual(
          err.message,
          `Field "hello" argument "who" of type "String!" is required, but it was not provided.`
        );
      });
    });
    it('when arguments have incorrect types', async () => {
      return testGQL(
        {
          source: 'query helloWho($who: String!) { hello(who: $who) }',
          variableValues: { who: 12 },
        },
        (res) => {
          const { errors: [err] = [] } = res;
          assert.deepStrictEqual(
            err.message,
            `Variable "$who" got invalid value 12; Expected type String; String cannot represent a non string value: 12`
          );
        }
      );
    });
    it('when query is malformed', () => {
      return testGQL({ source: 'query { helloWorld ' }, (res) => {
        const { errors: [err] = [] } = res;
        assert.deepStrictEqual(
          err.message,
          `Syntax Error: Expected Name, found <EOF>.`
        );
      });
    });
  });
  it('catches error in resolver function', () => {
    return testGQL({ source: 'query { asyncThrowMe }' }, (res) => {
      const { errors: [err] = [] } = res;
      assert.deepStrictEqual(err.message, 'im thrown');
    });
  });
  describe('allows format errors', () => {
    it('using default formatError', () => {
      return testGQL({ source: 'query { dangerousThrow }' }, (res) => {
        const { errors: [err] = [] } = res;
        assert.deepStrictEqual(err.message, 'oh no');
        // formatError will filter trivial prop
        // @ts-expect-error
        assert.deepStrictEqual(err.systemSecret, undefined);
      });
    });
    it('using custom formatError', () => {
      return testGQL(
        { source: 'query { dangerousThrow }' },
        (res) => {
          const { errors: [err] = [] } = res;
          assert.deepStrictEqual(err.message, 'Internal server error');
        },
        {
          formatError: (err) => {
            return { message: 'Internal server error' };
          },
        }
      );
    });
  });
});
