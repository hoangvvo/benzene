import { Benzene, ValueOrPromise } from '@benzene/core';
import { ExecutionResult, GraphQLError } from 'graphql';
import {
  CompleteMessage,
  ConnectionInitMessage,
  MessageType,
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

export interface HandlerOptions {
  onConnect?: (
    ctx: ConnectionContext,
    connectionParams: ConnectionInitMessage['payload']
  ) => ValueOrPromise<Record<string, unknown> | boolean | void>;
}

interface ConnectionContext<TExtra = unknown> {
  subscriptions: Map<string, AsyncIterableIterator<ExecutionResult>>;
  extra: TExtra;
  acknowledged: boolean;
  connectionInitReceived: boolean;
}

export function makeHandler(GQL: Benzene, options: HandlerOptions = {}) {
  const sendRes = (
    socket: WebSocketCompatible,
    id: string,
    payload: ExecutionResult
  ) =>
    socket.send(
      JSON.stringify({
        id,
        payload: GQL.formatExecutionResult(payload),
        type: MessageType.Next,
      })
    );

  const sendErr = (
    socket: WebSocketCompatible,
    id: string,
    errors: GraphQLError[]
  ) =>
    socket.send(
      JSON.stringify({
        id,
        payload: GQL.formatExecutionResult({ errors }).errors!,
        type: MessageType.Error,
      })
    );

  const stopSub = async (ctx: ConnectionContext, subId: string) => {
    const removingSub = ctx.subscriptions.get(subId);
    if (!removingSub) return;
    await removingSub.return?.();
    ctx.subscriptions.delete(subId);
  };

  const init = async (
    ctx: ConnectionContext,
    socket: WebSocketCompatible,
    message: ConnectionInitMessage
  ) => {
    if (ctx.connectionInitReceived) {
      return socket.close(4429, 'Too many initialisation requests');
    }
    ctx.connectionInitReceived = true;
    let permittedOrPayload;
    if (options.onConnect) {
      try {
        permittedOrPayload = await options.onConnect(ctx, message.payload);
      } catch (e) {
        return socket.close(4403, e.message);
      }
    }
    if (permittedOrPayload === false) return socket.close(4403, 'Forbidden');
    ctx.acknowledged = true;
    socket.send(
      JSON.stringify({
        type: MessageType.ConnectionAck,
        payload:
          typeof permittedOrPayload === 'object'
            ? permittedOrPayload
            : undefined,
      })
    );
  };

  const subscribe = async (
    ctx: ConnectionContext,
    socket: WebSocketCompatible,
    message: SubscribeMessage
  ) => {
    if (!ctx.acknowledged) {
      return socket.close(4401, 'Unauthorized');
    }
    if (ctx.subscriptions.has(message.id)) {
      return socket.close(4409, `Subscriber for ${message.id} already exists`);
    }
    if (!message.payload?.query) {
      return sendErr(socket, message.id, [
        new GraphQLError('Must provide query string.'),
      ]);
    }
    const cachedOrResult = GQL.getCachedGQL(
      message.payload.query,
      message.payload.operationName
    );
    if (!('document' in cachedOrResult)) {
      return sendErr(
        socket,
        message.id,
        cachedOrResult.errors as GraphQLError[]
      );
    }
    const execArg = {
      document: cachedOrResult.document,
      contextValue: {},
      variableValues: message.payload.variables,
      operationName: message.payload.operationName,
    };
    if (cachedOrResult.operation !== 'subscription') {
      sendRes(
        socket,
        message.id,
        await GQL.execute(execArg, cachedOrResult.jit)
      );
    } else {
      try {
        const result = await GQL.subscribe(execArg, cachedOrResult.jit);
        if (!isAsyncIterable(result)) {
          // If it is not an async iterator, it must be an
          // execution result with errors
          return sendErr(socket, message.id, result.errors as GraphQLError[]);
        }
        ctx.subscriptions.set(message.id, result);
        for await (const value of result) {
          sendRes(socket, message.id, value);
        }
      } catch (error) {
        return sendErr(socket, message.id, [error]);
      } finally {
        stopSub(ctx, message.id);
      }
    }

    socket.send(JSON.stringify({ type: MessageType.Complete, id: message.id }));
  };

  const cleanup = (ctx: ConnectionContext) => {
    for (const subId of ctx.subscriptions.keys()) stopSub(ctx, subId);
  };

  return function wsHandle<TExtra = unknown>(
    socket: WebSocketCompatible,
    extra: TExtra
  ) {
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_TRANSPORT_WS_PROTOCOL) === -1
    )
      // 1002: protocol error. We only support graphql_ws for now
      return socket.close(1002);

    const ctx: ConnectionContext<TExtra> = {
      subscriptions: new Map(),
      extra,
      acknowledged: false,
      connectionInitReceived: false,
    };

    socket.onclose = () => cleanup(ctx);

    socket.onmessage = (event) => {
      let message: ConnectionInitMessage | SubscribeMessage | CompleteMessage;

      try {
        message = JSON.parse(String(event.data));
      } catch (err) {
        return socket.close(4400, 'Invalid message received');
      }

      switch (message.type) {
        case MessageType.ConnectionInit: {
          init(ctx, socket, message);
          break;
        }

        case MessageType.Subscribe: {
          subscribe(ctx, socket, message);
          break;
        }

        case MessageType.Complete:
          stopSub(ctx, message.id);
          break;
      }
    };
  };
}
