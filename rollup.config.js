import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "./index.cjs",
      format: "cjs",
    },
    {
      dir: ".",
      format: "es",
    },
  ],
  external: ["graphql"],
  plugins: [typescript()],
};
