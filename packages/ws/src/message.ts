import { GraphQLParams } from '@benzene/core';
import { FormattedExecutionResult, GraphQLFormattedError } from 'graphql';

export enum MessageType {
  ConnectionInit = 'connection_init', // Client -> Server
  ConnectionAck = 'connection_ack', // Server -> Client

  Subscribe = 'subscribe', // Client -> Server
  Next = 'next', // Server -> Client
  Error = 'error', // Server -> Client
  Complete = 'complete', // bidirectional
}

export interface ConnectionInitMessage {
  type: MessageType.ConnectionInit;
  payload?: Record<string, unknown>;
}

export interface ConnectionAckMessage {
  type: MessageType.ConnectionAck;
  payload?: Record<string, unknown>;
}

export interface SubscribeMessage {
  id: string;
  type: MessageType.Subscribe;
  payload: GraphQLParams;
}

export interface NextMessage {
  id: string;
  type: MessageType.Next;
  payload: FormattedExecutionResult;
}

export interface ErrorMessage {
  id?: string;
  type: MessageType.Error;
  payload: readonly GraphQLFormattedError[];
}

export interface CompleteMessage {
  id: string;
  type: MessageType.Complete;
}
