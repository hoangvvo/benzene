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

There is also a [Getting Started](https://hoangvvo.github.io/benzene/#/getting-started) page to get started with `@benzene/server`.

## Packages

There are currently three packages under `@benzene`.

### Server (`@benzene/server`)
[![npm](https://badgen.net/npm/v/@benzene/server)](https://www.npmjs.com/package/@benzene/server)

Fast and simple GraphQL Server for Node.js

[Documentation](https://hoangvvo.github.io/benzene/#/server/) [npm](https://www.npmjs.com/package/@benzene/server) [yarn](https://yarnpkg.com/package/@benzene/server)

### Worker (`@benzene/worker`)
[![npm](https://badgen.net/npm/v/@benzene/worker)](https://www.npmjs.com/package/@benzene/worker)

GraphQL server right in the browser ([Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)) or at the edge ([Cloudflare Workers®](https://workers.cloudflare.com/))

[Documentation](https://hoangvvo.github.io/benzene/#/worker/) [npm](https://www.npmjs.com/package/@benzene/worker) [yarn](https://yarnpkg.com/package/@benzene/worker)

### WebSocket (`@benzene/ws`)
[![npm](https://badgen.net/npm/v/@benzene/ws)](https://www.npmjs.com/package/@benzene/ws)

GraphQL over WebSocket using [`ws`](https://github.com/websockets/worker)

[Documentation](https://hoangvvo.github.io/benzene/#/ws/) [npm](https://www.npmjs.com/package/@benzene/ws) [yarn](https://yarnpkg.com/package/@benzene/ws)

## Examples

Check out [examples](https://github.com/hoangvvo/benzene/tree/main/examples/) to see `benzene` in use.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
