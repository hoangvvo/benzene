# Core

`@benzene/core` is the dependency used by all `benzene` packages. This gets installed along with other `benzene` packages as a dependency so it's unlikely that you have to manually install this.

The main export is `GraphQL`, which can be used to create a Benzene "GraphQL" instance. This is re-exported from each binding package and can be shared across them.

```js
const { GraphQL } = require('@benzene/server');
// or
const { GraphQL } = require('@benzene/ws');
// or
const { GraphQL } = require('@benzene/worker');

// Create the instance
const GQL = new GraphQL(options);
```

!> Despite the name, `GraphQL` from `@benzene/core` is **not related** to anything in the official [graphql-js](https://github.com/graphql/graphql-js).

## GraphQL instance :id=graphql

The `GraphQL` constructor requires a `options` argument, which accepts the following:

| options | description | default |
|---------|-------------|---------|
| schema | A [`GraphQLSchema` instance](https://hoangvvo.github.io/benzene/#/getting-started?id=create-a-benzen-graphql-instance). | (required) |
| formatError | An optional function that will be used to format any errors from GraphQL execution result. | [`formatError`](https://github.com/graphql/graphql-js/blob/master/src/error/formatError.js) |

Unlike other frameworks `options.context` is not used in the constructor but rather in its API and binding packages.

The `schema` will be used throughout its [API](#api) and binding packages. It is validated only once on construction.

Options `formatError` also applies everywhere.

## GraphQL methods :id=method

### `GraphQL#graphql({ source, contextValue, variableValues, operationName, rootValue })` :id=api-graphql

Execute the GraphQL query with:

- `source` (string): The request query string to be executed.
- `contextValue` (object): the context value that will get passed to resolve functions.
- `variablesValues` (object): the variables object that will be used in the executor.
- `operationName` (string): The operation to be run if `source` contains multiple operations.
- `rootValue` (any): The root value passed to the GraphQL executor.

The function returns a never-rejected promise of the execution result, which is an object of `data` and `errors`.

It is almost the equivalent of the [`graphql`](https://graphql.org/graphql-js/graphql/#graphql) export from `graphql-js`. The only difference is that it does not accept `schema` since we have already provided in the constructor.

```js
const { data, error } = await GQL.graphql({
  source: `
    query pokemon($id: ID!) {
      pokemon(id: $id) {
        name
        image
        abilities
      }
    }
  `,
  contextValue: { trainer: 'Ash Ketchum', region: 'Kanto' },
  variables: { id: 25 },
});
```

## Error handling and formatting :id=error-handling

A GraphQL execution never throws error in resolvers. When they occur, errors are put inside the `errors` array in the response. Each error is, by default, formatted according to the rules described by the [Response Format Errors section](http://spec.graphql.org/draft/#sec-Errors.Error-result-format) of the spec.

`options.formatError` can be defined to replace the default error formatter for purposes such as avoiding exposing exploitable environment states. You can also log errors in `formatError` for debugging purposes.

```js
const GQL = new GraphQL({
  formatError: (err) => {
    // Don't give the specific errors to the client.
    if (err.message.startsWith('FatalErrorThatMayExposeEnvironment: ')) {
      // Let's log this error for debugging later
      logger.log(err);
      // Return a dummy error instead
      return new Error('Just some internal error, nothing to see here folk');
    }
    // Otherwise return the original error.
    return err;
  },
});
```
