const { makeExecutableSchema } = require("@graphql-tools/schema");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();

let idCount = 1;
const messages = [
  {
    id: idCount,
    message: "Message message",
  },
];

const typeDefs = `
  type Message {
    id: ID!
    message: String
  }

  type Query {
    messages: [Message]
  }

  type Mutation {
    addMessage(text: String!): Message
  }

  type Subscription {
    messageAdded: Message
  }
`;

const resolvers = {
  Query: {
    messages: () => messages,
  },
  Mutation: {
    addMessage: async (_, { text }) => {
      const id = idCount++;
      const message = {
        id,
        message: text,
      };
      messages.push(message);
      await pubsub.publish("NOTIFICATION_ADDED", {
        messageAdded: message,
      });
      return message;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: () => pubsub.asyncIterator("NOTIFICATION_ADDED"),
    },
  },
};

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers,
});
