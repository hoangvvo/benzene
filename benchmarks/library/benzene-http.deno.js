import { Benzene, makeHandler, parseGraphQLBody } from "@benzene/http";
import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import schema from "../src/schema.js";

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

const handler = async (request) => {
  const headers = Object.fromEntries(request.headers);
  const rawBody = await request.text();
  const result = await graphqlHTTP({
    method: request.method,
    headers,
    body: parseGraphQLBody(rawBody, headers["content-type"]),
  });
  return new Response(JSON.stringify(result.payload), {
    headers: new Headers(result.headers),
    status: result.status,
  });
};

await serve(handler, { port: 4000, onListen: undefined });
