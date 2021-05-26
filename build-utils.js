import typescript from "@rollup/plugin-typescript";

const getExternals = (packageJson) => {
  return [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ];
};

export const buildConfig = ({ packageJson }) => {
  const external = getExternals(packageJson);
  if (!external.includes("graphql")) external.push("graphql");
  return [
    {
      input: "src/index.ts",
      output: [
        {
          dir: "dist",
          format: "es",
        },
      ],
      plugins: [
        typescript({
          tsconfig: "./tsconfig.build.json",
        }),
      ],
      external,
    },
    {
      input: "src/index.ts",
      output: [
        {
          file: "dist/index.cjs",
          format: "cjs",
        },
      ],
      plugins: [
        typescript({
          tsconfig: "./tsconfig.build.json",
          declaration: false,
        }),
      ],
      external,
    },
  ];
};
