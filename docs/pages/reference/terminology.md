# Terminology

There are certain terms that are used throughout this documentation.

## ExecutionResult

The result of GraphQL execution.

- `errors` is included when any errors occurred as a non-empty array.
- `data` is the result of a successful execution of the query.
- `extensions` is reserved for adding non-standard properties.

```ts
interface ExecutionResult<
  TData = { [key: string]: any },
  TExtensions = { [key: string]: any }
> {
  errors?: ReadonlyArray<GraphQLError>;
  data?: TData | null;
  extensions?: TExtensions;
}
```

## GraphQLParams

The parameters used to execute a GraphQL query.

```ts
interface GraphQLParams {
  query?: Maybe<string>;
  variables?: Maybe<Record<string, any>>;
  operationName?: Maybe<string>;
  extensions?: Maybe<Record<string, any>>;
}
```
