import { Benzene, makeHandler, parseGraphQLBody } from "@benzene/http";
import { makeCompileQuery } from "@benzene/jit";
import { createReadStream } from "fs";
import { createServer } from "http";
import { schema } from "pokemon-graphql-schema";
import fetch from "undici-fetch";

globalThis.fetch = fetch;

const GQL = new Benzene({ schema, compileQuery: makeCompileQuery() });

const graphqlHTTP = makeHandler(GQL);

const readBody = (req) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
};

const server = createServer(async (req, res) => {
  if (req.url.startsWith("/graphql")) {
    // Serve GraphQL API
    const rawBody = await readBody(req);
    const result = await graphqlHTTP({
      method: req.method,
      headers: req.headers,
      body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    });
    res.writeHead(result.status, result.headers);
    res.end(JSON.stringify(result.payload));
  }
  // Serve index.html
  res.writeHead(200, { "content-type": "text/html" });
  createReadStream("index.html").pipe(res);
});

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000`);
});
