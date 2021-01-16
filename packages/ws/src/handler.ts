import { Benzene, ValueOrPromise } from '@benzene/core';
import { ExecutionResult, GraphQLError } from 'graphql';
import {
  CompleteMessage,
  ConnectionAckMessage,
  ConnectionInitMessage,
  ErrorMessage,
  MessageType,
  NextMessage,
  SubscribeMessage,
} from './message';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';

function isAsyncIterable<T = unknown>(
  val: unknown
): val is AsyncIterableIterator<T> {
  return typeof Object(val)[Symbol.asyncIterator] === 'function';
}

interface WebSocketCompatible {
  protocol: string;
  send(data: string): void;
  close(code?: number | undefined, data?: string | undefined): void;
  onclose: (event: CloseEvent) => void;
  onmessage: (event: MessageEvent) => void;
}

interface ConnectionContext {
  subscriptions: Map<string, AsyncIterableIterator<ExecutionResult>>;
}

export interface HandlerOptions {
  onConnect?: (
    ctx: ConnectionContext,
    connectionParams: ConnectionInitMessage['payload']
  ) => ValueOrPromise<Record<string, unknown> | boolean | void>;
}

export function makeHandler(gql: Benzene, options: HandlerOptions = {}) {
  return function handle(socket: WebSocketCompatible) {
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_TRANSPORT_WS_PROTOCOL) === -1
    )
      // 1002: protocol error. We only support graphql_ws for now
      return socket.close(1002);

    let acknowledged = false;
    let connectionInitReceived = false;

    const ctx: ConnectionContext = {
      subscriptions: new Map(),
    };

    const send = (
      message:
        | ConnectionAckMessage
        | NextMessage
        | ErrorMessage
        | CompleteMessage
    ) => socket.send(JSON.stringify(message));

    const sendRes = (id: string, payload: ExecutionResult) =>
      send({
        id,
        payload: gql.formatExecutionResult(payload),
        type: MessageType.Next,
      });

    const sendErr = (id: string, errors: GraphQLError[]) =>
      send({
        id,
        payload: gql.formatExecutionResult({ errors }).errors!,
        type: MessageType.Error,
      });

    const stopSub = async (subId: string) => {
      const removingSub = ctx.subscriptions.get(subId);
      if (!removingSub) return;
      await removingSub.return?.();
      ctx.subscriptions.delete(subId);
    };

    const init = async (payload: ConnectionInitMessage['payload']) => {
      let permittedOrPayload;
      if (options.onConnect) {
        try {
          permittedOrPayload = await options.onConnect(ctx, payload);
        } catch (e) {
          return socket.close(4403, e.message);
        }
      }
      if (permittedOrPayload === false) return socket.close(4403, 'Forbidden');
      send({
        type: MessageType.ConnectionAck,
        payload:
          typeof permittedOrPayload === 'object'
            ? permittedOrPayload
            : undefined,
      });
    };

    const subscribe = async (
      id: string,
      payload: SubscribeMessage['payload']
    ) => {
      if (ctx.subscriptions.has(id)) {
        return socket.close(4409, `Subscriber for ${id} already exists`);
      }
      if (!payload?.query) {
        return sendErr(id, [new GraphQLError('Must provide query string.')]);
      }
      const cachedOrResult = gql.getCachedGQL(
        payload.query,
        payload.operationName
      );
      if (!('document' in cachedOrResult)) {
        return sendErr(id, cachedOrResult.errors as GraphQLError[]);
      }
      const execArg = {
        document: cachedOrResult.document,
        contextValue: {},
        variableValues: payload.variables,
        operationName: payload.operationName,
      };
      if (cachedOrResult.operation !== 'subscription') {
        sendRes(id, await gql.execute(execArg, cachedOrResult.jit));
      } else {
        try {
          const result = await gql.subscribe(execArg, cachedOrResult.jit);
          if (!isAsyncIterable(result)) {
            // If it is not an async iterator, it must be an
            // execution result with errors
            return sendErr(id, result.errors as GraphQLError[]);
          }
          ctx.subscriptions.set(id, result);
          for await (const value of result) {
            sendRes(id, value);
          }
        } catch (error) {
          return sendErr(id, [error]);
        } finally {
          stopSub(id);
        }
      }

      send({ type: MessageType.Complete, id });
    };

    const cleanup = () => {
      for (const subId of ctx.subscriptions.keys()) stopSub(subId);
    };

    socket.onclose = cleanup;

    socket.onmessage = (event) => {
      let message: ConnectionInitMessage | SubscribeMessage | CompleteMessage;

      try {
        message = JSON.parse(String(event.data));
      } catch (err) {
        return socket.close(4400, 'Invalid message received');
      }

      switch (message.type) {
        case MessageType.ConnectionInit: {
          if (connectionInitReceived) {
            return socket.close(4429, 'Too many initialisation requests');
          }
          connectionInitReceived = true;
          init(message.payload).then(() => {
            acknowledged = true;
          });
          break;
        }

        case MessageType.Subscribe: {
          if (!acknowledged) {
            return socket.close(4401, 'Unauthorized');
          }
          subscribe(message.id, message.payload);
          break;
        }

        case MessageType.Complete:
          stopSub(message.id);
          break;
      }
    };
  };
}
