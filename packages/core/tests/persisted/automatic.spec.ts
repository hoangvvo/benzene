import { suite } from 'uvu';
import assert from 'uvu/assert';
import crypto from 'crypto';
import lru from 'tiny-lru';
import {
  Benzene,
  runHttpQuery,
  FormattedExecutionResult,
  HttpQueryResponse,
  persistedQueryPresets,
} from '../../src';
import { TestSchema } from '../schema.spec';

const sha256 = (query: string) =>
  crypto.createHash('sha256').update(query).digest('hex');

const GQL = new Benzene({
  schema: TestSchema,
  persisted: persistedQueryPresets.automatic({ sha256 }),
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
  const persistedAuto = persistedQueryPresets.automatic({ sha256 });
  const GQL = new Benzene({
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
  const cache = lru(1024);
  const auto = persistedQueryPresets.automatic({ sha256, cache });
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
    new Benzene({ schema: TestSchema, persisted: auto })
  );
  assert.is(cache.get(`apq:${sha256Hash}`), '{test}');
});

suiteAuto('Throws error if client provided hash256 is mismatched', async () => {
  const auto = persistedQueryPresets.automatic({ sha256 });
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
    new Benzene({ schema: TestSchema, persisted: auto })
  );
});

suiteAuto('Returns query using stored hash256', async () => {
  const cache = lru(1024);
  const sha256Hash: string = await sha256('{test}');
  cache.set(`apq:${sha256Hash}`, '{test}');
  const auto = persistedQueryPresets.automatic({ cache, sha256 });

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
    new Benzene({ schema: TestSchema, persisted: auto })
  );
});

suiteAuto('Allows using custom cache', () => {
  return new Promise((resolve) => {
    const cache = {
      get: async () => {
        resolve();
        return '{hello}';
      },
      set: () => null,
      delete: () => true,
    };
    const auto = persistedQueryPresets.automatic({ cache, sha256 });
    auto.getQuery({ extensions: { persistedQuery: { sha256: '' } } });
  });
});

suiteAuto.run();
