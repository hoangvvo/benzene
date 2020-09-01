import {
  GraphQLArgs,
  FormattedExecutionResult,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { deepStrictEqual } from 'assert';
import { GraphQL } from '../src';
import { TestSchema } from './schema.spec';

const GQL = new GraphQL({ schema: TestSchema });

describe('GraphQL#graphql', () => {
  async function testGraphql(
    args: Pick<
      GraphQLArgs,
      'contextValue' | 'variableValues' | 'operationName' | 'rootValue'
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

  it('allows passing in a rootValue', () => {
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
    return testGraphql(
      { source: 'query { test }', rootValue },
      { data: { test: 'testValue' } },
      new GraphQL({ schema })
    );
  });
});
