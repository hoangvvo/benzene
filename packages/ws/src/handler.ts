import { GraphQL, TContext, ValueOrPromise } from '@benzene/core';
import { IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import { SubscriptionConnection } from './connection';
import { GRAPHQL_WS } from './messageTypes';
import { HandlerConfig } from './types';

export function createHandler(gql: GraphQL, options: HandlerConfig = {}) {
  async function handleSocket(
    socket: WebSocket,
    contextPromise?: ValueOrPromise<TContext>
  ) {
    // We will wait until the context is resolved while queuing the messages
    const unhandledQueue: string[] = [];
    const queueUnhandled = (data: WebSocket.Data) =>
      unhandledQueue.push(data.toString());

    socket.on('message', queueUnhandled);

    let context: TContext = {};

    if (contextPromise)
      try {
        context = await contextPromise;
        console.log(context);
      } catch (e) {
        // 1011: Internal Error
        // TODO: We should allow custom code via e.code
        // We also need to inform the user somehow
        socket.close(1011);
        return;
      }

    // No longer need to queue
    socket.off('message', queueUnhandled);
    const connection = new SubscriptionConnection(gql, socket, context);
    // Flush all queued unhandled message
    for (let i = 0; i < unhandledQueue.length; i += 1) {
      connection.handleMessage(unhandledQueue[i]);
    }

    connection.init();
  }

  return function connection(socket: WebSocket, request: IncomingMessage) {
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_WS) === -1
    )
      // 1002: protocol error. We only support graphql_ws for now
      return socket.close(1002);

    console.log('h', options.context);

    handleSocket(
      socket,
      typeof options.context === 'function'
        ? options.context(socket, request)
        : options.context
    );
  };
}
