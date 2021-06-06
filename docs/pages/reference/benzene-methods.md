# GraphQL Methods

The [Benzene instance](/reference/benzene) is not only used to create transport handlers but also to execute GraphQL queries just like the [graphql-js](https://github.com/graphql/graphql-js) library.

Instead of import `graphql`, `execute`, `subscribe` from `graphql-js`. We can find them as the methods of `Benzene`. The API is the same as using the `graphql` exports from `graphql-js`, with the only difference that there is no `schema` since it is already defined upon creating the **Benzene** instance.

## Methods

```js
const GQL = new Benzene({ schema });
```

### graphql()

Implementation of [graphql](https://github.com/graphql/graphql-js/tree/main/src) from `graphql-js`.

```js
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
  variableValues: { id: 25 },
});
```

### execute()

Implementation of [execution](https://github.com/graphql/graphql-js/tree/main/src/execution) from `graphql-js`.

```js
import { parse } from "graphql";

const document = parse(`
  query pokemon($id: ID!) {
    pokemon(id: $id) {
      name
      image
      abilities
    }
  }
`)

const { data, errors } = await GQL.execute({
  document,
  contextValue: { trainer: "Ash Ketchum", region: "Kanto" },
  variableValues: { id: 25 },
});
```

### subscribe()

Implementation of [subscription](https://github.com/graphql/graphql-js/tree/main/src/subscription) from `graphql-js`.

```js
import { parse } from "graphql";

const document = parse(`
  query pokemon($id: ID!) {
    pokemon(id: $id) {
      name
      image
      abilities
    }
  }
`)

const payload = await GQL.subscribe({
  document,
  contextValue: { trainer: "Ash Ketchum", region: "Kanto" },
  variableValues: { id: 25 },
});

for await (const value of payload) {
  console.log(value);
}
```

## Query compilation

**Benzene** speeds up GraphQL executions by doing the process of memoized compilation.

### compile()

```js
const compiled = GQL.compile(query, operationName);

if (!("executre" in compiled)) {
  // Compilation failed. `compiled` is an `ExecutionResult`.
  console.log(compiled.errors);
  console.log(compiled.data);
} else {
  compiled.execute();
  compiled.subscribe();
}
```

### Provide compilation result

By calling either `execute()` or `subscribe()`, memoized compilations are done internally using [GQL.compile](#compile). However, we can also pass in the optional `compiled` arg when available to skip this step.


```js
const query = `
  query pokemon($id: ID!) {
    pokemon(id: $id) {
      name
      image
      abilities
    }
  }
`

const compiled = GQL.compile(query, operationName);

const { data, errors } = await GQL.execute({
  contextValue: { trainer: "Ash Ketchum", region: "Kanto" },
  variableValues: { id: 25 },
  compiled,
  // document is not required in this case
});
```