import { sha256 } from "crypto-hash";
import lru from "tiny-lru";
import { HTTPError } from "./errors";
import { KeyValueStore } from "./types";

export function makeAPQHandler(options?: {
  cache?: Pick<KeyValueStore, "get" | "set">;
}) {
  const cache = options?.cache || lru(1024);
  return async function apqHTTP(
    bodyOrQuery: Record<string, string | object> | null | undefined
  ) {
    if (!bodyOrQuery || typeof bodyOrQuery !== "object") return bodyOrQuery;
    const extensions: Record<string, any> =
      typeof bodyOrQuery.extensions === "string"
        ? JSON.parse(bodyOrQuery.extensions)
        : bodyOrQuery.extensions;
    if (extensions?.persistedQuery?.version !== 1) {
      // Persisted Queries not supported
      return bodyOrQuery;
    }
    const queryHash = extensions.persistedQuery.sha256Hash;
    if (!bodyOrQuery.query) {
      // Try get persisted query from store
      const query = cache.get(queryHash);
      if (!query) {
        throw new HTTPError(200, "PersistedQueryNotFound", {
          code: "PERSISTED_QUERY_NOT_FOUND",
        });
      }
      bodyOrQuery.query = query;
      return bodyOrQuery;
    }
    // Save persited query
    const computedQueryHash = await sha256(bodyOrQuery.query as string);
    if (computedQueryHash !== queryHash)
      throw new HTTPError(400, "provided sha does not match query");
    cache.set(queryHash, bodyOrQuery.query as string);
    return bodyOrQuery;
  };
}
