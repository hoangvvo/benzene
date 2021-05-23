# Runtime

**Benzene** supports GraphQL execution using a customizable runtime.

Benzene's GraphQL runtime can be configured using the `compileQuery` option. By default, it will use [`graphql-js` implementation](#graphql-js).

## Built-in implementations

`@benzene/core` is bundled two of the implementations, [`graphql-js`](https://github.com/graphql/graphql-js) and [`graphql-jit`](https://github.com/zalando-incubator/graphql-jit).

The modules are ESModule bundled, so the importing process may be different from the usual:

- If your Node version supports ESModule, import from `"@benzene/core/runtimes/x"`
- Otherwise, import from `"@benzene/core/dist/runtimes/x.cjs"`

### graphql-js

`graphql-js` is the original implementation of GraphQL for JavaScript, which offers the latest features and best stability.

```js
// ESModule import
import { makeCompileQuery } from "@benzene/core/runtimes/js";
// Legacy import
import { makeCompileQuery } from "@benzene/core/dist/runtimes/js.cjs";

const GQL = new Benzene({
  compileQuery: makeCompileQuery(),
});
```

This is preferred if your application is looking for the latest features while supporting environments, such as [Cloudflare Worker](https://workers.cloudflare.com/), which does not allow runtime evaluation required by other implementations.

### graphql-jit

`graphql-jit` is a new implementation of GraphQL for JavaScript, that offers significant performance improvement (up to 10x) compared to the former.

```js
// ESModule import
import { makeCompileQuery } from "@benzene/core/runtimes/jit";
// Legacy import
import { makeCompileQuery } from "@benzene/core/dist/runtimes/jit.cjs";

const GQL = new Benzene({
  compileQuery: makeCompileQuery(),
});
```

Check out [benchmarks](/benchmarks) so see how using this runtime can benefit your application.

## Custom Configuration

You can define your own runtime by creating a `compileQuery` function like below:

```js
const GQL = new Benzene({
  compileQuery(schema, document, operationName) {
    // Return the compiled result
    return {
      execute({
        document,
        contextValue,
        variableValues,
        rootValue,
        operationName,
      }) {
        // return execution result
      },
      susbcribe({
        document,
        contextValue,
        variableValues,
        rootValue,
        operationName,
      }) {
        // return subscription result
      },
    };
    // OR: in case of error, return an execution result
    return {
      errors: [new GraphQLError("Compilation failed")],
    };
  },
});
```

The function will be called with the schema, document node, and optionally operation name and returns either:

- an object with three functions `execute`, `subscribe`, and optionally `stringify`.
- GraphQL execution result in case of error

The signatures of `execute` and `subscribe` are the same as those (non-positional ones) from `graphql-js` (A difference being that it does not contain `schema` in the argument).

```ts
type CompileQuery = (
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName?: Maybe<string>
) => CompiledQuery | ExecutionResult;

interface CompiledQuery {
  execute(
    args: Pick<
      ExecutionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >
  ): ValueOrPromise<ExecutionResult>;

  subscribe?(
    args: Pick<
      SubscriptionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult>;

  stringify?(result: ExecutionResult): string;
}
```
