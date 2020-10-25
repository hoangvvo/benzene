import { suite } from 'uvu';
import assert from 'uvu/assert';
import WebSocket from 'ws';
import { GraphQL, FormattedExecutionResult } from '@benzene/core';
import { Config as GraphQLConfig } from '@benzene/core/src/types';
import { createServer, Server } from 'http';
import {
  GraphQLError,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { EventEmitter } from 'events';
import { SubscriptionConnection } from '../src/connection';
import { AddressInfo } from 'net';
import { wsHandler } from '../src';
import MessageTypes from '../src/messageTypes';
import { HandlerConfig, OperationMessage } from '../src/types';

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

let serverInit: { ws: WebSocket; server: Server; publish: () => void };

async function startServer(
  handlerConfig?: Partial<HandlerConfig>,
  options?: Partial<GraphQLConfig>,
  wsOptions?: {
    protocols?: string;
    init?: (socket: WebSocket) => void;
  }
) {
  const ee = new EventEmitter();

  const schema = new GraphQLSchema({
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

  const gql = new GraphQL({ schema, ...options });
  // @ts-ignore
  const server = createServer();
  const wss = new WebSocket.Server({ server });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  // We cross test different packages
  // @ts-ignore
  wss.on('connection', wsHandler(gql, handlerConfig));

  const ws = new WebSocket(
    `ws://localhost:${port}`,
    wsOptions?.protocols || 'graphql-ws'
  );

  // This is for early event register.
  wsOptions?.init?.(ws);

  await new Promise((resolve) => (ws as WebSocket).on('open', resolve));

  return (serverInit = {
    server,
    ws,
    publish: (message = 'Hello World') => {
      ee.emit('NOTIFICATION_ADDED', {
        notificationAdded: { message },
      });
    },
  });
}

const expectMessage = (
  ws: WebSocket,
  message: OperationMessage & { payload?: FormattedExecutionResult },
  preFn?: () => any
) => {
  return new Promise((resolve, reject) => {
    const fn = (chunk: WebSocket.Data) => {
      const json: OperationMessage = JSON.parse(chunk.toString());
      if (!(json.type === message.type)) return;
      try {
        assert.equal(json, message);
      } catch (e) {
        reject(e);
      }
      ws.off('message', fn);
      resolve();
    };
    ws.on('message', fn);
    preFn?.();
  });
};

const sendMessage = (
  ws: WebSocket,
  type: OperationMessage['type'],
  id?: OperationMessage['id'],
  payload?: OperationMessage['payload']
) => {
  return new Promise((resolve, reject) => {
    ws.send(
      JSON.stringify({
        type,
        id,
        payload,
      }),
      (err) => (err ? reject(err) : resolve())
    );
  });
};

const sendStartMessage = (
  ws: WebSocket,
  id: OperationMessage['id'],
  payload: OperationMessage['payload'],
  waitMs = 50
) => {
  return new Promise((resolve, reject) => {
    ws.send(
      JSON.stringify({
        type: MessageTypes.GQL_START,
        id,
        payload,
      }),
      (err) =>
        err ? reject(err) : waitMs ? wait(waitMs).then(resolve) : resolve()
    );
  });
};

const cleanupTest = () => {
  const { server, ws } = serverInit;
  ws.close();
  server.close();
};

const wsSuite = suite('wsHandler');

wsSuite.after.each(cleanupTest);

// Compat-only
wsSuite('replies with connection_ack', async () => {
  const { ws } = await startServer();
  await expectMessage(ws, { type: MessageTypes.GQL_CONNECTION_ACK }, () =>
    sendMessage(ws, MessageTypes.GQL_CONNECTION_INIT)
  );
});

wsSuite('sends updates via subscription', async () => {
  const { ws, publish } = await startServer();
  await sendStartMessage(ws, '1', {
    query: `
        subscription {
          notificationAdded {
            message
            dummy
          }
        }
      `,
  });
  await expectMessage(
    ws,
    {
      type: MessageTypes.GQL_DATA,
      id: '1',
      payload: {
        data: {
          notificationAdded: {
            message: 'Hello World',
            dummy: 'Hello World',
          },
        },
      },
    },
    publish
  );
});

wsSuite('rejects socket protocol other than graphql-ws', async () => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const { ws } = await startServer(
      {},
      {},
      { protocols: 'graphql-subscriptions' }
    );
    ws.on('close', resolve);
  });
});

wsSuite('errors on malformed message', async () => {
  // eslint-disable-next-line no-async-promise-executor
  const { ws } = await startServer();
  ws.send(`{"type":"connection_init","payload":`);
  await expectMessage(ws, {
    type: MessageTypes.GQL_ERROR,
    payload: { errors: [{ message: 'Malformed message' }] },
  });
});

wsSuite('format errors using formatError', async () => {
  const { ws, publish } = await startServer(
    {},
    {
      formatError: () => {
        return new GraphQLError('Internal server error');
      },
    }
  );
  await sendStartMessage(ws, '1', {
    query: `
        subscription {
          notificationAdded {
            message
            DO_NOT_USE_THIS_FIELD
          }
        }
      `,
  });
  await expectMessage(
    ws,
    {
      id: '1',
      type: MessageTypes.GQL_DATA,
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
    },
    publish
  );
});

wsSuite('errors on empty query', async function () {
  const { ws } = await startServer();
  await expectMessage(
    ws,
    {
      type: MessageTypes.GQL_ERROR,
      payload: { errors: [{ message: 'Must provide query string.' }] },
    },
    () =>
      sendStartMessage(ws, '1', {
        query: null,
      })
  );
});

wsSuite('resolves also queries and mutations', async function () {
  // We can also add a Query test just to be sure but Mutation one only should be sufficient
  const { ws } = await startServer();
  await sendStartMessage(ws, '1', { query: `query { test }` }, 0);
  await Promise.all([
    expectMessage(ws, {
      type: MessageTypes.GQL_DATA,
      id: '1',
      payload: { data: { test: 'test' } },
    }),
    expectMessage(ws, {
      id: '1',
      type: MessageTypes.GQL_COMPLETE,
    }),
  ]);
});

wsSuite('errors on gql.subscribe error', async () => {
  const { ws } = await startServer();
  await expectMessage(
    ws,
    {
      id: '1',
      type: MessageTypes.GQL_ERROR,
      payload: {
        errors: [
          {
            message:
              'Subscription field must return Async Iterable. Received: "nope".',
          },
        ],
      },
    },
    () =>
      sendStartMessage(
        ws,
        '1',
        {
          query: `
          subscription {
            badAdded
          }
        `,
        },
        0
      )
  );
});

wsSuite('errors on syntax error', async () => {
  const { ws } = await startServer();
  await expectMessage(
    ws,
    {
      id: '1',
      type: MessageTypes.GQL_ERROR,
      payload: {
        errors: [
          {
            message: `Cannot query field "NNotificationAdded" on type "Subscription". Did you mean "notificationAdded"?`,
            locations: [{ line: 3, column: 13 }],
          },
        ],
      },
    },
    () =>
      sendStartMessage(
        ws,
        '1',
        {
          query: `
          subscription {
            NNotificationAdded {
              message
            }
          }
        `,
        },
        0
      )
  );
});

wsSuite('resolves options.context that is an object', async () => {
  const { ws, publish } = await startServer({
    context: { user: 'Alexa' },
  });
  await sendStartMessage(ws, '1', {
    query: `
          subscription {
            notificationAdded {
              user
            }
          }
        `,
  });
  await expectMessage(
    ws,
    {
      type: MessageTypes.GQL_DATA,
      id: '1',
      payload: {
        data: {
          notificationAdded: {
            user: 'Alexa',
          },
        },
      },
    },
    publish
  );
});

wsSuite('resolves options.context that is a function', async () => {
  const { ws, publish } = await startServer({
    context: async () => ({
      user: 'Alice',
    }),
  });
  await sendStartMessage(ws, '1', {
    query: `
          subscription {
            notificationAdded {
              user
            }
          }
        `,
  });
  await expectMessage(
    ws,
    {
      type: MessageTypes.GQL_DATA,
      id: '1',
      payload: {
        data: {
          notificationAdded: {
            user: 'Alice',
          },
        },
      },
    },
    publish
  );
});

wsSuite('queue messages until context is resolved', async () => {
  const { ws, publish } = await startServer({
    context: () =>
      new Promise((resolve) => {
        // Reasonable time for messages to start to queue
        // FIXME: We still need to be sure though.
        setTimeout(() => resolve({ user: 'Alice' }), 50);
      }),
  });
  await sendStartMessage(ws, '1', {
    query: `
        subscription {
          notificationAdded {
            user
          }
        }
      `,
  });
  await expectMessage(
    ws,
    {
      type: MessageTypes.GQL_DATA,
      id: '1',
      payload: {
        data: {
          notificationAdded: {
            user: 'Alice',
          },
        },
      },
    },
    publish
  );
});

wsSuite('closes connection on error in context function', async () => {
  const context = async () => {
    throw new Error('You must be authenticated!');
  };
  // eslint-disable-next-line no-async-promise-executor
  await new Promise(async (done) => {
    await startServer(
      { context },
      {},
      {
        init: (socket) => {
          Promise.all([
            new Promise((resolve) => socket.on('close', resolve)),
            expectMessage(socket, {
              type: MessageTypes.GQL_CONNECTION_ERROR,
              payload: {
                errors: [
                  {
                    message:
                      'Context creation failed: You must be authenticated!',
                  },
                ],
              },
            }),
          ]).then(done);
        },
      }
    );
  });
});

wsSuite('stops subscription upon MessageTypes.GQL_STOP', async () => {
  const { ws, publish } = await startServer();
  await sendStartMessage(ws, '1', {
    query: `
        subscription {
          notificationAdded {
            message
          }
        }
      `,
  });
  await sendMessage(ws, MessageTypes.GQL_STOP, '1');
  await expectMessage(ws, { type: MessageTypes.GQL_COMPLETE, id: '1' });
  await new Promise((resolve, reject) => {
    publish();
    // Wait a bit to see if there is an anouncement
    const timer = setTimeout(() => {
      resolve();
    }, 20);
    ws.on('message', (chunk) => {
      if (JSON.parse(chunk.toString()).type === MessageTypes.GQL_DATA) {
        clearTimeout(timer);
        reject();
      }
    });
  });
});

// compat-only
wsSuite('closes connection on connection_terminate', async () => {
  const { ws } = await startServer();
  await sendMessage(ws, MessageTypes.GQL_CONNECTION_INIT);
  await expectMessage(ws, { type: MessageTypes.GQL_CONNECTION_ACK });
  await new Promise((resolve) => {
    ws.on('close', resolve);
    sendMessage(ws, MessageTypes.GQL_CONNECTION_TERMINATE);
  });
});

wsSuite.run();

const connSuite = suite('SubscriptionConnection');

connSuite.after.each(cleanupTest);

connSuite('call onStart on subscription start', async () => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const { ws } = await startServer({
      context: { test: 'test' },
      onStart(id, execArg) {
        assert.instance(this, SubscriptionConnection);
        assert.is(id, '1');
        assert.is(execArg.document.kind, 'Document');
        assert.is(execArg.contextValue.test, 'test');
        resolve();
      },
    });
    await sendStartMessage(ws, '1', {
      query: `
          subscription {
            notificationAdded {
              user
            }
          }
        `,
    });
  });
});

connSuite('call onStart on execution', async () => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const { ws } = await startServer({
      onStart(id, execArg) {
        assert.instance(this, SubscriptionConnection);
        assert.is(id, '1');
        assert.is(execArg.document.kind, 'Document');
        resolve();
      },
    });
    await sendStartMessage(ws, '1', {
      query: `query { test }`,
    });
  });
});

connSuite('call onComplete on subscription stop', async () => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const { ws } = await startServer({
      onComplete(id) {
        assert.instance(this, SubscriptionConnection);
        assert.is(id, '1');
        resolve();
      },
    });
    await sendStartMessage(ws, '1', {
      query: `
          subscription {
            notificationAdded {
              user
            }
          }
        `,
    });
    await sendMessage(ws, MessageTypes.GQL_STOP, '1');
  });
});

connSuite('return all subscription operations on disconnection', async () => {
  let operations: Map<string, any>;
  const { ws } = await startServer({
    onStart() {
      // @ts-ignore
      operations = operations || this.operations;
    },
  });
  await sendStartMessage(ws, '1', {
    query: `
        subscription {
          notificationAdded {
            user
          }
        }
      `,
  });
  assert.equal(operations!.size, 1);
  ws.close();
  // Wait a bit for ws to close
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(operations!.size, 0);
});

connSuite.run();
