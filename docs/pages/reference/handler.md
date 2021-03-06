# Benzene Handlers

GraphQL is a flexible specification by being transport-agnostic: We can serve GraphQL over HTTP, WebSockets, and more. **Benzene** provides packages to work with different transports, such as `@benzene/http` and `@benzene/ws`.

## Framework agnostic

Different from other libraries, **Benzene** do not bind to a specific framework (there is no `@benzene/express` or `@benzene/hapi`) or a specific runtime (there is no `@benzene/deno` or `@benzene/lambda`). It works because we make no assumptions of the environment where **Benzene** is used and write our APIs generically.

For example, in `@benzene/http`, we expose a factory function to create a handler that accepts a generic Request object:

```ts
interface HTTPRequest {
  method: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, any>;
  headers: Headers;
}
```

It does not matter whether we are dealing with the [`req` of Node.js IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) or the [`body` of Deno Reader](https://doc.deno.land/builtin/stable#Deno.Reader). We only need to provide such an object containing the above JavaScript data types.

This is great because it enables us to switch frameworks without modifying our GraphQL server logic while allowing maintainers to focus on few sets of packages.

## The factory function

In each package, there is an exported function called `makeHandler`. This function accepts a [Benzene instance](/reference/benzene) and returns a `HandlerFunction` specific to the package being used.

```js
import { Benzene, makeHandler } from "@benzene/x";

const GQL = new Benzene(options);

const graphqlHandle = makeHandler(GQL, handlerOptions);
```

Regardless of packages, the returned function always accepts two arguments: a specific input argument and an `extra` argument.

### The extra argument

Unlike other libraries that [store middleware specific variables in a "context" object](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#middleware-specific-context-fields) for convenience, **Benzene** avoids storing those that are not needed for the GraphQL execution to achieve the best performance.

Instead, the `extra` argument allows us to specify only what we need to store for later uses. For the best flexibility, though, we recommend avoid passing in runtime/framework-specific variables (like a Request object or a WebSocket instance).

```js
function onRequest(request) {
  const extra = { user: request.user, ip: request.ip };
  graphqlHandle(request, extra).then(respondGraphQl);
}
```

This `extra` variable can be accessed in places like the [context creation function](/reference/build-context).
