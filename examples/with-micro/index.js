const { text, send } = require("micro");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const schema = require("pokemon-graphql-schema");

// Polyfill fetch
global.fetch = require("node-fetch");

const GQL = new Benzene({ schema });

const httpHandler = makeHandler(GQL);

module.exports = async (req, res) => {
  const txt = await text(req);
  const result = await httpHandler({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(txt, req.headers["content-type"]),
  });
  send(res, result.status, result.payload);
};
