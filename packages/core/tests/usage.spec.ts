import { suite } from 'uvu';
import { GraphQLSchema } from 'graphql';
import { throws } from 'assert';
import { GraphQL } from '../src';

const suiteUsage = suite('GraphQL constructor');

suiteUsage('throws if initializing instance with no option', () => {
  throws(() => {
    // @ts-expect-error
    new GraphQL();
  });
});
suiteUsage('throws if schema is invalid', () => {
  throws(() => {
    new GraphQL({
      schema: new GraphQLSchema({ directives: [null] }),
    });
  });
});

suiteUsage.run();
