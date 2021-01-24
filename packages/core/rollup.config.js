import merge from "deepmerge";
import config from "../../rollup.config";

export default merge(config, {
  external: ["@benzene/core", "@hoangvvo/graphql-jit", "tiny-lru"],
});
