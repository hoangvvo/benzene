import { wsHandler } from '../src';
import * as MessageTypes from '../src/messageTypes';
import { HandlerConfig } from '../src/types';
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
    user: String
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
    user: (obj, variables, context) => context.user,
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
  handlerConfig?: Partial<HandlerConfig>,
  options?: Partial<GraphQLConfig>,
  ws: WebSocket = new WebSocket('ws://localhost:4000', 'graphql-ws')
) {
  const gql = new GraphQL({ schema, ...options });
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
  it('sends updates via subscription', async function () {
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
  it('rejects socket protocol other than graphql-ws', async () => {
    const ws = new WebSocket('ws://localhost:4000', 'graphql-subscriptions');
    await startServer({}, {}, ws);
    await new Promise((resolve) =>
      ws.on('close', () => {
        resolve();
      })
    );
  });
  it('errors on malformed message', (done) => {
    startServer().then(({ server, client, ws }) => {
      client.write(`{"type":"connection_init","payload":`);
      client.on('data', (chunk) => {
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
          done();
        }
      });
    });
  });
  it('errors on empty query', async function () {
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
  it('errors on syntax error', async () => {
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
  describe('resolves options.context that is', () => {
    it('an object', async () => {
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
    it('a function', async () => {
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
  });
  it('closes connection on error in context function', (done) => {
    const context = async (s, r) => {
      throw new Error('You must be authenticated!');
    };
    startServer({ context }).then(({ server, client }) => {
      client.write(
        JSON.stringify({
          type: MessageTypes.GQL_CONNECTION_INIT,
          payload: {
            unauthenticated: true,
          },
        })
      );
      let isErrored = false;
      client.on('data', (chunk) => {
        isErrored =
          chunk ===
          `{"type":"connection_error","payload":{"errors":[{"message":"Context creation failed: You must be authenticated!"}]}}`;
      });
      client.on('end', () => {
        done(assert(isErrored));
      });
    });
  });
  it('stops subscription upon MessageTypes.GQL_STOP', async () => {
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
  it('closes connection on connection_terminate', (done) => {
    startServer().then(({ server, client }) => {
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
      client.on('end', () => {
        done();
      });
    });
  });
});
