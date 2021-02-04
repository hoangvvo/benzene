# Benzene

Every **Benzene** package relies on the `Benzene` class, which contains all the logic in executing the GraphQL request. The class can be found in the `@benzene/core` package and is re-exported in `@benzene/http` and `@benzene/ws` (use either one interchangeably).

```js
import { Benzene } from "@benzene/http"
// is the same as
import { Benzene } from "@benzene/ws"
```

Most of the GraphQL behavior can be configured upon instantiating `Benzene`, such as context creation or error handling. Those configurations will apply when we use that [Benzene instance](/reference/benzene) in `@benzene/http` and `@benzene/ws`. For example, both `@benzene/http` and `@benzene/ws` will call the same `formatErrorFn` on execution errors and `contextFn` to create the resolver context.

This allows us to write such logic only once and use it everywhere.

## Configuration

A `Benzene` instance will be instantiated with an `options` object, containing the following field:

- `schema`: (required) A [GraphQLSchema](https://graphql.org/graphql-js/type/#graphqlschema) instance.
- `formatErrorFn`: A function to format errors. See [Error Handling](./error-handling).
- `contextFn`: A function to build resolvers context per query. See [Building Context](./build-context).

### The GraphQL Schema

**Benzene** is not concerned of the method that is used to generate the [GraphQLSchema](https://graphql.org/graphql-js/type/#graphqlschema) instance. We can create it with libraries like [graphql-tools](https://github.com/ardatan/graphql-tools), [type-graphql](https://github.com/MichalLytek/type-graphql), [GraphQL Nexus](https://nexusjs.org/), and others.

## Benzene methods

A `Benzene` instance has methods similar to those in the official [graphql-js](https://github.com/graphql/graphql-js) library. That includes `graphql()`, `execute()`, and `subscribe()`. The argument is the same with the `graphql-js` methods. The only difference is that each does not take in `schema` since we already define it above.

These methods allow you to execute GraphQL wherever you want.

Learn more at [GraphQL Query](./graphql-query).

## TypeScript usage

The `Benzene` class allows two generics `TContext` and `TExtra`. `TContext` is the resovlers context and `TExtra` would be the [extra argument](./handler#the-extra-argument) used in downstream packages.

When a `Benzene` instance is used by `makeHandler` from `@benzene/http` or `@benzene/ws`, the generics will be inherited.

```ts
const GQL = new Benzene<{ user: User }, { token: string }>({
  schema,
  contextFn: async ({ extra }) => {
    const user = await getUserFromToken(extra.token);
    return { user };
  },
});

const graphqlHTTP = makeHandler(GQL);

function onRequest(request) {
  const result = await graphqlHTTP(request, {
    token: request.headers["Authorization"],
  });
}
```