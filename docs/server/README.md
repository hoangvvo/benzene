# Benzene Server

Fast and simple GraphQL Server for Node.js

## Install

```bash
yarn add graphql @benzene/server
```

## Philosophy

GraphQL Server like `apollo-server` and its `applyMiddleware` is too coupled and overly opinionated. While this helps beginners, it becomes difficult to configurate and extend (See [apollographql/apollo-server#1308](https://github.com/apollographql/apollo-server/issues/1308)).

`@benzene/server` takes the opposite path and returns nothing but a `requestListener` function (which is in the familiar `(req, res) => void` form) to be used in different frameworks/routers or simply `http.createServer`.

Aspects like `cors` and `body-parser` is all up to the users to implement as they wish.

## Documentation

There are two seperated modules in `@benzene/server` package with their own documentations.

### [HTTP](/server/http)

Create a HTTP/HTTPS server. Can used in Node [HTTP server](https://nodejs.org/api/http.html) or [HTTPS server](https://nodejs.org/api/https.html) and compatible frameworks.

Use this module by import `httpHandler` from `@benzene/server`. See [documentation](/server/http) for more information.

### [HTTP/2](/server/http2)

Create a HTTP/2 server. Can be used in Node [http/2 server](https://nodejs.org/api/http2.html)

Use this module by import `http2Handler` from `@benzene/server`. See [documentation](/server/http2) for more information.

!> This is **not** to be used with the [Compatiblility API](https://nodejs.org/api/http2.html#http2_compatibility_api) but the [stream listener](https://nodejs.org/api/http2.html#http2_server_side_example). You can use the `HTTP` version for the Compatiblility API.