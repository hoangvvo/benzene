import { ValueOrPromise, TContext } from '@benzene/core';

export interface HandlerConfig {
  context?: TContext | ((request: Request) => ValueOrPromise<TContext>);
}
