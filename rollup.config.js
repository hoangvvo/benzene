import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    {
      dir: "dist",
      format: "es",
    },
  ],
  external: ["graphql"],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.build.json",
    }),
  ],
};
