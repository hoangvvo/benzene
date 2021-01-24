import { makeExecutableSchema } from "@graphql-tools/schema";
import { on, EventEmitter } from "events";

const authors = [
  { id: 1, firstName: "Tom", lastName: "Coleman" },
  { id: 2, firstName: "Sashko", lastName: "Stubailo" },
  { id: 3, firstName: "Mikhail", lastName: "Novikov" },
];

const posts = [
  { id: 1, authorId: 1, title: "Introduction to GraphQL", votes: 2 },
  { id: 2, authorId: 2, title: "Welcome to Meteor", votes: 3 },
  { id: 3, authorId: 2, title: "Advanced GraphQL", votes: 1 },
  { id: 4, authorId: 3, title: "Launchpad is Cool", votes: 7 },
];

const typeDefs = `
  type Author {
    id: Int!
    name: String
    posts: [Post]
  }

  type Post {
    id: Int!
    title: String
    author: Author
    votes: Int
  }

  type Query {
    posts: [Post]
  }

  type Mutation {
    postUpvote (
      postId: Int!
    ): Post
  }

  type Subscription {
    postSubscribe: Post
  }
`;

const ee = new EventEmitter();

const resolvers = {
  Query: {
    posts: () => posts,
  },

  Mutation: {
    postUpvote: (_, { postId }) => {
      const post = posts.find((post) => post.id === postId);
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      ee.emit("POST_SUBSCRIBE", { postSubscribe: post });
      return post;
    },
  },

  Subscription: {
    postSubscribe: {
      subscribe: async function* postSubscribe() {
        for await (const event of on(ee, "POST_SUBSCRIBE")) {
          yield event[0];
        }
      },
    },
  },

  Author: {
    posts: (author) => posts.filter((post) => post.authorId === author.id),
  },

  Post: {
    author: (post) => authors.filter((author) => author.id === post.authorId),
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
