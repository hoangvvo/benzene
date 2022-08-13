# deno example

This example demonstrates using `@benzene/http` with [Deno](https://deno.land/).

[Demo on Deno Deploy](https://benzene-example.deno.dev/)

## How to use

Download the example

```bash
curl https://codeload.github.com/hoangvvo/benzene/tar.gz/main | tar -xz --strip=2 benzene-main/examples/deno
cd deno
```

Run it:

```bash
deno run --allow-net --import-map=./import_map.json main.ts
```

Deploy to [Deno Deploy](https://deno.com/deploy) using [deployctl](https://deno.com/deploy/docs/deployctl):

```bash
deployctl deploy --project=benzene-example --import-map=./import_map.json --token=$DENO_DEPLOY_TOKEN main.ts
```
