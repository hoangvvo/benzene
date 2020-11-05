import { suite } from 'uvu';
import assert from 'uvu/assert';
import { Lru } from 'tiny-lru';
import Benzene from '../src/core';
import { TestSchema } from './schema.spec';
import { QueryCache } from '../src/types';

const suiteCache = suite('GraphQL#cache');

suiteCache('saves compiled query to cache', async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL(`{ test }`);
  assert.ok(lru.has('{ test }'));
});
suiteCache('uses compiled query from cache', async () => {
  const GQL = new Benzene({
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
  assert.equal(result, { data: { test: 'Goodbye' } });
});
suiteCache('does not cache bad query', async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL('{ baddd }');
  assert.not.ok(lru.has('{ baddd }'));
});

suiteCache.run();
