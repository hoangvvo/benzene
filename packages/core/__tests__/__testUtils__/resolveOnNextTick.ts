// https://github.com/graphql/graphql-js/blob/main/src/__testUtils__/resolveOnNextTick.ts

export function resolveOnNextTick(): Promise<void> {
  return Promise.resolve(undefined);
}
