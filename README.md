# ⌬ Benzene

![ci](https://github.com/hoangvvo/benzene/workflows/Test%20&%20Coverage/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

A **fast** and **non-coupled** JavaScript GraphQL Server and Executor

## Features

- LRU caching of schema validation and compilation
- Highly performant Just-In-Time compiler via [graphql-jit](https://github.com/zalando-incubator/graphql-jit).
- Lightweight and non-coupled integration with great extensibility: Does nothing more but returning handle functions.

## Documentation

Documentation is available at [hoangvvo.github.io/benzene/](https://hoangvvo.github.io/benzene/)

There is also a [Getting Started](http://localhost:3000/#/getting-started) page to get started with `@benzene/server`.

## Examples

See [examples](examples/).

## TODO

`Benzene` is a work-in-progress. It is obviously not battle-tested and lack several features. My plan for now is to implement the following:

- [x] WebSocket/Subscriptions
- [ ] Persisted queries
- [ ] Federation
- [ ] Gateway

GraphQL execution layer is also bounded by the limitation of [graphql-jit](https://github.com/zalando-incubator/graphql-jit#differences-to-graphql-js). Yet, I have been using it in production and see no problems for my use-cases.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
