const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.js",
  unstable_staticImage: true,
  unstable_flexsearch: {
    codeblock: false,
  },
});
module.exports = withNextra({
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/examples/:path*",
        destination:
          "https://github.com/hoangvvo/benzene/tree/main/examples/:path*",
        permanent: false,
      },
    ];
  },
});
