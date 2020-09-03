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
| benzene-server | 12732.4 | 0.0078 secs |
| fastify-gql | 12206.9334 | 0.0082 secs |
| apollo-server-fastify | 3557.1205 | 0.0280 secs |
| apollo-server | 2139.7377 | 0.0466 secs |
| express-graphql | 1687.9057 | 0.0590 secs |
