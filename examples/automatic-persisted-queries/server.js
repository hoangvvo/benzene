import { makeAPQHandler } from "@benzene/extra";
import { Benzene, makeHandler, parseGraphQLBody } from "@benzene/http";
import parse from "@polka/url";
import { createReadStream } from "fs";
import { createServer } from "http";
import { schema } from "pokemon-graphql-schema";

const apqHTTP = makeAPQHandler();

const GQL = new Benzene({ schema });

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
    const { query } = parse(req, true); // parse query string
    const body = parseGraphQLBody(
      await readBody(req),
      req.headers["content-type"]
    ); // parse body
    try {
      await apqHTTP(body || query);
    } catch (err) {
      // It may throw `HTTPError` object from `@benzene/extra`
      // It may be `PersistedQueryNotFound`, which asks the client
      // to send back a pair of query and hash to persist
      const result = GQL.formatExecutionResult({
        errors: [err],
      });
      return res
        .writeHead(err.status, { "content-type": "application/json" })
        .end(JSON.stringify(result));
    }
    const result = await graphqlHTTP({
      method: req.method,
      headers: req.headers,
      query,
      body,
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
