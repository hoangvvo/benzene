import {
  Benzene,
  makeHandler,
  parseGraphQLBody,
} from "https://cdn.skypack.dev/@benzene/http?dts";
import { schema } from "https://cdn.skypack.dev/pokemon-graphql-schema?dts";

const GQL = new Benzene({ schema });
const graphqlHTTP = makeHandler(GQL);

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle request and respond
 * @param {Request} request
 */
async function handleRequest(request: Request) {
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
      headers: new Headers(result.headers as HeadersInit),
      status: result.status,
    });
  }
  // Serve index.html
  return new Response(
    `<html><head><title>Simple GraphiQL Example</title><link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" /></head><body style="margin: 0;"><div id="graphiql" style="height: 100vh;"></div> <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js" ></script> <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js" ></script> <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js" ></script> <script>const graphQLFetcher=graphQLParams=>fetch('/graphql',{method:'post',headers:{'Content-Type':'application/json'},body:JSON.stringify(graphQLParams),}).then(response=>response.json()).catch(()=>response.text());ReactDOM.render(React.createElement(GraphiQL,{fetcher:graphQLFetcher}),document.getElementById('graphiql'),);</script> </body></html>`,
    { headers: { "content-type": "text/html" } },
  );
}
