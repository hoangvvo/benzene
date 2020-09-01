import { suite } from 'uvu';
import WebSocket from 'ws';
import { httpHandler } from '@benzene/server';
import { GraphQL } from '@benzene/core';
import { Config as GraphQLConfig } from '@benzene/core/src/types';
import { strict as assert } from 'assert';
import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import fetch from 'node-fetch';
import {
  GraphQLError,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { wsHandler } from '../src';
import MessageTypes from '../src/messageTypes';
import { HandlerConfig } from '../src/types';

const pubsub = new PubSub();

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
      resolve: (obj, variables, context) => context.user,
    },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      test: {
        type: GraphQLString,
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      addNotification: {
        type: Notification,
        args: {
          message: { type: GraphQLString },
        },
        resolve: async (_: any, { message }: { message: string }) => {
          const notification = { message };
          await pubsub.publish('NOTIFICATION_ADDED', {
            notificationAdded: notification,
          });
          return notification;
        },
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      notificationAdded: {
        type: Notification,
        subscribe: () => pubsub.asyncIterator('NOTIFICATION_ADDED'),
      },
    },
  }),
});

let serverInit;

async function startServer(
  handlerConfig?: Partial<HandlerConfig>,
  options?: Partial<GraphQLConfig>,
  ws: WebSocket = new WebSocket('ws://localhost:4000', 'graphql-ws')
) {
  const gql = new GraphQL({ schema, ...options });
  // @ts-ignore
  const server = createServer(httpHandler(gql));
  const wss = new WebSocket.Server({ server });
  // We cross test different packages
  // @ts-ignore
  wss.on('connection', wsHandler(gql, handlerConfig));
  const client = WebSocket.createWebSocketStream(ws, {
    encoding: 'utf8',
    objectMode: true,
  });
  await new Promise((resolve) => server.listen(4000, resolve));
  return (serverInit = { server, client, ws });
}

const wsSuite = suite('wsHandler');

wsSuite.after.each(() => {
  if (!serverInit) return;
  const { server, client } = serverInit;
  client.end();
  server.close();
});

function sendMessageMutation() {
  return fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation {
          addNotification(message: "Hello World") {
            message
          }
        }`,
    }),
  });
}

wsSuite('replies with connection_ack', async () => {
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  await new Promise((resolve) => {
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      assert.deepStrictEqual(json, { type: MessageTypes.GQL_CONNECTION_ACK });
      resolve();
    });
  });
});
wsSuite('sends updates via subscription', async function () {
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
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
    })
  );
  await new Promise((resolve, reject) => {
    client.on('data', (chunk) => {
      const data = JSON.parse(chunk);
      if (data.type === MessageTypes.GQL_CONNECTION_ACK) {
        return sendMessageMutation();
      }
      if (data.type === MessageTypes.GQL_DATA) {
        assert.deepStrictEqual(data, {
          type: MessageTypes.GQL_DATA,
          id: 1,
          payload: {
            data: {
              notificationAdded: {
                message: 'Hello World',
                dummy: 'Hello World',
              },
            },
          },
        });
        resolve();
      }
    });
  });
});
wsSuite('rejects socket protocol other than graphql-ws', async () => {
  const ws = new WebSocket('ws://localhost:4000', 'graphql-subscriptions');
  await startServer({}, {}, ws);
  await new Promise((resolve) =>
    ws.on('close', () => {
      resolve();
    })
  );
});
wsSuite('errors on malformed message', async () => {
  // eslint-disable-next-line no-async-promise-executor
  const { server, client, ws } = await startServer();
  return new Promise((resolve) => {
    client.write(`{"type":"connection_init","payload":`);
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type === 'error') {
        assert.deepStrictEqual(json, {
          type: 'error',
          payload: { errors: [{ message: 'Malformed message' }] },
        });
        resolve();
      }
    });
  });
});
wsSuite('format errors using formatError', async () => {
  const { server, client, ws } = await startServer(
    {},
    {
      formatError: () => {
        return new GraphQLError('Internal server error');
      },
    }
  );

  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
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
    })
  );
  return new Promise((resolve) => {
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type === MessageTypes.GQL_CONNECTION_ACK) {
        sendMessageMutation();
      }
      if (json.type === MessageTypes.GQL_DATA) {
        assert.deepStrictEqual(json, {
          id: 1,
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
        });
        resolve();
      }
    });
  });
});
wsSuite('errors on empty query', async function () {
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: null,
      },
    })
  );
  await new Promise((resolve, reject) => {
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type === 'error') {
        assert.deepStrictEqual(json, {
          type: 'error',
          payload: { errors: [{ message: 'Must provide query string.' }] },
        });
        resolve();
      }
    });
  });
});
wsSuite('resolves also queries and mutations', async function () {
  // We can also add a Query test just to be sure but Mutation one only should be sufficient
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
            mutation {
              addNotification(message: "Hello World") {
                message
              }
            }
          `,
      },
    })
  );
  await new Promise((resolve, reject) => {
    let resolved = false;
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type === `data`) {
        assert.deepStrictEqual(json, {
          type: MessageTypes.GQL_DATA,
          id: 1,
          payload: { data: { addNotification: { message: 'Hello World' } } },
        });
        resolved = true;
      }
      if (json.type === MessageTypes.GQL_COMPLETE && resolved === true) {
        // It should complete the subscription immediately since it is a mutations/queries
        resolve();
      }
      return;
    });
  });
});
wsSuite('errors on syntax error', async () => {
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
              subscription {
                NNotificationAdded {
                  message
                }
              }
            `,
      },
    })
  );
  await new Promise((resolve, reject) => {
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type === MessageTypes.GQL_ERROR) {
        const {
          payload: {
            errors: [{ message }],
          },
        } = json;
        assert.deepEqual(
          message,
          `Cannot query field "NNotificationAdded" on type "Subscription". Did you mean "notificationAdded"?`
        );
        resolve();
        // FIXME: Add test for Subscription is stopped after this
      }
    });
  });
});

wsSuite('resolves options.context that is an object', async () => {
  const { client } = await startServer({
    context: { user: 'Alexa' },
  });
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
              subscription {
                notificationAdded {
                  user
                }
              }
            `,
      },
    })
  );
  await new Promise((resolve, reject) => {
    client.on('data', (chunk) => {
      const data = JSON.parse(chunk);
      if (data.type === MessageTypes.GQL_CONNECTION_ACK) {
        return sendMessageMutation();
      }
      if (data.type === MessageTypes.GQL_DATA) {
        assert.deepStrictEqual(data, {
          type: MessageTypes.GQL_DATA,
          id: 1,
          payload: {
            data: {
              notificationAdded: {
                user: 'Alexa',
              },
            },
          },
        });
        resolve();
      }
    });
  });
});
wsSuite('resolves options.context that is a function', async () => {
  const { client } = await startServer({
    context: async () => ({
      user: 'Alice',
    }),
  });
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
              subscription {
                notificationAdded {
                  user
                }
              }
            `,
      },
    })
  );
  await new Promise((resolve) => {
    client.on('data', (chunk) => {
      const data = JSON.parse(chunk);
      if (data.type === MessageTypes.GQL_CONNECTION_ACK) {
        return sendMessageMutation();
      }
      if (data.type === MessageTypes.GQL_DATA) {
        assert.deepStrictEqual(data, {
          type: MessageTypes.GQL_DATA,
          id: 1,
          payload: {
            data: {
              notificationAdded: {
                user: 'Alice',
              },
            },
          },
        });
        resolve();
      }
    });
  });
});

wsSuite('queue messages until context is resolved', async () => {
  const { client } = await startServer({
    context: () =>
      new Promise((resolve) => {
        // Reasonable time for messages to start to queue
        // FIXME: We still need to be sure though.
        setTimeout(() => resolve({ user: 'Alice' }), 50);
      }),
  });
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
            subscription {
              notificationAdded {
                user
              }
            }
          `,
      },
    })
  );
  await new Promise((resolve) => {
    client.on('data', (chunk) => {
      const data = JSON.parse(chunk);
      if (data.type === MessageTypes.GQL_CONNECTION_ACK) {
        return sendMessageMutation();
      }
      if (data.type === MessageTypes.GQL_DATA) {
        assert.deepStrictEqual(data, {
          type: MessageTypes.GQL_DATA,
          id: 1,
          payload: {
            data: {
              notificationAdded: {
                user: 'Alice',
              },
            },
          },
        });
        resolve();
      }
    });
  });
});
wsSuite('closes connection on error in context function', async () => {
  const context = async (s, r) => {
    throw new Error('You must be authenticated!');
  };
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const { client } = await startServer({ context });
    client.write(
      JSON.stringify({
        type: MessageTypes.GQL_CONNECTION_INIT,
      })
    );
    let isErrored = false;
    client.on('data', (chunk) => {
      const json = JSON.parse(chunk);
      if (json.type !== MessageTypes.GQL_CONNECTION_ERROR) return;
      assert.deepStrictEqual(json, {
        type: MessageTypes.GQL_CONNECTION_ERROR,
        payload: {
          errors: [
            { message: 'Context creation failed: You must be authenticated!' },
          ],
        },
      });
      isErrored = true;
    });
    client.on('end', () => {
      assert(isErrored);
      resolve();
    });
  });
});
wsSuite('stops subscription upon MessageTypes.GQL_STOP', async () => {
  const { client } = await startServer();
  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.write(
    JSON.stringify({
      id: 1,
      type: MessageTypes.GQL_START,
      payload: {
        query: `
            subscription {
              notificationAdded {
                message
              }
            }
          `,
      },
    })
  );
  await new Promise((resolve, reject) => {
    client.on('data', (chunk) => {
      const data = JSON.parse(chunk);
      let timer;
      if (data.type === MessageTypes.GQL_CONNECTION_ACK) {
        client.write(
          JSON.stringify({
            id: 1,
            type: MessageTypes.GQL_STOP,
          })
        );
        sendMessageMutation().then(() => {
          // Wait for little bit more to see if there is notification
          timer = setTimeout(resolve, 20);
        });
      }
      if (data.type === MessageTypes.GQL_DATA) {
        // We have unsubscribed, there should not be data
        if (timer) clearTimeout(timer);
        reject();
      }
    });
  });
});
wsSuite('closes connection on connection_terminate', async (done) => {
  const { client } = await startServer();

  client.write(
    JSON.stringify({
      type: MessageTypes.GQL_CONNECTION_INIT,
    })
  );
  client.on('data', () => {
    client.write(
      JSON.stringify({
        type: MessageTypes.GQL_CONNECTION_TERMINATE,
      })
    );
  });
  return new Promise((resolve) => {
    client.on('end', () => {
      resolve();
    });
  });
});

wsSuite.run();
