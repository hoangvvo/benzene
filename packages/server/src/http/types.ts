import { IncomingMessage } from 'http';
import { ValueOrPromise, TContext } from '@benzene/core';

export interface HandlerConfig {
  path?: string;
  context?: TContext | ((req: IncomingMessage) => ValueOrPromise<TContext>);
}
