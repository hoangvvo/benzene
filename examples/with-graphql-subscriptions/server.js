const http = require("http");
const WebSocket = require("ws");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const { makeHandler: makeWsHandler } = require("@benzene/ws");
const schema = require("./utils/schema");

const GQL = new Benzene({ schema });

const httpHandler = makeHandler(GQL);

const readBody = (req, done) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => done(body));
};

const server = http.createServer((req, res) => {
  readBody(req, (rawBody) => {
    httpHandler({
      method: req.method,
      headers: req.headers,
      body: parseGraphQLBody(rawBody, req.headers["content-type"]),
    }).then((result) => {
      res.writeHead(result.status, result.headers);
      res.end(JSON.stringify(result.payload));
    });
  });
});

const wss = new WebSocket.Server({ path: "/graphql", server });

wss.on("connection", makeWsHandler(GQL));

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/`);
});
