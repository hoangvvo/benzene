const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const { Benzene, httpHandler } = require('@benzene/server');
const { makeHandler } = require('@benzene/ws');
const schema = require('./schema');

const GQL = new Benzene({ schema });

const server = http.createServer(httpHandler(GQL, { path: '/graphql' }));

const wss = new WebSocket.Server({ path: '/graphql', server });

wss.on(
  'connection',
  makeHandler(GQL, {
    context: (ctx) => {
      // Return a context to be used in resolvers
      return {};
    },
  })
);

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/`);
});
