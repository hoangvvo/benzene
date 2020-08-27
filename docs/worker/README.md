# Benzene Worker

GraphQL execution layer in the browser and at the edge.

## Why GraphQL in the browser

- You can query 3rd parties' APIs without making a redundant round to and from the backend.
- It enables query deduplication so that you do not waste server resources for identical 3rd parties' requests, while improving speed/performance.

In addition, you can (and more often) use `@benzene/worker` in [Cloudflare Workers®](https://workers.cloudflare.com/).

## Install

Install `@benzene/worker` and `graphql` dependencies:

```shell
yarn add @benzene/worker graphql
```

## Usage

[Service Worker Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-service-worker)

This assumes basic understanding of service worker. If not, you can learn how to register the service worker [here](https://developers.google.com/web/fundamentals/primers/service-workers/registration).

```javascript
import { GraphQL, fetchHandler } from '@benzene/worker';

// Creating a GraphQL instance
const GQL = new GraphQL(options);

const gqlHandle = fetchHandler(GQL, { path: '/graphql' })

addEventListener('fetch', gqlHandle);
```

Fetch requests to `/graphql` will now be intercepted by the registered worker.

See [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) for more info.

**Note:** `@benzene/worker` can be large in size for use in browser. Consider lazy loading it and implement [Offline/Progressive Web Apps](https://web.dev/progressive-web-apps/).

## API

### `handleRequest(GQL, request, options)`

`GQL` is an instance of [`GraphQL`](../core/).

`request` is [FetchEvent.request](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/request)

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| path | Specify a path for the GraphQL endpoint. If supplied `@benzene/worker` will ignore requests to different pathname. If not, **`@benzene/worker`** will intercept all requests (which is **not** desired) | `undefined` |
| context | An object or function called to creates a context shared across resolvers per request. The function accepts [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) as the only argument. | `{}` |

It returns a promise that resolves with [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) to be used in `event.respondWith`.

## Building Context

`options.context` in `handleRequest` can be used to build a context for GraphQL execution layer. It can either be an object or a function. In the case of function, it accepts a single argument that is [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).

```js
const gqlHandle = fetchHandler(GQL, {
  path: '/graphql',
  context: async (request) => {
    const token = request.header.get('Authorization');
    const user = await getUserFromToken(token);
    // Return the context object
    return { user };
  }
})
```

(The example above makes more sense in environments like [Cloudflare Workers®](https://workers.cloudflare.com/) since you cannot really look up user in the browser)

## Questions

### My web worker(s) already have a fetch event handler

It is possible to have multiple fetch event handlers within a service worker. The second handler gets its chance to call `event.respondWith()` only if the previous one does not. 

If `path` does not match, `gqlHandle` will simply return, letting other fetch event handler to work. See this [demo](https://googlechrome.github.io/samples/service-worker/multiple-handlers/index.html) for demonstration.
