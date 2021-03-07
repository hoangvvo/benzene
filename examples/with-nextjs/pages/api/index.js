import { Benzene, makeHandler } from "@benzene/http";
import schema from "pokemon-graphql-schema";

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

export default function handler(req, res) {
  return graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: req.body,
  }).then((result) => {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
    res.status(result.status).send(result.payload);
  });
}
