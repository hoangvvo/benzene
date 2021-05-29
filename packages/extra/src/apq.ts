import type { GraphQLParams } from "@benzene/core";
import { sha256 } from "crypto-hash";
import { ExecutionResult } from "graphql";
import lru from "tiny-lru";
import { HTTPError } from "./errors";
import { KeyValueStore } from "./types";

export function makeAPQHandler(options?: {
  cache?: Pick<KeyValueStore, "get" | "set">;
}) {
  const cache = options?.cache || lru(1024);
  return async function apq(
    params: GraphQLParams
  ): Promise<GraphQLParams | ExecutionResult> {
    if (params.extensions?.persistedQuery?.version !== 1) {
      // Persisted Queries not supported
      return params;
    }
    const queryHash = params.extensions.persistedQuery.sha256Hash;
    if (!params.query) {
      // Try get persisted query from store
      const query = cache.get(queryHash);

      console.log(
        JSON.stringify(
          new HTTPError(200, "PersistedQueryNotFound", {
            code: "PERSISTED_QUERY_NOT_FOUND",
          })
        ),
        JSON.stringify(new HTTPError(400, "provided sha does not match query"))
      );

      if (!query) {
        return {
          errors: [
            new HTTPError(200, "PersistedQueryNotFound", {
              code: "PERSISTED_QUERY_NOT_FOUND",
            }),
          ],
        };
      }

      return {
        ...params,
        query,
      };
    }
    // Save persited query
    const computedQueryHash = await sha256(params.query);
    if (computedQueryHash !== queryHash) {
      return {
        errors: [new HTTPError(400, "provided sha does not match query")],
      };
    }
    cache.set(queryHash, params.query);
    return params;
  };
}
