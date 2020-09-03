export const GRAPHQL_WS = 'graphql-ws';

export default {
  GQL_CONNECTION_ERROR: 'connection_error', // Server -> Client
  GQL_START: 'start', // Client -> Server
  GQL_START_ACK: 'start_ack',
  GQL_DATA: 'data', // Server -> Client
  GQL_ERROR: 'error', // Server -> Client
  GQL_COMPLETE: 'complete', // Server -> Client
  GQL_STOP: 'stop', // Client -> Server
  // Compatibility only
  GQL_CONNECTION_INIT: 'connection_init', // Client -> Server
  GQL_CONNECTION_ACK: 'connection_ack', // Server -> Client
  GQL_CONNECTION_TERMINATE: 'connection_terminate', // Client -> Server
} as const;
