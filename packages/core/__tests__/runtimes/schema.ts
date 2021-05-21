import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

export const SimpleSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      bar: {
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
