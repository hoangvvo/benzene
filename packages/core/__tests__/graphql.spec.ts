import {
  GraphQLArgs,
  FormattedExecutionResult,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import Benzene from '../src/core';
import { TestSchema } from './utils/schema';

const GQL = new Benzene({ schema: TestSchema });

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
  return expect(result).toEqual(expected);
}
test('allows with query', async () => {
  return testGraphql({ source: '{test}' }, { data: { test: 'Hello World' } });
});

test('allows with variable values', async () => {
  return testGraphql(
    {
      source: 'query helloWho($who: String){ test(who: $who) }',
      variableValues: { who: 'Dolly' },
    },
    { data: { test: 'Hello Dolly' } }
  );
});

test('allows with operation name', () => {
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

test('reports validation errors', () => {
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

test('Errors when missing operation name', () => {
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

test('Allows passing in a context', () => {
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
    new Benzene({ schema })
  );
});

test('allows passing in a rootValue', () => {
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
    new Benzene({ schema })
  );
});
