# @benzene/jit

[![npm](https://badgen.net/npm/v/@benzene/jit)](https://www.npmjs.com/package/@benzene/jit)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> GraphQL-JIT implementation for @benzene/core

## Installation

```bash
npm i @benzene/jit
```

## Usage

```js
import { makeCompileQuery } from "@benzene/jit";

const GQL = new Benzene({
  schema,
  compileQuery: makeCompileQuery(),
});
```

Check out [benchmarks](https://github.com/hoangvvo/benzene/tree/main/benchmarks) to see the performance gain from using [graphql-jit](https://github.com/zalando-incubator/graphql-jit).

## Documentation

Documentation is available at [benzene.vercel.app](https://benzene.vercel.app/).
