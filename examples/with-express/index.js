import express from "express";
import { Benzene, makeHandler } from "@benzene/http";
import expressPlayground from "graphql-playground-middleware-express";
import schema from "pokemon-graphql-schema";

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

const app = express();

app.use(express.json());

app.get("/", expressPlayground.default({ endpoint: "/graphql" }));

app.all("/graphql", (req, res) => {
  graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: req.body,
  }).then((result) => {
    res.header(result.headers);
    res.status(result.status).send(result.payload);
  });
});

app.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000`);
});
