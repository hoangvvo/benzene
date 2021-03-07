import merge from "deepmerge";
import config from "../../rollup.config";

export default merge(config, {
  external: ["crypto-hash", "tiny-lru"],
});
