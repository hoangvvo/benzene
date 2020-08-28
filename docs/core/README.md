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
| schema | A `GraphQLSchema` instance. It can be created using `makeExecutableSchema` from [graphql-tools](https://github.com/apollographql/graphql-tools). | (required) |
| rootValue | A value or function called with the parsed `Document` that creates the root value passed to the GraphQL executor. | `{}` |
| formatError | An optional function which will be used to format any errors from GraphQL execution result. | [`formatError`](https://github.com/graphql/graphql-js/blob/master/src/error/formatError.js) |

Unlike other frameworks `options.context` is not used in the constructor but rather in its API and binding packages.

The `schema` will be used throughout its [API](#api) and binding packages. It is validated only once on construction.

Other options like `rootValue` and `formatError` also applies everywhere.

## GraphQL methods :id=method

### `GraphQL#graphql({ source, contextValue, variableValues, operationName })` :id=api-graphql

Execute the GraphQL query with:

- `source` (string): The request query string to be executed.
- `contextValue` (object): the context value that will get passed to resolve functions.
- `variablesValues` (object): the variables object that will be used in the executor.
- `operationName` (string): The operation to be run if `source` contains multiple operations.

The function returns a never-rejected promise of the execution result, which is an object of `data` and `errors`.

It is almost the equivalent of the [`graphql`](https://graphql.org/graphql-js/graphql/#graphql) export from `graphql-js`. The only diffence is that it does not accept `schema` since we have already provided in the constructor.

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

`options.formatError` can be defined to replace the default error formatter for purpose such as avoiding exposing exploitable environment state. In addition, you can also log errors in `formatError` for debugging purposes.

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

This applies everywhere that uses the `GraphQL` instance. Some errors that are never included are:

- BodyParsing error
- No provided query

## RootValue

`options.rootValue` defines away to supply a `rootValue` to the GraphQL execution. While this value is not mentioned anywhere and the official document, this [Stackoverflow answer](https://stackoverflow.com/a/53987189/14114942) provides some insight.

While it's unlikely you will need this, you can either provides an **object** or a **function** to dynamically provide `rootValue` on each GraphQL query. In the case of function, it receives `document`, which is [parsed](https://graphql.org/graphql-js/language/#parse) from `source`.

```js
// Adapted from Apollo Server documentation
const GQL = new GraphQL({
  rootValue: (documentAST) => {
    const op = getOperationAST(documentNode);
    return op === 'mutation' ? mutationRoot : queryRoot;
  },
});
```