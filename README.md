<p align="center">
  <a href="https://withstereo.com">
    <img alt="Stereo" src="https://benzene.vercel.app/og.png">
  </a>
</p>

Benzene is a new take on GraphQL server that gives us the control we need while staying blazing fast.

[benzene.vercel.app](https://benzene.vercel.app/)

## Documentation

Documentation is available at [benzene.vercel.app](https://benzene.vercel.app)

There is also a [Getting Started](https://benzene.vercel.app/getting-started) section
which shows how to build a *real-time* book voting app using both `@benzene/http` and `@benzene/ws`.

There are also various [examples](examples) for integrations with different tools and frameworks.

## Features

The `@benzene/http` and `@benzene/ws` packages allow us to build a full-featured GraphQL server, featuring:

- **Super minimal and [performant](/benchmarks)**. `@benzene/http` and `@benzene/ws` purely wrap `@benzene/core`, which includes minimal dependencies and features no third-party integrations, thus avoiding unnecessary overheads.
- **Transport & Framework agnostic**. Each package features generic Request, Response, or WebSocket interfaces to easily plug into any JavaScript frameworks or runtimes.
- **Unopinionated and observable APIs**. Benzene does not include any middleware or configurations, so we can be in total control of logging, parsing, and error handling.
- **Unified pipeline**. Write error handling or context creation function only once. Every transport handler inherits the same [Benzene instance](https://benzene.vercel.app/reference/benzene) and takes advantage of its shared configuration.

We are taking an approach opposite to [Apollo Server](https://github.com/apollographql/apollo-server), which abstracts everything behind its `applyMiddleware` function that includes unexpected and hard-to-customized "defaults".
While our approach requires a bit more boilerplate, we achieve an observable and customizable server integration.

## Contributing

Please see my [contributing.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)