// theme.config.js
const description = "Benzene: A fast and minimal JavaScript GraphQL Server";

export default {
  repository: "https://github.com/hoangvvo/benzene", // project repo
  docsRepository: "https://github.com/hoangvvo/benzene", // docs repo
  branch: "main", // branch of docs
  path: "/docs", // path of docs
  titleSuffix: " – hoangvvo/benzene",
  nextLinks: true,
  prevLinks: true,
  search: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: true,
  footerText: (
    <>
      <p>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://hoangvvo.com/" target="_blank" rel="noopener">
          Hoang Vo
        </a>
        .
      </p>
      <small>Made with ❤️ love, 🔥 passion, and a ⌨️ keyboard</small>
    </>
  ),
  footerEditOnGitHubLink: true, // will link to the docs repo
  logo: (
    <>
      <span
        style={{ color: "hsl(349deg 100% 59%)" }}
        className="font-bold p-2 text-lg"
      >
        Benzene
      </span>
      <span className="text-sm text-gray-600">
        The fast and minimal GraphQL Server
      </span>
    </>
  ),
  head: (
    <>
      <meta name="theme-color" content="#ff2e54" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta name="description" content={description} />
      <meta name="og:description" content={description} />
      <meta name="og:title" content="hoangvvo/benzene" />
      <meta name="og:image" content="https://benzene.vercel.app/og.png" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ff2e54" />
      <meta name="msapplication-TileColor" content="#ff2e54" />
      <meta name="theme-color" content="#ffffff" />
    </>
  ),
};
