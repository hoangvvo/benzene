import { HTTPError } from "@benzene/extra/src/errors";
import { GraphQLError } from "graphql";

describe("HTTPError", () => {
  test("extends GraphQLError", () => {
    expect(new HTTPError(400, "")).toBeInstanceOf(GraphQLError);
  });
  test("set (http) status property", () => {
    const error = new HTTPError(418, "");
    expect(error.status).toBe(418);
  });
  test("set extensions property", () => {
    const extensions = { code: "THE_EXTENSION" };
    const error = new HTTPError(400, "", extensions);
    expect(error.extensions).toBe(extensions);
  });
  test("throws if status code is invalid", () => {
    expect(() => new HTTPError(600, "")).toThrowError(
      "HTTP status code must be between 100 and 599"
    );
    expect(() => new HTTPError(99, "")).toThrowError(
      "HTTP status code must be between 100 and 599"
    );
  });
});
