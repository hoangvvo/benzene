import merge from "deepmerge";
import { getExternals } from "../../build-utils";
import config from "../../rollup.config";
import packageJson from "./package.json";

export default merge(config, {
  external: getExternals(packageJson),
});
