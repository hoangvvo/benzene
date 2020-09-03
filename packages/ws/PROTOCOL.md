# GraphQL over WebSocket Protocol

The protocol used in `@benzene/ws` is a modified version of [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws). It still works with clients implementing the original `subscriptions-transport-ws` as expected.

Each WebSocket connection has the subprotocol of `graphql-ws`. Otherwise, it will be closed with `1011` status.

## Differences from [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws)

- There is no `connection_init` (or `connectionParams`) and `connection_ack`. [How about authentication?](#authentication_and_initialization)
- There is no `connection_terminate`. The client simply calls [`WebSocket.close()`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close) to close the connection.

?> For compatibility, if the client sends a `type = "connection_init" `, it will still receive `type = "connection_ack"`, and if the client sends a `type = "connection_terminate"`, the connection is still closed.

## Client-server communication

Each message has a `type` and `payload` field. An `id` field will present to identify different subscriptions. Every message should be JSON stringified (We only handle UTF-8 [RFC3629](https://tools.ietf.org/html/rfc3629) text).

### OperationMessage

```js
interface OperationMessage {
  id?: string;
  payload?: GraphQLParams;
  type: MessageType;
}
```

### MessageType

Some `type` are used in messages sent from client to server and some otherwise. The known `type` are:

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

### Authentication and initialization

Different from [`subscriptions_transport_ws`](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md), this modified protocol does not concern of `connection_init`. (even though it still sends back `connection_ack` for compatibility reason).

`connectionParams` is often sent along with `connection_init` for authentication, which is not the case in this protocol. However, in its place, there are several approaches.

#### Headers authentication

As WebSockets will pass through standard HTTP headers, you may choose to include authentication detail in the headers. Unfortunately, since the WebSocket API disallows header customization, it is limited.

If you do have session authentication in one of the previous HTTP requests, chances are you have the `Cookie` header, which will be sent along during the WebSocket handshake.

See [Authentication](https://hoangvvo.github.io/benzene/#/ws/authentication) for some authentication mechanisms.

### Start a subscription

The client can start a subscription by sending a `type="start"` message with the GraphQL params in `payload`:

```json
{
  "id": "UNIQUE_ID",
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

### Subscription Data

Subscription events will be sent to the client with a `type = "data"` message with the `id` and `payload` including a typical GraphQL response:

```json
{
  "id": "UNIQUE_ID",
  "payload": {
    "data": {
      "onMessage": {
        "message": "Hello World",
        "__typename": "Message"
      }
    }
  }
}
```

An `errors` field may be included if there are resolver errors.

### Deregister subscription

If the client no longer wants to receive updates from a specific subscription, it will send a `type = "stop"` message with the `id` of the one it wishes the unsubscribe:

```json
{
  "id": "UNIQUE_ID_THAT_SHOULD_BE_SUBSCRIBED",
  "type": "stop"
}
```

The server will acknowledge the request by sending back a `type = "complete"` message:

```json
{
  "id": "UNIQUE_ID_THAT_SHOULD_BE_SUBSCRIBED",
  "type": "complete"
}
```

## Error

If an error is part of the GraphQL resolve, it will be sent as part of `errors` field in the payload of a `type = "data"`, just like a typical GraphQL response.

Besides that, there are two message types the server sends to clients upon errors.

### Connection error

This error happens upon the initial connection handshake. This is often happened due to authentication error (which often thrown in `options.context` if you use `@benzene/ws`).

The server would send a `type = "connection_error"` message. It will include a `payload` that also represents a typical GraphQL response with an `errors` field:

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

If this error is sent, the server **will** close the socket, so the client may have to establish another connection.

### Operation error

For other types of errors, the server would send it via `type = "error"`. Similarly, it will include a `payload` that also represents a typical GraphQL response with an `errors` field:

```json
{
  "type": "connection_error",
  "payload": {
    "errors": [
      { "message": "There is an error" }
    ]
  }
}
```

Unlike *connection error*, the server **will not** close the socket. However, it informs the client that its request will not be processed.

Some of the cases for this will be:

- Invalid message
- Parsing error (such as invalid GraphQL query)
- Validation error (such as invalid arguments)

