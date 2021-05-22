"use strict";

const { createServer } = require("http");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const { makeCompileQuery } = require("@benzene/core/runtimes/jit");
const schema = require("../schema");

const GQL = new Benzene({ schema, compileQuery: makeCompileQuery() });

const graphqlHTTP = makeHandler(GQL);

const rawBody = (req, done) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => done(body));
};

createServer((req, res) => {
  rawBody(req, (rawBody) =>
    graphqlHTTP({
      method: req.method,
      headers: req.headers,
      body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    }).then((result) => {
      res.writeHead(result.status, result.headers);
      res.end(JSON.stringify(result.payload));
    })
  );
}).listen(4000);
