'use strict';

const Fastify = require('fastify');
const mercurius = require('mercurius');
const schema = require('../utils/schema');

const app = Fastify();

app.register(mercurius, {
  schema,
  jit: 1,
});

app.listen(4000);
