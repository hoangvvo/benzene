import { suite } from './uvu';
import assert from './uvu/assert';
import { Benzene } from '../../src';
import { httpTest as oHttpTest } from '../http.spec';
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

const httpTest = (httpParams, expected, GQLInstance = GQL) =>
  oHttpTest(httpParams, expected, GQLInstance);
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
    { payload: { data: { test: 'Hello World' } } }
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
        payload: {
          errors: [
            {
              message: 'Must provide query string.',
              locations: undefined,
              path: undefined,
            },
          ],
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
      payload: {
        errors: [
          {
            message: 'Must provide query string.',
            locations: undefined,
            path: undefined,
          },
        ],
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
      payload: {
        errors: [{ message: 'Throws', locations: undefined, path: undefined }],
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
        payload: {
          errors: [
            {
              message: 'Bad Persisted Query',
              locations: undefined,
              path: undefined,
            },
          ],
        },
      },
      GQL
    );
  }
);

suitePersisted.run();
