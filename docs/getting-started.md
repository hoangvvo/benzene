# Getting Started

This tutorial takes you through the process of building a GraphQL server with `benzene`. We will build a simple todo app.

## Create our Todo App with Query and Mutation

We will install `@benzene/server` and [`graphql-js`](https://github.com/graphql/graphql-js).

```bash
npm i graphql @benzene/server
```

### Create a GraphQLSchema instance

`benzene` does not concern of how you create a [`GraphQLSchema`](https://graphql.org/graphql-js/type/#graphqlschema) instance, you can either use:

- *SDL-first* libraries like [graphql-tools](https://github.com/ardatan/graphql-tools) 
- *code-first* libraries likes [type-graphql](https://github.com/MichalLytek/type-graphql) and [@nexus/schema](https://github.com/graphql-nexus/schema).

We will use `graphql-tools` in this tutorial. Install it using:

```bash
npm i @graphql-tools/schema
```

We also use [`nanoid`](https://github.com/ai/nanoid) to generate random ids for our todos:

```bash
npm i nanoid
```

Create a file called `schema.js` and add the following:

```js
import { makeExecutableSchema } from "@graphql-tools/schema";
import { nanoid } from "nanoid";

const todos = [];

const typeDefs = `
  type Todo {
    id: ID!
    text: String!
    done: Boolean!
  }

  type Query {
    todo(id: ID!): Todo
  }

  type Mutation {
    createTodo(text: String!): Todo!
    updateTodo(id: ID!, text: String, done: Boolean): Todo!
  }
`;

const resolvers = {
  Query: {
    todo: (parent, { id }) => todos.find((t) => t.id === id),
  },
  Mutation: {
    createTodo: (parent, { text }) => {
      const newTodo = {
        id: nanoid(),
        text,
        done: false,
      };
      todos.push(newTodo);
      return newTodo;
    },
    updateTodo: (parent, { id, text, done }) => {
      const updatingTodo = todos.find((t) => t.id === id);
      if (!updatingTodo) throw new Error("Todo not found");
      if (text) updatingTodo.text = text;
      if (typeof done === "boolean") updatingTodo.done = done;
      return updatingTodo;
    },
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
```

### Create a Benzene GraphQL instance and HTTP Server

With our schema, create a [Benzene GraphQL instance](core/) instance with it. Let's create `server.js`:

```js
import { GraphQL } from "@benzene/server";
import schema from "./schema";

const GQL = new GraphQL({ schema });
```

*Note that this `GraphQL` is not related to anything in the official [graphql-js](https://github.com/graphql/graphql-js)*

We then hook that instance into `httpHandler` which creates a [request listener](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener) that can be used in [`http`](https://nodejs.org/api/http.html).

```js
import http from "http";
import { GraphQL, httpHandler } from "@benzene/server";
import schema from "./schema";

const GQL = new GraphQL({ schema });

// Note: options.path is often set if using with `http` only.
// If you use other frameworks like Express, which has its
// own router, you don't have to set it.
const gqlHandle = httpHandler(GQL, { path: "/graphql" });

const server = http.createServer(gqlHandle);
server.listen(3000);
```

We should now have a GraphQL server listening at port `3000`.

## Extended: Add Subscription to our Todo App

Suppose the todo list is used by multiple people. We need a way to notify other people if a todo is updated by a person. One way to do so is to have GraphQL Subscription over [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API). We can use WebSocket inside Node.js with [`ws`](https://github.com/websockets/ws).

Install `ws` and `@benzene/ws`. We also use `graphql-subscriptions` to create [Asynchronous Iterators](https://github.com/tc39/proposal-async-iteration), but you can use any other libraries that achieve the same purpose.

```bash
npm i ws @benzene/ws graphql-subscriptions
```

### Add Subcription to our GraphQLSchema instance

Let's edit `schema.ts`:

```js
/* ... */
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();

const typeDefs = `
  type Todo {
    id: ID!
    text: String!
    done: Boolean!
  }

  type Query {
    todo(id: ID!): Todo
  }

  type Mutation {
    createTodo(text: String!): Todo!
    updateTodo(id: ID!, text: String, done: Boolean): Todo!
  }

  type Subscription {
    todoUpdated: Todo!
  }
`;

const resolvers = {
  /* ... */
  Mutation: {
    /* ... */
    updateTodo: (parent, { id, text, done }) => {
      const updatingTodo = todos.find((t) => t.id === id);
      if (!updatingTodo) throw new Error("Todo not found");
      if (text) updatingTodo.text = text;
      if (typeof done === "boolean") updatingTodo.done = done;

      pubsub.publish(`todo_updated`, {
        todoUpdated: updatingTodo,
      });

      return updatingTodo;
    },
  },
  Subscription: {
    todoUpdated: {
      subscribe: () => pubsub.asyncIterator(`todo_updated`),
    },
  },
};
```

We now have a [GraphQL Subscription](https://graphql.org/blog/subscriptions-in-graphql-and-relay/) in the schema that will notify if a todo is updated.

### Create a WebSocket server

Let's edit `server.ts`

```js
import http from "http";
import * as WebSocket from "ws";
import { GraphQL, httpHandler } from "@benzene/server";
import { wsHandler } from "@benzene/ws";
import schema from "./schema";

const GQL = new GraphQL({ schema });

const gqlHandle = httpHandler(GQL, { path: "/graphql" });
// Add wsHandle
const wsHandle = wsHandler(GQL);

const server = http.createServer(gqlHandle);
server.listen(3000);

const wss = new WebSocket.Server({ server });
wss.on("connection", wsHandle);
```

As you can see, we reuse the same `GQL` instance that is used inside `httpHandler`. We also create a `ws` server instance and respond to `connection` event using the handler created by `wsHandler`.
