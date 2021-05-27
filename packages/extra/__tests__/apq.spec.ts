import { makeAPQHandler } from "@benzene/extra/src/apq";
import { sha256 } from "crypto-hash";
import lru from "tiny-lru";

test("does nothing if input is not object or does not contain a supported persisted query", async () => {
  const badCache = {};
  // @ts-expect-error: It should not invoke cache in the cases below
  const apqHTTP = makeAPQHandler({ cache: badCache });

  const req = {};
  const res = await apqHTTP(req);
  expect(res).toBe(req);

  const res1 = await apqHTTP(undefined);
  expect(res1).toBeUndefined();

  const res2 = await apqHTTP(null);
  expect(res2).toBeNull();

  const req3 = { extensions: { persistedQuery: { version: 2 } } };
  const res3 = await apqHTTP(req3);
  expect(res3).toBe(req3);

  const req4 = { extensions: { persisted: "foo" } };
  const res4 = await apqHTTP(req4);
  expect(res4).toBe(req4);
});

test("throws PersistedQueryNotFound is query hash is not recognized", () => {
  return expect(
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
  return expect(
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

  expect(cache.get(sha256Hash)).toBe("{test}");
});

test("throws error if receiving mismatched hash256", async () => {
  const sha256Hash = await sha256("{test}");

  const cache = lru();

  cache.set(sha256Hash, "{test}");

  return expect(
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
