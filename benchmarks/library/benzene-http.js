"use strict";

const polka = require("polka");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const schema = require("../utils/schema");

const app = polka();

const GQL = new Benzene({ schema });

const httpHandler = makeHandler(GQL);

const readBody = (req, done) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => done(body));
};

app.all("/graphql", (req, res) => {
  readBody(req, (rawBody) => {
    httpHandler({
      method: req.method,
      headers: req.headers,
      body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    }).then((result) => {
      res.writeHead(result.status, result.headers);
      res.end(JSON.stringify(result.payload));
    });
  });
});

app.listen(4000);
