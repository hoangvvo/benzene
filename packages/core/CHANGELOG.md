# @benzene/core

## 0.8.2

### Patch Changes

- 45ff7ab: Bump dependencies and drop Node.js 12

## 0.8.1

### Patch Changes

- b7aa97e: Fix compatibility with graphql-js v16
- 9351274: Remove undefined options.compileQuery warning

## 0.8.0

### Minor Changes

- ec7cb0c: Allows calling `execute` and `subscribe` without `compiled`
- 81f0e4c: Delegate operation name validation to execution layer

### Patch Changes

- 927d0fd: Fix types of BenzeneGraphQLArgs

## 0.7.1

### Patch Changes

- cce8d67: Fix broken releases

## 0.7.0

### Minor Changes

- d4e60c1: feat: Allow custom validation rules and validation function

### Patch Changes

- 341e290: Add isExecutionResult util

## 0.6.0

### Minor Changes

- afd5f1c: Update TS Config and drop support for Node 10
- d300586: allow custom compileQuery implementation

## 0.5.0

### Minor Changes

- f485f9d: Require graphql@>15 and bump @hoangvvo/graphql-jit

## 0.4.2

### Patch Changes

- e104106: Fix ESModule export

## 0.4.1

### Patch Changes

- c2fb34f: Fix ESModule Publish

## 0.4.0

### Minor Changes

- b6b3c59: New `http` package to unify `server` and `worker`

## 0.3.0

### Minor Changes

- becbc04: Use microbundle
- aa80cdd: (breaking) Rename Benzene classes
- 51d9c32: Return object payload for runHttpQuery

## 0.2.1

### Patch Changes

- 2743ced: Move @benzene/persisted package into core
- bd8beb0: handle error in subscribe() and update hooks

## 0.2.0

### Minor Changes

- 942f990: Add support for persisted queries

## 0.1.1

### Patch Changes

- 60245fe: Remove rootValue from GraphQL constructor
- 33c6ed5: Use JIT subscribe from @hoangvvo/graphql-jit
- 51a15a7: Shift HTTP handling toward core and improve tests

## 0.1.0

### Minor Changes

- 8dbbfca: Enforce GraphQL response format on error

## 0.0.1

### Patch Changes

- Renamed from graphyne
