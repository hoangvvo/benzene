// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { suite } from './uvu';
import assert from './uvu/assert';
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from './graphql';
import { Benzene, HTTPResponse, runHttpQuery } from '../src';

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

const GQL = new Benzene({ schema: TestSchema });

function stringifyURLParams(urlParams?: { [param: string]: string }): string {
  return new URLSearchParams(urlParams).toString();
}

export async function httpTest(
  httpParams: {
    method: string;
    body?: string | any;
    queryParams?: { [key: string]: string };
    context?: any;
    headers?: Record<string, string>;
    stringifyBody?: boolean;
  },
  expected: Partial<HTTPResponse>,
  GQLInstance = GQL
) {
  expected.status = expected.status || 200;
  expected.headers = expected.headers || { 'content-type': 'application/json' };

  assert.equal(
    await runHttpQuery(GQLInstance, {
      body:
        typeof httpParams.body === 'object' &&
        httpParams.stringifyBody !== false
          ? JSON.stringify(httpParams.body)
          : httpParams.body,
      queryParams: httpParams.queryParams || null,
      headers: httpParams.headers || {
        'content-type':
          typeof httpParams.body === 'object' ? 'application/json' : '',
      },
      context: httpParams.context,
      httpMethod: httpParams.method,
    }),
    expected
  );
}

const suiteGet = suite('GET functionality');

suiteGet('allows GET with query param', () => {
  return httpTest(
    { method: 'GET', queryParams: { query: '{test}' } },
    {
      payload: { data: { test: 'Hello World' } },
    }
  );
});

suiteGet('allows GET with variable values', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: 'query helloWho($who: String){ test(who: $who) }',
        variables: JSON.stringify({ who: 'Dolly' }),
      },
    },
    { payload: { data: { test: 'Hello Dolly' } } }
  );
});

suiteGet('allows GET with operation name', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: `
        query helloYou { test(who: "You"), ...shared }
        query helloWorld { test(who: "World"), ...shared }
        query helloDolly { test(who: "Dolly"), ...shared }
        fragment shared on QueryRoot {
          shared: test(who: "Everyone")
        }
      `,
        operationName: 'helloWorld',
      },
    },
    {
      payload: {
        data: {
          test: 'Hello World',
          shared: 'Hello Everyone',
        },
      },
    }
  );
});

suiteGet('Reports validation errors', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{ test, unknownOne, unknownTwo }',
      },
    },
    {
      payload: {
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
      },
      status: 400,
    }
  );
});

suiteGet('Errors when missing operation name', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: `
          query TestQuery { test }
          mutation TestMutation { writeTest { test } }
        `,
      },
    },
    {
      status: 400,
      payload: {
        errors: [
          {
            message:
              'Must provide operation name if query contains multiple operations.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteGet('Errors when sending a mutation via GET', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: 'mutation TestMutation { writeTest { test } }',
      },
    },
    {
      status: 405,
      payload: {
        errors: [
          {
            message:
              'Can only perform a mutation operation from a POST request.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteGet('Errors when selecting a mutation within a GET', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        operationName: 'TestMutation',
        query: `
            query TestQuery { test }
            mutation TestMutation { writeTest { test } }
          `,
      },
    },
    {
      status: 405,
      payload: {
        errors: [
          {
            message:
              'Can only perform a mutation operation from a POST request.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteGet('Allows a mutation to exist within a GET', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        operationName: 'TestQuery',
        query: `
          mutation TestMutation { writeTest { test } }
          query TestQuery { test }
        `,
      },
    },
    {
      payload: {
        data: {
          test: 'Hello World',
        },
      },
    }
  );
});

// Allows passing in a fieldResolve
// Allows passing in a typeResolver

suiteGet('Allows passing in a context', async () => {
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

  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{ test }',
      },
      context: 'testValue',
    },
    {
      payload: {
        data: {
          test: 'testValue',
        },
      },
    },
    new Benzene({ schema })
  );
});

suiteGet.run();

const suitePost = suite('POST functionality');

suitePost('allows POST with JSON encoding', async () => {
  return httpTest(
    { method: 'POST', body: { query: '{test}' } },
    { payload: { data: { test: 'Hello World' } } }
  );
});

suitePost('alows POST with JSON encoding with additional directives', () => {
  return httpTest(
    {
      method: 'POST',
      body: { query: '{test}' },
      headers: {
        'content-type': 'application/json; charset=UTF-8',
      },
    },
    { payload: { data: { test: 'Hello World' } } }
  );
});

suitePost('Allows sending a mutation via POST', async () => {
  return httpTest(
    {
      method: 'POST',
      body: { query: 'mutation TestMutation { writeTest { test } }' },
    },
    { payload: { data: { writeTest: { test: 'Hello World' } } } }
  );
});

suitePost('Allows POST with url encoding', async () => {
  return httpTest(
    {
      method: 'POST',
      body: stringifyURLParams({ query: '{test}' }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
    { payload: { data: { test: 'Hello World' } } }
  );
});

// supports POST JSON query with string variables

suitePost('supports POST JSON query with JSON variables', async () => {
  return httpTest(
    {
      method: 'POST',
      body: {
        query: 'query helloWho($who: String){ test(who: $who) }',
        variables: { who: 'Dolly' },
      },
    },
    {
      payload: { data: { test: 'Hello Dolly' } },
    }
  );
});

// supports POST url encoded query with string variables

suitePost('supports POST JSON query with GET variable values', () => {
  return httpTest(
    {
      method: 'POST',
      queryParams: {
        variables: JSON.stringify({ who: 'Dolly' }),
      },
      body: { query: 'query helloWho($who: String){ test(who: $who) }' },
    },
    {
      payload: { data: { test: 'Hello Dolly' } },
    }
  );
});

suitePost('supports POST url encoded query with GET variable values', () => {
  return httpTest(
    {
      method: 'POST',
      queryParams: {
        variables: JSON.stringify({ who: 'Dolly' }),
      },
      body: stringifyURLParams({
        query: 'query helloWho($who: String){ test(who: $who) }',
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
    { payload: { data: { test: 'Hello Dolly' } } }
  );
});

suitePost('supports POST raw text query with GET variable values', () => {
  return httpTest(
    {
      method: 'POST',
      queryParams: {
        variables: JSON.stringify({ who: 'Dolly' }),
      },
      body: stringifyURLParams({
        query: 'query helloWho($who: String){ test(who: $who) }',
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
    { payload: { data: { test: 'Hello Dolly' } } }
  );
});

suitePost('allows POST with operation name', async () => {
  return httpTest(
    {
      method: 'POST',
      body: {
        query: `
            query helloYou { test(who: "You"), ...shared }
            query helloWorld { test(who: "World"), ...shared }
            query helloDolly { test(who: "Dolly"), ...shared }
            fragment shared on QueryRoot {
              shared: test(who: "Everyone")
            }
          `,
        operationName: 'helloWorld',
      },
    },
    {
      payload: {
        data: {
          test: 'Hello World',
          shared: 'Hello Everyone',
        },
      },
    }
  );
});

suitePost('allows POST with GET operation name', async () => {
  return httpTest(
    {
      method: 'POST',
      queryParams: {
        operationName: 'helloWorld',
      },
      body: `
      query helloYou { test(who: "You"), ...shared }
      query helloWorld { test(who: "World"), ...shared }
      query helloDolly { test(who: "Dolly"), ...shared }
      fragment shared on QueryRoot {
        shared: test(who: "Everyone")
      }
    `,
      headers: { 'content-type': 'application/graphql' },
    },
    {
      payload: {
        data: {
          test: 'Hello World',
          shared: 'Hello Everyone',
        },
      },
    }
  );
});

// allows other UTF charsets
// allows deflated POST bodies

suitePost('allows for pre-parsed POST bodies', () => {
  // TODO: More illustrative test
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'QueryRoot',
      fields: {
        test: {
          type: GraphQLString,
          resolve: (obj, variables, context) => 'test',
        },
      },
    }),
  });

  return httpTest(
    {
      method: 'POST',
      body: { query: 'query { test }' },
      stringifyBody: false,
    },
    { payload: { data: { test: 'test' } } },
    new Benzene({ schema })
  );
});
// allows for pre-parsed POST bodies
// allows for pre-parsed POST using application/graphql
// does not accept unknown pre-parsed POST string
// does not accept unknown pre-parsed POST raw Buffer

// will send request and response when using thunk

suitePost.run();

const suiteError = suite('Error handling functionality');

suiteError('handles field errors caught by GraphQL', async () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{thrower}',
      },
    },
    {
      status: 200,
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }],
            path: ['thrower'],
          },
        ],
      },
    }
  );
});

// handles query errors from non-null top field errors (graphql-jit seems to fix this behavior)

suiteError('allows for custom error formatting to sanitize', () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{thrower}',
      },
    },
    {
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: 'Custom error format: Throws!',
          },
        ],
      },
    },
    new Benzene({
      schema: TestSchema,
      formatError(error) {
        return { message: 'Custom error format: ' + error.message };
      },
    })
  );
});

suiteError('allows for custom error formatting to elaborate', async () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{thrower}',
      },
    },
    {
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: 'Throws!',
            locations: [{ line: 1, column: 2 }],
            // @ts-expect-error
            stack: 'Stack trace',
          },
        ],
      },
    },
    new Benzene({
      schema: TestSchema,
      formatError(error) {
        return {
          message: error.message,
          locations: error.locations,
          stack: 'Stack trace',
        };
      },
    })
  );
});

suiteError('handles syntax errors caught by GraphQL', async () => {
  return httpTest(
    {
      method: 'GET',
      queryParams: {
        query: 'syntax_error',
      },
    },
    {
      status: 400,
      payload: {
        errors: [
          {
            message: 'Syntax Error: Unexpected Name "syntax_error".',
            locations: [{ line: 1, column: 1 }],
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteError('handles errors caused by a lack of query', async () => {
  return httpTest(
    { method: 'GET' },
    {
      status: 400,
      payload: {
        errors: [
          {
            message: 'Must provide query string.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

// handles invalid JSON bodies
suiteError('handles incomplete JSON bodies', async () => {
  return httpTest(
    {
      method: 'POST',
      body: '{"query":',
      headers: { 'content-type': 'application/json' },
    },
    {
      status: 400,
      payload: {
        errors: [
          {
            message: 'POST body sent invalid JSON.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteError('handles plain POST text', async () => {
  return httpTest(
    {
      method: 'POST',
      queryParams: {
        variables: JSON.stringify({ who: 'Dolly' }),
      },
      body: 'query helloWho($who: String){ test(who: $who) }',
      headers: { 'content-type': 'text/plain' },
    },
    {
      status: 400,
      payload: {
        errors: [
          {
            message: 'Must provide query string.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

// handles unsupported charset
// handles unsupported utf charset
// handles invalid body
// handles poorly formed variables
// allows for custom error formatting of poorly formed requests
// allows for custom error formatting of poorly formed requests

suiteError('handles invalid variables', async () => {
  return httpTest(
    {
      method: 'POST',
      body: {
        query: 'query helloWho($who: String){ test(who: $who) }',
        variables: { who: ['John', 'Jane'] },
      },
    },
    {
      status: 200, // graphql-express uses 500
      payload: {
        errors: [
          {
            message:
              'Variable "$who" got invalid value ["John", "Jane"]; Expected type String; String cannot represent a non string value: ["John", "Jane"]',
            locations: [{ line: 1, column: 16 }],
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteError('handles unsupported HTTP methods', async () => {
  return httpTest(
    { method: 'PUT', queryParams: { query: '{test}' } },
    {
      status: 405,
      payload: {
        errors: [
          {
            message: 'GraphQL only supports GET and POST requests.',
            locations: undefined,
            path: undefined,
          },
        ],
      },
    }
  );
});

suiteError.run();

// Custom validate function
// Custom validation rules
// Custom execute
// Custom parse function
// Custom result extension
