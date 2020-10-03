# GraphQL over WebSocket Protocol

The protocol used in `@benzene/ws` is a modified version of [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws). 

It is backward compatible with clients implementing the original `subscriptions-transport-ws`, with an exception of not supporting `connectionParams`.

Each WebSocket connection must have the subprotocol of `graphql-ws`. Otherwise, it will be closed with `1011` status.

## Differences from [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws)

- There is no `connection_init` (or `connectionParams`) and `connection_ack`. [How about authentication?](#authentication_and_initialization)
- There is no `connection_terminate`. The client calls [`WebSocket.close()`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close) to close the connection.
- `type = "error"` messages' `payload` fields must **always** be in [GraphQL Response Format](https://spec.graphql.org/June2018/#sec-Response-Format). It must have an `errors` field but no `data` field.

?> For compatibility, if the client sends a `type = "connection_init" `, it will still receive `type = "connection_ack"`, and if the client sends a `type = "connection_terminate"`, the connection is still closed.

## Client-server communication

Each message must have a `type` field. A `payload` field is optional, and an `id` field must be present to identify different subscriptions. Every message must be JSON stringified (as UTF-8 [RFC3629](https://tools.ietf.org/html/rfc3629) text).

### Message

```js
interface OperationMessage {
  id?: string;
  payload?: GraphQLParams;
  type: MessageType;
}
```

### MessageType

Some `type` must only be used in messages sent from client to server and some otherwise. The allowed `type` are:

```js
type MessageType =
  | 'connection_error' // Server -> Client
  | 'start' // Client -> Server
  | 'start_ack' // Server -> Client
  | 'data' // Server -> Client
  | 'error' // Server -> Client
  | 'complete' // Server -> Client
  | 'stop'; // Client -> Server
```

## Message Flow

```
  Client                                 Server  
    | <---Socket Handshake + Connection---> |
    |                                       |
    |         Register Subscription         |
    | -------- { type = 'start' } --------> |
    |                                       |
    |         Register Acknowledge          |
    | <----- { type = 'start_ack' } ------- |
    |                                       | <-- GraphQL Mutation --
    |       Subscription Notification       |
    | <------- { type = 'data' } ---------- |
    |                                       | 
    |       Deregister Subscription         |
    | --------- { type = 'stop' } --------> |
    |                                       |    
    |       Subscription Complete           |
    | <------ { type = 'complete' } ------- |
```

### Initialization

To intialize, the client must open a WebSocket connection with `graphql-ws` sub-protocol.

```js
const socket = new WebSocket("ws://localhost:8080/graphql", "graphql-ws")
```

To WebSocket URL may include query params.

`connectionParams` and `connection_init` in [`subscriptions_transport_ws`](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md) are not supported. See [Authentication](https://hoangvvo.github.io/benzene/#/ws/authentication) for some authentication mechanisms in their places.

### Start a subscription

The client starts a subscription by sending a `type = "start"` message with the GraphQL params in `payload`:

```json
{
  "id": "<unique_id>",
  "payload": {
    "query": "subscription onMessage($id: ID!) { onMessage(id: $id) { message } }",
    "variables": {
      "id": "123"
    }
  },
  "type": "start"
}
```

An `id` must be included to differentiate between different subscriptions. It is the client's responsibility to make it unique.

If the subscription is successfully, the server will send back a `type = "start_ack"` with the client-defined unique id:

```json
{
  "id": "<unique_id>",
  "type": "start_ack"
}
```

If the subscription is not successful, the client will receive a `type = "error"` indicates why the subscription is unsuccessful. See [Subscription error](#subscription-error).

The server **does not** send back a `type = "start_ack"` in queries/mutations, where a `type = "complete"` message is followed immediately instead. 

### Subscription Data

Subscription events must be sent from the server to the client with a `type = "data"` message with the `id` and `payload` including a typical GraphQL response:

```json
{
  "id": "<unique_id>",
  "payload": {
    "data": {
      "onMessage": {
        "message": "Hello World"
      }
    }
  }
}
```

An `errors` field may be included if there are resolver errors, similiar to [GraphQL Response Format](https://spec.graphql.org/June2018/#sec-Response-Format).

### Deregister subscription

If the client no longer wants to receive updates from a specific subscription, it must send a `type = "stop"` message with the `id` of the one it wishes the unsubscribe:

```json
{
  "id": "<unique_id>",
  "type": "stop"
}
```

If the unsubscription request is sastified, the server sends back a `type = "complete"` message with `id`:

```json
{
  "id": "<unique_id>",
  "type": "complete"
}
```

## Error

If an error is part of the GraphQL resolve, it must be sent as part of `errors` field in the payload of a `type = "data"` message. It must not use `type = "connection_error"` or `type = "error"`.

Otherwise, there are two message types the server sends to clients upon errors.

### Connection error

This error happens after initial connection handshake. This is often happened due to authentication error (which often thrown in `options.context` if you use `@benzene/ws`).

The server must send a `type = "connection_error"` message. It must include a `payload` that represents a typical GraphQL response with an `errors` field:

```json
{
  "type": "connection_error",
  "payload": {
    "errors": [
      { "message": "Client is not authenticated" }
    ]
  }
}
```

If this error is sent, the server **must** close the socket, and the client will have to establish another connection.

### Subscription error

If an error(s) prevents the subscription from being started/registered, the server must send it via `type = "error"` message. **Note that errors thrown in resolvers must be sent with `type = "data"`**

It must include a `payload` that represents a typical GraphQL response with an `errors` field:

```json
{
  "type": "error",
  "payload": {
    "errors": [
      { "message": "There is an error" }
    ]
  }
}
```

Unlike *connection error*, the server **must not** close the socket. However, the client should acknowledge that the request will not be processed.

Some of the cases for this will be:

- Invalid message (message cannot be JSON parsed)
- Parsing error (such as invalid GraphQL query)
- Validation error (such as invalid arguments)

