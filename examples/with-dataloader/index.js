const express = require('express');
const { GraphQL, httpHandler } = require('@benzene/server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const expressPlayground = require('graphql-playground-middleware-express')
  .default;
const DataLoader = require('dataloader');
const { getUser, getBatchUsers } = require('./users');

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

const GQL = new GraphQL({ schema });

const app = express();

app.get('/playground', expressPlayground({ endpoint: '/graphql' }));
app.all(
  '/graphql',
  httpHandler(GQL, {
    context: (req) => {
      console.log(' --- ');
      return {
        // other contexts
        loaders: createLoaders(),
      };
    },
  })
);
app.use(express.static('public'));

app.listen(4000, () => {
  console.log('Server ready at http://localhost:4000/');
});

// It is not only helpful in httpHandler but also in GraphQL#graphql
// The example below creates a new loader inside the function to avoid stale data
// function getUserWithGraphQL(id) {
//   const context = {
//     loaders: createLoaders(),
//   }
//   GQL.graphql({
//     query: userQuery, variableValues: { id }, contextValue: context
//   })
// }
