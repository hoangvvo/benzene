import { createServer } from "http";
import sirv from "sirv";
import WebSocket from "ws";
import { Benzene, parseGraphQLBody, makeHandler } from "@benzene/http";
import { makeHandler as makeHandlerWs } from "@benzene/ws";
import schema from "./schema.js";

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);
const graphqlWS = makeHandlerWs(GQL);

const assets = sirv("public");

const server = createServer(async (req, res) => {
  if (req.url.startsWith("/graphql")) {
    // serve graphql
    const rawBody = await readBody(req);
    const result = await graphqlHTTP({
      method: req.method,
      headers: req.headers,
      body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    });
    res.writeHead(result.status, result.headers);
    res.end(JSON.stringify(result.payload));
  } else {
    // serve svelte
    assets(req, res);
  }
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  graphqlWS(ws);
});

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000`);
});
