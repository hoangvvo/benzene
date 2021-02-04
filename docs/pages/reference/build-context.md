# Building Context

In GraphQL, `context` is a value that is provided to every resolver and holds important contextual information that we can access in resolvers. (See [Root fields & resolvers](https://graphql.org/learn/execution/#root-fields-resolvers))

Benzene allows us to write a factory function that creates the context object in question. This context factory function will be used by downstream packages `@benzene/http` and `@benzene/ws`.

## Writing the context factory function

The context factory function can be defined in `contextFn` when instantiating the [Benzene instance](/reference/benzene).

```js
const GQL = new Benzene({
  contextFn: ({ extra }) => {
    return { role: "admin" };
  },
});
```

It will receive an object with `extra`, which is the second argument passed into the handler function of downstream packages. For example:

```js
import { Benzene, makeHandler } from "@benzene/ws";

const GQL = new Benzene({
  contextFn: ({ extra }) => {
    // extra is { user: "Niko", ip: "127.0.0.1" }
    return { user: extra.user }
  },
});

const graphqlWS = makeHandler(GQL);

function onConnection(socket, req) {
  const extra = {
    user: "Niko",
    ip: req.connection.remoteAddress,
  };
  graphqlWS(socket, extra);
}
```

## Access the context in resolvers

This context will be created using the factory function on every request. We can access it in resolvers like so:

```js
const resolvers = {
  Query: {
    catSecretPlan(obj, args, context, info) {
      if (context.user !== "Niko")
        throw new HttpError(401, "Only Niko can access this data");
      return thePlan;
    },
  },
};
```