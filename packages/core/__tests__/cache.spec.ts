import { Lru } from 'tiny-lru';
import Benzene from '../src/core';
import { TestSchema } from './utils/schema';
import { QueryCache } from '../src/types';

test('saves compiled query to cache', async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL(`{ test }`);
  expect(lru.has('{ test }')).toBe(true);
});

test('uses compiled query from cache', async () => {
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
  expect(result).toEqual({ data: { test: 'Goodbye' } });
});
test('does not cache bad query', async () => {
  const GQL = new Benzene({
    schema: TestSchema,
  });
  const lru: Lru<QueryCache> = (GQL as any).lru;
  await GQL.getCachedGQL('{ baddd }');
  expect(lru.has('{ baddd }')).toBe(false);
});
