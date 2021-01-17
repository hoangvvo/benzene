import { IncomingMessage } from 'http';
import { ValueOrPromise, TContext } from '../../../ws/__tests__/@benzene/core';

export interface HandlerConfig {
  path?: string;
  context?: TContext | ((req: IncomingMessage) => ValueOrPromise<TContext>);
}
