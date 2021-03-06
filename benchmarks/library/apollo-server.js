"use strict";

const { ApolloServer } = require("apollo-server");
const schema = require("../schema");

const server = new ApolloServer({
  schema,
});

server.listen(4000);
