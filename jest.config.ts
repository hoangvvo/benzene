export default {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/", "*.js"],
  testEnvironment: "node",
  modulePathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/__tests__/**/*.spec.ts", "**/__tests__/**/*.test.ts"],
};
