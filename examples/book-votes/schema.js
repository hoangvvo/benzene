import { makeExecutableSchema } from "@graphql-tools/schema";
import { on, EventEmitter } from "events";

const authors = [
  { id: 1, name: "Tom Coleman" },
  { id: 2, name: "Sashko Stubailo" },
  { id: 3, name: "Mikhail Novikov" },
];

const books = [
  { id: 1, authorId: 1, title: "Introduction to GraphQL", votes: 2 },
  { id: 2, authorId: 2, title: "Welcome to Meteor", votes: 3 },
  { id: 3, authorId: 2, title: "Advanced GraphQL", votes: 1 },
  { id: 4, authorId: 3, title: "Launchpad is Cool", votes: 7 },
];

const typeDefs = `
  type Author {
    id: Int!
    name: String
    books: [Book]
  }

  type Book {
    id: Int!
    title: String
    author: Author
    votes: Int
  }

  type Query {
    books: [Book]
  }

  type Mutation {
    bookUpvote (
      bookId: Int!
    ): Book
  }

  type Subscription {
    bookSubscribe: Book
  }
`;

const ee = new EventEmitter();

const resolvers = {
  Query: {
    books: () => books,
  },

  Mutation: {
    bookUpvote: (_, { bookId }) => {
      const book = books.find((book) => book.id === bookId);
      if (!book) {
        throw new Error(`Couldn't find book with id ${bookId}`);
      }
      book.votes += 1;
      ee.emit("BOOK_SUBSCRIBE", { bookSubscribe: book });
      return book;
    },
  },

  Subscription: {
    bookSubscribe: {
      subscribe: async function* bookSubscribe() {
        for await (const event of on(ee, "BOOK_SUBSCRIBE")) {
          yield event[0];
        }
      },
    },
  },

  Author: {
    books: (author) => books.filter((book) => book.authorId === author.id),
  },

  Book: {
    author: (book) => authors.find((author) => author.id === book.authorId),
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;
