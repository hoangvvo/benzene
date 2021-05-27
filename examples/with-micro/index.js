const { text, send } = require("micro");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const { schema } = require("pokemon-graphql-schema");
const fetch = require("undici-fetch");

globalThis.fetch = fetch;

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

module.exports = async (req, res) => {
  const txt = await text(req);
  const result = await graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(txt, req.headers["content-type"]),
  });
  send(res, result.status, result.payload);
};
