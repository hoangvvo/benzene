// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { GraphQLObjectType, GraphQLString, GraphQLSchema } from 'graphql';
import request from 'supertest';
import { Config } from '@benzene/core/src/types';
import { strictEqual } from 'assert';
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

describe('httpHandler', () => {
  it('handles GET request', () => {
    const server = createGQLServer({ schema: TestSchema });
    return request(server)
      .get('/graphql?query={test}')
      .expect(JSON.stringify({ data: { test: 'Hello World' } }));
  });
  it('handles POST request', () => {
    const server = createGQLServer({ schema: TestSchema });
    return request(server)
      .post('/graphql')
      .send({ query: '{test}' })
      .expect(JSON.stringify({ data: { test: 'Hello World' } }));
  });
  describe('Resolves options.context that is', () => {
    it('an object', async () => {
      const server = createGQLServer(
        { schema: TestSchema },
        { context: { who: 'Jane' } }
      );
      await request(server)
        .post('/graphql')
        .send({ query: '{testCtx}' })
        .expect(JSON.stringify({ data: { testCtx: 'Hello Jane' } }));
    });
    it('a function', async () => {
      const server = createGQLServer(
        { schema: TestSchema },
        { context: async () => ({ who: 'John' }) }
      );
      await request(server)
        .get('/graphql?query={testCtx}')
        .expect(JSON.stringify({ data: { testCtx: 'Hello John' } }));
    });
  });
  it('catches error thrown in context function', async () => {
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
  it('allows for pre-parsed POST bodies', (done) => {
    const test = {};
    // @ts-expect-error
    readBody({ body: test }, (err, body) => {
      strictEqual(test, body);
      done();
    });
  });
  it('skips body parsing if no content-type presented', (done) => {
    // @ts-expect-error
    readBody({ headers: {} }, (err, body) => {
      strictEqual(body, null);
      done();
    });
  });
  it('responses 500 on request error', async () => {
    const server = createServer((req, res) => {
      httpHandler(new GraphQL({ schema: TestSchema }))(req, res);
      req.emit('error', new Error('Request Error!'));
    });
    await request(server)
      .post('/graphql')
      .send({ query: '{test}' })
      .expect(500);
  });
  describe('responses 404 accordingly by options.path', () => {
    const gql = new GraphQL({ schema: TestSchema });
    it('by checking against req.url', async () => {
      const server = createServer(httpHandler(gql, { path: '/api' }));
      await request(server).get('/api?query={test}').expect(200);
      await request(server).get('/graphql?query={test}').expect(404);
    });
    it('by checking against req.path when available', async () => {
      const server = createServer((req, res) => {
        (req as any).path = req.url.substring(0, req.url.indexOf('?'));
        httpHandler(gql, { path: '/api' })(req, res);
      });
      await request(server).get('/api?query={test}').expect(200);
      await request(server).get('/graphql?query={test}').expect(404);
    });
  });
});
