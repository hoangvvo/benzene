const express = require('express');
const { GraphQL, httpHandler } = require('@benzene/server');
const expressPlayground = require('graphql-playground-middleware-express')
  .default;
const schema = require('pokemon-graphql-schema');

// Polyfill fetch
global.fetch = require('node-fetch');

const GQL = new GraphQL({ schema });

const app = express();

app.get('/playground', expressPlayground({ endpoint: '/graphql' }));
app.all('/graphql', httpHandler(GQL));
app.use(express.static('public'));

app.listen(4000, () => {
  console.log('Server ready at http://localhost:4000/');
});
