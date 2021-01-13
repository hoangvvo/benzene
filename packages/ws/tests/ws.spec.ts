import { suite } from 'uvu';
import assert from 'uvu/assert';
import WebSocket from 'ws';
import { Benzene } from '@benzene/core';
import { Config as GraphQLConfig } from '@benzene/core/src/types';
import { createServer, Server } from 'http';
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
  handlerConfig?: Partial<HandlerOptions>,
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

  const gql = new Benzene({ schema, ...options });
  // @ts-ignore
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
  expect: ConnectionAckMessage | NextMessage | ErrorMessage | CompleteMessage,
  preFn?: () => any
) => {
  return new Promise<void>((resolve, reject) => {
    const fn = (chunk: WebSocket.Data) => {
      const json: typeof expect = JSON.parse(chunk.toString());
      if (!(json.type === expect.type)) return;
      try {
        assert.equal(json, expect);
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
  message: ConnectionInitMessage | SubscribeMessage | CompleteMessage
) => {
  return new Promise<void>((resolve, reject) => {
    ws.send(JSON.stringify(message), (err) => (err ? reject(err) : resolve()));
  });
};

const cleanupTest = () => {
  const { server, ws } = serverInit;
  ws.close();
  server.close();
};

const wsSuite = suite('makeHandler');

wsSuite.after.each(cleanupTest);

wsSuite(
  'closes connection if use protocol other than graphql-transport-ws',
  async () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const { ws } = await startServer(
        {},
        {},
        { protocols: 'graphql-subscriptions' }
      );
      ws.on('close', (code) => {
        assert.equal(code, 1002);
        resolve();
      });
    });
  }
);

wsSuite('closes connection if message is invalid', async () => {
  const { ws } = await startServer();

  return new Promise((resolve) => {
    ws.on('close', (code, message) => {
      assert.equal(code, 4400);
      assert.equal(message, 'Invalid message received');
      resolve();
    });

    // @ts-expect-error: we are checking invalid message
    sendMessage(ws, JSON.stringify('test'));
  });
});

wsSuite('replies with connection_ack', async () => {
  const { ws } = await startServer();
  await expectMessage(ws, { type: MessageType.ConnectionAck }, () => {
    sendMessage(ws, { type: MessageType.ConnectionInit });
  });
});

wsSuite(
  'calls onConnect() with ctx and connectionParams upon connection_init',
  () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<void>(async (resolve, reject) => {
      const { ws } = await startServer({
        onConnect: (ctx, params: any) => {
          if (ctx.subscriptions && params.test === 'ok') resolve();
          reject();
        },
      });

      sendMessage(ws, {
        type: MessageType.ConnectionInit,
        payload: { test: 'ok' },
      });
    });
  }
);

wsSuite('replies with connection_ack if onConnect() == true', async () => {
  const { ws } = await startServer({
    onConnect: () => true,
  });
  await expectMessage(ws, { type: MessageType.ConnectionAck }, () => {
    sendMessage(ws, { type: MessageType.ConnectionInit });
  });
});

wsSuite(
  'replies with connection_ack and payload if onConnect() == object',
  async () => {
    const { ws } = await startServer({
      onConnect: () => ({ test: 1 }),
    });
    await expectMessage(
      ws,
      { type: MessageType.ConnectionAck, payload: { test: 1 } },
      () => {
        sendMessage(ws, { type: MessageType.ConnectionInit });
      }
    );
  }
);

wsSuite('closes connection if onConnect() == false', async () => {
  const { ws } = await startServer({
    onConnect: async () => false,
  });

  return new Promise<void>((resolve) => {
    ws.on('close', (code, reason) => {
      assert.equal(code, 4403);
      assert.equal(reason, 'Forbidden');
      resolve();
    });

    sendMessage(ws, { type: MessageType.ConnectionInit });
  });
});

wsSuite('closes connection if onConnect() throws', async () => {
  const { ws } = await startServer({
    onConnect: async () => {
      throw new Error('bad');
    },
  });

  return new Promise<void>((resolve) => {
    ws.on('close', (code, reason) => {
      assert.equal(code, 4403);
      assert.equal(reason, 'bad');
      resolve();
    });

    sendMessage(ws, { type: MessageType.ConnectionInit });
  });
});

wsSuite('closes connection if too many initialisation requests', async () => {
  const { ws } = await startServer();

  return new Promise<void>((resolve) => {
    ws.on('close', (code, reason) => {
      assert.equal(code, 4429);
      assert.equal(reason, 'Too many initialisation requests');
      resolve();
    });

    sendMessage(ws, { type: MessageType.ConnectionInit });
    sendMessage(ws, { type: MessageType.ConnectionInit });
  });
});

wsSuite('closes connection if subscribe before initialized', async () => {
  const { ws } = await startServer();

  return new Promise<void>((resolve) => {
    ws.on('close', (code, reason) => {
      assert.equal(code, 4401);
      assert.equal(reason, 'Unauthorized');
      resolve();
    });

    sendMessage(ws, { type: MessageType.Subscribe, id: '1', payload: {} });
  });
});

wsSuite('error if no payload', async () => {
  const { ws } = await startServer();

  expectMessage(
    ws,
    {
      id: '1',
      type: MessageType.Error,
      payload: [{ message: 'Must provide query string.' }],
    },
    () =>
      sendMessage(ws, {
        type: MessageType.Subscribe,
        payload: undefined,
        id: '1',
      })
  );

  expectMessage(
    ws,
    {
      id: '1',
      type: MessageType.Error,
      payload: [{ message: 'Must provide query string.' }],
    },
    () =>
      sendMessage(ws, {
        type: MessageType.Subscribe,
        payload: { query: '' },
        id: '1',
      })
  );
});

// wsSuite('sends updates via subscription', async () => {
//   const { ws, publish } = await startServer();

//   await sendStartMessage(ws, '1', {
//     query: `
//         subscription {
//           notificationAdded {
//             message
//             dummy
//           }
//         }
//       `,
//   });
//   await expectMessage(
//     ws,
//     {
//       type: MessageType.GQL_DATA,
//       id: '1',
//       payload: {
//         data: {
//           notificationAdded: {
//             message: 'Hello World',
//             dummy: 'Hello World',
//           },
//         },
//       },
//     },
//     publish
//   );
// });

// wsSuite('errors on malformed message', async () => {
//   // eslint-disable-next-line no-async-promise-executor
//   const { ws } = await startServer();
//   ws.send(`{"type":"connection_init","payload":`);
//   await expectMessage(ws, {
//     type: MessageType.GQL_ERROR,
//     payload: { errors: [{ message: 'Malformed message' }] },
//   });
// });

// wsSuite('format errors using formatError', async () => {
//   const { ws, publish } = await startServer(
//     {},
//     {
//       formatError: () => {
//         return new GraphQLError('Internal server error');
//       },
//     }
//   );
//   await sendStartMessage(ws, '1', {
//     query: `
//         subscription {
//           notificationAdded {
//             message
//             DO_NOT_USE_THIS_FIELD
//           }
//         }
//       `,
//   });
//   await expectMessage(
//     ws,
//     {
//       id: '1',
//       type: MessageType.GQL_DATA,
//       payload: {
//         data: {
//           notificationAdded: {
//             DO_NOT_USE_THIS_FIELD: null,
//             message: 'Hello World',
//           },
//         },
//         // Override "I told you so" error
//         errors: [{ message: 'Internal server error' }],
//       },
//     },
//     publish
//   );
// });

// wsSuite('errors on empty query', async function () {
//   const { ws } = await startServer();
//   await expectMessage(
//     ws,
//     {
//       type: MessageType.GQL_ERROR,
//       payload: { errors: [{ message: 'Must provide query string.' }] },
//     },
//     () =>
//       sendStartMessage(ws, '1', {
//         query: null,
//       })
//   );
// });

// wsSuite('resolves also queries and mutations', async function () {
//   // We can also add a Query test just to be sure but Mutation one only should be sufficient
//   const { ws } = await startServer();
//   await sendStartMessage(ws, '1', { query: `query { test }` }, 0);
//   await Promise.all([
//     expectMessage(ws, {
//       type: MessageType.GQL_DATA,
//       id: '1',
//       payload: { data: { test: 'test' } },
//     }),
//     expectMessage(ws, {
//       id: '1',
//       type: MessageType.GQL_COMPLETE,
//     }),
//   ]);
// });

// wsSuite('errors on gql.subscribe error', async () => {
//   const { ws } = await startServer();
//   await expectMessage(
//     ws,
//     {
//       id: '1',
//       type: MessageType.GQL_ERROR,
//       payload: {
//         errors: [
//           {
//             message:
//               'Subscription field must return Async Iterable. Received: "nope".',
//           },
//         ],
//       },
//     },
//     () =>
//       sendStartMessage(
//         ws,
//         '1',
//         {
//           query: `
//           subscription {
//             badAdded
//           }
//         `,
//         },
//         0
//       )
//   );
// });

// wsSuite('errors on syntax error', async () => {
//   const { ws } = await startServer();
//   await expectMessage(
//     ws,
//     {
//       id: '1',
//       type: MessageType.GQL_ERROR,
//       payload: {
//         errors: [
//           {
//             message: `Cannot query field "NNotificationAdded" on type "Subscription". Did you mean "notificationAdded"?`,
//             locations: [{ line: 3, column: 13 }],
//           },
//         ],
//       },
//     },
//     () =>
//       sendStartMessage(
//         ws,
//         '1',
//         {
//           query: `
//           subscription {
//             NNotificationAdded {
//               message
//             }
//           }
//         `,
//         },
//         0
//       )
//   );
// });

// wsSuite('resolves options.context that is an object', async () => {
//   const { ws, publish } = await startServer({
//     context: { user: 'Alexa' },
//   });
//   await sendStartMessage(ws, '1', {
//     query: `
//           subscription {
//             notificationAdded {
//               user
//             }
//           }
//         `,
//   });
//   await expectMessage(
//     ws,
//     {
//       type: MessageType.GQL_DATA,
//       id: '1',
//       payload: {
//         data: {
//           notificationAdded: {
//             user: 'Alexa',
//           },
//         },
//       },
//     },
//     publish
//   );
// });

// wsSuite('resolves options.context that is a function', async () => {
//   const { ws, publish } = await startServer({
//     context: async () => ({
//       user: 'Alice',
//     }),
//   });
//   await sendStartMessage(ws, '1', {
//     query: `
//           subscription {
//             notificationAdded {
//               user
//             }
//           }
//         `,
//   });
//   await expectMessage(
//     ws,
//     {
//       type: MessageType.GQL_DATA,
//       id: '1',
//       payload: {
//         data: {
//           notificationAdded: {
//             user: 'Alice',
//           },
//         },
//       },
//     },
//     publish
//   );
// });

// wsSuite('queue messages until context is resolved', async () => {
//   const { ws, publish } = await startServer({
//     context: () =>
//       new Promise((resolve) => {
//         // Reasonable time for messages to start to queue
//         // FIXME: We still need to be sure though.
//         setTimeout(() => resolve({ user: 'Alice' }), 50);
//       }),
//   });
//   await sendStartMessage(ws, '1', {
//     query: `
//         subscription {
//           notificationAdded {
//             user
//           }
//         }
//       `,
//   });
//   await expectMessage(
//     ws,
//     {
//       type: MessageType.GQL_DATA,
//       id: '1',
//       payload: {
//         data: {
//           notificationAdded: {
//             user: 'Alice',
//           },
//         },
//       },
//     },
//     publish
//   );
// });

// wsSuite('closes connection on error in context function', async () => {
//   const context = async () => {
//     throw new Error('You must be authenticated!');
//   };
//   // eslint-disable-next-line no-async-promise-executor
//   await new Promise(async (done) => {
//     await startServer(
//       { context },
//       {},
//       {
//         init: (socket) => {
//           Promise.all([
//             new Promise((resolve) => socket.on('close', resolve)),
//             expectMessage(socket, {
//               type: MessageType.GQL_CONNECTION_ERROR,
//               payload: {
//                 errors: [
//                   {
//                     message:
//                       'Context creation failed: You must be authenticated!',
//                   },
//                 ],
//               },
//             }),
//           ]).then(done);
//         },
//       }
//     );
//   });
// });

// wsSuite('stops subscription upon MessageType.GQL_STOP', async () => {
//   const { ws, publish } = await startServer();
//   await sendStartMessage(ws, '1', {
//     query: `
//         subscription {
//           notificationAdded {
//             message
//           }
//         }
//       `,
//   });
//   await sendMessage(ws, MessageType.GQL_STOP, '1');
//   await expectMessage(ws, { type: MessageType.GQL_COMPLETE, id: '1' });
//   await new Promise((resolve, reject) => {
//     publish();
//     // Wait a bit to see if there is an anouncement
//     const timer = setTimeout(() => {
//       resolve();
//     }, 20);
//     ws.on('message', (chunk) => {
//       if (JSON.parse(chunk.toString()).type === MessageType.GQL_DATA) {
//         clearTimeout(timer);
//         reject();
//       }
//     });
//   });
// });

// // compat-only
// wsSuite('closes connection on connection_terminate', async () => {
//   const { ws } = await startServer();
//   await sendMessage(ws, MessageType.GQL_CONNECTION_INIT);
//   await expectMessage(ws, { type: MessageType.GQL_CONNECTION_ACK });
//   await new Promise((resolve) => {
//     ws.on('close', resolve);
//     sendMessage(ws, MessageType.GQL_CONNECTION_TERMINATE);
//   });
// });

wsSuite.run();

// const connSuite = suite('SubscriptionConnection');

// connSuite.after.each(cleanupTest);

// connSuite('return all subscription operations on disconnection', async () => {
//   let operations: Map<string, any>;
//   const { ws } = await startServer({
//     onStart() {
//       // @ts-ignore
//       operations = operations || this.operations;
//     },
//   });
//   await sendStartMessage(ws, '1', {
//     query: `
//         subscription {
//           notificationAdded {
//             user
//           }
//         }
//       `,
//   });
//   assert.equal(operations!.size, 1);
//   ws.close();
//   // Wait a bit for ws to close
//   await new Promise((resolve) => setTimeout(resolve, 20));
//   assert.equal(operations!.size, 0);
// });

// connSuite.run();
