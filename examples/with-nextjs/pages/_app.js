import Head from "next/head";
import { createClient, Provider } from "urql";

const client = createClient({
  url: "/api",
});

function MyApp({ Component, pageProps }) {
  return (
    <Provider value={client}>
      <Head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/@picocss/pico@latest/css/pico.min.css"
        />
        <title>Pokemon GraphQL with @benzene/http</title>
      </Head>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
