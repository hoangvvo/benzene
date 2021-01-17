import { suite } from 'uvu';
import assert from 'uvu/assert';
import WebSocket from 'ws';
import { Benzene } from '@benzene/core';
import { Config as GraphQLConfig } from '@benzene/core/src/types';
import { createServer, IncomingMessage, Server } from 'http';
import {
  GraphQLError,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { EventEmitter } from 'events';
import { AddressInfo } from 'net';
import { HandlerOptions, makeHandler } from '../src/handler';
import {
  MessageType,
  CompleteMessage,
  ConnectionAckMessage,
  ConnectionInitMessage,
  ErrorMessage,
  NextMessage,
  SubscribeMessage,
} from '../src/message';
import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from '../src/protocol';

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
    next() {
      return listening ? pullValue() : this.return();
    },
    return() {
      emptyQueue();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error: any) {
      emptyQueue();
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  } as any;
}

const Notification = new GraphQLObjectType({
  name: 'Notification',
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
        throw new Error('I told you so');
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
      name: 'Query',
      fields: {
        test: {
          type: GraphQLString,
          resolve: () => 'test',
        },
      },
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        notificationAdded: {
          type: Notification,
          subscribe: () => emitterAsyncIterator(ee, 'NOTIFICATION_ADDED'),
        },
        badAdded: {
          type: GraphQLString,
          subscribe: () => 'nope',
        },
      },
    }),
  });

async function startServer(
  handlerConfig?: Partial<HandlerOptions<any, any>>,
  options?: Partial<GraphQLConfig>,
  wsOptions?: { protocols?: string }
) {
  const ee = new EventEmitter();

  const gql = new Benzene({ schema: createSchema(ee), ...options });

  const server = createServer();
  const wss = new WebSocket.Server({ server });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  // We cross test different packages
  wss.on('connection', makeHandler(gql, handlerConfig));

  const ws = new WebSocket(
    `ws://localhost:${port}`,
    wsOptions?.protocols || GRAPHQL_TRANSPORT_WS_PROTOCOL
  );

  const datas: WebSocket.Data[] = [];
  let close: { code: number; reason: string };

  // Inspired by https://github.com/enisdenjo/graphql-ws/tree/master/src/tests/utils/tclient.ts#L28
  return new Promise<{
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
  }>((resolve) => {
    ws.on('message', datas.push);
    ws.on('close', (code, reason) => (close = { code, reason }));
    ws.once('open', () => {
      resolve({
        ws,
        async waitForMessage(test, expire) {
          return new Promise((resolve, reject) => {
            const done = () => {
              const next = datas.shift()!;
              try {
                test?.(JSON.parse(String(next)));
              } catch (e) {
                return reject(e);
              }
              resolve();
            };
            if (datas.length > 0) {
              return done();
            }
            ws.once('message', done);
            if (expire) {
              setTimeout(() => {
                ws.off('message', done); // expired
                resolve();
              }, expire);
            }
          });
        },
        async waitForClose(test, expire) {
          return new Promise((resolve, reject) => {
            const done = () => {
              try {
                test?.(close!.code, close!.reason);
              } catch (e) {
                return reject(e);
              }
              return resolve();
            };
            if (close) return done();
            ws.once('close', done);
            if (expire) {
              setTimeout(() => {
                // @ts-expect-error: its ok
                ws.off('close', done) = null; // expired
                resolve();
              }, expire);
            }
          });
        },
        send(message) {
          return new Promise((resolve, reject) => {
            ws.send(JSON.stringify(message), (err) =>
              err ? reject(err) : resolve()
            );
          });
        },
        async doAck() {
          return new Promise((resolve, reject) => {
            ws.once('message', (data) => {
              if (JSON.parse(String(data)).type === MessageType.ConnectionAck)
                resolve();
              else reject(`Unexpected message ${String(data)}`);
            });
            ws.send(
              JSON.stringify({
                type: MessageType.ConnectionAck,
              })
            );
          });
        },
        publish(message) {
          ee.emit('NOTIFICATION_ADDED', {
            notificationAdded: { message },
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

const wsSuite = suite('makeHandler');

wsSuite.after.each(cleanupTest);

wsSuite(
  'closes connection if use protocol other than graphql-transport-ws',
  async () => {
    const utils = await startServer(
      {},
      {},
      { protocols: 'graphql-subscriptions' }
    );

    await utils.waitForClose((code) => {
      assert.equal(code, 1002);
    });
  }
);

wsSuite('closes connection if message is invalid', async () => {
  const utils = await startServer();

  utils.ws.send("'");

  await utils.waitForClose((code, message) => {
    assert.equal(code, 4400);
    assert.equal(message, 'Invalid message received');
  });
});

wsSuite('replies with connection_ack', async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    assert.equal(message.type, MessageType.ConnectionAck);
  });
});

wsSuite('replies with connection_ack if onConnect() == true', async () => {
  const utils = await startServer({
    onConnect: () => true,
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForMessage((message) => {
    assert.equal(message.type, MessageType.ConnectionAck);
  });
});

wsSuite(
  'replies with connection_ack and payload if onConnect() == object',
  async () => {
    const utils = await startServer({
      onConnect: () => ({ test: 1 }),
    });

    utils.send({ type: MessageType.ConnectionInit });

    await utils.waitForMessage((message) => {
      assert.equal(message.type, MessageType.ConnectionAck);
      assert.equal((message as ConnectionAckMessage).payload, { test: 1 });
    });
  }
);

wsSuite('closes connection if onConnect() == false', async () => {
  const utils = await startServer({
    onConnect: async () => false,
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    assert.equal(code, 4403);
    assert.equal(reason, 'Forbidden');
  });
});

wsSuite('receive connectionParams in onConnect', async () => {
  const utils = await startServer({
    onConnect: async (ctx, connectionParams) => connectionParams,
  });

  utils.send({ type: MessageType.ConnectionInit, payload: { test: 'ok' } });

  await utils.waitForMessage((message) => {
    assert.equal(message.type, MessageType.ConnectionAck);
    assert.equal((message as ConnectionAckMessage).payload, { test: 'ok' });
  });
});

wsSuite('receive connection context and extra', async () => {
  const utils = await startServer({
    // see startServer - makeHandler(socket, request) request is extra
    onConnect: async (ctx) => ctx.extra instanceof IncomingMessage,
  });

  utils.send({ type: MessageType.ConnectionInit, payload: { test: 'ok' } });

  await utils.waitForMessage((message) => {
    assert.equal(message.type, MessageType.ConnectionAck);
  });
});

wsSuite('closes connection if onConnect() throws', async () => {
  const utils = await startServer({
    onConnect: async () => {
      throw new Error('bad');
    },
  });

  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    assert.equal(code, 4403);
    assert.equal(reason, 'bad');
  });
});

wsSuite('closes connection if too many initialisation requests', async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.ConnectionInit });
  utils.send({ type: MessageType.ConnectionInit });

  await utils.waitForClose((code, reason) => {
    assert.equal(code, 4429);
    assert.equal(reason, 'Too many initialisation requests');
  });
});

wsSuite('closes connection if subscribe before initialized', async () => {
  const utils = await startServer();

  utils.send({ type: MessageType.Subscribe, id: '1', payload: {} });

  await utils.waitForClose((code, reason) => {
    assert.equal(code, 4401);
    assert.equal(reason, 'Unauthorized');
  });
});

wsSuite('closes connection if subscriber id is already existed', async () => {
  const utils = await startServer();

  await utils.doAck();

  await utils.send({
    type: MessageType.Subscribe,
    payload: undefined,
    id: '1',
  });

  await utils.send({
    type: MessageType.Subscribe,
    payload: undefined,
    id: '1',
  });

  await utils.waitForClose((code, reason) => {
    assert.equal(code, 4409);
    assert.equal(reason, 'Subscriber for 1 already exists');
  });
});

wsSuite('returns errors if no payload', async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    type: MessageType.Subscribe,
    payload: undefined,
    id: '1',
  });

  await utils.waitForMessage((message) => {
    assert.equal(message, {
      id: '1',
      type: MessageType.Error,
      payload: [{ message: 'Must provide query string.' }],
    });
  });
});

wsSuite('returns errors on syntax error', async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    id: '1',
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
    assert.equal(message, {
      id: '1',
      type: MessageType.Error,
      payload: [
        {
          message: `Cannot query field "NNotificationAdded" on type "Subscription". Did you mean "notificationAdded"?`,
          locations: [{ line: 3, column: 13 }],
        },
      ],
    });
  });
});

wsSuite('format errors using formatError', async () => {
  const utils = await startServer(
    {},
    {
      formatError: () => {
        return new GraphQLError('Internal server error');
      },
    }
  );

  await utils.doAck();

  utils.send({
    id: '1',
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

  await utils.waitForMessage((message) => {
    assert.equal(message, {
      id: '1',
      type: MessageType.Next,
      payload: {
        data: {
          notificationAdded: {
            DO_NOT_USE_THIS_FIELD: null,
            message: 'Hello World',
          },
        },
        // Override "I told you so" error
        errors: [{ message: 'Internal server error' }],
      },
    });
  });
});

wsSuite('sends updates via subscription', async () => {
  const utils = await startServer();

  await utils.doAck();

  await utils.send({
    id: '1',
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

  utils.publish();

  await utils.waitForMessage((message) => {
    assert.equal(message, {
      type: MessageType.Next,
      id: '1',
      payload: {
        data: {
          notificationAdded: {
            message: 'Hello World',
            dummy: 'Hello World',
          },
        },
      },
    });
  });
});

wsSuite(
  'resolves queries and mutations (single result operation)',
  async () => {
    // We can also add a Query test just to be sure but Mutation one only should be sufficient
    const utils = await startServer();

    await utils.doAck();

    await utils.send({
      id: '1',
      payload: { query: `query { test }` },
      type: MessageType.Subscribe,
    });

    await utils.waitForMessage((message) => {
      assert.equal(message, {
        type: MessageType.Next,
        id: '1',
        payload: { data: { test: 'test' } },
      });
    });

    await utils.waitForMessage((message) => {
      assert.equal(message, {
        id: '1',
        type: MessageType.Complete,
      });
    });
  }
);

wsSuite('returns errors on gql.subscribe error', async () => {
  const utils = await startServer();

  await utils.doAck();

  utils.send({
    id: '1',
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
    assert.equal(message, {
      id: '1',
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

wsSuite('stops subscription upon MessageType.GQL_STOP', async () => {
  const utils = await startServer();

  await utils.doAck();

  await utils.send({
    id: '1',
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
    id: '1',
    type: MessageType.Complete,
  });

  utils.publish();

  await utils.waitForMessage(() => {
    assert.unreachable('Should have been unsubscribed');
  }, 100);
});

wsSuite.run();
