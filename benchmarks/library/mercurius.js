import Fastify from "fastify";
import mercurius from "mercurius";
import schema from "../schema.js";

const app = Fastify();

app.register(mercurius, {
  schema,
  jit: 1,
});

app.listen({
  port: 4000,
});
