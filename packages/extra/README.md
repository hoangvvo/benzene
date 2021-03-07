# @benzene/extra

[![npm](https://badgen.net/npm/v/@benzene/extra)](https://www.npmjs.com/package/@benzene/extra)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Extra treats for GraphQL Server. Not limited to [benzene libraries](https://github.com/hoangvvo/benzene)!

## Introduction

The GraphQL specification is meant to be extensible. For this reasons, there are many extensions to the specification such as:

- [Automatic persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq/)

**Benzene** is written to be unopinionated, so it avoids including such extensions. However, its extensibility enables us to integrate those ourselves. This way, Benzene can stay lightweight while supporting wide ranges of use case.

Most of the modules in this package is written to be framework-agnostic, and most are usable outside of **Benzene**.

## Installation

```bash
npm i @benzene/extra
```

