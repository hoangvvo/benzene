const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { GraphQL, httpHandler } = require('@benzene/server');
const { wsHandler } = require('@benzene/ws');
const schema = require('./schema');

const GQL = new GraphQL({ schema });

const server = http.createServer(httpHandler(GQL, { path: '/graphql' }));

const wss = new WebSocket.Server({ path: '/graphql', server });

wss.on(
  'connection',
  wsHandler(GQL, {
    context: (socket, request) => {
      // Return a context to be used in resolvers
      return {};
    },
  })
);

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/`);
});
