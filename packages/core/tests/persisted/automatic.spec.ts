import { suite } from 'uvu';
import assert from 'uvu/assert';
import {
  GraphQL,
  runHttpQuery,
  FormattedExecutionResult,
  HttpQueryResponse,
} from '../../src';
import { PersistedAutomatic } from '../../src/persisted';
import { TestSchema } from '../schema.spec';
import { sha256 } from 'crypto-hash';

const GQL = new GraphQL({
  schema: TestSchema,
  persisted: new PersistedAutomatic(),
});

async function httpTest(
  httpParams: {
    method: string;
    body?: string | any;
    queryParams?: { [key: string]: string };
    context?: any;
    headers?: Record<string, string>;
    stringifyBody?: boolean;
  },
  expected: Partial<Omit<HttpQueryResponse, 'body'>> & {
    body?: FormattedExecutionResult | string;
  },
  GQLInstance = GQL
) {
  expected.body =
    (typeof expected.body === 'object'
      ? JSON.stringify(expected.body)
      : expected.body) || '';
  expected.status = expected.status || 200;
  expected.headers = expected.headers || { 'content-type': 'application/json' };

  assert.equal(
    await runHttpQuery(GQLInstance, {
      body:
        typeof httpParams.body === 'object' &&
        httpParams.stringifyBody !== false
          ? JSON.stringify(httpParams.body)
          : httpParams.body,
      queryParams: httpParams.queryParams || null,
      headers: httpParams.headers || {
        'content-type':
          typeof httpParams.body === 'object' ? 'application/json' : '',
      },
      context: httpParams.context,
      httpMethod: httpParams.method,
    }),
    expected
  );
}

const suiteAuto = suite('PersistedAutomatic');

suiteAuto('Bypass if isPersistedQuery returns false', async () => {
  const persistedAuto = new PersistedAutomatic();
  const GQL = new GraphQL({
    schema: TestSchema,
    persisted: persistedAuto,
  });

  persistedAuto.getQuery = () => {
    throw new Error('Should not be called');
  };

  // Regular query
  await httpTest(
    {
      method: 'GET',
      queryParams: {
        query: '{test}',
      },
    },
    { body: { data: { test: 'Hello World' } } },
    GQL
  );

  // No persistedQuery in extensions
  await httpTest(
    {
      method: 'POST',
      body: {
        extensions: { docId: 'noop' },
      },
    },
    {
      status: 400,
      body: {
        errors: [{ message: 'Must provide query string.' }],
      },
    },
    GQL
  );

  // persistedQuery version mismatched
  await httpTest(
    {
      method: 'POST',
      body: {
        extensions: {
          persistedQuery: {
            sha256Hash: 'W5vrrAIypCbniaIYeroNnw==',
            version: 2,
          },
        },
      },
    },
    {
      status: 400,
      body: {
        errors: [{ message: 'Must provide query string.' }],
      },
    },
    GQL
  );
});

suiteAuto(
  'Throws PersistedQueryNotFound if query not found in store',
  async () => {
    await httpTest(
      {
        method: 'POST',
        body: {
          extensions: {
            persistedQuery: {
              sha256Hash: sha256('{test}'),
              version: 1,
            },
          },
        },
      },
      {
        status: 200,
        body: {
          errors: [
            {
              message: 'PersistedQueryNotFound',
              extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
            },
          ],
        },
      },
      GQL
    );
  }
);

suiteAuto('Saves query by hash sent from clients', async () => {
  const auto = new PersistedAutomatic();
  const sha256Hash: string = await sha256('{test}');
  await httpTest(
    {
      method: 'POST',
      body: {
        query: '{test}',
        extensions: {
          persistedQuery: {
            sha256Hash,
            version: 1,
          },
        },
      },
    },
    { body: { data: { test: 'Hello World' } } },
    new GraphQL({ schema: TestSchema, persisted: auto })
  );
  assert.is(auto.cache.get(`apq:${sha256Hash}`), '{test}');
});

suiteAuto('Throws error if client provided hash256 is mismatched', async () => {
  const auto = new PersistedAutomatic();
  await httpTest(
    {
      method: 'POST',
      body: {
        query: '{test}',
        extensions: {
          persistedQuery: {
            sha256Hash: await sha256('{bad}'),
            version: 1,
          },
        },
      },
    },
    {
      status: 400,
      body: { errors: [{ message: 'provided sha does not match query' }] },
    },
    new GraphQL({ schema: TestSchema, persisted: auto })
  );
});

suiteAuto('Returns query using stored hash256', async () => {
  const auto = new PersistedAutomatic();
  const sha256Hash: string = await sha256('{test}');
  auto.cache.set(`apq:${sha256Hash}`, '{test}');

  await httpTest(
    {
      method: 'POST',
      body: {
        extensions: {
          persistedQuery: {
            sha256Hash,
            version: 1,
          },
        },
      },
    },
    { body: { data: { test: 'Hello World' } } },
    new GraphQL({ schema: TestSchema, persisted: auto })
  );
});

suiteAuto('Allows using custom cache', async () => {
  const cache = {
    get: async () => '{hello}',
    set: () => null,
    delete: () => true,
  };
  const auto = new PersistedAutomatic({ cache });
  assert.is(auto.cache, cache);
});

suiteAuto.run();
