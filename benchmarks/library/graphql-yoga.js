import { createServer } from "@graphql-yoga/node";
import schema from "../schema.js";

const server = createServer({
  schema,
  port: 4000,
  logging: false,
});

server.start();
