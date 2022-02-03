import { sha256 } from "crypto-hash";
import lru from "tiny-lru";
import { Benzene } from "../../core/src";
import { SimpleSchema } from "../../core/__tests__/_schema";
import { makeHandler } from "../../http/src/handler";
import { makeAPQHandler } from "../src/apq";

test("does nothing if inputs does not contain a supported persisted query", async () => {
  const badCache = {};
  // @ts-expect-error: It should not invoke cache in the cases below
  const apq = makeAPQHandler({ cache: badCache });

  const req = {};
  const res = await apq(req);
  expect(res).toBe(req);

  const req3 = { extensions: { persistedQuery: { version: 2 } } };
  const res3 = await apq(req3);
  expect(res3).toBe(req3);

  const req4 = { extensions: { persisted: "foo" } };
  const res4 = await apq(req4);
  expect(res4).toBe(req4);
});

test("returns result with PersistedQueryNotFound if query hash is not recognized", async () => {
  return expect(
    await makeAPQHandler()({
      extensions: {
        persistedQuery: {
          sha256Hash: sha256("{test}"),
          version: 1,
        },
      },
    })
  ).toMatchObject({
    errors: [
      {
        message: "PersistedQueryNotFound",
        extensions: { code: "PERSISTED_QUERY_NOT_FOUND" },
        status: 200,
      },
    ],
  });
});

test("allows custom cache", (done) => {
  const cache = {
    get: () => {
      done();
      return "{test}";
    },
    set: () => "",
  };
  makeAPQHandler({ cache })({
    extensions: {
      persistedQuery: {
        sha256Hash: "dummy",
        version: 1,
      },
    },
  });
});

test("saves query by hash sent from clients", async () => {
  const cache = lru();
  const query = "{test}";
  const sha256Hash = await sha256(query);
  const request = {
    query: query,
    extensions: {
      persistedQuery: {
        sha256Hash,
        version: 1,
      },
    },
  };
  const result = await makeAPQHandler({ cache })(request);
  expect(result).toBe(request); // Return the original params
  expect(cache.get(sha256Hash)).toBe(query);
});

test("return result with error if receiving mismatched hash256", async () => {
  const sha256Hash = await sha256("{test}");

  const cache = lru();

  cache.set(sha256Hash, "{test}");

  return expect(
    await makeAPQHandler()({
      query: "{test}",
      extensions: {
        persistedQuery: {
          sha256Hash: await sha256("{bad}"),
          version: 1,
        },
      },
    })
  ).toMatchObject({
    errors: [{ message: "provided sha does not match query", status: 400 }],
  });
});

test("adds query if hash is found in cache", async () => {
  const sha256Hash = await sha256("{test}");

  const request = {
    extensions: {
      persistedQuery: {
        sha256Hash,
        version: 1,
      },
    },
  } as any;

  const cache = lru();

  cache.set(sha256Hash, "{test}");

  const result = await makeAPQHandler({ cache })(request);

  // @ts-ignore
  expect(result.query).toBe("{test}");
});

const GQL = new Benzene({ schema: SimpleSchema });

describe("usage with @benzene/http", () => {
  it("returns result with PersistedQueryNotFound if query hash is not recognized", async () => {
    expect(
      await makeHandler(GQL, {
        onParams(params) {
          return makeAPQHandler()(params);
        },
      })({
        headers: {},
        method: "GET",
        query: {
          extensions: JSON.stringify({
            persistedQuery: {
              sha256Hash: "dummy",
              version: 1,
            },
          }),
        },
      })
    ).toMatchObject({
      headers: {
        "content-type": "application/json",
      },
      payload: {
        errors: [
          {
            message: "PersistedQueryNotFound",
            extensions: { code: "PERSISTED_QUERY_NOT_FOUND" },
          },
        ],
      },
      status: 200,
    });
  });

  it("adds query if hash is found in cache", async () => {
    const sha256Hash = await sha256("{foo}");

    const cache = lru();
    cache.set(sha256Hash, "{foo}");

    expect(
      await makeHandler(GQL, {
        onParams(params) {
          return makeAPQHandler({ cache })(params);
        },
      })({
        headers: {},
        method: "GET",
        query: {
          extensions: JSON.stringify({
            persistedQuery: {
              sha256Hash,
              version: 1,
            },
          }),
        },
      })
    ).toEqual({
      headers: {
        "content-type": "application/json",
      },
      payload: {
        data: {
          foo: "FooValue",
        },
      },
      status: 200,
    });
  });
});
