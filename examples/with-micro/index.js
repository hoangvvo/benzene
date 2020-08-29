const { GraphQL, httpHandler } = require('@benzene/server');
const schema = require('pokemon-graphql-schema');

// Polyfill fetch
global.fetch = require('node-fetch');

const GQL = new GraphQL({ schema });

module.exports = httpHandler(GQL, {
  context: (req) => ({ hello: 'world' }),
  path: '/graphql',
});
