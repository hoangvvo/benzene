import { Benzene } from '../../src';
import { httpTest as oHttpTest } from '../http.spec';
import { TestSchema } from '../utils/schema';

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

test('Allows options.persisted to be set', () => {
  const persisted = {} as any;
  const GQL = new Benzene({
    schema: TestSchema,
    persisted,
  });
  expect(GQL.persisted).toBe(persisted);
});

test('Gets query using persisted#getQuery', async () => {
  await httpTest(
    {
      method: 'POST',
      body: { extensions: { persisted: true, query: '{test}' } },
    },
    { payload: { data: { test: 'Hello World' } } }
  );
});

test('Bypass persisted if isPersistedQuery returns false', async () => {
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
});

test('Allows persisted#getQuery to returns undefined', async () => {
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

test('Catches errors throw in persisted#getQuery', async () => {
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

test('Uses error.status of error thrown in persisted#getQuery', async () => {
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
});
