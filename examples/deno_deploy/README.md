# deno_deploy example

[![Deploy this example](https://deno.com/deno-deploy-button.svg)](https://dash.deno.com/new?url=https://raw.githubusercontent.com/hoangvvo/benzene/main/examples/deno_deploy/mod.ts)

This example demonstrates deploying a GraphQL server to [Deno Deploy](https://deno.com/deploy).

## How to use

Download the example:

```bash
curl https://codeload.github.com/hoangvvo/benzene/tar.gz/main | tar -xz --strip=2 benzene-main/examples/deno_deploy
cd deno_deploy
```

Install [deployctl](https://deno.com/deploy/docs/deployctl)

Run the script:

```bash
deployctl run mod.ts
```

[Demo on Deno Deploy](https://benzene-example.deno.dev/)
