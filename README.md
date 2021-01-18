# ⌬ Benzene ⌬

![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> A [**fast**](/benchmarks) and minimal JavaScript GraphQL Server and Executor

## Features

- Super lightweight and [performant](/benchmarks)
- Transport & Framework agnostic: Node.js, Web Workers, and WebSocket
- Observable APIs (Nothing like [`applyMiddleware`](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#applymiddleware), returns only familiar handler functions)

## Documentation

Documentation is available at [hoangvvo.github.io/benzene/](https://hoangvvo.github.io/benzene/)

There is also a [Getting Started](https://hoangvvo.github.io/benzene/#/getting-started) to get started quickly.

## Packages

There are currently two packages under `@benzene`, which can be used together or independently.

### HTTP (`@benzene/http`)

[![npm](https://badgen.net/npm/v/@benzene/http)](https://www.npmjs.com/package/@benzene/http)

Fast and simple GraphQL Server for Node.js

[Documentation](https://hoangvvo.github.io/benzene/#/http/) [npm](https://www.npmjs.com/package/@benzene/http)
### WebSocket (`@benzene/ws`)

[![npm](https://badgen.net/npm/v/@benzene/ws)](https://www.npmjs.com/package/@benzene/ws)

GraphQL over WebSocket using [`ws`](https://github.com/websockets/ws)

[Documentation](https://hoangvvo.github.io/benzene/#/ws/) [npm](https://www.npmjs.com/package/@benzene/ws)

## Examples

Check out [examples](https://github.com/hoangvvo/benzene/tree/main/examples/) to see `benzene` in use.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
