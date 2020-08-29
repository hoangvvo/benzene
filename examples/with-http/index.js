const http = require('http');
const { GraphQL, httpHandler } = require('@benzene/server');
const schema = require('pokemon-graphql-schema');

global.fetch = require('node-fetch');

const GQL = new GraphQL({ schema });

const server = http.createServer(httpHandler(GQL, { path: '/graphql' }));

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/graphql`);
});
