# @benzene/server

Fast and simple GraphQL Server for Node.js

## Install

```bash
yarn add graphql @benzene/server
```

## Usage

```js
const { GraphQL, httpHandler } = require('@benzene/server');
const http = require('http');

const GQL = new GraphQL({ schema });
const gqlHandle = httpHandler(GQL, options);

const server = http.createServer(gqlHandle);
server.listen(3000, () => {
  console.log(`🚀  Server ready at :3000`);
});
```

You can use `gqlHandle` in other compatible frameworks (those that accepts the `(req, res) => void` function). See [Framework integrations](/server/http-integration.md) for additional usage.

## API

### httpHandler(GQL, options)

The `httpHandler` function returns a `requestListener` function (`(req, res) => void`).

`GQL` in an instance [Benzene GraphQL instance](/core/#graphql).

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| context | An object or function called to creates a context shared across resolvers per request. The function accepts [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) as the only argument. | `{}` |
| path | Specify a path for the GraphQL endpoint, and `@benzene/server` will respond with `404` elsewhere. You **should not** set this when using with frameworks with built-in routers (such as `express`). | `undefined` (run on all paths) |

## Building Context :id=context

`options.context` in `httpHandler` can be used to build a context for GraphQL execution layer. It can either be an object or a function. In the case of function, it accepts `req` (`http.IncomingMessage`). Depends on the framework, you may receive an extended `IncomingMessage` (such as in `express`) that has extra properties.

```js
const gqlHandle = httpHandler(GQL, {
  context: async (req) => {
    const user = await getUserFromReq(req);
    // Return the context object
    return { user };
  },
});
```

## Authentication

`benzene` recommends seperating authentication from GraphQL layer. You can use packages like [`passport`](https://github.com/jaredhanson/passport), which sets the user to `req.user` that can later be accessed inside the `context` function.