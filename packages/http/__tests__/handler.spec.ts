// Adapted from https://github.com/graphql/express-graphql/blob/master/src/__tests__/http-test.ts
import Benzene from "@benzene/core/src/core";
import { SimpleSchema, TestSchema } from "@benzene/core/__tests__/_schema";
import { makeHandler } from "@benzene/http/src/handler";
import {
  GraphQLError,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";

const GQL = new Benzene({ schema: TestSchema });

describe("GET functionality", () => {
  test("allows GET with query param", async () => {
    expect(
      await makeHandler(GQL)(
        { method: "GET", query: { query: "{test}" }, headers: {} },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello World" } },
    });
  });

  test("allows GET with variable values", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: "query helloWho($who: String){ test(who: $who) }",
            variables: JSON.stringify({ who: "Dolly" }),
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello Dolly" } },
    });
  });

  test("allows GET with operation name", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: `
            query helloYou { test(who: "You"), ...shared }
            query helloWorld { test(who: "World"), ...shared }
            query helloDolly { test(who: "Dolly"), ...shared }
            fragment shared on QueryRoot {
              shared: test(who: "Everyone")
            }
          `,
            operationName: "helloWorld",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          test: "Hello World",
          shared: "Hello Everyone",
        },
      },
    });
  });

  test("Reports validation errors", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: "{ test, unknownOne, unknownTwo }",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 400,
      headers: { "content-type": "application/json" },
      payload: {
        errors: [
          {
            message: 'Cannot query field "unknownOne" on type "QueryRoot".',
            locations: [{ line: 1, column: 9 }],
            path: undefined,
          },
          {
            message: 'Cannot query field "unknownTwo" on type "QueryRoot".',
            locations: [{ line: 1, column: 21 }],
            path: undefined,
          },
        ],
      },
    });
  });

  test.skip("Errors when missing operation name", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: `
          query TestQuery { test }
          mutation TestMutation { writeTest { test } }
        `,
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 400,
      headers: { "content-type": "application/json" },
      payload: {
        errors: [
          {
            message:
              "Must provide operation name if query contains multiple operations.",
            locations: undefined,
            path: undefined,
          },
        ],
      },
    });
  });

  test("Errors when sending a mutation via GET", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: "mutation TestMutation { writeTest { test } }",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 405,
      headers: { "content-type": "application/json" },
      payload: {
        errors: [
          {
            message:
              "Can only perform a mutation operation from a POST request.",
            locations: undefined,
            path: undefined,
          },
        ],
      },
    });
  });

  test("Errors when selecting a mutation within a GET", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            operationName: "TestMutation",
            query: `
            query TestQuery { test }
            mutation TestMutation { writeTest { test } }
          `,
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 405,
      headers: { "content-type": "application/json" },
      payload: {
        errors: [
          {
            message:
              "Can only perform a mutation operation from a POST request.",
            locations: undefined,
            path: undefined,
          },
        ],
      },
    });
  });

  test("Allows a mutation to exist within a GET", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            operationName: "TestQuery",
            query: `
          mutation TestMutation { writeTest { test } }
          query TestQuery { test }
        `,
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          test: "Hello World",
        },
      },
    });
  });

  // Allows passing in a fieldResolve
  // Allows passing in a typeResolver
});

describe("POST functionality", () => {
  test("allows POST with JSON encoding", async () => {
    expect(
      await makeHandler(GQL)(
        { method: "POST", body: { query: "{test}" }, headers: {} },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello World" } },
    });
  });

  test("alows POST with JSON encoding with additional directives", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          body: { query: "{test}" },
          headers: {
            "content-type": "application/json; charset=UTF-8",
          },
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello World" } },
    });
  });

  test("Allows sending a mutation via POST", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          body: { query: "mutation TestMutation { writeTest { test } }" },
          headers: {
            "content-type": "application/json",
          },
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { writeTest: { test: "Hello World" } } },
    });
  });

  // supports POST JSON query with string variables

  test("supports POST JSON query with JSON variables", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          body: {
            query: "query helloWho($who: String){ test(who: $who) }",
            variables: { who: "Dolly" },
          },
          headers: {
            "content-type": "application/json",
          },
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello Dolly" } },
    });
  });

  // supports POST url encoded query with string variables

  test("supports POST JSON query with GET variable values", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          query: {
            variables: JSON.stringify({ who: "Dolly" }),
          },
          body: { query: "query helloWho($who: String){ test(who: $who) }" },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: { data: { test: "Hello Dolly" } },
    });
  });

  test("allows POST with operation name", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          body: {
            query: `
            query helloYou { test(who: "You"), ...shared }
            query helloWorld { test(who: "World"), ...shared }
            query helloDolly { test(who: "Dolly"), ...shared }
            fragment shared on QueryRoot {
              shared: test(who: "Everyone")
            }
          `,
            operationName: "helloWorld",
          },
          headers: {
            "content-type": "application/json",
          },
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          test: "Hello World",
          shared: "Hello Everyone",
        },
      },
    });
  });

  // allows other UTF charsets
  // allows deflated POST bodies
  // allows for pre-parsed POST bodies
  // allows for pre-parsed POST using application/graphql
  // does not accept unknown pre-parsed POST string
  // does not accept unknown pre-parsed POST raw Buffer

  // will send request and response when using thunk
});

describe("Error handling functionality", () => {
  test("handles field errors caught by GraphQL", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: "{thrower}",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: "Throws!",
            locations: [{ line: 1, column: 2 }],
            path: ["thrower"],
          },
        ],
      },
    });
  });

  // handles query errors from non-null top field errors (graphql-jit seems to fix this behavior)

  test("allows for custom error formatting", async () => {
    expect(
      await makeHandler(
        new Benzene({
          schema: TestSchema,
          formatErrorFn(error) {
            return { message: "Custom error format: " + error.message };
          },
        })
      )(
        {
          method: "GET",
          query: {
            query: "{thrower}",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: "Custom error format: Throws!",
          },
        ],
      },
    });
  });

  test("allows for custom error formatting to elaborate", async () => {
    expect(
      await makeHandler(
        new Benzene({
          schema: TestSchema,
          formatErrorFn(error) {
            return {
              message: error.message,
              locations: error.locations,
              stack: "Stack trace",
            };
          },
        })
      )(
        {
          method: "GET",
          query: {
            query: "{thrower}",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      headers: { "content-type": "application/json" },
      status: 200,
      payload: {
        data: { thrower: null },
        errors: [
          {
            message: "Throws!",
            locations: [{ line: 1, column: 2 }],
            stack: "Stack trace",
          },
        ],
      },
    });
  });

  test("handles syntax errors caught by GraphQL", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "GET",
          query: {
            query: "syntax_error",
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      headers: { "content-type": "application/json" },
      status: 400,
      payload: {
        errors: [
          {
            message: 'Syntax Error: Unexpected Name "syntax_error".',
            locations: [{ line: 1, column: 1 }],
            path: undefined,
          },
        ],
      },
    });
  });

  test("handles errors caused by a lack of query", async () => {
    expect(
      await makeHandler(GQL)({ method: "GET", headers: {} }, undefined)
    ).toEqual({
      headers: { "content-type": "application/json" },
      status: 400,
      payload: {
        errors: [
          {
            message: "Must provide query string.",
            locations: undefined,
            path: undefined,
          },
        ],
      },
    });
  });

  // handles unsupported charset
  // handles unsupported utf charset
  // handles invalid body
  // handles poorly formed variables
  // allows for custom error formatting of poorly formed requests
  // allows for custom error formatting of poorly formed requests

  test("handles invalid variables", async () => {
    expect(
      await makeHandler(GQL)(
        {
          method: "POST",
          body: {
            query: "query helloWho($who: String){ test(who: $who) }",
            variables: { who: ["John", "Jane"] },
          },
          headers: {},
        },
        undefined
      )
    ).toEqual({
      headers: { "content-type": "application/json" },
      status: 200, // graphql-express uses 500
      payload: {
        errors: [
          {
            message:
              'Variable "$who" got invalid value ["John", "Jane"]; String cannot represent a non string value: ["John", "Jane"]',
            locations: [{ line: 1, column: 16 }],
            path: undefined,
          },
        ],
      },
    });
  });

  test("handles unsupported HTTP methods", async () => {
    expect(
      await makeHandler(GQL)(
        { method: "PUT", query: { query: "{test}" }, headers: {} },
        undefined
      )
    ).toEqual({
      headers: { "content-type": "application/json" },
      status: 405,
      payload: {
        errors: [
          {
            message: "GraphQL only supports GET and POST requests.",
            locations: undefined,
            path: undefined,
          },
        ],
      },
    });
  });
});

test("creates GraphQL context using Benzene#contextFn", async () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        test: {
          type: GraphQLString,
          resolve: (_obj, _args, context) => context,
        },
      },
    }),
  });

  expect(
    await makeHandler(new Benzene({ schema, contextFn: () => "testValue" }))(
      {
        method: "GET",
        query: {
          query: "{ test }",
        },
        headers: {},
      },
      undefined
    )
  ).toEqual({
    status: 200,
    headers: { "content-type": "application/json" },
    payload: {
      data: {
        test: "testValue",
      },
    },
  });
});

test("Receives extra in Benzene#contextFn", async () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        test: {
          type: GraphQLString,
          resolve: (_obj, _args, context) => context,
        },
      },
    }),
  });

  expect(
    await makeHandler(
      new Benzene<string, { value: string }>({
        schema,
        contextFn: ({ extra }) => extra.value,
      })
    )(
      {
        method: "GET",
        query: {
          query: "{ test }",
        },
        headers: {},
      },
      { value: "testValue" }
    )
  ).toEqual({
    status: 200,
    headers: { "content-type": "application/json" },
    payload: {
      data: {
        test: "testValue",
      },
    },
  });
});

test("Receives nullable extra in Benzene#contextFn", async () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        test: {
          type: GraphQLString,
          resolve: (_obj, _args, context) => context,
        },
      },
    }),
  });

  expect(
    await makeHandler(
      new Benzene<unknown, unknown>({
        schema,
        contextFn: ({ extra }) => extra,
      })
    )({
      method: "GET",
      query: {
        query: "{ test }",
      },
      headers: {},
    })
  ).toEqual({
    status: 200,
    headers: { "content-type": "application/json" },
    payload: {
      data: {
        test: null,
      },
    },
  });
});

describe("options.onParams", () => {
  const GQL = new Benzene<unknown, unknown>({
    schema: SimpleSchema,
  });
  test("Overrides options.onParams if it returns a GraphQLParams object", async () => {
    expect(
      await makeHandler(GQL, {
        onParams(params) {
          return {
            ...params,
            query: "{ foo }",
          };
        },
      })({
        method: "GET",
        query: {}, // query.query is intentionally empty
        headers: {},
      })
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          foo: "FooValue",
        },
      },
    });
  });

  test("Overrides options.onParams if it returns a promise of GraphQLParams object", async () => {
    expect(
      await makeHandler(GQL, {
        onParams(params) {
          return Promise.resolve({
            ...params,
            query: "{ foo }",
          });
        },
      })({
        method: "GET",
        query: {}, // query.query is intentionally empty
        headers: {},
      })
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          foo: "FooValue",
        },
      },
    });
  });

  test("Responds early if it returns an ExecutionResult", async () => {
    expect(
      await makeHandler(GQL, {
        onParams() {
          return {
            errors: [new GraphQLError("TestError")],
          };
        },
      })({ method: "GET", query: {}, headers: {} })
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        errors: [{ message: "TestError" }],
      },
    });
  });

  test("Does nothing if it does not return a value", async () => {
    expect(
      await makeHandler(GQL, {
        onParams() {},
      })({
        method: "GET",
        query: { query: "{ foo }" }, // query.query is intentionally empty
        headers: {},
      })
    ).toEqual({
      status: 200,
      headers: { "content-type": "application/json" },
      payload: {
        data: {
          foo: "FooValue",
        },
      },
    });
  });
});

// Custom validate function
// Custom validation rules
// Custom execute
// Custom parse function
// Custom result extension
