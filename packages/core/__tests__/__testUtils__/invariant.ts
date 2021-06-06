// https://github.com/graphql/graphql-js/blob/main/src/jsutils/invariant.ts

export function invariant(
  condition: unknown,
  message?: string
): asserts condition {
  const booleanCondition = Boolean(condition);
  // istanbul ignore else (See transformation done in './resources/inlineInvariant.js')
  if (!booleanCondition) {
    throw new Error(
      message != null ? message : "Unexpected invariant triggered."
    );
  }
}
