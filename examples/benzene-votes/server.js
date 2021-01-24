import { createServer } from "http";
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

const server = createServer(async (req, res) => {
  const rawBody = await readBody(req);
  const result = await graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers["content-type"]),
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  graphqlWS(ws);
});

server.listen(3000);
