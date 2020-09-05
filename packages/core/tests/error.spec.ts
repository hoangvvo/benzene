import { suite } from 'uvu';
import assert from 'uvu/assert';
import { GraphQLError } from 'graphql';
import { BenzeneError, BenzeneHTTPError } from '../src/error';

const suiteError = suite('BenzeneError');

suiteError('Extends GraphQLError', () => {
  assert.instance(new BenzeneError('err'), GraphQLError);
});

suiteError('Includes code if called with code', () => {
  assert.is(
    new BenzeneError('err', 'AN_ERROR_CODE').extensions?.code,
    'AN_ERROR_CODE'
  );

  assert.is(
    new BenzeneError('err', 'AN_ERROR_CODE', {}).extensions.code,
    'AN_ERROR_CODE'
  );
});

suiteError('Includes extensions if called with extensions', () => {
  const extensions = { test: 'test' };

  assert.is(
    new BenzeneError('err', undefined, extensions).extensions,
    extensions
  );
});

const suiteHttpError = suite('BenzeneHTTPError');

suiteHttpError('Includes status if called with status', () => {
  assert.is(new BenzeneHTTPError(401, 'Unauthenticated').status, 401);
});

suiteError.run();
