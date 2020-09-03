import { GraphQL, TContext } from '@benzene/core';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import { SubscriptionConnection } from './connection';
import MessageTypes, { GRAPHQL_WS } from './messageTypes';
import { HandlerConfig } from './types';

export function createHandler(gql: GraphQL, options: HandlerConfig = {}) {
  return async function connection(
    socket: WebSocket,
    request: IncomingMessage
  ) {
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_WS) === -1
    )
      // 1002: protocol error. We only support graphql_ws for now
      return socket.close(1002);

    // We will wait until the context is resolved while queuing the messages
    const unhandledQueue: string[] = [];
    const queueUnhandled = (data: WebSocket.Data) =>
      unhandledQueue.push(data.toString());

    socket.on('message', queueUnhandled);

    let context: TContext = {};

    if (options.context)
      try {
        context =
          typeof options.context === 'function'
            ? await options.context(socket, request)
            : options.context;
      } catch (err) {
        // 1011: Internal Error
        // TODO: We should allow custom code via e.code
        err.message = `Context creation failed: ${err.message}`;
        socket.send(
          JSON.stringify({
            type: MessageTypes.GQL_CONNECTION_ERROR,
            payload: gql.formatExecutionResult({ errors: [err] }),
          }),
          () => socket.close()
        );
        return;
      }

    // No longer need to queue
    socket.off('message', queueUnhandled);
    const connection = new SubscriptionConnection(gql, socket, context, {
      onStart: options.onStart,
      onComplete: options.onComplete,
    });
    // Flush all queued unhandled message
    for (let i = 0; i < unhandledQueue.length; i += 1) {
      // FIXME: Need test for this behavior
      connection.handleMessage(unhandledQueue[i]);
    }

    connection.init();
  };
}
