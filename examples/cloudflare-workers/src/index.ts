import { Benzene, makeHandler, parseGraphQLBody } from "@benzene/http";
import { schema } from "pokemon-graphql-schema";

const GQL = new Benzene({ schema });
const graphqlHTTP = makeHandler(GQL);

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/graphql")) {
      // Serve GraphQL API
      const headers = Object.fromEntries(request.headers);
      const rawBody = await request.text();
      const result = await graphqlHTTP({
        method: request.method,
        headers,
        body: parseGraphQLBody(rawBody, headers["content-type"]),
        query: Object.fromEntries(url.searchParams),
      });
      return new Response(JSON.stringify(result.payload), {
        // @ts-ignore
        headers: new Headers(result.headers),
        status: result.status,
      });
    }
    // Serve index.html
    return new Response(
      `<html><head><title>Simple GraphiQL Example</title><link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" /></head><body style="margin: 0;"><div id="graphiql" style="height: 100vh;"></div> <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js" ></script> <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js" ></script> <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js" ></script> <script>const graphQLFetcher=graphQLParams=>fetch('/graphql',{method:'post',headers:{'Content-Type':'application/json'},body:JSON.stringify(graphQLParams),}).then(response=>response.json()).catch(()=>response.text());ReactDOM.render(React.createElement(GraphiQL,{fetcher:graphQLFetcher}),document.getElementById('graphiql'),);</script> </body></html>`,
      { headers: { "content-type": "text/html" } }
    );
  },
};
