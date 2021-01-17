// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import request from 'supertest';
import { Config } from '@benzene/core/src/types';
import { createServer } from 'http';
import { Benzene, httpHandler } from '../src';
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
  const gql = new Benzene(options);
  return createServer(httpHandler(gql, handlerOpts));
}

test('handles GET request', async () => {
  const server = createGQLServer({ schema: TestSchema });
  await request(server)
    .get('/graphql?query={test}')
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
test('allows for pre-parsed query strings', async () => {
  const gql = new Benzene({ schema: TestSchema });
  const server = createServer((req, res) => {
    (req as any).query = { query: '{test}' };
    httpHandler(gql)(req, res);
  });
  await request(server)
    .get('/graphql')
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
test('handles POST request', async () => {
  const server = createGQLServer({ schema: TestSchema });
  await request(server)
    .post('/graphql')
    .send({ query: '{test}' })
    .expect(JSON.stringify({ data: { test: 'Hello World' } }));
});
test('Resolves options.context that is an object', async () => {
  const server = createGQLServer(
    { schema: TestSchema },
    { context: { who: 'Jane' } }
  );
  await request(server)
    .post('/graphql')
    .send({ query: '{testCtx}' })
    .expect(JSON.stringify({ data: { testCtx: 'Hello Jane' } }));
});
test('Resolves options.context that is a function', async () => {
  const server = createGQLServer(
    { schema: TestSchema },
    { context: async () => ({ who: 'John' }) }
  );
  await request(server)
    .get('/graphql?query={testCtx}')
    .expect(JSON.stringify({ data: { testCtx: 'Hello John' } }));
});
test('catches error thrown in context function', async () => {
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
test('allows for pre-parsed POST bodies', () => {
  const test = {};
  return new Promise<void>((resolve) => {
    // @ts-expect-error
    readBody({ body: test }, (body) => {
      expect(test).toEqual(body);
      resolve();
    });
  });
});
test('skips body parsing if no content-type presented', (done) => {
  // @ts-expect-error
  readBody({ headers: {} }, (body) => {
    expect(body).toBeNull();
    done();
  });
});
test('respond 404 by checking against req.url', async () => {
  const server = createServer(
    httpHandler(new Benzene({ schema: TestSchema }), { path: '/api' })
  );
  await request(server).post('/api').send({ query: '{test}' }).expect(200);
  await request(server).get('/api?query={test}').expect(200);
  await request(server).get('/graphql?query={test}').expect(404);
});
test('respond 404 by checking against req.path when available', async () => {
  const server = createServer((req, res) => {
    (req as any).path = req.url.substring(0, req.url.indexOf('?'));
    httpHandler(new Benzene({ schema: TestSchema }), { path: '/api' })(
      req,
      res
    );
  });
  await request(server).get('/api?query={test}').expect(200);
  await request(server).get('/graphql?query={test}').expect(404);
});
