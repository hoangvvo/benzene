import { Benzene, ExtractExtraType, isAsyncIterator } from "@benzene/core";
import { ExecutionResult, GraphQLError } from "graphql";
import {
  CompleteMessage,
  ConnectionInitMessage,
  MessageType,
  SubscribeMessage,
} from "./message";
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from "./protocol";
import { ConnectionContext, HandlerOptions, WebSocket } from "./types";

/**
 * Create a handler to handle incoming WebSocket
 * @param GQL A Benzene instance
 * @param options Handler options
 */
export function makeHandler<TBenzene extends Benzene>(
  GQL: TBenzene,
  options: HandlerOptions<ExtractExtraType<TBenzene>> = {}
) {
  type TExtra = ExtractExtraType<TBenzene>;
  type TConnectionContext = ConnectionContext<TExtra>;

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

  const stopSub = async (ctx: TConnectionContext, subId: string) => {
    const removingSub = ctx.subscriptions.get(subId);
    if (!removingSub) return;
    await removingSub.return?.();
    ctx.subscriptions.delete(subId);
  };

  const init = async (
    ctx: TConnectionContext,
    socket: WebSocket,
    message: ConnectionInitMessage
  ) => {
    if (ctx.connectionInitReceived) {
      return socket.close(4429, "Too many initialisation requests");
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
    if (permittedOrPayload === false) return socket.close(4403, "Forbidden");
    ctx.acknowledged = true;
    socket.send(
      JSON.stringify({
        type: MessageType.ConnectionAck,
        payload:
          typeof permittedOrPayload === "object"
            ? permittedOrPayload
            : undefined,
      })
    );
  };

  const subscribe = async (
    ctx: TConnectionContext,
    socket: WebSocket,
    message: SubscribeMessage
  ) => {
    if (!ctx.acknowledged) {
      return socket.close(4401, "Unauthorized");
    }
    if (!message.id) {
      return socket.close(4400, "Invalid message received");
    }
    if (ctx.subscriptions.has(message.id)) {
      return socket.close(4409, `Subscriber for ${message.id} already exists`);
    }
    if (!message.payload?.query) {
      return sendErr(socket, message.id, [
        new GraphQLError("Must provide query string."),
      ]);
    }
    const cachedOrResult = GQL.getCachedGQL(
      message.payload.query,
      message.payload.operationName
    );
    if (!("document" in cachedOrResult)) {
      return sendErr(
        socket,
        message.id,
        cachedOrResult.errors as GraphQLError[]
      );
    }
    const execArg = {
      document: cachedOrResult.document,
      contextValue: GQL.contextFn
        ? await GQL.contextFn({ extra: ctx.extra })
        : undefined,
      variableValues: message.payload.variables,
      operationName: message.payload.operationName,
    };

    if (cachedOrResult.operation !== "subscription") {
      sendRes(
        socket,
        message.id,
        await GQL.execute(execArg, cachedOrResult.jit)
      );
    } else {
      try {
        const result = await GQL.subscribe(execArg, cachedOrResult.jit);

        if (!isAsyncIterator(result)) {
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

  const cleanup = (ctx: TConnectionContext) => {
    for (const subId of ctx.subscriptions.keys()) stopSub(ctx, subId);
  };

  /**
   * A function that handles incoming WebSocket connection
   * @param socket The WebSocket connection {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket}
   * @param extra An extra field to store anything that needs to persist throughout connection, accessible in callbacks
   */
  return function graphqlWS(socket: WebSocket, extra: TExtra) {
    if (
      socket.protocol === undefined ||
      socket.protocol.indexOf(GRAPHQL_TRANSPORT_WS_PROTOCOL) === -1
    )
      // 1002: protocol error. We only support graphql_ws for now
      return socket.close(1002);

    const ctx: TConnectionContext = {
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
        return socket.close(4400, "Invalid message received");
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
