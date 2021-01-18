# Getting Started

This tutorial takes you through the process of building a GraphQL server with `benzene`. We will build a simple todo app.

## Create our Todo App with Query and Mutation

We will install `@benzene/http` and [graphql-js](https://github.com/graphql/graphql-js).

```bash
npm i graphql @benzene/http
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

### Create a Benzene instance and HTTP Server

With our schema, create a [Benzene instance](core/) instance with it like so using `Benzene` export from `@benzene/http` (which is re-exported from `@benzene/core`). 

```js
const GQL = new Benzene({ schema });
```

`benzene` libraries are designed to work anywhere, but let's use Node.js `http` this time.

Since we don't use Express.js or [body-parser](https://github.com/expressjs/body-parser), we need to write a function to read data from incoming request:

```js
function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}
```

To parse the string body retrieved from `readBody` according to GraphQL HTTP spec, use `parseGraphQLBody` from `@benzene/http`, which requires the string raw body and the incoming request's content-type. 

```js
const rawBody = await readBody(req);
const body = parseGraphQLBody(rawBody, req.headers['content-type']);
```

Next, use `makeHandler` from `@benzene/http` to create a handler for the incoming request.

```js
const httpHandler = makeHandler(GQL);
```

`makeHandler` returns a handler function `httpHandler` that is to be called an object with the following fields: 

- `method` (the HTTP method)
- `body` (parsed from `parseGraphQLBody` or `undefined`),
- `query` (can be parsed from `req.url` using `querystring` or `undefined`)
- `headers` (the object of incoming headers)

Since we are sending GraphQL via POST body, `query` is not needed.

```js
const result = await httpHandler({
  method: req.method,
  headers: req.headers,
  body
});
```

The returned `result` is an object with:

- `status` the status code that should be set to response
- `headers` the headers that should be set to response
- `payload` the execution result object

Simply uses `res` to send the response.

```js
res.writeHead(result.status, result.headers);
res.end(JSON.stringify(result.payload));
```

Here is our complete code:


```js
import http from "http";
import { Benzene, parseGraphQLBody, makeHandler } from "@benzene/http";
import schema from "./schema";

function readBody(request) {
  return new Promise(resolve => {
    var body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => resolve(body));
  });
}

const GQL = new Benzene({ schema });

const httpHandler = makeHandler(GQL);

const server = http.createServer(async (req, res) => {
  const rawBody = await readBody(req);
  const result = await httpHandler({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers['content-type'])
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
});

server.listen(3000);
```

We should now have a GraphQL server listening at port `3000`.

## Extended: Add Subscription to our Todo App

Suppose the todo list is used by multiple people. We need a way to notify other people if a todo is updated by a person. One way to do so is to have GraphQL Subscription over [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API).

Similiar, while `@benzene/ws` can work with any compatible WebSocket server, we will use [`ws`](https://github.com/websockets/ws) this time.

Install `ws` and `@benzene/ws`. We also needs `graphql-subscriptions` to create [Asynchronous Iterators](https://github.com/tc39/proposal-async-iteration), but you can use any other libraries that achieve the same purpose.

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
import WebSocket from "ws";
import { Benzene, parseGraphQLBody, makeHandler } from "@benzene/http";
import { makeHandler as makeWsHandler } from "@benzene/ws";
import schema from "./schema";

function readBody(request) {
  return new Promise(resolve => {
    var body = '';
    request.on('data', () => (body += chunk));
    request.on('end', () => resolve(body));
  });
}

const GQL = new Benzene({ schema });

const httpHandler = makeHandler(GQL);

const wsHandler = makeWsHandler(GQL);

const server = http.createServer(async (req, res) => {
  const rawBody = await readBody(req);
  const result = await httpHandler({
    method: req.method,
    headers: req.headers,
    body: parseGraphQLBody(rawBody, req.headers['content-type'])
  });
  res.writeHead(result.status, result.headers);
  res.end(JSON.stringify(result.payload));
});

const wss = new WebSocket.Server({ server });
wss.on("connection", (ws) => wsHandle(ws));

server.listen(3000);
```

As you can see, we use the same `Benzene` instance. We also create a `ws` server instance and respond to `connection` event using the handler created by `makeHandler`.
