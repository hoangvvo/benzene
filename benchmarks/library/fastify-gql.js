'use strict';

const Fastify = require('fastify');
const GQL = require('fastify-gql');
const schema = require('../schema');

const app = Fastify();

app.register(GQL, {
  schema,
  jit: 1,
});

app.get('/', async function (req, reply) {
  const query = '{ add(x: 2, y: 2) }';
  return reply.graphql(query);
});

app.listen(4000);
