// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { suite } from 'uvu';
import assert from 'uvu/assert';
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import request from 'supertest';
import { Config } from '@benzene/core/src/types';
import { createServer } from 'http';
import { GraphQL, httpHandler } from '../src';
import { HandlerConfig } from '../src/http/types';
import { readBody } from '../src/http/readBody';

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

function createGQLServer(options: Config, handlerOpts?: HandlerConfig) {
  const gql = new GraphQL(options);
  return createServer(httpHandler(gql, handlerOpts));
}

const suiteHttp = suite('httpHandler');

suiteHttp('handles GET request', async () => {
  const server = createGQLServer({ schema: TestSchema });
  await request(server)
    .get('/graphql?query={test}')
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
suiteHttp('allows for pre-parsed query strings', async () => {
  const gql = new GraphQL({ schema: TestSchema });
  const server = createServer((req, res) => {
    (req as any).query = { query: '{test}' };
    httpHandler(gql)(req, res);
  });
  await request(server)
    .get('/graphql')
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
suiteHttp('handles POST request', async () => {
  const server = createGQLServer({ schema: TestSchema });
  await request(server)
    .post('/graphql')
    .send({ query: '{test}' })
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
suiteHttp('Resolves options.context that is an object', async () => {
  const server = createGQLServer(
    { schema: TestSchema },
    { context: { who: 'Jane' } }
  );
  await request(server)
    .post('/graphql')
    .send({ query: '{testCtx}' })
    .expect(JSON.stringify({ data: { testCtx: 'Hello Jane' } }));
});
suiteHttp('Resolves options.context that is a function', async () => {
  const server = createGQLServer(
    { schema: TestSchema },
    { context: async () => ({ who: 'John' }) }
  );
  await request(server)
    .get('/graphql?query={testCtx}')
    .expect(JSON.stringify({ data: { testCtx: 'Hello John' } }));
});
suiteHttp('catches error thrown in context function', async () => {
  const server = createGQLServer(
    { schema: TestSchema },
    {
      context: async () => {
        throw new Error('uh oh');
      },
    }
  );
  await request(server)
    .get('/graphql')
    .query({ query: '{test}' })
    .expect('{"errors":[{"message":"Context creation failed: uh oh"}]}');
  // Non promise function
  const server2 = createGQLServer(
    { schema: TestSchema },
    {
      context: async () => {
        throw new Error('uh oh');
      },
    }
  );
  await request(server2)
    .get('/graphql?query={testCtx}')
    .expect('{"errors":[{"message":"Context creation failed: uh oh"}]}');
});
suiteHttp('allows for pre-parsed POST bodies', () => {
  const test = {};
  return new Promise((resolve) => {
    // @ts-expect-error
    readBody({ body: test }, (err, body) => {
      assert.equal(test, body);
      resolve();
    });
  });
});
suiteHttp('skips body parsing if no content-type presented', (done) => {
  return new Promise((resolve) => {
    // @ts-expect-error
    readBody({ headers: {} }, (err, body) => {
      assert.equal(body, null);
      resolve();
    });
  });
});
suiteHttp('responses 500 on request error', async () => {
  const server = createServer((req, res) => {
    httpHandler(new GraphQL({ schema: TestSchema }))(req, res);
    req.emit('error', new Error('Request Error!'));
  });
  await request(server).post('/graphql').send({ query: '{test}' }).expect(500);
});
suiteHttp('respond 404 by checking against req.url', async () => {
  const server = createServer(
    httpHandler(new GraphQL({ schema: TestSchema }), { path: '/api' })
  );
  await request(server).post('/api').send({ query: '{test}' }).expect(200);
  await request(server).get('/api?query={test}').expect(200);
  await request(server).get('/graphql?query={test}').expect(404);
});
suiteHttp(
  'respond 404 by checking against req.path when available',
  async () => {
    const server = createServer((req, res) => {
      (req as any).path = req.url.substring(0, req.url.indexOf('?'));
      httpHandler(new GraphQL({ schema: TestSchema }), { path: '/api' })(
        req,
        res
      );
    });
    await request(server).get('/api?query={test}').expect(200);
    await request(server).get('/graphql?query={test}').expect(404);
  }
);

suiteHttp.run();
