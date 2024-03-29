# Error Handling

A GraphQL execution never throws because it always catches any errors that occur inside the schema resolvers and returns them as an array in the `errors` field (See [Errors section in the spec](http://spec.graphql.org/draft/#sec-Errors)).

While we can be assured that the errors will not crash the app, there are use cases to format or log the errors for debugging. To do so we define `formatErrorFn` option when instantiating the [Benzene instance](/reference/benzene).

## Formatting errors

Since any thrown errors will be presented to the user via the `errors` field, we may expose sensitive system information if the errors originated from places like database operations. Therefore, it is important to strip away those errors before it is sent out to users.

By default, **Benzene** formats the errors using a [compliant implementation](https://github.com/hoangvvo/benzene/blob/main/packages/core/src/utils.ts), which allows them to be compliant with the spec.

If we need to format each error different, we can define the `formatErrorFn` option like so:

```js
const GQL = new Benzene({
  formatErrorFn: (err) => {
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

In addition to formatting errors, `formatErrorFn` can also be used to log our errors. One strategy is to define a list of expected user errors and treat other errors as unexpected ones that should be logged for debugging.

When an error is thrown in resolvers, the GraphQL executor augments it with information like its `locations` and `path`, while storing the original error in the `originalError` . (See [`GraphQLError.js`](https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L19) in `graphql-js`)

```js
const GQL = new Benzene({
  formatErrorFn: (err) => {
    if (!(err.originalError instanceof MyCustomError)) {
      // Log the error for later debugging only if
      // it is an internal error
      logger.error(err);
    }
    return err;
  },
});
```
