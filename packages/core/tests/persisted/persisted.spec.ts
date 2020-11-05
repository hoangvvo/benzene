import { suite } from 'uvu';
import assert from 'uvu/assert';
import {
  Benzene,
  runHttpQuery,
  FormattedExecutionResult,
  HttpQueryResponse,
} from '../../src';
import { TestSchema } from '../schema.spec';

const TestPersisted = {
  isPersistedQuery(params) {
    return params.extensions?.persisted === true;
  },
  getQuery(params) {
    return params.extensions?.query;
  },
};

const GQL = new Benzene({
  schema: TestSchema,
  persisted: TestPersisted,
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

const suitePersisted = suite('GraphQL#persisted');

suitePersisted('Allows options.persisted to be set', () => {
  const persisted = {} as any;
  const GQL = new Benzene({
    schema: TestSchema,
    persisted,
  });
  assert.is(GQL.persisted, persisted);
});

suitePersisted('Gets query using persisted#getQuery', async () => {
  await httpTest(
    {
      method: 'POST',
      body: { extensions: { persisted: true, query: '{test}' } },
    },
    { body: { data: { test: 'Hello World' } } }
  );
});

suitePersisted(
  'Bypass persisted if isPersistedQuery returns false',
  async () => {
    await httpTest(
      {
        method: 'POST',
        body: { extensions: { persisted: false, query: '{test}' } },
      },
      {
        status: 400,
        body: {
          errors: [{ message: 'Must provide query string.' }],
        },
      }
    );
  }
);

suitePersisted('Allows persisted#getQuery to returns undefined', async () => {
  await httpTest(
    {
      method: 'POST',
      body: { extensions: { persisted: true } },
    },
    {
      status: 400,
      body: {
        errors: [{ message: 'Must provide query string.' }],
      },
    }
  );
});

suitePersisted('Catches errors throw in persisted#getQuery', async () => {
  const GQL = new Benzene({
    schema: TestSchema,
    persisted: {
      isPersistedQuery: () => true,
      async getQuery() {
        throw new Error('Throws');
      },
    },
  });

  await httpTest(
    {
      method: 'GET',
      body: {},
    },
    {
      status: 500,
      body: {
        errors: [{ message: 'Throws' }],
      },
    },
    GQL
  );
});

suitePersisted(
  'Uses error.status of error thrown in persisted#getQuery',
  async () => {
    const GQL = new Benzene({
      schema: TestSchema,
      persisted: {
        isPersistedQuery: () => true,
        async getQuery() {
          const error = new Error('Bad Persisted Query');
          (error as any).status = 400;
          throw error;
        },
      },
    });

    await httpTest(
      {
        method: 'GET',
        body: {},
      },
      {
        status: 400,
        body: {
          errors: [{ message: 'Bad Persisted Query' }],
        },
      },
      GQL
    );
  }
);

suitePersisted.run();
