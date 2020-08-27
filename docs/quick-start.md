# Quick start

`benzene` is a suite of packages to implement GraphQL in different environments and transports.

The following packages are available:

- `@benzene/server`: Fast and simple GraphQL Server for Node.js
- `@benzene/worker`: GraphQL Executor and Server for Web Workers
- `@benzene/ws`: GraphQL over WebSocket using [`ws`](https://github.com/websockets/ws)

Each package can be used either *together* or *independently*, all depend `@benzene/core` which contains shared core utils.



## Installation

Install `graphql` and the `benzene` package you need.

```bash
yarn add graphql @benzene/<package>
```

## Making the Benzene GraphQL instance

### Create a GraphQLSchema instance

At its minimum `benzene` requires a `GraphQLSchema` instance.

The `GraphQLSchema` can be created either using *SDL-first* libraries like [graphql-tools](https://github.com/ardatan/graphql-tools) or *code-first* libraries likes [type-graphql](https://github.com/MichalLytek/type-graphql) and [@nexus/schema](https://github.com/graphql-nexus/schema).

### Create a Benzee GraphQL instance

Each package reexports `GraphQL` from `@benzene/core`, which can be used to create a [Benzene GraphQL instance](core/).

```js
const { GraphQL } = require('@benzene/<package>');

const GQL = new GraphQL({ schema: yourGraphQLSchema });
```

Now `GQL` can be used in one of the `benzene` packages.

## Usage in Benzene packages

The same `GQL` can be used in one or more `benzene` packages. Below is an example using `@benzene/server`:

```js
const { httpHandler } = require('@benzene/server');

const gqlHandle = httpHandler(GQL, options);

// In Node.js http
const server = http.createServer(gqlHandle);
server.listen(3000);

// In Express.js
const app = express();
app.all('/graphql', gqlHandle);
app.listen(3000);
```

For additional usage, see the respective package's documentation.