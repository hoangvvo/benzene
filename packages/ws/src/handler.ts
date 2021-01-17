import { Benzene, ValueOrPromise } from '../__tests__/@benzene/core';
import { ExecutionResult, GraphQLError } from '../../core/__tests__/graphql';
import {
  CompleteMessage,
  ConnectionInitMessage,
  MessageType,
  SubscribeMessage,
} from './message';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from './protocol';

/**
 * Return true if the argument is async iterable
 * @param val The object to be checked
 * @returns Whether the value is async iterable
 */
function isAsyncIterable<T = unknown>(
  val: unknown
): val is AsyncIterableIterator<T> {
  return typeof Object(val)[Symbol.asyncIterator] === 'function';
}

/**
 * A minimum compatible WebSocket instance
 */
interface WebSocket {
  /**
   * The subprotocol of the WebSocket. It must be
   * supported by the protocol used by @benzene/ws
   */
  protocol: string;
  /**
   * Enqueues the specified data to be transmitted to the client over the WebSocket connection
   * @param data The data to send to the client
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send}
   */
  send(data: string): void;
  /**
   * Closes the WebSocket connection or connection attempt, if any
   * @param code A numeric value indicating the status code explaining why the connection is being closed
   * @param reason A human-readable string explaining why the connection is closing.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close}
   */
  close(code?: number | undefined, reason?: string | undefined): void;
  /**
   * An EventHandler that is called when the WebSocket connection's readyState changes to CLOSED
   * @param event A CloseEvent is sent to clients using WebSockets when the connection is closed
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/onclose}
   */
  onclose: (event: CloseEvent) => void;
  /**
   * An EventHandler that is called when a message is received from the client
   * @param event Represents a message received by a target object.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/onmessage}
   */
  onmessage: (event: MessageEvent) => void;
}

/**
 * An object that stores information about a WebSocket connection
 */
interface ConnectionContext<TExtra> {
  // A map of all GraphQL subscriptions' async iterators
  subscriptions: Map<string, AsyncIterableIterator<ExecutionResult>>;
  extra: TExtra;
  // Whether the connection has been acknowledged
  acknowledged: boolean;
  // Whether the server has received connection init request from the client
  connectionInitReceived: boolean;
}

export interface HandlerOptions<TContext, TExtra> {
  /**
   * A function to be called when a new WebSocket connection is established
   * @param ctx The ConnectionContext
   * @param connectionParams A optional payload sent from the client in its ConnectionInit message
   */
  onConnect?: (
    ctx: ConnectionContext<TExtra>,
    connectionParams: ConnectionInitMessage['payload']
  ) => ValueOrPromise<Record<string, unknown> | boolean | void>;
  /**
   * A function to create an object used by all the resolvers of a specific GraphQL execution
   * @param ctx The ConnectionContext
   */
  contextFn?: (ctx: ConnectionContext<TExtra>) => ValueOrPromise<TContext>;
}

/**
 * Create a handler to handle incoming WebSocket
 * @param GQL A Benzene instance
 * @param options Handler options
 */
export function makeHandler<TContext = unknown, TExtra = unknown>(
  GQL: Benzene,
  options: HandlerOptions<TContext, TExtra> = {}
) {
  const sendRes = (socket: WebSocket, id: string, payload: ExecutionResult) =>
    socket.send(
      JSON.stringify({
        id,
        payload: GQL.formatExecutionResult(payload),
        type: MessageType.Next,
      })
    );

  const sendErr = (socket: WebSocket, id: string, errors: GraphQLError[]) =>
    socket.send(
      JSON.stringify({
        id,
        payload: GQL.formatExecutionResult({ errors }).errors!,
        type: MessageType.Error,
      })
    );

  const stopSub = async (ctx: ConnectionContext<TExtra>, subId: string) => {
    const removingSub = ctx.subscriptions.get(subId);
    if (!removingSub) return;
    await removingSub.return?.();
    ctx.subscriptions.delete(subId);
  };

  const init = async (
    ctx: ConnectionContext<TExtra>,
    socket: WebSocket,
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
    ctx: ConnectionContext<TExtra>,
    socket: WebSocket,
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
      contextValue: options.contextFn
        ? await options.contextFn(ctx)
        : undefined,
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

  const cleanup = (ctx: ConnectionContext<TExtra>) => {
    for (const subId of ctx.subscriptions.keys()) stopSub(ctx, subId);
  };

  /**
   * A function that handles incoming WebSocket connection
   * @param socket The WebSocket connection {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket}
   * @param extra An extra field to store anything that needs to persist throughout connection, accessible in callbacks
   */
  return function wsHandler(socket: WebSocket, extra: TExtra) {
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
