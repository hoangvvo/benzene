import { ExecutionResult } from 'graphql';

export function isExecutionResult<C, E extends ExecutionResult>(
  mayResult: C | E
): mayResult is E {
  return 'error' in mayResult;
}
