# @benzene/ws

## 0.7.1

### Patch Changes

- b7aa97e: Fix compatibility with graphql-js v16
- Updated dependencies [b7aa97e]
- Updated dependencies [9351274]
  - @benzene/core@0.8.1

## 0.7.0

### Minor Changes

- ec7cb0c: Allows calling `execute` and `subscribe` without `compiled`

### Patch Changes

- 81f0e4c: Delegate operation name validation to execution layer
- Updated dependencies [ec7cb0c]
- Updated dependencies [927d0fd]
- Updated dependencies [81f0e4c]
  - @benzene/core@0.8.0

## 0.6.2

### Patch Changes

- cce8d67: Fix broken releases
- Updated dependencies [cce8d67]
  - @benzene/core@0.7.1

## 0.6.1

### Patch Changes

- Updated dependencies [d4e60c1]
- Updated dependencies [341e290]
  - @benzene/core@0.7.0

## 0.6.0

### Minor Changes

- afd5f1c: Update TS Config and drop support for Node 10
- d300586: allow custom compileQuery implementation

### Patch Changes

- Updated dependencies [afd5f1c]
- Updated dependencies [d300586]
- Updated dependencies [d300586]
  - @benzene/core@0.6.0

## 0.5.1

### Patch Changes

- 05944c6: Make `extra` optional on `graphqlHTTP` and `graphqlWS`

## 0.5.0

### Minor Changes

- f485f9d: Require graphql@>15 and bump @hoangvvo/graphql-jit

### Patch Changes

- Updated dependencies [f485f9d]
  - @benzene/core@0.5.0

## 0.4.4

### Patch Changes

- 1fcabc6: Fix WebSocket interface

## 0.4.3

### Patch Changes

- b853425: Mark @benzene/ws as module and export MessageType

## 0.4.2

### Patch Changes

- 6c3aca0: Updated dependencies

## 0.4.1

### Patch Changes

- c2fb34f: Fix ESModule Publish
- 8747cbd: Disallow subscribing without an id
- Updated dependencies [c2fb34f]
  - @benzene/core@0.4.1

## 0.4.0

### Minor Changes

- 954c8a4: Rewrite using new graphql-transport-ws spec

### Patch Changes

- Updated dependencies [b6b3c59]
  - @benzene/core@0.4.0

## 0.3.0

### Minor Changes

- becbc04: Use microbundle
- aa80cdd: (breaking) Rename Benzene classes

### Patch Changes

- Updated dependencies [becbc04]
- Updated dependencies [aa80cdd]
- Updated dependencies [51d9c32]
  - @benzene/core@0.3.0

## 0.2.1

### Patch Changes

- 2743ced: Move @benzene/persisted package into core
- bd8beb0: handle error in subscribe() and update hooks
- Updated dependencies [2743ced]
- Updated dependencies [bd8beb0]
  - @benzene/core@0.2.1

## 0.2.0

### Minor Changes

- 96b9dc2: Drop start_ack from spec

### Patch Changes

- 83199ae: Close operations properly on connection closure

## 0.1.3

### Patch Changes

- Updated dependencies [942f990]
  - @benzene/core@0.2.0

## 0.1.2

### Patch Changes

- dbef0d3: (ws) Add start_ack and drop connection_terminate

## 0.1.1

### Patch Changes

- 33c6ed5: Use JIT subscribe from @hoangvvo/graphql-jit
- 0bc5cde: (ws) Add onStart and onComplete Hook API (#10)
- 51a15a7: Shift HTTP handling toward core and improve tests
- Updated dependencies [60245fe]
- Updated dependencies [33c6ed5]
- Updated dependencies [51a15a7]
  - @benzene/core@0.1.1

## 0.1.0

### Minor Changes

- 09105bc: (ws) Add Protocol and improve API

### Patch Changes

- Updated dependencies [8dbbfca]
  - @benzene/core@0.1.0

## 0.0.1

### Patch Changes

- Renamed from graphyne
- Updated dependencies [undefined]
  - @benzene/core@0.0.1
