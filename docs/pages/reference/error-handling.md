# Error Handling

A GraphQL execution never throws because it always catches any errors that occur inside the schema resolvers and returns them as an array in the `errors` field (See [Errors section in the spec](http://spec.graphql.org/draft/#sec-Errors)).

While you can be assured that the errors will not crash the app, there are use cases to format or log the errors for debugging. To do so we define `formatError` option when initializing the Benzene instance.

## Formatting errors

Since any errors thrown will be presented to the user via the `errors` field, we may expose sensitive system information if the errors originated from places like database operations. Therefore, it is important to strip away those errors before it is sent out to users.

By default, **Benzene** formats the errors using the [`formatError` function from graphql-js](https://graphql.org/graphql-js/error/#formaterror), which allows them to be compliant with the spec.

If you need to format each error different, you can define the `formatError` option like so:

```js
const GQL = new Benzene({
  formatError: (err) => {
    // Don't give the specific errors to the client.
    if (err.message.startsWith("FatalErrorThatMayExposeEnvironment: ")) {
      return new Error("Just some internal error, nothing to see here folk");
    }
    // Otherwise return the original error.
    return err;
  },
});
```

## Logging errors

In addition to formatting errors, `formatError` can also be used to log your errors. One strategy is to define a list of expected user errors and treat other errors as unexpected ones that should be logged for debugging.

When an error is thrown in resolvers, the GraphQL executor augments it with information like its `locations` and `path`, while storing the original error in the `originalError` . (See [`GraphQLError.js`](https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L19) in `graphql-js`)

```js
const GQL = new Benzene({
  formatError: (err) => {
    if (!(err.originalError instanceof MyCustomError)) {
      // Log the error for later debugging only if
      // it is an internal error
      logger.error(err);
    }
    return err;
  },
});
```
