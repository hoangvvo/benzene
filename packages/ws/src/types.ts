import { GraphQLParams, ValueOrPromise, TContext } from '@benzene/core';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { SubscriptionConnection } from './connection';

export type ConnectionParams = Record<string, any>;

export interface OperationMessage {
  id?: string;
  payload?: GraphQLParams | ConnectionParams;
  type: string;
}

export interface HandlerConfig {
  context?:
    | TContext
    | ((
        ws: WebSocket,
        request: IncomingMessage,
        connectionParams: ConnectionParams
      ) => ValueOrPromise<TContext>);
  onSubscriptionConnection?: (connection: SubscriptionConnection) => void;
}
