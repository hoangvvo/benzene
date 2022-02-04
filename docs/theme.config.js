// theme.config.js
const description = "Fast, minimal, agnostic GraphQL Libraries";

export default {
  projectLink: "https://github.com/hoangvvo/benzene", // GitHub link in the navbar
  docsRepositoryBase: "https://github.com/hoangvvo/benzene/tree/main/docs", // base URL for the docs repository
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
  footerEditLink: `Edit this page on GitHub`,
  logo: (
    <>
      <span
        style={{ color: "#00a99d", fontWeight: "bold" }}
        className="p-2 text-lg"
      >
        Benzene
      </span>
      <span className="text-sm text-gray-600">{description}</span>
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
