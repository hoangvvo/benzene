A basic HTTP benchmarks against `@benzene/http` and popular GraphQL Server libraries.

Results are taken after a 3s warm-up. Then the following command is used.

```bash
wrk -t12 -c400 -d8s -s src/post.lua http://localhost:4000/graphql
```

> Remember, this benchmark is for _reference only_ and by no means says that one is better than the others. The slowest part of the application is still the application code itself, not the library. Some libraries may be slower only because they have more features.

## Add a benchmark

To add a benchmark, create a file in `library`:

- if the file name ends with `.deno.js`, it will be run with [deno](https://deno.land/)
- if the file name ends with `.bun.js`, it will be run with [bun](https://bun.sh/)
- otherwise, it will be run with [node](https://nodejs.org/)

## Run benchmark

Clone the repository, go to benchmarks folder, and install the dependencies.

```bash
git clone https://github.com/hoangvvo/benzene.git
cd benzene/benchmarks
npm i
```

[Install wrk](https://github.com/wg/wrk)

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

The result would be written to `results/<library>.json`.

The following can be used as `<library>`:

- `benzene-jit-http` ([`@benzene/http`](https://github.com/hoangvvo/benzene/tree/main/packages/http) with [JIT runtime](https://benzene.vercel.app/reference/runtime#graphql-jit))
- `benzene-http` ([`@benzene/http`](https://github.com/hoangvvo/benzene/tree/main/packages/http))
- `benzene-http.deno` ([`@benzene/http`](https://github.com/hoangvvo/benzene/tree/main/packages/http) on [Deno](https://deno.land/))
- [`apollo-server`](https://github.com/apollographql/apollo-server)
- [`mercurius`](https://github.com/mercurius-js/mercurius) (with JIT)
- [`graphql-yoga`](https://www.graphql-yoga.com/)
- [`graphql-helix`](https://github.com/contra/graphql-helix)
- [`express-graphql`](https://github.com/graphql/express-graphql)

To run all benchmarks at once:

```bash
./runall
```

[Create a PR](https://github.com/hoangvvo/benzene/pulls) to add one.

To create a markdown table from the result:

```bash
./runall
```

## Result

Machine: Linux 5.17.0-051700-generic x86_64 | 12 vCPUs | 16GB
Node: v18.7.0

| Library           | Requests/s | Latency | Throughput/Mb |
| ----------------- | ---------- | ------- | ------------- |
| benzene-jit-http  | 21956.59   | 0.018   | 99.58         |
| mercurius         | 18408.99   | 0.0214  | 83.08         |
| benzene-http deno | 11125.83   | 0.0356  | 46.68         |
| benzene-http      | 10586.64   | 0.0372  | 47.93         |
| graphql-yoga      | 6582.51    | 0.0597  | 30.48         |
| apollo-server     | 3997.27    | 0.098   | 20.35         |
| graphql-helix     | 2499.71    | 0.1563  | 11.34         |
| express-graphql   | 2083.07    | 0.1874  | 10.43         |
