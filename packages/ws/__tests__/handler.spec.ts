import { Benzene } from "@benzene/core";
import { Options } from "@benzene/core/src/types";
import { EventEmitter } from "events";
import {
  GraphQLError,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import { createServer, IncomingMessage, Server } from "http";
import { AddressInfo } from "net";
import WebSocket from "ws";
import { makeHandler } from "../src/handler";
import {
  CompleteMessage,
  ConnectionAckMessage,
  ConnectionInitMessage,
  ErrorMessage,
  MessageType,
  NextMessage,
  SubscribeMessage,
} from "../src/message";
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from "../src/protocol";
import { HandlerOptions } from "../src/types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function emitterAsyncIterator(
  eventEmitter: EventEmitter,
  eventName: string
): AsyncIterableIterator<any> {
  const pullQueue = [] as any;
  const pushQueue = [] as any;
  let listening = true;
  eventEmitter.addListener(eventName, pushValue);

  function pushValue(event: any) {
    if (pullQueue.length !== 0) {
      pullQueue.shift()({ value: event, done: false });
    } else {
      pushQueue.push(event);
    }
  }

  function pullValue() {
    return new Promise((resolve) => {
      if (pushQueue.length !== 0) {
        resolve({ value: pushQueue.shift(), done: false });
      } else {
        pullQueue.push(resolve);
      }
    });
  }

  function emptyQueue() {
    if (listening) {
      listening = false;
      eventEmitter.removeListener(eventName, pushValue);
      for (const resolve of pullQueue) {
        resolve({ value: undefined, done: true });
      }
      pullQueue.length = 0;
      pushQueue.length = 0;
    }
  }

  return {
    // @ts-ignore
    async next() {
      return listening ? pullValue() : this.return?.();
    },
    return() {
      emptyQueue();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      emptyQueue();
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

const Notification = new GraphQLObjectType({
  name: "Notification",
  fields: {
    message: {
      type: GraphQLString,
    },
    dummy: {
      type: GraphQLString,
      resolve: ({ message }) => message,
    },
    DO_NOT_USE_THIS_FIELD: {
      type: GraphQLString,
      resolve: () => {
        throw new Error("I told you so");
      },
    },
    user: {
      type: GraphQLString,
      resolve: (_, __, context) => context.user,
    },
  },
});

let serverInit: { ws: WebSocket; server: Server };

const createSchema = (ee: EventEmitter) =>
  new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        test: {
          type: GraphQLString,
          resolve: () => "test",
        },
      },
    }),
    subscription: new GraphQLObjectType({
      name: "Subscription",
      fields: {
        notificationAdded: {
          type: Notification,
          subscribe: () => emitterAsyncIterator(ee, "NOTIFICATION_ADDED"),
        },
        badAdded: {
          type: GraphQLString,
          subscribe: () => "nope",
        },
      },
    }),
  });

interface ServerUtil {
  ws: WebSocket;
  waitForMessage: (
    test?: (
      message:
        | ConnectionAckMessage
        | NextMessage
        | ErrorMessage
        | CompleteMessage
    ) => void,
    expire?: number
  ) => Promise<void>;
  waitForClose: (
    test?: (code: number, reason: string) => void,
    expire?: number
  ) => Promise<void>;
  send: (
    message: ConnectionInitMessage | SubscribeMessage | CompleteMessage
  ) => Promise<void>;
  doAck: () => Promise<void>;
  publish: (message?: string) => void;
}

async function startServer(
  handlerOptions?: Partial<HandlerOptions<any>>,
  options?: Partial<Options<any, any>>,
  wsOptions?: { protocols?: string },
  extra?: any
): Promise<ServerUtil> {
  const ee = new EventEmitter();

  const gql = new Benzene({ schema: createSchema(ee), ...options });

  const server = createServer();
  const wss = new WebSocket.Server({ server });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  // We cross test different packages
  const graphqlWS = makeHandler(gql, handlerOptions);
  wss.on("connection", (socket) => {
    graphqlWS(socket, extra);
  });

  // Inspired by https://github.com/enisdenjo/graphql-ws/tree/master/src/tests/utils/tclient.ts#L28
  return new Promise((resolve) => {
    let closeEvent: WebSocket.CloseEvent;
    const queue: WebSocket.MessageEvent[] = [];

    const ws = new WebSocket(
      `ws://localhost:${port}`,
      wsOptions?.protocols || GRAPHQL_TRANSPORT_WS_PROTOCOL
    );

    serverInit = { ws, server };

    ws.onclose = (event) => (closeEvent = event);
    ws.onmessage = (message) => queue.push(message);

    ws.once("open", () => {
      resolve({
        ws,
        send(message) {
          return new Promise((resolve, reject) => {
            ws.send(JSON.stringify(message), (err) =>
              err ? reject(err) : resolve()
            );
          });
        },
        async doAck(this: ServerUtil) {
          this.send({
            type: MessageType.ConnectionInit,
          });
          return this.waitForMessage((message) => {
            expect(message.type).toBe(MessageType.ConnectionAck);
          });
        },
        publish(message = "Hello World") {
          ee.emit("NOTIFICATION_ADDED", {
            notificationAdded: { message },
          });
        },
        async waitForMessage(test, expire) {
          return new Promise((resolve, reject) => {
            const done = () => {
              const next = queue.shift()!;
              try {
                test?.(JSON.parse(String(next.data)));
              } catch (e) {
                reject(e);
              }
              resolve();
            };
            if (queue.length > 0) {
              return done();
            }
            ws.once("message", done);
            if (expire) {
              setTimeout(() => {
                ws.removeListener("message", done); // expired
                resolve();
              }, expire);
            }
          });
        },
        async waitForClose(test, expire) {
          return new Promise((resolve, reject) => {
            if (closeEvent) {
              test?.(closeEvent.code, closeEvent.reason);
              return resolve();
            }
            ws.onclose = (event) => {
              closeEvent = event;
              try {
                test?.(closeEvent.code, closeEvent.reason);
              } catch (e) {
                reject(e);
              }
              resolve();
            };
            if (expire) {
              setTimeout(() => {
                // @ts-ignore: Can do
                ws.onclose = null; // expired
                resolve();
              }, expire);
            }
          });
        },
      });
    });
  });
}

const cleanupTest = () => {
  serverInit.ws.close();
  serverInit.server.close();
};

afterEach(cleanupTest);

test("closes connection if use protocol other than graphql-transport-ws", async () => {
  const utils = await startServer(
    {},
    {},
    { protocols: "graphql-subscriptions" }
  );

  await utils.waitForClose((code) => {
    expect(code).toBe(1002);
  });
});

describe("closes connection if message is invalid", () => {
  it("when sending invalid JSON", async () => {
    const utils = await startServer();

    utils.ws.send("'");

    await utils.waitForClose((code, message) => {
      expect(code).toBe(4400);
      expect(message).toBe("Invalid message received");
    });
  });

  it("when subscribing without id", async () => {
    const utils = await startServer();

    await utils.doAck();

    // @ts-expect-error
    utils.send({
      payload: {},
      type: MessageType.Subscribe,
    });

    await utils.waitForClose((code, message) => {
      expect(code).toBe(4400);
      expect(message).toBe("Invalid message received");
    });
  });
});

test("replies with connection_ack", async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    expect(message.type).toBe(MessageType.ConnectionAck);
  });
});

test("replies with connection_ack if onConnect() == true", async () => {
  const utils = await startServer({
    onConnect: () => true,
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    expect(message.type).toBe(MessageType.ConnectionAck);
  });
});

test("replies with connection_ack and payload if onConnect() == object", async () => {
  const utils = await startServer({
    onConnect: () => ({ test: 1 }),
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    expect(message.type).toBe(MessageType.ConnectionAck);
    expect((message as ConnectionAckMessage).payload).toEqual({ test: 1 });
  });
});

test("closes connection if onConnect() == false", async () => {
  const utils = await startServer({
    onConnect: async () => false,
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    expect(code).toBe(4403);
    expect(reason).toBe("Forbidden");
  });
});

test("receive connectionParams in onConnect", async () => {
  const utils = await startServer({
    onConnect: async (ctx, connectionParams) => connectionParams,
  });

  utils.send({ type: MessageType.ConnectionInit, payload: { test: "ok" } });

  await utils.waitForMessage((message) => {
    expect(message.type).toBe(MessageType.ConnectionAck);
    expect((message as ConnectionAckMessage).payload).toEqual({ test: "ok" });
  });
});

test("receive connection context and extra in onConnect", async () => {
  const utils = await startServer({
    // see startServer - makeHandler(socket, request) request is extra
    onConnect: async (ctx) => ctx.extra instanceof IncomingMessage,
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    expect(message.type).toBe(MessageType.ConnectionAck);
  });
});

test("closes connection if onConnect() throws", async () => {
  const utils = await startServer({
    onConnect: async () => {
      throw new Error("bad");
    },
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    expect(code).toBe(4403);
    expect(reason).toBe("bad");
  });
});

test("closes connection if too many initialisation requests", async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.ConnectionInit });
  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    expect(code).toBe(4429);
    expect(reason).toBe("Too many initialisation requests");
  });
});

test("closes connection if subscribe before initialized", async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.Subscribe, id: "1", payload: {} });

  await utils.waitForClose((code, reason) => {
    expect(code).toBe(4401);
    expect(reason).toBe("Unauthorized");
  });
});

test("closes connection if subscriber id is already existed", async () => {
  const utils = await startServer();

  await utils.doAck();

  const query = `subscription { notificationAdded { message } }`;

  await utils.send({
    type: MessageType.Subscribe,
    payload: { query },
    id: "1",
  });

  await wait(50);

  utils.send({
    type: MessageType.Subscribe,
    payload: { query },
    id: "1",
  });

  await utils.waitForClose((code, reason) => {
    expect(code).toBe(4409);
    expect(reason).toBe("Subscriber for 1 already exists");
  });
});

test("returns errors if no payload", async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    type: MessageType.Subscribe,
    // @ts-expect-error
    payload: undefined,
    id: "1",
  });

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      type: MessageType.Error,
      payload: [{ message: "Must provide query string." }],
    });
  });
});

test("returns errors on syntax error", async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    id: "1",
    payload: {
      query: `
      subscription {
        NNotificationAdded {
          message
        }
      }
    `,
    },
    type: MessageType.Subscribe,
  });

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      type: MessageType.Error,
      payload: [
        {
          message: `Cannot query field "NNotificationAdded" on type "Subscription". Did you mean "notificationAdded"?`,
          locations: [{ line: 3, column: 9 }],
        },
      ],
    });
  });
});

test("format errors using formatErrorFn", async () => {
  const utils = await startServer(
    {},
    {
      formatErrorFn: () => {
        return new GraphQLError("Internal server error");
      },
    }
  );

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
            subscription {
              notificationAdded {
                message
                DO_NOT_USE_THIS_FIELD
              }
            }
          `,
    },
    type: MessageType.Subscribe,
  });

  await wait(50);

  await new Promise((resolve) => setTimeout(resolve, 50));

  utils.publish();

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      type: MessageType.Next,
      payload: {
        data: {
          notificationAdded: {
            DO_NOT_USE_THIS_FIELD: null,
            message: "Hello World",
          },
        },
        // Override "I told you so" error
        errors: [{ message: "Internal server error" }],
      },
    });
  });
});

test("resolves subscriptions and send updates", async () => {
  const utils = await startServer();

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
        subscription {
          notificationAdded {
            message
            dummy
          }
        }
      `,
    },
    type: MessageType.Subscribe,
  });

  await wait(50);

  utils.publish();

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      type: MessageType.Next,
      id: "1",
      payload: {
        data: {
          notificationAdded: {
            message: "Hello World",
            dummy: "Hello World",
          },
        },
      },
    });
  });
});

test("resolves queries and mutations (single result operation)", async () => {
  // We can also add a Query test just to be sure but Mutation one only should be sufficient
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    id: "1",
    payload: { query: `query { test }` },
    type: MessageType.Subscribe,
  });

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      type: MessageType.Next,
      id: "1",
      payload: { data: { test: "test" } },
    });
  });

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      type: MessageType.Complete,
    });
  });
});

test("creates GraphQL context using Benzene#contextFn", async () => {
  const utils = await startServer(undefined, {
    contextFn: async () => ({ user: "Alexa" }),
  });

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
          subscription {
            notificationAdded {
              user
            }
          }
          `,
    },
    type: MessageType.Subscribe,
  });

  await wait(50);

  utils.publish();

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      payload: {
        data: {
          notificationAdded: {
            user: "Alexa",
          },
        },
      },
      type: MessageType.Next,
    });
  });
});

test("Receive extra in Benzene#contextFn", async () => {
  const utils = await startServer(
    undefined,
    {
      contextFn: async ({ extra }) => ({
        user: extra === "foo"
      }),
    },
    undefined,
    "foo"
  );

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
          subscription {
            notificationAdded {
              user
            }
          }
          `,
    },
    type: MessageType.Subscribe,
  });

  await wait(50);

  utils.publish();

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      payload: {
        data: {
          notificationAdded: {
            user: "true",
          },
        },
      },
      type: MessageType.Next,
    });
  });
});

test("Receive nullable extra in Benzene#contextFn", async () => {
  const utils = await startServer(
    undefined,
    {
      contextFn: async ({ extra }) => ({
        user: extra === undefined,
      }),
    },
    undefined
  );

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
          subscription {
            notificationAdded {
              user
            }
          }
          `,
    },
    type: MessageType.Subscribe,
  });

  await wait(50);

  utils.publish();

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      payload: {
        data: {
          notificationAdded: {
            user: "true",
          },
        },
      },
      type: MessageType.Next,
    });
  });
});

test("returns errors on subscribe() error", async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    id: "1",
    payload: {
      query: `
      subscription {
        badAdded
      }
    `,
    },
    type: MessageType.Subscribe,
  });

  await utils.waitForMessage((message) => {
    expect(message).toEqual({
      id: "1",
      type: MessageType.Error,
      payload: [
        {
          message:
            'Subscription field must return Async Iterable. Received: "nope".',
        },
      ],
    });
  });
});

test("stops subscription upon MessageType.GQL_STOP", async () => {
  const utils = await startServer();

  await utils.doAck();

  await utils.send({
    id: "1",
    payload: {
      query: `
          subscription {
            notificationAdded {
              message
            }
          }
        `,
    },
    type: MessageType.Subscribe,
  });

  await utils.send({
    id: "1",
    type: MessageType.Complete,
  });

  utils.publish();

  await utils.waitForMessage(() => {
    throw new Error("Should have been unsubscribed");
  }, 100);
});

// TODO: Add test to test on close event cleanup
