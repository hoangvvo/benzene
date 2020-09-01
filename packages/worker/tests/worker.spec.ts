import { suite } from 'uvu';
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
): Promise<void> {
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

// @ts-ignore
global.Request = fetch.Request;
// @ts-ignore
global.Response = fetch.Response;

const suiteFetch = suite('fetchHandler');

suiteFetch('handles GET request', () => {
  return testFetch(new fetch.Request('http://localhost/graphql?query={test}'), {
    body: JSON.stringify({ data: { test: 'Hello World' } }),
  });
});

suiteFetch('handles POST request', () => {
  return testFetch(
    new fetch.Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{test}' }),
    }),
    { body: JSON.stringify({ data: { test: 'Hello World' } }) }
  );
});

suiteFetch('resolves options.context that is an object', async () => {
  await testFetch(
    new fetch.Request('/graphql?query={testCtx}'),
    { body: `{"data":{"testCtx":"Hello Jane"}}` },
    { context: { who: 'Jane' } }
  );
});

suiteFetch('resolves options.context that is a function', async () => {
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

suiteFetch('catches error thrown in context function', async () => {
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

suiteFetch('Ignore requests of different to options.path', () => {
  const badFetchEvent: FetchEvent = {
    // @ts-ignore
    request: new fetch.Request('http://localhost/notAPI'),
    respondWith: () => {
      throw new Error("DON'T CALL ME!!!");
    },
  };
  fetchHandler(new GraphQL({ schema: TestSchema }), { path: '/api' })(
    badFetchEvent
  );
});
suiteFetch('Respond to requests to options.path', (done) => {
  return new Promise((resolve) => {
    const correctFetchEvent: FetchEvent = {
      // @ts-ignore
      request: new fetch.Request('http://localhost:/api'),
      respondWith: async (maybeResponse) => {
        resolve();
        return maybeResponse;
      },
    };
    fetchHandler(new GraphQL({ schema: TestSchema }), { path: '/api' })(
      correctFetchEvent
    );
  });
});

suiteFetch.run();
