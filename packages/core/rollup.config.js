import merge from "deepmerge";
import config from "../../rollup.config";

const buildNestedModule = (name) => ({
  input: `src/${name}.ts`,
  output: [
    {
      file: `./${name}.cjs`,
      format: "cjs",
    },
    {
      file: `./${name}.js`,
      format: "es",
    },
  ],
  external: [...config.external, "@hoangvvo/graphql-jit"],
  plugins: [...config.plugins],
});

export default [
  buildNestedModule("runtimes/js"),
  buildNestedModule("runtimes/jit"),
  merge(config, {
    external: ["@benzene/core", "@hoangvvo/graphql-jit", "tiny-lru", "./runtimes/js", "./runtimes/jit"],
  }),
];
