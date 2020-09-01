import { suite } from 'uvu';
import assert from 'uvu/assert';
import { GraphQLSchema } from 'graphql';
import { GraphQL } from '../src';

const suiteUsage = suite('GraphQL constructor');

suiteUsage('throws if initializing instance with no option', () => {
  assert.throws(() => {
    // @ts-expect-error
    new GraphQL();
  });
});
suiteUsage('throws if schema is invalid', () => {
  assert.throws(() => {
    new GraphQL({
      schema: new GraphQLSchema({ directives: [null] }),
    });
  });
});

suiteUsage.run();
