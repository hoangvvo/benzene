const express = require("express");
const { Benzene, makeHandler } = require("@benzene/http");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const expressPlayground = require("graphql-playground-middleware-express")
  .default;
const DataLoader = require("dataloader");
const { getUser, getBatchUsers } = require("./users");

function createLoaders() {
  return {
    users: new DataLoader(getBatchUsers),
    // Add more models here
  };
}

const typeDefs = `
  type User {
    id: ID!
    name: String!
    age: Int!
    friends: [User]!
    bestFriend: User
  }

  type UserNoLoader {
    id: ID!
    name: String!
    age: Int!
    friends: [UserNoLoader]!
    bestFriend: User
  }

  type Query {
    user(id: ID!): User
    userNoLoader(id: ID!): UserNoLoader
  }
`;

const resolvers = {
  User: {
    friends: (parent, variables, context) => {
      return context.loaders.users.loadMany(parent.friendIds);
    },
    bestFriend: (parent, variables, context) => {
      return context.loaders.users.load(parent.bestFriendId);
    },
  },
  UserNoLoader: {
    friends: (parent, variables, context) => {
      return getBatchUsers(parent.friendIds);
    },
    bestFriend: (parent) => {
      return getUser(parent.bestFriendId);
    },
  },
  Query: {
    user: (obj, variables, context) => {
      return context.loaders.users.load(variables.id);
    },
    userNoLoader: (obj, variables) => {
      return getUser(variables.id);
    },
  },
};

var schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const GQL = new Benzene({
  schema,
  contextFn: () => {
    console.log(" --- ");
    return {
      // other contexts
      loaders: createLoaders(),
    };
  },
});

const graphqlHTTP = makeHandler(GQL);

const app = express();

app.use(express.json());

app.get("/playground", expressPlayground({ endpoint: "/graphql" }));
app.all("/graphql", (req, res) => {
  graphqlHTTP({
    method: req.method,
    headers: req.headers,
    body: req.body,
  }).then((result) => {
    res.header(result.headers);
    res.status(result.status).send(result.payload);
  });
});
app.use(express.static("public"));

app.listen(4000, () => {
  console.log("Server ready at http://localhost:4000/");
});
