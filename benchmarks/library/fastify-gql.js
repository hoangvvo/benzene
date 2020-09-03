'use strict';

const Fastify = require('fastify');
const GQL = require('fastify-gql');
const schema = require('../schema');

const app = Fastify();

app.register(GQL, {
  schema,
  jit: 1,
});

app.listen(4000);
