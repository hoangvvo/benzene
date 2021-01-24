import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs",
    },
    {
      file: "dist/index.js",
      format: "es",
    },
  ],
  external: ["graphql"],
  plugins: [typescript()],
};
