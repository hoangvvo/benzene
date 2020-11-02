'use strict';

const polka = require('polka');
const { Benzene, httpHandler } = require('@benzene/server');
const schema = require('../schema');

const app = polka();

const GQL = new Benzene({ schema });

app.all('/graphql', httpHandler(GQL));

app.listen(4000);
