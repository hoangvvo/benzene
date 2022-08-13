# cloudflare-workers example

This example demonstrates using `@benzene/http` with [Cloudflare Workers](https://workers.cloudflare.com/).

[Demo on Cloudflare Workers](https://benzene-example.hoangvvo.workers.dev/)

## How to use

Download the example:

```bash
curl https://codeload.github.com/hoangvvo/benzene/tar.gz/main | tar -xz --strip=2 benzene-main/examples/cloudflare-workers
cd cloudflare-workers
```

Install and authenticate [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler).

Set `account_id` (`wrangler whoami`) to [wrangler.toml](./wrangler.toml).

Install it and run:

```bash
npm install
wrangler dev
```

To publish the site:

```bash
wrangler publish
```
