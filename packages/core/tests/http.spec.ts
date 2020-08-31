// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { deepStrictEqual } from 'assert';
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import {
  GraphQL,
  HttpQueryResponse,
  runHttpQuery,
  FormattedExecutionResult,
} from '../src';

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

function stringifyURLParams(urlParams?: { [param: string]: string }): string {
  return new URLSearchParams(urlParams).toString();
}

async function httpTest(
  httpParams: {
    method: string;
    body?: string | any;
    queryParams?: { [key: string]: string };
    context?: any;
    headers?: Record<string, string>;
    stringifyBody?: boolean;
  },
  expected: Partial<Omit<HttpQueryResponse, 'body'>> & {
    body?: FormattedExecutionResult | string;
  },
  GQLInstance = GQL
) {
  expected.body =
    (typeof expected.body === 'object'
      ? JSON.stringify(expected.body)
      : expected.body) || '';
  expected.status = expected.status || 200;
  expected.headers = expected.headers || { 'content-type': 'application/json' };

  deepStrictEqual(
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

describe('GET functionality', () => {
  it('allows GET with query param', () => {
    return httpTest(
      { method: 'GET', queryParams: { query: '{test}' } },
      {
        body: { data: { test: 'Hello World' } },
      }
    );
  });

  it('allows GET with variable values', () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: 'query helloWho($who: String){ test(who: $who) }',
          variables: JSON.stringify({ who: 'Dolly' }),
        },
      },
      { body: { data: { test: 'Hello Dolly' } } }
    );
  });

  it('allows GET with operation name', () => {
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
        body: {
          data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
          },
        },
      }
    );
  });

  it('Reports validation errors', () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: '{ test, unknownOne, unknownTwo }',
        },
      },
      {
        body: {
          errors: [
            {
              message: 'Cannot query field "unknownOne" on type "QueryRoot".',
              locations: [{ line: 1, column: 9 }],
            },
            {
              message: 'Cannot query field "unknownTwo" on type "QueryRoot".',
              locations: [{ line: 1, column: 21 }],
            },
          ],
        },
        status: 400,
      }
    );
  });

  it('Errors when missing operation name', () => {
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
        body: {
          errors: [
            {
              message:
                'Must provide operation name if query contains multiple operations.',
            },
          ],
        },
      }
    );
  });

  it('Errors when sending a mutation via GET', () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: 'mutation TestMutation { writeTest { test } }',
        },
      },
      {
        status: 405,
        body: {
          errors: [
            {
              message:
                'Can only perform a mutation operation from a POST request.',
            },
          ],
        },
      }
    );
  });

  it('Errors when selecting a mutation within a GET', () => {
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
        body: {
          errors: [
            {
              message:
                'Can only perform a mutation operation from a POST request.',
            },
          ],
        },
      }
    );
  });

  it('Allows a mutation to exist within a GET', () => {
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
        body: {
          data: {
            test: 'Hello World',
          },
        },
      }
    );
  });

  // Allows passing in a fieldResolve
  // Allows passing in a typeResolver

  it('Allows passing in a context', async () => {
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
        body: {
          data: {
            test: 'testValue',
          },
        },
      },
      new GraphQL({ schema })
    );
  });
});

describe('POST functionality', () => {
  it('allows POST with JSON encoding', async () => {
    return httpTest(
      { method: 'POST', body: { query: '{test}' } },
      { body: { data: { test: 'Hello World' } } }
    );
  });

  it('alows POST with JSON encoding with additional directives', () => {
    return httpTest(
      {
        method: 'POST',
        body: { query: '{test}' },
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
      },
      { body: { data: { test: 'Hello World' } } }
    );
  });

  it('Allows sending a mutation via POST', async () => {
    return httpTest(
      {
        method: 'POST',
        body: { query: 'mutation TestMutation { writeTest { test } }' },
      },
      { body: { data: { writeTest: { test: 'Hello World' } } } }
    );
  });

  it('Allows POST with url encoding', async () => {
    return httpTest(
      {
        method: 'POST',
        body: stringifyURLParams({ query: '{test}' }),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      },
      { body: { data: { test: 'Hello World' } } }
    );
  });

  // supports POST JSON query with string variables

  it('supports POST JSON query with JSON variables', async () => {
    return httpTest(
      {
        method: 'POST',
        body: {
          query: 'query helloWho($who: String){ test(who: $who) }',
          variables: { who: 'Dolly' },
        },
      },
      {
        body: { data: { test: 'Hello Dolly' } },
      }
    );
  });

  // supports POST url encoded query with string variables

  it('supports POST JSON query with GET variable values', () => {
    return httpTest(
      {
        method: 'POST',
        queryParams: {
          variables: JSON.stringify({ who: 'Dolly' }),
        },
        body: { query: 'query helloWho($who: String){ test(who: $who) }' },
      },
      {
        body: { data: { test: 'Hello Dolly' } },
      }
    );
  });

  it('supports POST url encoded query with GET variable values', () => {
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
      { body: { data: { test: 'Hello Dolly' } } }
    );
  });

  it('supports POST raw text query with GET variable values', () => {
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
      { body: { data: { test: 'Hello Dolly' } } }
    );
  });

  it('allows POST with operation name', async () => {
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
        body: {
          data: {
            test: 'Hello World',
            shared: 'Hello Everyone',
          },
        },
      }
    );
  });

  it('allows POST with GET operation name', async () => {
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
        body: {
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

  it('allows for pre-parsed POST bodies', () => {
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
      { body: { data: { test: 'test' } } },
      new GraphQL({ schema })
    );
  });
  // allows for pre-parsed POST bodies
  // allows for pre-parsed POST using application/graphql
  // does not accept unknown pre-parsed POST string
  // does not accept unknown pre-parsed POST raw Buffer

  // will send request and response when using thunk
});

describe('Error handling functionality', () => {
  it('handles field errors caught by GraphQL', async () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: '{thrower}',
        },
      },
      {
        status: 200,
        body: {
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

  it('allows for custom error formatting to sanitize', () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: '{thrower}',
        },
      },
      {
        body: {
          data: { thrower: null },
          errors: [
            {
              message: 'Custom error format: Throws!',
            },
          ],
        },
      },
      new GraphQL({
        schema: TestSchema,
        formatError(error) {
          return { message: 'Custom error format: ' + error.message };
        },
      })
    );
  });

  it('allows for custom error formatting to elaborate', async () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: '{thrower}',
        },
      },
      {
        body: {
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
      new GraphQL({
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

  it('handles syntax errors caught by GraphQL', async () => {
    return httpTest(
      {
        method: 'GET',
        queryParams: {
          query: 'syntax_error',
        },
      },
      {
        status: 400,
        body: {
          errors: [
            {
              message: 'Syntax Error: Unexpected Name "syntax_error".',
              locations: [{ line: 1, column: 1 }],
            },
          ],
        },
      }
    );
  });

  it('handles errors caused by a lack of query', async () => {
    return httpTest(
      { method: 'GET' },
      {
        status: 400,
        body: {
          errors: [{ message: 'Must provide query string.' }],
        },
      }
    );
  });

  // handles invalid JSON bodies
  it('handles incomplete JSON bodies', async () => {
    return httpTest(
      {
        method: 'POST',
        body: '{"query":',
        headers: { 'content-type': 'application/json' },
      },
      {
        status: 400,
        body: {
          errors: [{ message: 'POST body sent invalid JSON.' }],
        },
      }
    );
  });

  it('handles plain POST text', async () => {
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
        body: {
          errors: [{ message: 'Must provide query string.' }],
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

  it('handles invalid variables', async () => {
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
        body: {
          errors: [
            {
              message:
                'Variable "$who" got invalid value ["John", "Jane"]; Expected type String; String cannot represent a non string value: ["John", "Jane"]',
              locations: [{ line: 1, column: 16 }],
            },
          ],
        },
      }
    );
  });

  it('handles unsupported HTTP methods', async () => {
    return httpTest(
      { method: 'PUT', queryParams: { query: '{test}' } },
      {
        status: 405,
        body: {
          errors: [{ message: 'GraphQL only supports GET and POST requests.' }],
        },
      }
    );
  });
});

// Custom validate function
// Custom validation rules
// Custom execute
// Custom parse function
// Custom result extension
