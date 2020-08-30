// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import request from 'supertest';
import { Config } from '@benzene/core/src/types';
import { strict as assert } from 'assert';
import { createServer } from 'http';
import { GraphQL, httpHandler } from '../src';
import { HandlerConfig } from '../src/http/types';

function createGQLServer(options: Config, handlerOpts?: HandlerConfig) {
  const gql = new GraphQL(options);
  return createServer(httpHandler(gql, handlerOpts));
}

const schema = makeExecutableSchema({
  typeDefs: `
    type Query {
      hello: String
      helloMe: String
      helloAsync: String
    }
  `,
  resolvers: {
    Query: {
      hello: () => 'world',
      helloAsync: async () => 'world',
      helloMe: (obj, args, context) => context.me,
    },
  },
});

describe('server/http: httpHandler', () => {
  it('runs simple request', () => {
    const gql = new GraphQL({
      schema,
    });
    const server = createServer(httpHandler(gql));
    return request(server)
      .post('/graphql')
      .send({
        query: 'query { hello }',
      })
      .expect(200)
      .expect(JSON.stringify({ data: { hello: 'world' } }));
  });
  it('runs simple request with async resolver', () => {
    const gql = new GraphQL({
      schema,
    });
    const server = createServer(httpHandler(gql));
    return request(server)
      .post('/graphql')
      .send({
        query: 'query { helloAsync }',
      })
      .expect(200)
      .expect(JSON.stringify({ data: { helloAsync: 'world' } }));
  });
  it('returns 400 on body parsing error', async () => {
    const gql = new GraphQL({
      schema,
    });
    const server = createServer(httpHandler(gql));
    await request(server)
      .post('/graphql')
      .set('content-type', 'application/json')
      .send('{ as')
      .expect(400)
      .expect(
        JSON.stringify({
          errors: [{ message: 'POST body sent invalid JSON.' }],
        })
      );
  });
  it('catches error thrown in context function', async () => {
    const server = createGQLServer(
      { schema },
      {
        context: async () => {
          throw new Error('uh oh');
        },
      }
    );
    await request(server)
      .get('/graphql')
      .query({ query: 'query { helloMe }' })
      .expect('{"errors":[{"message":"Context creation failed: uh oh"}]}');
    // Non promise function
    const server2 = createGQLServer(
      { schema },
      {
        context: () => {
          throw new Error('uh oh');
        },
      }
    );
    await request(server2)
      .get('/graphql')
      .query({ query: 'query { helloMe }' })
      .expect('{"errors":[{"message":"Context creation failed: uh oh"}]}');
  });
  describe('resolves options.context that is', () => {
    it('an object', async () => {
      const server = createGQLServer({ schema }, { context: { me: 'hoang' } });
      await request(server)
        .get('/graphql')
        .query({ query: 'query { helloMe }' })
        .expect('{"data":{"helloMe":"hoang"}}');
    });
    it('a function', async () => {
      const server = createGQLServer(
        { schema },
        { context: async () => ({ me: 'hoang' }) }
      );
      await request(server)
        .get('/graphql')
        .query({ query: 'query { helloMe }' })
        .expect('{"data":{"helloMe":"hoang"}}');
    });
  });
  describe('sends 404 response accordingly if options.path is set', () => {
    const gql = new GraphQL({ schema });
    it('by checking against req.url', async () => {
      const server = createServer(httpHandler(gql, { path: '/api' }));
      await request(server).get('/api?query={hello}').expect(200);
      await request(server).get('/graphql?query={hello}').expect(404);
    });
    it('by checking against req.path when available', async () => {
      const server = createServer((req, res) => {
        (req as any).path = req.url.substring(0, req.url.indexOf('?'));
        httpHandler(gql, { path: '/api' })(req, res);
      });
      await request(server).get('/api?query={hello}').expect(200);
      await request(server).get('/graphql?query={hello}').expect(404);
    });
  });
});
