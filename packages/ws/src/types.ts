import { GraphQLParams, ValueOrPromise, TContext } from '@benzene/core';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import MessageTypes from './messageTypes';
import { DocumentNode } from 'graphql';
import { SubscriptionConnection } from './connection';

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
  onStart?: (
    this: SubscriptionConnection,
    id: string,
    execArg: {
      document: DocumentNode;
      contextValue: TContext;
      variableValues: Record<string, any> | null | undefined;
      operationName: string | null | undefined;
    }
  ) => void;
  onComplete?: (this: SubscriptionConnection, id: string) => void;
}
