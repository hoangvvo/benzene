- **[Getting Started](getting-started)**
  - [Install](getting-started#install)
  - [Create a GraphQLSchema instance](getting-started?id=create-a-graphqlschema-instance)
  - [Making the GraphQL instance](getting-started#making-the-benzene-graphql-instance)
  - [Start a server](getting-started#start-a-server)

- **[Benchmarks](benchmarks)**

- **Core**
  - [`@benzene/core`](core/)
    - [GraphQL instance](core/#graphql)
    - [GraphQL methods](core/#method)
    - [Error handling](core/#error-handling)
    - [Custom Root Value](core/#rootvalue)

- **Server**
  - [`@benzene/server`](server/)
  - **[HTTP Server](server/http)**
    - [API](server/http#api)
    - [Building Context](server/http#context)
  - **[HTTP Integration](server/http-integration)**
    - [Express.js](server/http-integration#express)
    - [micro](server/http-integration#micro)
    - [Next.js](server/http-integration#nextjs)

  - **[HTTP/2 Server](server/http2)**

- **Web Worker**
  - [`@benzene/worker`](worker/)
  - [Usage](worker/#usage)
  - [API](worker/#api)
  - [Building Context](worker/#context)

- **GraphQL over ws**
  - [`@benzene/ws`](ws/)
    - [Usage](ws/#usage)
    - [API](ws/#api)
    - [Building Context](ws/#context)
    - [Hooks](ws/#hooks)
  - [Authentication](ws/authentication)
  - [Protocol](ws/PROTOCOL)
  - [Integration](ws/ws-integration)