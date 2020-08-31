import { GraphQLSchema } from 'graphql';
import { throws } from 'assert';
import { GraphQL } from '../src';

describe('GraphQL constructor', () => {
  it('throws if initializing instance with no option', () => {
    throws(() => {
      // @ts-expect-error
      new GraphQL();
    });
  });
  it('throws if schema is invalid', () => {
    throws(() => {
      new GraphQL({
        schema: new GraphQLSchema({ directives: [null] }),
      });
    });
  });
});
