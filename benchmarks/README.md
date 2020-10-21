# Benchmarks

A basic HTTP benchmarks against `@benzene/server` and popular GraphQL Server libraries using [rakyll/hey](https://github.com/rakyll/hey).

[`lukeed/polka`](https://github.com/lukeed/polka) is used in place of `express` where applicable because `express` adds overhead (See [fastify/benchmarks](https://github.com/fastify/benchmarks)).

Results are taken after a 5s warm-up. Then the following command is used.

```bash
hey -c 100 -z 8s -D body.txt -T application/json -m POST http://localhost:4000/graphql
``` 

> Remember, this benchmark is for *reference only* and by no means says that one is better than the others. The slowest part of the application is still the application code itself, not the library.

## How to use

```bash
./run <library>
```

The following can be used as `<library>`:

- [`apollo-server`](https://github.com/apollographql/apollo-server)
- [`apollo-server-fastify`](https://github.com/apollographql/apollo-server)
- `benzene-server` ([`@benzene/server`](https://github.com/hoangvvo/benzene/tree/main/packages/server))
- [`express-graphql`](https://github.com/graphql/express-graphql)
- [`mercurius`](https://github.com/mercurius-js/mercurius)

To run all benchmarks at once:

```bash
./runall
```

Make a PR to add one.

## Result

Machine: Linux 5.4.0-51-generic x86_64 | 4 vCPUs | 16GB

Node: `v14.12.0`

| Library | Request/sec | Latency |
| --- | --- | --- |
| benzene-server | 13592.2223 | 0.0073 secs |
| fastify-gql | 12277.0624 | 0.0081 secs |
| apollo-server-fastify | 3264.9005 | 0.0306 secs |
| apollo-server | 2032.8558 | 0.0490 secs |
| express-graphql | 1618.0362 | 0.0615 secs |
