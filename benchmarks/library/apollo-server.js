import { ApolloServer } from "apollo-server";
import schema from "../src/schema.js";

const server = new ApolloServer({
  schema,
  cache: "bounded",
});

server.listen(4000);
