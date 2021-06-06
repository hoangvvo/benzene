A basic HTTP benchmarks against `@benzene/http` and popular GraphQL Server libraries using [rakyll/hey](https://github.com/rakyll/hey/).

[`http`](https://nodejs.org/api/http.html) is preferred over `express` where applicable because `express` adds overhead (See [fastify/benchmarks](https://github.com/fastify/benchmarks)).

Results are taken after a 5s warm-up. Then the following command is used.

```bash
hey -c 100 -z 8s -D body.txt -T application/json -m POST http://localhost:4000/graphql
```

> Remember, this benchmark is for _reference only_ and by no means says that one is better than the others. The slowest part of the application is still the application code itself, not the library.

## How to use

Clone the repository, go to benchmarks folder, and install the dependencies.

```bash
git clone https://github.com/hoangvvo/benzene.git
cd benzene/benchmarks
npm i
```

[Install rakyll/hey](https://github.com/rakyll/hey/)

Run the benchmarks (for Windows, use [git bash](https://www.atlassian.com/git/tutorials/git-bash)):

Set permissions:

```bash
chmod u+x ./run
chmod u+x ./runall
```

Run benchmarks:

```bash
./run <library>
```

The following can be used as `<library>`:

- [`apollo-server`](https://github.com/apollographql/apollo-server)
- `benzene-jit-http` ([`@benzene/http`](https://github.com/hoangvvo/benzene/tree/main/packages/http) with [JIT runtime](https://benzene.vercel.app/reference/runtime#graphql-jit))
- `benzene-http` ([`@benzene/http`](https://github.com/hoangvvo/benzene/tree/main/packages/http))
- [`express-graphql`](https://github.com/graphql/express-graphql)
- [`mercurius`](https://github.com/mercurius-js/mercurius) (with JIT)

To run all benchmarks at once:

```bash
./runall
```

[Create a PR](https://github.com/hoangvvo/benzene/pulls) to add one.

Also check out [benawad/node-graphql-benchmarks](https://github.com/benawad/node-graphql-benchmarks) for more benchmarks.

## Result

Machine: Linux 5.11.0-17-generic x86_64 | 12 vCPUs | 16GB
Node: v16.0.0

| Library          | Requests/s | Latency |
| ---------------- | ---------- | ------- |
| benzene-jit-http | 24789.2541 | 0.004   |
| mercurius        | 21658.6016 | 0.0046  |
| benzene-http     | 11627.693  | 0.0086  |
| apollo-server    | 3348.3177  | 0.0298  |
| express-graphql  | 2625.843   | 0.038   |
| graphql-helix    | 2386.6439  | 0.0418  |
