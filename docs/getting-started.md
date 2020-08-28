# Getting Started

`benzene` is a suite of packages to implement GraphQL in different environments and transports.

The following packages are available:

- `@benzene/server`
- `@benzene/worker`
- `@benzene/ws`

Each package can be used either *independently* or *together* (by sharing the same `GraphQL` instance from `@benzene/core`).

## Installation

Install `graphql` and the `benzene` package(s) you need. Whichever package(s) you install, `@benzene/core` will also be installed along as a dependency.

Let's try out `@benzene/server` for example.

```bash
yarn add graphql @benzene/server
```

## Making the Benzene GraphQL instance

### Create a GraphQLSchema instance

At its minimum `benzene` requires a [`GraphQLSchema`](https://graphql.org/graphql-js/type/#graphqlschema) instance. Therefore, as a prerequisite, one must be created.

The `GraphQLSchema` can be created either using

- *SDL-first* libraries like [graphql-tools](https://github.com/ardatan/graphql-tools) 
- *code-first* libraries likes [type-graphql](https://github.com/MichalLytek/type-graphql) and [@nexus/schema](https://github.com/graphql-nexus/schema).

### Create a Benzee GraphQL instance

Each package reexports `GraphQL` from `@benzene/core`, which can be used to create a [Benzene GraphQL instance](core/). 

*Note that this `GraphQL` is not related to anything in the official [graphql-js](https://github.com/graphql/graphql-js)*

```js
const { GraphQL } = require('@benzene/server');

const GQL = new GraphQL({ schema: yourGraphQLSchema });
```

Now `GQL` can be used in one or more `benzene` packages. Below is an example using `@benzene/server`:

```js
const { GraphQL, httpHandler } = require('@benzene/server');

const gqlHandle = httpHandler(GQL, options);

// In Node.js http
const server = http.createServer(gqlHandle);
server.listen(3000);

// In Express.js
const app = express();
app.all('/graphql', gqlHandle);
app.listen(3000);
```

For additional usage, see the binding packages' documentations:

- [@benzene/server](server/)
- [@benzene/worker](worker/)
- [@benzene/ws](ws/)

## Where from here

It is recommended to read about `GraphQL` instance in the [Core Section](core/) before diving into specific binding.