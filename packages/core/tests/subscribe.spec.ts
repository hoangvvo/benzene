/**
 * Based on https://github.com/graphql/graphql-js/blob/master/src/subscription/subscribe.js
 * This test suite makes an addition denoted by "*" comments:
 * graphql-jit does not support the root resolver pattern that this test uses
 * so the part must be rewritten to include that root resolver in `subscribe` of
 * the GraphQLObject in the schema.
 */

import { suite } from 'uvu';
import assert from 'uvu/assert';
import { EventEmitter } from 'events';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLSchema,
  parse,
  DocumentNode,
  GraphQLError,
  SubscriptionArgs,
  ExecutionResult,
} from 'graphql';
import Benzene from '../src/core';
import { isAsyncIterable } from '../src/utils';
import { compileQuery, isCompiledQuery } from '@hoangvvo/graphql-jit';

function checkDeepEqual(actual, expected) {
  // FIXME: Should not have to do this
  if (actual.value?.errors)
    actual.value.errors = actual.value.errors.map(formatError);
  if (actual.errors) actual.errors = actual.errors.map(formatError);
  assert.equal(actual, expected);
}

function formatError(error: any) {
  let _error$message;

  const message =
    (_error$message = error.message) !== null && _error$message !== void 0
      ? _error$message
      : 'An unknown error occurred.';
  const locations = error.locations;
  const path = error.path;
  return {
    message: message,
    ...(path && { path }),
    ...(locations && { locations }),
  };
}

function eventEmitterAsyncIterator(
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

async function subscribe(
  args: SubscriptionArgs
): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
  // Will be change in the next version
  const GQL = new Benzene({
    schema: args.schema,
  });

  const jit = compileQuery(args.schema, args.document, args.operationName);

  if (!isCompiledQuery(jit)) return jit;
  return GQL.subscribe(
    {
      document: args.document,
      contextValue: args.contextValue,
      variableValues: args.variableValues,
      rootValue: args.rootValue,
      operationName: args.operationName,
    },
    jit
  );
}

const EmailType = new GraphQLObjectType({
  name: 'Email',
  fields: {
    from: { type: GraphQLString },
    subject: { type: GraphQLString },
    message: { type: GraphQLString },
    unread: { type: GraphQLBoolean },
  },
});

const InboxType = new GraphQLObjectType({
  name: 'Inbox',
  fields: {
    total: {
      type: GraphQLInt,
      resolve: (inbox) => inbox.emails.length,
    },
    unread: {
      type: GraphQLInt,
      resolve: (inbox) =>
        inbox.emails.filter((email: any) => email.unread).length,
    },
    emails: { type: new GraphQLList(EmailType) },
  },
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    inbox: { type: InboxType },
  },
});

const EmailEventType = new GraphQLObjectType({
  name: 'EmailEvent',
  fields: {
    email: { type: EmailType },
    inbox: { type: InboxType },
  },
});

const emailSchema = emailSchemaWithResolvers();

function emailSchemaWithResolvers<T>(
  subscribeFn?: (arg: T) => any,
  resolveFn?: (arg: T) => any
) {
  return new GraphQLSchema({
    query: QueryType,
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        importantEmail: {
          type: EmailEventType,
          resolve: resolveFn,
          subscribe: subscribeFn,
          args: {
            priority: { type: GraphQLInt },
          },
        },
      },
    }),
  });
}

const defaultSubscriptionAST = parse(`
  subscription ($priority: Int = 0) {
    importantEmail(priority: $priority) {
      email {
        from
        subject
      }
      inbox {
        unread
        total
      }
    }
  }
`);

async function createSubscription(
  pubsub: EventEmitter,
  schema?: GraphQLSchema,
  document: DocumentNode = defaultSubscriptionAST
) {
  const data = {
    inbox: {
      emails: [
        {
          from: 'joe@graphql.org',
          subject: 'Hello',
          message: 'Hello World',
          unread: false,
        },
      ],
    },
    importantEmail() {
      return eventEmitterAsyncIterator(pubsub, 'importantEmail');
    },
  };

  if (!schema) {
    // *
    schema = emailSchemaWithResolvers(() =>
      eventEmitterAsyncIterator(pubsub, 'importantEmail')
    );
  }

  function sendImportantEmail(newEmail: any) {
    data.inbox.emails.push(newEmail);
    // Returns true if the event was consumed by a subscriber.
    return pubsub.emit('importantEmail', {
      importantEmail: {
        email: newEmail,
        inbox: data.inbox,
      },
    });
  }

  // `subscribe` returns Promise<AsyncIterator | ExecutionResult>
  return {
    sendImportantEmail,
    subscription: await subscribe({ schema, document, rootValue: data }),
  };
}

async function expectPromiseToThrow(
  promise: () => Promise<any>,
  message: string
) {
  try {
    await promise();
    throw new Error('promise should have thrown but did not');
  } catch (error) {
    assert.instance(error, Error);
    assert.is(error.message, message);
  }
}

// Check all error cases when initializing the subscription.

const suiteInit = suite('Subscription Initialization Phase');

suiteInit('accepts positional arguments', async () => {
  const document = parse(`
      subscription {
        importantEmail {
          # Difference
          email { from }
        }
      }
    `);

  async function* emptyAsyncIterator() {
    // Empty
  }

  const ai = await subscribe({
    // *
    schema: emailSchemaWithResolvers(emptyAsyncIterator),
    document,
    rootValue: {
      importantEmail: emptyAsyncIterator,
    },
  });

  // @ts-ignore
  ai.next();
  // @ts-ignore
  ai.return();
});

suiteInit(
  'accepts multiple subscription fields defined in schema',
  async () => {
    const pubsub = new EventEmitter();
    const SubscriptionTypeMultiple = new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        // *
        importantEmail: {
          type: EmailEventType,
          subscribe: () => eventEmitterAsyncIterator(pubsub, 'importantEmail'),
        },
        nonImportantEmail: {
          type: EmailEventType,
          subscribe: () =>
            eventEmitterAsyncIterator(pubsub, 'nonImportantEmail'),
        },
      },
    });

    const testSchema = new GraphQLSchema({
      query: QueryType,
      subscription: SubscriptionTypeMultiple,
    });

    const { subscription, sendImportantEmail } = await createSubscription(
      pubsub,
      testSchema
    );

    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright',
      message: 'Tests are good',
      unread: true,
    });

    // @ts-ignore
    await subscription.next();
  }
);

suiteInit('accepts type definition with sync subscribe function', async () => {
  const pubsub = new EventEmitter();
  const schema = new GraphQLSchema({
    query: QueryType,
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        importantEmail: {
          type: GraphQLString,
          subscribe: () => eventEmitterAsyncIterator(pubsub, 'importantEmail'),
        },
      },
    }),
  });

  const subscription = await subscribe({
    schema,
    document: parse(`
        subscription {
          importantEmail {
            email { from }
          }
        }
      `),
  });

  pubsub.emit('importantEmail', {
    importantEmail: {},
  });

  // @ts-ignore
  await subscription.next();
});

suiteInit('accepts type definition with async subscribe function', async () => {
  const pubsub = new EventEmitter();
  const schema = new GraphQLSchema({
    query: QueryType,
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        importantEmail: {
          type: GraphQLString,
          subscribe: async () => {
            await new Promise(setImmediate);
            return eventEmitterAsyncIterator(pubsub, 'importantEmail');
          },
        },
      },
    }),
  });

  const subscription = await subscribe({
    schema,
    document: parse(`
        subscription {
          importantEmail
        }
      `),
  });

  pubsub.emit('importantEmail', {
    importantEmail: {},
  });

  // @ts-ignore
  await subscription.next();
});

suiteInit(
  'should only resolve the first field of invalid multi-field',
  async () => {
    let didResolveImportantEmail = false;
    let didResolveNonImportantEmail = false;

    const SubscriptionTypeMultiple = new GraphQLObjectType({
      name: 'Subscription',
      fields: {
        importantEmail: {
          type: EmailEventType,
          subscribe() {
            didResolveImportantEmail = true;
            return eventEmitterAsyncIterator(new EventEmitter(), 'event');
          },
        },
        nonImportantEmail: {
          type: EmailEventType,
          // istanbul ignore next (Shouldn't be called)
          subscribe() {
            didResolveNonImportantEmail = true;
            return eventEmitterAsyncIterator(new EventEmitter(), 'event');
          },
        },
      },
    });

    const schema = new GraphQLSchema({
      query: QueryType,
      subscription: SubscriptionTypeMultiple,
    });

    const subscription = await subscribe({
      schema,
      document: parse(`
        subscription {
          importantEmail
          nonImportantEmail
        }
      `),
    });

    // @ts-ignore
    subscription.next(); // Ask for a result, but ignore it.

    assert.is(didResolveImportantEmail, true);
    assert.is(didResolveNonImportantEmail, false);

    // Close subscription
    // @ts-ignore
    subscription.return();
  }
);

suiteInit('resolves to an error for unknown subscription field', async () => {
  const ast = parse(`
      subscription {
        unknownField
      }
    `);

  const pubsub = new EventEmitter();

  const { subscription } = await createSubscription(pubsub, emailSchema, ast);

  checkDeepEqual(subscription, {
    errors: [
      {
        message: 'The subscription field "unknownField" is not defined.',
        locations: [{ line: 3, column: 9 }],
      },
    ],
  });
});

suiteInit(
  'throws an error if subscribe does not return an iterator',
  async () => {
    const invalidEmailSchema = new GraphQLSchema({
      query: QueryType,
      subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
          importantEmail: {
            type: GraphQLString,
            subscribe: () => 'test',
          },
        },
      }),
    });

    const pubsub = new EventEmitter();

    await expectPromiseToThrow(
      () => createSubscription(pubsub, invalidEmailSchema),
      'Subscription field must return Async Iterable. Received: "test".'
    );
  }
);

suiteInit('resolves to an error for subscription resolver errors', async () => {
  // Returning an error
  const subscriptionReturningErrorSchema = emailSchemaWithResolvers(
    () => new Error('test error')
  );
  await testReportsError(subscriptionReturningErrorSchema);

  // Throwing an error
  const subscriptionThrowingErrorSchema = emailSchemaWithResolvers(() => {
    throw new Error('test error');
  });
  await testReportsError(subscriptionThrowingErrorSchema);

  // Resolving to an error
  const subscriptionResolvingErrorSchema = emailSchemaWithResolvers(() =>
    Promise.resolve(new Error('test error'))
  );
  await testReportsError(subscriptionResolvingErrorSchema);

  // Rejecting with an error
  const subscriptionRejectingErrorSchema = emailSchemaWithResolvers(() =>
    Promise.reject(new Error('test error'))
  );
  await testReportsError(subscriptionRejectingErrorSchema);

  async function testReportsError(schema: GraphQLSchema) {
    // Promise<AsyncIterable<ExecutionResult> | ExecutionResult>
    const result = await subscribe({
      schema,
      document: parse(`
          subscription {
            importantEmail
          }
        `),
    });

    checkDeepEqual(result, {
      errors: [
        {
          message: 'test error',
          locations: [{ line: 3, column: 13 }],
          path: ['importantEmail'],
        },
      ],
    });
  }
});

suiteInit.skip(
  'resolves to an error for source event stream resolver errors',
  async () => {
    // Returning an error
    const subscriptionReturningErrorSchema = emailSchemaWithResolvers(
      () => new Error('test error')
    );
    await testReportsError(subscriptionReturningErrorSchema);

    // Throwing an error
    const subscriptionThrowingErrorSchema = emailSchemaWithResolvers(() => {
      throw new Error('test error');
    });
    await testReportsError(subscriptionThrowingErrorSchema);

    // Resolving to an error
    const subscriptionResolvingErrorSchema = emailSchemaWithResolvers(() =>
      Promise.resolve(new Error('test error'))
    );
    await testReportsError(subscriptionResolvingErrorSchema);

    // Rejecting with an error
    const subscriptionRejectingErrorSchema = emailSchemaWithResolvers(() =>
      Promise.reject(new Error('test error'))
    );
    await testReportsError(subscriptionRejectingErrorSchema);

    async function testReportsError(schema: GraphQLSchema) {
      // Promise<AsyncIterable<ExecutionResult> | ExecutionResult>
      const result = await subscribe({
        schema,
        document: parse(`
        subscription {
          importantEmail
        }
      `),
      });

      checkDeepEqual(result, {
        errors: [
          {
            message: 'test error',
            locations: [{ column: 13, line: 3 }],
            path: ['importantEmail'],
          },
        ],
      });
    }
  }
);

suiteInit('resolves to an error if variables were wrong type', async () => {
  // If we receive variables that cannot be coerced correctly, subscribe()
  // will resolve to an ExecutionResult that contains an informative error
  // description.
  const ast = parse(`
      subscription ($priority: Int) {
        importantEmail(priority: $priority) {
          email {
            from
            subject
          }
          inbox {
            unread
            total
          }
        }
      }
    `);

  const result = await subscribe({
    schema: emailSchema,
    document: ast,
    variableValues: { priority: 'meow' },
  });

  checkDeepEqual(result, {
    errors: [
      {
        // Different
        message:
          'Variable "$priority" got invalid value "meow"; Expected type Int; Int cannot represent non-integer value: "meow"',
        locations: [{ line: 2, column: 21 }],
      },
    ],
  });
});

suiteInit.run();

// Once a subscription returns a valid AsyncIterator, it can still yield
// errors.

const suitePub = suite('Subscription Publish Phase');

suitePub(
  'produces a payload for multiple subscribe in same subscription',
  async () => {
    const pubsub = new EventEmitter();
    const { sendImportantEmail, subscription } = await createSubscription(
      pubsub
    );
    const second = await createSubscription(pubsub);

    // @ts-ignore
    const payload1 = subscription.next();
    // @ts-ignore
    const payload2 = second.subscription.next();

    assert.is(
      sendImportantEmail({
        from: 'yuzhi@graphql.org',
        subject: 'Alright',
        message: 'Tests are good',
        unread: true,
      }),
      true
    );

    const expectedPayload = {
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              from: 'yuzhi@graphql.org',
              subject: 'Alright',
            },
            inbox: {
              unread: 1,
              total: 2,
            },
          },
        },
      },
    };

    checkDeepEqual(await payload1, expectedPayload);
    checkDeepEqual(await payload2, expectedPayload);
  }
);

suitePub('produces a payload per subscription event', async () => {
  const pubsub = new EventEmitter();
  const { sendImportantEmail, subscription } = await createSubscription(pubsub);

  // Wait for the next subscription payload.
  // @ts-ignore
  const payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright',
      message: 'Tests are good',
      unread: true,
    }),
    true
  );

  // The previously waited on payload now has a value.
  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Alright',
          },
          inbox: {
            unread: 1,
            total: 2,
          },
        },
      },
    },
  });

  // Another new email arrives, before subscription.next() is called.
  assert.is(
    sendImportantEmail({
      from: 'hyo@graphql.org',
      subject: 'Tools',
      message: 'I <3 making things',
      unread: true,
    }),
    true
  );

  // The next waited on payload will have a value.
  // @ts-ignore
  checkDeepEqual(await subscription.next(), {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'hyo@graphql.org',
            subject: 'Tools',
          },
          inbox: {
            unread: 2,
            total: 3,
          },
        },
      },
    },
  });

  // The client decides to disconnect.
  // @ts-ignore
  checkDeepEqual(await subscription.return(), {
    done: true,
    value: undefined,
  });

  // Which may result in disconnecting upstream services as well.
  assert.is(
    sendImportantEmail({
      from: 'adam@graphql.org',
      subject: 'Important',
      message: 'Read me please',
      unread: true,
    }),
    false
  ); // No more listeners.

  // Awaiting a subscription after closing it results in completed results.
  // @ts-ignore
  checkDeepEqual(await subscription.next(), {
    done: true,
    value: undefined,
  });
});

suitePub('produces a payload when there are multiple events', async () => {
  const pubsub = new EventEmitter();
  const { sendImportantEmail, subscription } = await createSubscription(pubsub);
  // @ts-ignore
  let payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright',
      message: 'Tests are good',
      unread: true,
    }),
    true
  );

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Alright',
          },
          inbox: {
            unread: 1,
            total: 2,
          },
        },
      },
    },
  });

  // @ts-ignore
  payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright 2',
      message: 'Tests are good 2',
      unread: true,
    }),
    true
  );

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Alright 2',
          },
          inbox: {
            unread: 2,
            total: 3,
          },
        },
      },
    },
  });
});

suitePub('should not trigger when subscription is already done', async () => {
  const pubsub = new EventEmitter();
  const { sendImportantEmail, subscription } = await createSubscription(pubsub);
  // @ts-ignore
  let payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright',
      message: 'Tests are good',
      unread: true,
    }),
    true
  );

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Alright',
          },
          inbox: {
            unread: 1,
            total: 2,
          },
        },
      },
    },
  });

  // @ts-ignore
  payload = subscription.next();
  // @ts-ignore
  subscription.return();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright 2',
      message: 'Tests are good 2',
      unread: true,
    }),
    false
  );

  checkDeepEqual(await payload, {
    done: true,
    value: undefined,
  });
});

suitePub('should not trigger when subscription is thrown', async () => {
  const pubsub = new EventEmitter();
  const { sendImportantEmail, subscription } = await createSubscription(pubsub);
  // @ts-ignore
  let payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright',
      message: 'Tests are good',
      unread: true,
    }),
    true
  );

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Alright',
          },
          inbox: {
            unread: 1,
            total: 2,
          },
        },
      },
    },
  });

  // @ts-ignore
  payload = subscription.next();

  // Throw error
  let caughtError;
  try {
    // @ts-ignore
    await subscription.throw('ouch');
  } catch (e) {
    caughtError = e;
  }
  assert.is(caughtError, 'ouch');

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Alright 2',
      message: 'Tests are good 2',
      unread: true,
    }),
    false
  );

  checkDeepEqual(await payload, {
    done: true,
    value: undefined,
  });
});

suitePub('event order is correct for multiple publishes', async () => {
  const pubsub = new EventEmitter();
  const { sendImportantEmail, subscription } = await createSubscription(pubsub);
  // @ts-ignore
  let payload = subscription.next();

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Message',
      message: 'Tests are good',
      unread: true,
    }),
    true
  );

  // A new email arrives!
  assert.is(
    sendImportantEmail({
      from: 'yuzhi@graphql.org',
      subject: 'Message 2',
      message: 'Tests are good 2',
      unread: true,
    }),
    true
  );

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Message',
          },
          inbox: {
            unread: 2,
            total: 3,
          },
        },
      },
    },
  });

  // @ts-ignore
  payload = subscription.next();

  checkDeepEqual(await payload, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            from: 'yuzhi@graphql.org',
            subject: 'Message 2',
          },
          inbox: {
            unread: 2,
            total: 3,
          },
        },
      },
    },
  });
});

suitePub('should handle error during execution of source event', async () => {
  const erroringEmailSchema = emailSchemaWithResolvers(
    async function* () {
      yield { email: { subject: 'Hello' } };
      yield { email: { subject: 'Goodbye' } };
      yield { email: { subject: 'Bonjour' } };
    },
    (event) => {
      if ((event as any).email.subject === 'Goodbye') {
        throw new Error('Never leave.');
      }
      return event;
    }
  );

  const subscription = await subscribe({
    schema: erroringEmailSchema,
    document: parse(`
        subscription {
          importantEmail {
            email {
              subject
            }
          }
        }
      `),
  });

  // @ts-ignore
  const payload1 = await subscription.next();
  checkDeepEqual(payload1, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            subject: 'Hello',
          },
        },
      },
    },
  });

  // An error in execution is presented as such.
  // @ts-ignore
  const payload2 = await subscription.next();
  checkDeepEqual(payload2, {
    done: false,
    value: {
      errors: [
        {
          message: 'Never leave.',
          locations: [{ line: 3, column: 11 }],
          path: ['importantEmail'],
        },
      ],
      data: {
        importantEmail: null,
      },
    },
  });

  // However that does not close the response event stream. Subsequent
  // events are still executed.
  // @ts-ignore
  const payload3 = await subscription.next();
  checkDeepEqual(payload3, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            subject: 'Bonjour',
          },
        },
      },
    },
  });
});

suitePub(
  'should pass through error thrown in source event stream',
  async () => {
    const erroringEmailSchema = emailSchemaWithResolvers(
      async function* () {
        yield { email: { subject: 'Hello' } };
        throw new Error('test error');
      },
      (email) => email
    );

    const subscription = await subscribe({
      schema: erroringEmailSchema,
      document: parse(`
        subscription {
          importantEmail {
            email {
              subject
            }
          }
        }
      `),
    });

    // @ts-ignore
    const payload1 = await subscription.next();
    checkDeepEqual(payload1, {
      done: false,
      value: {
        data: {
          importantEmail: {
            email: {
              subject: 'Hello',
            },
          },
        },
      },
    });

    let expectedError;
    try {
      // @ts-ignore
      await subscription.next();
    } catch (error) {
      expectedError = error;
    }

    assert.instance(expectedError, Error);
    assert.ok('message' in expectedError);

    // @ts-ignore
    const payload2 = await subscription.next();
    checkDeepEqual(payload2, {
      done: true,
      value: undefined,
    });
  }
);

suitePub('should resolve GraphQL error from source event stream', async () => {
  const erroringEmailSchema = emailSchemaWithResolvers(
    async function* () {
      yield { email: { subject: 'Hello' } };
      throw new GraphQLError('test error');
    },
    (email) => email
  );

  const subscription = await subscribe({
    schema: erroringEmailSchema,
    document: parse(`
        subscription {
          importantEmail {
            email {
              subject
            }
          }
        }
      `),
  });

  // @ts-ignore
  const payload1 = await subscription.next();
  checkDeepEqual(payload1, {
    done: false,
    value: {
      data: {
        importantEmail: {
          email: {
            subject: 'Hello',
          },
        },
      },
    },
  });

  // @ts-ignore
  const payload2 = await subscription.next();
  checkDeepEqual(payload2, {
    done: false,
    value: {
      errors: [
        {
          message: 'test error',
        },
      ],
    },
  });

  // @ts-ignore
  const payload3 = await subscription.next();
  checkDeepEqual(payload3, {
    done: true,
    value: undefined,
  });
});

suitePub.run();

const suiteIsAI = suite('isAsyncIterable');

suiteIsAI('should return `true` for AsyncIterable', () => {
  const asyncIteratable = { [Symbol.asyncIterator]: (x) => x };
  assert.is(isAsyncIterable(asyncIteratable), true);

  // istanbul ignore next (Never called and use just as a placeholder)
  async function* asyncGeneratorFunc() {
    /* do nothing */
  }

  assert.is(isAsyncIterable(asyncGeneratorFunc()), true);

  // But async generator function itself is not iteratable
  assert.is(isAsyncIterable(asyncGeneratorFunc), false);
});

suiteIsAI('should return `false` for all other values', () => {
  assert.is(isAsyncIterable(null), false);
  assert.is(isAsyncIterable(undefined), false);

  assert.is(isAsyncIterable('ABC'), false);
  assert.is(isAsyncIterable('0'), false);
  assert.is(isAsyncIterable(''), false);

  assert.is(isAsyncIterable([]), false);
  assert.is(isAsyncIterable(new Int8Array(1)), false);

  assert.is(isAsyncIterable({}), false);
  assert.is(isAsyncIterable({ iterable: true }), false);

  const iterator = { [Symbol.iterator]: (x) => x };
  assert.is(isAsyncIterable(iterator), false);

  // istanbul ignore next (Never called and use just as a placeholder)
  function* generatorFunc() {
    /* do nothing */
  }
  assert.is(isAsyncIterable(generatorFunc()), false);

  const invalidAsyncIteratable = {
    [Symbol.asyncIterator]: { next: (x) => x },
  };
  assert.is(isAsyncIterable(invalidAsyncIteratable), false);
});

suiteIsAI.run();
