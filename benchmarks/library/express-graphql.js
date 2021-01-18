"use strict";

const polka = require("polka");
const { graphqlHTTP } = require("express-graphql");
const schema = require("../utils/schema");

const app = polka();

app.all("/graphql", graphqlHTTP({ schema }));

app.listen(4000);
