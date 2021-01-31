"use strict";

const http = require("http");
const { graphqlHTTP } = require("express-graphql");
const schema = require("../schema");

http.createServer(graphqlHTTP({ schema })).listen(4000);
