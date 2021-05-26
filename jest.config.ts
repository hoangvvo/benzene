export default {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/__tests__/**/*.spec.ts", "**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "./packages/**/*.ts",
    "!./packages/**/*.js",
    "!./packages/**/*.cjs",
    "!./packages/**/*.d.ts",
    "!./packages/*/__tests__/**",
    "!./packages/**/index.ts",
    "!./packages/**/types.ts",
  ],
};
