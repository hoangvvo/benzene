const { ApolloServer } = require('apollo-server-fastify');
const app = require('fastify')();
const schema = require('../schema');

const server = new ApolloServer({ schema });

app.register(server.createHandler());
app.listen(4000);