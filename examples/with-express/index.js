const express = require("express");
const { Benzene, makeHandler } = require("@benzene/http");
const expressPlayground = require("graphql-playground-middleware-express")
  .default;
const schema = require("pokemon-graphql-schema");

// Polyfill fetch
global.fetch = require("node-fetch");

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

const app = express();

app.use(express.json());

app.get("/playground", expressPlayground({ endpoint: "/graphql" }));
app.all("/graphql", (req, res) => {
  graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: req.body,
  }).then((result) => {
    res.writeHead(result.status, result.headers);
    res.send(result.payload);
  });
});
app.use(express.static("public"));

app.listen(4000, () => {
  console.log("Server ready at http://localhost:4000/");
});
