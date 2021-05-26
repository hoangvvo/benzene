export default {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["/node_modules/"],
  testMatch: ["**/__tests__/**/*.spec.ts", "**/__tests__/**/*.test.ts"],
};
