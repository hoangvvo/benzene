// Based on https://github.com/contrawork/graphql-helix/blob/master/examples/http/server.ts
import { getGraphQLParameters, processRequest } from "graphql-helix";
import { createServer } from "http";
import schema from "../src/schema.js";

createServer((req, res) => {
  let payload = "";

  req.on("data", (chunk) => {
    payload += chunk.toString();
  });

  req.on("end", async () => {
    const request = {
      body: JSON.parse(payload || "{}"),
      headers: req.headers,
      method: req.method,
      query: {},
    };

    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
    });

    result.headers.forEach(({ name, value }) => res.setHeader(name, value));
    res.writeHead(result.status, {
      "content-type": "application/json",
    });
    res.end(JSON.stringify(result.payload));
  });
}).listen(4000);
