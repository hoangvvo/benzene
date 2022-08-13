import express from "express";
import { graphqlHTTP } from "express-graphql";
import schema from "../src/schema.js";

const app = express();
app.use("/graphql", graphqlHTTP({ schema }));

app.listen(4000);
