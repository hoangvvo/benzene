# GraphQL Query

The [Benzene instance](/reference/benzene) is not only used to create transport handlers but also to execute GraphQL queries just like the [graphql-js](https://github.com/graphql/graphql-js) library.

```js
const GQL = new Benzene({ schema });

const { data, errors } = await GQL.graphql({
  source: `
    query pokemon($id: ID!) {
      pokemon(id: $id) {
        name
        image
        abilities
      }
    }
  `,
  contextValue: { trainer: "Ash Ketchum", region: "Kanto" },
  variables: { id: 25 },
});
```

The API is the same as using the `graphql` export from `graphql-js`, with the only difference that there is no `schema` since it is already defined upon creating the **Benzene** instance.

[`formatErrorFn` from the Benzene instance](http://localhost:3000/reference/error-handling) will apply here so the returned `errors` field includes formatted errors.