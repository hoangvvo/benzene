import { suite } from 'uvu';
import { Lru } from 'tiny-lru';
import { strict as assert } from 'assert';
import { GraphQL } from '../src';
import { TestSchema } from './schema.spec';
import { QueryCache } from '../src/types';

const suiteCache = suite('GraphQL#cache');

suiteCache('saves compiled query to cache', async () => {
  const GQL = new GraphQL({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL(`{ test }`);
  assert(lru.has('{ test }'));
});
suiteCache('uses compiled query from cache', async () => {
  const GQL = new GraphQL({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  lru.set('{ test }', {
    jit: {
      query: () => ({ data: { test: 'Goodbye' } }),
      stringify: JSON.stringify,
    },
    operation: 'query',
    document: '' as any,
  });

  const result = await GQL.graphql({ source: '{ test }' });
  assert.deepStrictEqual(result, { data: { test: 'Goodbye' } });
});
suiteCache('does not cache bad query', async () => {
  const GQL = new GraphQL({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL('{ baddd }');
  assert(lru.has('{ baddd }') !== true);
});

suiteCache.run();
