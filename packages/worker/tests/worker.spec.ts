import { makeExecutableSchema } from '@graphql-tools/schema';
import * as fetch from 'node-fetch';
import { strict as assert } from 'assert';
import { HttpQueryResponse } from '@benzene/core/src';
import { GraphQL, fetchHandler } from '../src';
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import { HandlerConfig } from '../src/types';

interface FetchEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): Promise<Response>;
}

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
    testCtx: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, _args, context: { who?: string }) =>
        'Hello ' + (context.who ?? 'World'),
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
});

async function testFetch(
  request: fetch.Request,
  expected: Partial<HttpQueryResponse> | null,
  options?: HandlerConfig,
  GQLInstance = new GraphQL({ schema: TestSchema })
) {
  return new Promise((resolve, reject) => {
    const fetchEvent: FetchEvent = {
      // @ts-ignore
      request: new fetch.Request(request),
      respondWith: async (maybeResponse) => {
        const response = await maybeResponse;
        assert.strictEqual(expected.body, await response.text());
        assert.strictEqual(expected.status || 200, response.status);
        // TODO: Add headers
        resolve();
        return response;
      },
    };
    fetchHandler(GQLInstance, options)(fetchEvent);
  });
}

before(() => {
  // @ts-ignore
  global.Request = fetch.Request;
  // @ts-ignore
  global.Response = fetch.Response;
});

describe('fetchHandler', () => {
  it('handles GET request', () => {
    return testFetch(
      new fetch.Request('http://localhost/graphql?query={test}'),
      { body: JSON.stringify({ data: { test: 'Hello World' } }) }
    );
  });

  it('handles POST request', () => {
    return testFetch(
      new fetch.Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{test}' }),
      }),
      { body: JSON.stringify({ data: { test: 'Hello World' } }) }
    );
  });

  describe('resolves options.context that is', () => {
    it('an object', async () => {
      await testFetch(
        new fetch.Request('/graphql?query={testCtx}'),
        { body: `{"data":{"testCtx":"Hello Jane"}}` },
        { context: { who: 'Jane' } }
      );
    });

    it('a function', async () => {
      await testFetch(
        new fetch.Request('http://localhost/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: '{testCtx}' }),
        }),
        { body: `{"data":{"testCtx":"Hello John"}}` },
        { context: async () => ({ who: 'John' }) }
      );
    });
  });

  it('catches error thrown in context function', async () => {
    await testFetch(
      new fetch.Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{testCtx}' }),
      }),
      {
        body: `{"errors":[{"message":"Context creation failed: uh oh"}]}`,
        status: 500,
      },
      {
        context: async () => {
          throw new Error('uh oh');
        },
      }
    );
  });

  describe('When options.path is set', () => {
    const gql = new GraphQL({ schema: TestSchema });
    it('ignore requests of different path', (done) => {
      const badFetchEvent: FetchEvent = {
        // @ts-ignore
        request: new fetch.Request('http://localhost/notAPI'),
        respondWith: () => {
          throw new Error("DON'T CALL ME!!!");
        },
      };
      fetchHandler(gql, { path: '/api' })(badFetchEvent);
      done();
    });
    it('response to requests to defined path', (done) => {
      const correctFetchEvent: FetchEvent = {
        // @ts-ignore
        request: new fetch.Request('http://localhost:/api'),
        respondWith: async (maybeResponse) => {
          done();
          return maybeResponse;
        },
      };
      fetchHandler(gql, { path: '/api' })(correctFetchEvent);
    });
  });
});
