const http = require("http");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const schema = require("pokemon-graphql-schema");

global.fetch = require("node-fetch");

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

const readBody = (req, done) => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
};

const server = http.createServer(async (req, res) => {
  const rawBody = await readBody(req);
  const result = await graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers["content-type"]),
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
});

server.listen(3000, () => {
  console.log(`🚀  Server ready at http://localhost:3000/graphql`);
});
