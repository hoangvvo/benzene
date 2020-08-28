import { GraphQLParams, ValueOrPromise, TContext } from '@benzene/core';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';

export interface OperationMessage {
  id?: string;
  payload?: GraphQLParams;
  type: string;
}

export interface HandlerConfig {
  context?:
    | TContext
    | ((
        socket: WebSocket,
        request: IncomingMessage
      ) => ValueOrPromise<TContext>);
}
