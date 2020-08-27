import {
  wsHandler,
  GQL_CONNECTION_INIT,
  GQL_DATA,
  GQL_CONNECTION_ACK,
  GQL_START,
  GQL_COMPLETE,
  GQL_STOP,
  GQL_CONNECTION_TERMINATE,
} from '../src';
import { HandlerConfig } from '../src/types';
import { SubscriptionConnection } from '../src/connection';
import { GraphQL, runHttpQuery } from '../../core/src';
import { Config as GraphQLConfig } from '../../core/src/types';
import { parseBody } from '../../server/src/http/parseBody';
import WebSocket from 'ws';
import { strict as assert } from 'assert';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import fetch from 'node-fetch';
import { GraphQLError } from 'graphql';

const pubsub = new PubSub();

const typeDefs = `
  type Notification {
    message: String
    dummy: String
    DO_NOT_USE_THIS_FIELD: String
  }

  type Query {
    _: String
  }

  type Mutation {
    addNotification(message: String): Notification
  }

  type Subscription {
    notificationAdded: Notification
  }
`;

const resolvers = {
  Query: {
    _: () => '',
  },
  Mutation: {
    addNotification: async (_: any, { message }: { message: string }) => {
      const notification = { message };
      await pubsub.publish('NOTIFICATION_ADDED', {
        notificationAdded: notification,
      });
      return notification;
    },
  },
  Subscription: {
    notificationAdded: {
      subscribe: () => pubsub.asyncIterator('NOTIFICATION_ADDED'),
    },
  },
  Notification: {
    dummy: ({ message }) => message,
    DO_NOT_USE_THIS_FIELD: () => {
      throw new Error('I told you so');
    },
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

let serverInit;

async function startServer(
  options: { ws?: WebSocket } = {},
  gqlOpts: Omit<GraphQLConfig, 'schema'> = {},
  handlerConfig?: HandlerConfig
) {
  const ws = options.ws || new WebSocket('ws://localhost:4000', 'graphql-ws');
  const gql = new GraphQL({ schema, ...gqlOpts });
  const server = createServer((req, res) => {
    parseBody(req, async (err, body) => {
      const result = await runHttpQuery(gql, {
        query: body.query,
        variables: body.variables,
        operationName: body.operationName,
        context: {},
        httpMethod: req.method as string,
      });
      res.writeHead(result.status, result.headers).end(result.body);
    });
  });
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

afterEach(function () {
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

describe('ws: wsHandler', () => {
  it('replies with connection_ack', async () => {
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    await new Promise((resolve) => {
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        assert.deepStrictEqual(json, { type: GQL_CONNECTION_ACK });
        resolve();
      });
    });
  });
  it('sends updates via subscription', async function () {
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    client.write(
      JSON.stringify({
        id: 1,
        type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const data = JSON.parse(chunk);
        if (data.type === GQL_CONNECTION_ACK) {
          return sendMessageMutation();
        }
        if (data.type === GQL_DATA) {
          assert.deepStrictEqual(data, {
            type: GQL_DATA,
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
  it('rejects socket protocol other than graphql-ws', async () => {
    const ws = new WebSocket('ws://localhost:4000', 'graphql-subscriptions');
    await startServer({ ws });
    await new Promise((resolve) =>
      ws.on('close', () => {
        resolve();
      })
    );
  });
  it('errors on malformed message', (done) => {
    startServer().then(({ server, client, ws }) => {
      client.write(`{"type":"connection_init","payload":`);
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        if (json.type === 'error') {
          assert.deepStrictEqual(json, {
            type: 'error',
            payload: { message: 'Malformed message' },
          });
          done();
        }
      });
    });
  });
  it('format errors using formatError', (done) => {
    startServer(
      {},
      {
        formatError: () => {
          return new GraphQLError('Internal server error');
        },
      }
    ).then(({ server, client, ws }) => {
      client.write(
        JSON.stringify({
          type: GQL_CONNECTION_INIT,
        })
      );
      client.write(
        JSON.stringify({
          id: 1,
          type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        if (json.type === GQL_CONNECTION_ACK) {
          sendMessageMutation();
        }
        if (json.type === GQL_DATA) {
          assert.deepStrictEqual(json, {
            id: 1,
            type: GQL_DATA,
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
          done();
        }
      });
    });
  });
  it('errors on empty query', async function () {
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    client.write(
      JSON.stringify({
        id: 1,
        type: GQL_START,
        payload: {
          query: null,
        },
      })
    );
    await new Promise((resolve, reject) => {
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        if (json.type === 'error') {
          assert.deepStrictEqual(json, {
            type: 'error',
            id: 1,
            payload: { message: 'Must provide query string.' },
          });
          resolve();
        }
      });
    });
  });
  it('resolves also queries and mutations', async function () {
    // We can also add a Query test just to be sure but Mutation one only should be sufficient
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    client.write(
      JSON.stringify({
        id: 1,
        type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        if (json.type === `data`) {
          assert.deepStrictEqual(json, {
            type: GQL_DATA,
            id: 1,
            payload: { data: { addNotification: { message: 'Hello World' } } },
          });
          resolved = true;
        }
        if (json.type === GQL_COMPLETE && resolved === true) {
          // It should complete the subscription immediately since it is a mutations/queries
          resolve();
        }
        return;
      });
    });
  });
  it('errors on syntax error', async () => {
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    client.write(
      JSON.stringify({
        id: 1,
        type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const json = JSON.parse(chunk);
        if (json.type === GQL_DATA) {
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
  it('stops subscription upon GQL_STOP', async () => {
    const { client } = await startServer();
    client.write(
      JSON.stringify({
        type: GQL_CONNECTION_INIT,
      })
    );
    client.write(
      JSON.stringify({
        id: 1,
        type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const data = JSON.parse(chunk);
        let timer;
        if (data.type === GQL_CONNECTION_ACK) {
          client.write(
            JSON.stringify({
              id: 1,
              type: GQL_STOP,
            })
          );
          sendMessageMutation().then(() => {
            // Wait for little bit more to see if there is notification
            timer = setTimeout(resolve, 20);
          });
        }
        if (data.type === GQL_DATA) {
          // We have unsubscribed, there should not be data
          if (timer) clearTimeout(timer);
          reject();
        }
      });
    });
  });
  it('closes connection on error in context function', (done) => {
    const context = (s, r, connectionParams) => {
      if (connectionParams?.unauthenticated)
        throw new Error('You must be authenticated!');
      return {};
    };
    startServer({}, {}, { context }).then(({ server, client }) => {
      client.write(
        JSON.stringify({
          type: GQL_CONNECTION_INIT,
          payload: {
            unauthenticated: true,
          },
        })
      );
      let isErrored = false;
      client.on(GQL_DATA, (chunk) => {
        isErrored =
          chunk ===
          `{"type":"connection_error","payload":{"errors":[{"message":"You must be authenticated!"}]}}`;
      });
      client.on('end', () => {
        done(assert(isErrored));
      });
    });
  });
  it('closes connection on connection_terminate', (done) => {
    startServer().then(({ server, client }) => {
      client.write(
        JSON.stringify({
          type: GQL_CONNECTION_INIT,
        })
      );
      client.on(GQL_DATA, () => {
        client.write(
          JSON.stringify({
            type: GQL_CONNECTION_TERMINATE,
          })
        );
      });
      client.on('end', () => {
        done();
      });
    });
  });
});

describe('ws: SubscriptionConnection', () => {
  it('emits connection_init', () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const { client } = await startServer(
        {},
        {},
        {
          onSubscriptionConnection: (connection: SubscriptionConnection) => {
            connection.on(GQL_CONNECTION_INIT, (connectionParams) => {
              try {
                assert.deepStrictEqual(connectionParams, { test: 'ok' });
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          },
        }
      );
      client.write(
        JSON.stringify({
          payload: { test: 'ok' },
          type: GQL_CONNECTION_INIT,
        })
      );
    });
  });
  it('emits subscription_start', () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const body = {
        id: 1,
        type: GQL_START,
        payload: {
          query: `
        subscription {
          notificationAdded {
            message
          }
        }
      `,
        },
      };
      const { client } = await startServer(
        {},
        {},
        {
          onSubscriptionConnection,
          context: () => ({ test: true }),
        }
      );
      function onSubscriptionConnection(connection: SubscriptionConnection) {
        connection.on('subscription_start', (id, payload, context) => {
          try {
            assert.strictEqual(id, body.id);
            assert.strictEqual(context.test, true);
            assert.deepStrictEqual(payload, body.payload);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }
      client.write(
        JSON.stringify({
          payload: { test: 'ok' },
          type: GQL_CONNECTION_INIT,
        })
      );
      client.write(JSON.stringify(body));
    });
  });
  it('emits subscription_stop', () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const { client } = await startServer(
        {},
        {},
        {
          onSubscriptionConnection,
        }
      );
      function onSubscriptionConnection(connection: SubscriptionConnection) {
        connection.on('subscription_stop', (id) => {
          try {
            assert.strictEqual(id, 1);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }
      client.write(
        JSON.stringify({
          type: GQL_CONNECTION_INIT,
        })
      );
      client.write(
        JSON.stringify({
          id: 1,
          type: GQL_START,
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
      client.on(GQL_DATA, (chunk) => {
        const data = JSON.parse(chunk);
        if (data.type === GQL_CONNECTION_ACK) {
          client.write(
            JSON.stringify({
              id: 1,
              type: GQL_STOP,
            })
          );
        }
      });
    });
  });
  it('emits connection_terminate', () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const { client } = await startServer(
        {},
        {},
        {
          onSubscriptionConnection,
        }
      );
      function onSubscriptionConnection(connection: SubscriptionConnection) {
        connection.on(GQL_CONNECTION_TERMINATE, () => {
          resolve();
        });
      }
      client.write(
        JSON.stringify({
          type: GQL_CONNECTION_INIT,
        })
      );
      client.on(GQL_DATA, () => {
        client.write(
          JSON.stringify({
            type: GQL_CONNECTION_TERMINATE,
          })
        );
      });
    });
  });
});
