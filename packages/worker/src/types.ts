import { ValueOrPromise, TContext } from '@benzene/core';

export interface HandlerConfig {
  path?: string;
  context?: TContext | ((request: Request) => ValueOrPromise<TContext>);
}
