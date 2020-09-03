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
- [`fastify-gql`](https://github.com/mcollina/fastify-gql)

To run all benchmarks at once:

```bash
./runall
```

Make a PR to add one.

## Result

Machine: Linux 5.4.0-45-generic x86_64 | 4 vCPUs | 16GB

Node: `v12.18.2`

| Library | Request/sec | Latency |
| --- | --- | --- |
| benzene-server | 14662.6688 | 0.0068 secs |
| fastify-gql | 13208.0059 | 0.0076 secs |
| apollo-server-fastify | 5570.7369 | 0.0311 secs |
| apollo-server | 2117.7460 | 0.0471 secs |
| express-graphql | 1791.4142 | 0.0556 secs |
