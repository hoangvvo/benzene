import * as fetch from 'node-fetch';
import { HTTPResponse } from '@benzene/core/src';
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import { Benzene, fetchHandler } from '../src';
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
  expected: Partial<HTTPResponse> | null,
  options?: HandlerConfig,
  GQLInstance = new Benzene({ schema: TestSchema })
): Promise<void> {
  return new Promise((resolve) => {
    const fetchEvent: FetchEvent = {
      // @ts-ignore
      request: new fetch.Request(request),
      respondWith: async (maybeResponse) => {
        const response = await maybeResponse;
        expect(await response.json()).toEqual(expected?.payload);
        expect(response.status).toEqual(expected?.status || 200);
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

test('handles GET request', () => {
  return testFetch(new fetch.Request('http://localhost/graphql?query={test}'), {
    payload: { data: { test: 'Hello World' } },
  });
});

test('handles POST request', () => {
  return testFetch(
    new fetch.Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{test}' }),
    }),
    { payload: { data: { test: 'Hello World' } } }
  );
});

test('resolves options.context that is an object', async () => {
  await testFetch(
    new fetch.Request('/graphql?query={testCtx}'),
    { payload: { data: { testCtx: 'Hello Jane' } } },
    { context: { who: 'Jane' } }
  );
});

test('resolves options.context that is a function', async () => {
  await testFetch(
    new fetch.Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{testCtx}' }),
    }),
    { payload: { data: { testCtx: 'Hello John' } } },
    { context: async () => ({ who: 'John' }) }
  );
});

test('catches error thrown in context function', async () => {
  await testFetch(
    new fetch.Request('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{testCtx}' }),
    }),
    {
      payload: { errors: [{ message: 'Context creation failed: uh oh' }] },
      status: 500,
    },
    {
      context: async () => {
        throw new Error('uh oh');
      },
    }
  );
});

test('Ignore requests of different to options.path', () => {
  const badFetchEvent: FetchEvent = {
    // @ts-ignore
    request: new fetch.Request('http://localhost/notAPI'),
    respondWith: () => {
      throw new Error("DON'T CALL ME!!!");
    },
  };
  fetchHandler(new Benzene({ schema: TestSchema }), { path: '/api' })(
    badFetchEvent
  );
});
test('Respond to requests to options.path', (done) => {
  const correctFetchEvent: FetchEvent = {
    // @ts-ignore
    request: new fetch.Request('http://localhost:/api'),
    respondWith: async (maybeResponse) => {
      done();
      return maybeResponse;
    },
  };
  fetchHandler(new Benzene({ schema: TestSchema }), { path: '/api' })(
    correctFetchEvent
  );
});
