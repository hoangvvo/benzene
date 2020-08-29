import { makeExecutableSchema } from '@graphql-tools/schema';
import * as fetch from 'node-fetch';
import { strict as assert } from 'assert';
import { HttpQueryResponse } from '@benzene/core/src';
import { GraphQL, fetchHandler } from '../src';

interface FetchEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): Promise<Response>;
}

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
      helloMe: String
      helloWho(who: String!): String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'world',
      helloMe: (obj, args, context) => context.me,
      helloWho: (obj, args) => args.who,
    },
  },
});

async function testRequest(
  input: string,
  init: fetch.RequestInit,
  expected: Partial<HttpQueryResponse> | null,
  handlerOptions = {}
) {
  const gql = new GraphQL({ schema });
  return new Promise((resolve, reject) => {
    const fetchEvent: FetchEvent = {
      // @ts-ignore
      request: new fetch.Request(
        input.startsWith('/') ? `http://localhost:0${input}` : input,
        init
      ),
      respondWith: async (maybeResponse) => {
        const response = await maybeResponse;
        if (expected.body)
          assert.strictEqual(expected.body, await response.text());
        assert.strictEqual(expected.status || 200, response.status);
        resolve();
        return response;
      },
    };
    fetchHandler(gql, handlerOptions)(fetchEvent);
  });
}

before(() => {
  // @ts-ignore
  global.Request = fetch.Request;
  // @ts-ignore
  global.Response = fetch.Response;
});

describe('worker: fetchHandler', () => {
  it('works with queryParams', async () => {
    await testRequest(
      '/graphql?query={ hello }',
      {},
      { status: 200, body: `{"data":{"hello":"world"}}` }
    );
  });

  it('works with application/json body', async () => {
    await testRequest(
      '/graphql',
      {
        body: JSON.stringify({
          query: `query helloWho($who: String!) { helloWho(who: $who) }`,
          variables: { who: 'John' },
          headers: { 'content-type': 'application/json' },
        }),
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
      { status: 200, body: `{"data":{"helloWho":"John"}}` }
    );
  });

  it('works with application/graphql', async () => {
    await testRequest(
      '/graphql',
      {
        body: `{ hello }`,
        method: 'POST',
        headers: { 'content-type': 'application/graphql' },
      },
      { status: 200, body: `{"data":{"hello":"world"}}` }
    );
  });

  describe('do not parse body', () => {
    it('with empty content-type', async () => {
      await testRequest(
        '/graphql',
        {
          body: JSON.stringify({
            query: `query helloWho($who: String!) { helloWho(who: $who) }`,
            variables: { who: 'John' },
          }),
          method: 'POST',
        },
        {
          status: 400,
          // Because body is not parsed, query string cannot be read
          body: JSON.stringify({
            errors: [{ message: 'Must provide query string.' }],
          }),
        }
      );
    });
  });

  it('errors if query is not defined', async () => {
    await testRequest(
      '/graphql',
      {},
      {
        body: JSON.stringify({
          errors: [{ message: 'Must provide query string.' }],
        }),
        status: 400,
      }
    );
  });

  it('errors if body is malformed', async () => {
    await testRequest(
      '/graphql',
      {
        body: `query { helloWorld`,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
      {
        status: 400,
        body: JSON.stringify({
          errors: [{ message: 'POST body sent invalid JSON.' }],
        }),
      }
    );
  });

  it('catches error thrown in context function', async () => {
    await testRequest(
      '/graphql?query={helloMe}',
      {},
      {
        status: 500,
        body: `{"errors":[{"message":"Context creation failed: uh oh"}]}`,
      },
      {
        context: async () => {
          throw new Error('uh oh');
        },
      }
    );
  });

  describe('resolves options.context that is', () => {
    it('an object', async () => {
      await testRequest(
        '/graphql?query={helloMe}',
        {},
        {
          status: 200,
          body: `{"data":{"helloMe":"hoang"}}`,
        },
        { context: { me: 'hoang' } }
      );
    });

    it('a function', async () => {
      await testRequest(
        '/graphql?query={helloMe}',
        {},
        {
          status: 200,
          body: `{"data":{"helloMe":"hoang"}}`,
        },
        { context: async () => ({ me: 'hoang' }) }
      );
    });
  });

  describe('When options.path is set', () => {
    const gql = new GraphQL({ schema });
    it('ignore requests of different path', (done) => {
      const badFetchEvent: FetchEvent = {
        // @ts-ignore
        request: new fetch.Request('http://localhost:0/notAPI'),
        respondWith: (maybeResponse) => {
          throw new Error("DON'T CALL ME! WE ALREADY BROKE UP.");
        },
      };
      fetchHandler(gql, { path: '/api' })(badFetchEvent);
      done();
    });
    it('response to requests to defined path', (done) => {
      const correctFetchEvent: FetchEvent = {
        // @ts-ignore
        request: new fetch.Request('http://localhost:0/api'),
        respondWith: async (maybeResponse) => {
          done();
          return maybeResponse;
        },
      };
      fetchHandler(gql, { path: '/api' })(correctFetchEvent);
    });
  });
});
