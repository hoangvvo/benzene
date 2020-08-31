import {
  GraphQLSchema,
  GraphQLArgs,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { strict as assert, deepStrictEqual } from 'assert';
import { GraphQL, FormattedExecutionResult, runHttpQuery } from '../src';
import { Config, QueryCache } from '../src/types';
import { Lru } from 'tiny-lru';

const QueryRootType = new GraphQLObjectType({
  name: 'QueryRoot',
  fields: {
    test: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, args: { who?: string }) =>
        'Hello ' + (args.who ?? 'World'),
    },
    thrower: {
      type: GraphQLString,
      resolve() {
        throw new Error('Throws!');
      },
    },
  },
});

const TestSchema = new GraphQLSchema({
  query: QueryRootType,
  mutation: new GraphQLObjectType({
    name: 'MutationRoot',
    fields: {
      writeTest: {
        type: QueryRootType,
        resolve: () => ({}),
      },
    },
  }),
});

const GQL = new GraphQL({ schema: TestSchema });

describe('GraphQL constructor', () => {
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

describe('GraphQL#graphql', () => {
  async function testGraphql(
    args: Pick<
      GraphQLArgs,
      'contextValue' | 'variableValues' | 'operationName'
    > & {
      source: string;
    },
    expected: FormattedExecutionResult,
    GQLInstance = GQL
  ) {
    const result = await GQLInstance.graphql(args);
    return deepStrictEqual(result, expected);
  }
  it('allows with query', () => {
    return testGraphql({ source: '{test}' }, { data: { test: 'Hello World' } });
  });
  it('allows with variable values', () => {
    return testGraphql(
      {
        source: 'query helloWho($who: String){ test(who: $who) }',
        variableValues: { who: 'Dolly' },
      },
      { data: { test: 'Hello Dolly' } }
    );
  });
  it('allows with operation name', () => {
    return testGraphql(
      {
        source: `
      query helloYou { test(who: "You"), ...shared }
      query helloWorld { test(who: "World"), ...shared }
      query helloDolly { test(who: "Dolly"), ...shared }
      fragment shared on QueryRoot {
        shared: test(who: "Everyone")
      }
    `,
        operationName: 'helloWorld',
      },
      {
        data: {
          test: 'Hello World',
          shared: 'Hello Everyone',
        },
      }
    );
  });
  it('reports validation errors', () => {
    return testGraphql(
      {
        source: '{ test, unknownOne, unknownTwo }',
      },
      {
        errors: [
          {
            message: 'Cannot query field "unknownOne" on type "QueryRoot".',
            locations: [{ line: 1, column: 9 }],
            path: undefined,
          },
          {
            message: 'Cannot query field "unknownTwo" on type "QueryRoot".',
            locations: [{ line: 1, column: 21 }],
            path: undefined,
          },
        ],
      }
    );
  });
  it('Errors when missing operation name', () => {
    return testGraphql(
      {
        source: `
      query TestQuery { test }
      mutation TestMutation { writeTest { test } }
    `,
      },
      {
        errors: [
          {
            locations: undefined,
            path: undefined,
            message:
              'Must provide operation name if query contains multiple operations.',
          },
        ],
      }
    );
  });

  it('Allows passing in a context', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {
            type: GraphQLString,
            resolve: (_obj, _args, context) => context,
          },
        },
      }),
    });

    return testGraphql(
      {
        source: '{ test }',
        contextValue: 'testValue',
      },
      {
        data: {
          test: 'testValue',
        },
      },
      new GraphQL({ schema })
    );
  });

  describe('allows options.rootValue', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          test: {
            type: GraphQLString,
            resolve: (obj) => obj.test,
          },
        },
      }),
    });
    const rootValue = { test: 'testValue' };
    // FIXME: need better test
    it('as an object', () => {
      return testGraphql(
        { source: 'query { test }' },
        { data: { test: 'testValue' } },
        new GraphQL({ schema, rootValue })
      );
    });
    it('as a function', () => {
      return testGraphql(
        { source: 'query { test }' },
        { data: { test: 'testValue' } },
        new GraphQL({ schema, rootValue: () => rootValue })
      );
    });
  });
});

describe('GraphQL#cache', () => {
  it('saves compiled query to cache', async () => {
    const GQL = new GraphQL({
      schema: TestSchema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    await GQL.getCachedGQL(`{ test }`);
    assert(lru.has('{ test }'));
  });
  it('uses compiled query from cache', async () => {
    const GQL = new GraphQL({
      schema: TestSchema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    lru.set('{ test }', {
      jit: {
        query: () => ({ data: { test: 'Goodbye' } }),
        stringify: JSON.stringify,
      },
      operation: 'query',
      document: '' as any,
    });

    const result = await GQL.graphql({ source: '{ test }' });
    assert.deepStrictEqual(result, { data: { test: 'Goodbye' } });
  });
  it('does not cache bad query', async () => {
    const GQL = new GraphQL({
      schema: TestSchema,
    });
    const lru: Lru<QueryCache> = (GQL as any).lru;
    await GQL.getCachedGQL('{ baddd }');
    assert(lru.has('{ baddd }') !== true);
  });
});
