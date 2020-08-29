# ⌬ Benzene ⌬

> A **fast** and **non-coupled** JavaScript GraphQL Server and Executor

## Features

- LRU caching of schema validation and compilation
- Highly performant Just-In-Time compiler via [graphql-jit](https://github.com/zalando-incubator/graphql-jit).
- Lightweight and non-coupled integration with great extensibility: Does nothing more but returning handle functions.

## Getting Started

See how you can quickly create a GraphQL server via [Getting Started](https://hoangvvo.github.io/benzene/getting-started.md). You can always add other features like WebSocket later from here.

## Packages

There are currently three packages under `@benzene`.

### Server (`@benzene/server`)

Fast and simple GraphQL Server for Node.js

[Documentation](server/) [npm](https://www.npmjs.com/package/@benzene/server) [yarn](https://yarnpkg.com/package/@benzene/server)

### Worker (`@benzene/worker`)

GraphQL server right in the browser ([Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)) or at the edge ([Cloudflare Workers®](https://workers.cloudflare.com/))

[Documentation](worker/) [npm](https://www.npmjs.com/package/@benzene/worker) [yarn](https://yarnpkg.com/package/@benzene/worker)

### WebSocket

GraphQL over WebSocket using [`ws`](https://github.com/websockets/worker)

[Documentation](ws/) [npm](https://www.npmjs.com/package/@benzene/ws) [yarn](https://yarnpkg.com/package/@benzene/ws)

## Examples

Check out [examples](https://github.com/hoangvvo/benzene/tree/main/examples/) to see `benzene` in use.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
