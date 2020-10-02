# @benzene/worker

GraphQL server right in the browser ([Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)) or at the edge (such as [Cloudflare Workers®](https://workers.cloudflare.com/)).

## Install

Install `@benzene/worker` and `graphql` dependencies:

```shell
yarn add @benzene/worker graphql
```

## Usage

[Service Worker Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-service-worker)

This assumes basic understanding of Service Workers. If not, you can learn how to register the service worker [here](https://developers.google.com/web/fundamentals/primers/service-workers/registration).

```js
import { GraphQL, fetchHandler } from '@benzene/worker';

// Creating a GraphQL instance
const GQL = new GraphQL({ schema });

const gqlHandle = fetchHandler(GQL, { path: '/graphql' });

addEventListener('fetch', gqlHandle);
```

Fetch requests to `/graphql` will now be intercepted by the registered worker.

?> It is recommended to read about `GraphQL` instance in the [Core Section](core/) first.

!> **Note:** While `@benzene/worker` is not so large in size ([~20kb Minified + Gzipped](http://bundlephobia.com/result?p=@benzene/worker)), it is recommended to lazy-load it and implement [Offline/Progressive Web Apps](https://web.dev/progressive-web-apps/).

## API

### `fetchHandler(GQL, options)`

`GQL` is an instance of [`GraphQL`](/core/)

`options` is optional and accepts the following:

| options | description | default |
|---------|-------------|---------|
| path | Specify a path for the GraphQL endpoint. If supplied `@benzene/worker` will ignore requests to different pathname. If not, **`@benzene/worker`** will intercept all requests (which is **not** desired) | `undefined` |
| context | An object or function called to creates a context shared across resolvers per request. The function accepts [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) as the only argument. | `{}` |

It returns a Fetch event listener handler `addEventListener('fetch', fn)`.

## Building Context :id=context

`options.context` in `fetchHandler` can be used to build a context for GraphQL execution layer. It can either be an object or a function. In the case of a function, it accepts a single argument that is [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).

```js
const gqlHandle = fetchHandler(GQL, {
  path: '/graphql',
  context: async (request) => {
    const token = request.header.get('Authorization');
    const user = await getUserFromToken(token);
    // Return the context object
    return { user };
  },
});
```

(The example above makes more sense in environments like [Cloudflare Workers®](https://workers.cloudflare.com/) since you cannot really look up users in the browser)

## Questions

### My service worker already has a fetch event handler

It is possible to have multiple fetch event handlers within a service worker. The second handler gets its chance to call `event.respondWith()` only if the previous one does not. See this [demo](https://googlechrome.github.io/samples/service-worker/multiple-handlers/index.html) for demonstration.

If `path` does not match, `gqlHandle` will simply return, letting other fetch event handler to work normally.
