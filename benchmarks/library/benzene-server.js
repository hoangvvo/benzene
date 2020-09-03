'use strict';

const polka = require('polka');
const { GraphQL, httpHandler } = require('@benzene/server');
const schema = require('../schema');

const app = polka();

const GQL = new GraphQL({ schema });

app.all('/graphql', httpHandler(GQL));

app.listen(4000);
