import { sha256 } from "crypto-hash";
import lru from "tiny-lru";
import { makeAPQHandler } from "../src/apq";

test("does nothing if it is not a supported persisted query", async () => {
  const req = {};
  const res = await makeAPQHandler()(req);
  expect(res).toBe(req);
  expect(req).not.toHaveProperty("query");
});

test("throws PersistedQueryNotFound is query hash is not recognized", () => {
  expect(
    makeAPQHandler()({
      extensions: {
        persistedQuery: {
          sha256Hash: sha256("{test}"),
          version: 1,
        },
      },
    })
  ).rejects.toThrowError("PersistedQueryNotFound");
});

test("throws PersistedQueryNotFound is query hash is not found", () => {
  expect(
    makeAPQHandler()({
      extensions: {
        persistedQuery: {
          sha256Hash: sha256("{test}"),
          version: 1,
        },
      },
    })
  ).rejects.toThrowError("PersistedQueryNotFound");
});

test("allows custom cache", (done) => {
  const cache = {
    get: () => done(),
    set: () => "",
  };
  makeAPQHandler({ cache })({
    extensions: {
      persistedQuery: {
        sha256Hash: sha256("{test}"),
        version: 1,
      },
    },
  });
});

test("saves query by hash sent from clients", async () => {
  const cache = lru();
  const query = "{test}"
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
  expect(result).toBe(request);
  expect(cache.get(sha256Hash)).toBe(query);
});

test("saves query by hash sent from clients (query strings)", async () => {
  const cache = lru();
  const sha256Hash = await sha256("{test}");

  const request = {
    query: "{test}",
    extensions: JSON.stringify({
      persistedQuery: {
        sha256Hash,
        version: 1,
      },
    }),
  };

  const result = await makeAPQHandler({ cache })(request);

  expect(result).toBe(request);

  expect(cache.get(sha256Hash)).toBe('{test}');
});

test("throws error if receiving mismatched hash256", async () => {
  const sha256Hash = await sha256("{test}");

  const cache = lru();

  cache.set(sha256Hash, "{test}");

  expect(
    makeAPQHandler()({
      query: "{test}",
      extensions: {
        persistedQuery: {
          sha256Hash: await sha256("{bad}"),
          version: 1,
        },
      },
    })
  ).rejects.toThrowError("provided sha does not match query");
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

  expect(result).toBe(request);

  expect(request.query).toBe("{test}");
});

test("adds query if hash is found in cache (query strings)", async () => {
  const sha256Hash = await sha256("{test}");

  const request = {
    extensions: JSON.stringify({
      persistedQuery: {
        sha256Hash,
        version: 1,
      },
    }),
  } as any;

  const cache = lru();

  cache.set(sha256Hash, "{test}");

  const result = await makeAPQHandler({ cache })(request);

  expect(result).toBe(request);

  expect(request.query).toBe("{test}");
});
