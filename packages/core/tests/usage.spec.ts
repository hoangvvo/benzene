import { suite } from 'uvu';
import assert from 'uvu/assert';
import { GraphQLSchema } from 'graphql';
import { Benzene } from '../src';

const suiteUsage = suite('GraphQL constructor');

suiteUsage('throws if initializing instance with no option', () => {
  assert.throws(() => {
    // @ts-expect-error
    new Benzene();
  });
});
suiteUsage('throws if schema is invalid', () => {
  assert.throws(() => {
    new Benzene({
      schema: new GraphQLSchema({ directives: [null] }),
    });
  });
});

suiteUsage.run();
