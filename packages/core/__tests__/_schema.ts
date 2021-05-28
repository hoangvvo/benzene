import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

const QueryRootType = new GraphQLObjectType({
  name: "QueryRoot",
  fields: {
    test: {
      type: GraphQLString,
      args: {
        who: { type: GraphQLString },
      },
      resolve: (_root, args: { who?: string }) =>
        "Hello " + (args.who ?? "World"),
    },
    thrower: {
      type: GraphQLString,
      resolve() {
        throw new Error("Throws!");
      },
    },
  },
});

export const TestSchema = new GraphQLSchema({
  query: QueryRootType,
  mutation: new GraphQLObjectType({
    name: "MutationRoot",
    fields: {
      writeTest: {
        type: QueryRootType,
        resolve: () => ({}),
      },
    },
  }),
});

export const SimpleSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      foo: {
        type: GraphQLString,
        resolve: function fooResolve() {
          return "FooValue";
        },
      },
    },
  }),
  subscription: new GraphQLObjectType({
    name: "Subscription",
    fields: {
      bar: {
        type: GraphQLString,
        subscribe: async function* barGenerator() {
          yield { bar: "BarValue" };
        },
      },
    },
  }),
});
