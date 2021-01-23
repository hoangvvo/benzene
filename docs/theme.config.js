// theme.config.js
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="A fast and minimal JavaScript GraphQL Server"
      />
      <meta name="og:title" content="hoangvvo/benzene" />
    </>
  ),
};
