module.exports = function (config) {
  config.devServer.proxy = [
    {
      path: "/graphql",
      target: "http://localhost:3000",
    },
  ];
};
