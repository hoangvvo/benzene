# Benzene Core

`@benzene/core` is used by all `benzene` packages. The main export is `GraphQL`, which can be used to create a Benzene `GraphQL` instance.

```js
const { GraphQL } = require('@benzene/<package>');

const GQL = new GraphQL(options);
```

## Options

The `options` argument is required and accepts the following:

| options | description | default |
|---------|-------------|---------|
| schema | A `GraphQLSchema` instance. It can be created using `makeExecutableSchema` from [graphql-tools](https://github.com/apollographql/graphql-tools). | (required) |
| rootValue | A value or function called with the parsed `Document` that creates the root value passed to the GraphQL executor. | `{}` |
| formatError | An optional function which will be used to format any errors from GraphQL execution result. | [`formatError`](https://github.com/graphql/graphql-js/blob/master/src/error/formatError.js) |

Unlike other frameworks `options.context` is not used in the constructor but rather in its API and binding packages.

## API

### `GraphQL#graphql({ source, contextValue, variableValues, operationName })`

Execute the GraphQL query with:

- `source` (string): The request query string to be executed.
- `contextValue` (object): the context value that will get passed to resolve functions.
- `variablesValues` (object): the variables object that will be used in the executor.
- `operationName` (string): The operation to be run if `source` contains multiple operations.

The function returns a never-rejected promise of the execution result, which is an object of `data` and `errors`.