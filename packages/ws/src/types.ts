import { GraphQLParams, ValueOrPromise, TContext } from '@benzene/core';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import MessageTypes from './messageTypes';

type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

export interface OperationMessage {
  id?: string;
  payload?: GraphQLParams;
  type: MessageType;
}

export interface HandlerConfig {
  context?:
    | TContext
    | ((
        socket: WebSocket,
        request: IncomingMessage
      ) => ValueOrPromise<TContext>);
}
