import { GraphQL } from '@benzene/core';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import { GRAPHQL_WS } from './messageTypes';
import { HandlerConfig } from './types';
import { SubscriptionConnection } from './connection';

export function createHandler(gql: GraphQL, options: HandlerConfig = {}) {
  return function connection(socket: WebSocket, request: IncomingMessage) {
    // Check that socket.protocol is GRAPHQL_WS
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_WS) === -1
    )
      return socket.close(1002);

    const connection = new SubscriptionConnection(
      socket,
      request,
      gql,
      options
    );

    if (options.onSubscriptionConnection)
      options.onSubscriptionConnection(connection);

    socket.on('message', (message) => {
      connection.handleMessage(message.toString());
    });
    socket.on('error', () => connection.handleConnectionClose());
    socket.on('close', () => connection.handleConnectionClose());
  };
}
