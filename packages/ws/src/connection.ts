import { ExecutionResult, GraphQLError } from 'graphql';
import {
  GraphQLParams,
  GraphQL,
  FormattedExecutionResult,
  TContext,
  isAsyncIterable,
} from '@benzene/core';
import * as WebSocket from 'ws';
import MessageTypes from './messageTypes';
import { OperationMessage, HandlerConfig } from './types';

export class SubscriptionConnection {
  private operations: Map<
    string,
    AsyncIterableIterator<ExecutionResult>
  > = new Map();

  constructor(
    private gql: GraphQL,
    public socket: WebSocket,
    public context: TContext,
    private options: Omit<HandlerConfig, 'context'>
  ) {}

  init() {
    // Listen to events
    this.socket.on('message', (data) => this.handleMessage(data.toString()));
    this.socket.on('error', () => this.handleConnectionClose());
    this.socket.on('close', () => this.handleConnectionClose());
  }

  handleMessage(message: string) {
    let data: OperationMessage;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return this.sendMessage(MessageTypes.GQL_ERROR, undefined, {
        errors: [new GraphQLError('Malformed message')],
      });
    }
    switch (data.type) {
      case MessageTypes.GQL_CONNECTION_INIT:
        // Our modified protocol does not concern about this
        // It is fine to not send connection_init
        this.sendMessage(MessageTypes.GQL_CONNECTION_ACK);
        break;
      // This is also compatibility-only
      // The client can simply closes using the JS API
      case MessageTypes.GQL_CONNECTION_TERMINATE:
        this.handleConnectionClose();
        break;
      case MessageTypes.GQL_START:
        this.handleGQLStart(
          data as OperationMessage & { id: string; payload: GraphQLParams }
        );
        break;
      case MessageTypes.GQL_STOP:
        this.handleGQLStop(data.id as string);
        break;
    }
  }

  async handleGQLStart(
    data: OperationMessage & { id: string; payload: GraphQLParams }
  ) {
    // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#start-a-subscription
    const { query, variables, operationName } = data.payload;

    if (!query) {
      // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#subscription-error
      return this.sendMessage(MessageTypes.GQL_ERROR, undefined, {
        errors: [new GraphQLError('Must provide query string.')],
      });
    }

    const cachedOrResult = this.gql.getCachedGQL(query, operationName);

    if (!('document' in cachedOrResult)) {
      // There is an validation/syntax error, cannot continue
      // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#subscription-error
      return this.sendMessage(MessageTypes.GQL_ERROR, data.id, cachedOrResult);
    }

    const execArg = {
      document: cachedOrResult.document,
      contextValue: this.context,
      variableValues: variables,
      operationName,
      jit: cachedOrResult.jit,
    };

    if (cachedOrResult.operation !== 'subscription') {
      if (this.options.onStart) {
        this.options.onStart.call(this, data.id, {
          document: cachedOrResult.document,
          contextValue: this.context,
          variableValues: variables,
          operationName,
        });
      }
      const result = await this.gql.execute(execArg);
      this.sendMessage(MessageTypes.GQL_DATA, data.id, result);
    } else {
      const result = await this.gql.subscribe(execArg);
      if (!isAsyncIterable<ExecutionResult>(result)) {
        // Something prevents a subscription from being created properly
        // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#subscription-error
        return this.sendMessage(MessageTypes.GQL_ERROR, data.id, result);
      }
      // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#start-a-subscription
      // An acknowledge of subscription start, DOES NOT happen in queries/mutations
      this.sendMessage(MessageTypes.GQL_START_ACK, data.id);
      this.operations.set(data.id, result);
      if (this.options.onStart) {
        this.options.onStart.call(this, data.id, {
          document: cachedOrResult.document,
          contextValue: this.context,
          variableValues: variables,
          operationName,
        });
      }
      for await (const value of result) {
        this.sendMessage(MessageTypes.GQL_DATA, data.id, value);
      }
    }
    // Complete
    if (this.options.onComplete) this.options.onComplete.call(this, data.id);
    this.sendMessage(MessageTypes.GQL_COMPLETE, data.id);
  }

  handleGQLStop(opId: string) {
    // Unsubscribe from specific operation
    // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#deregister-subscription
    const removingOperation = this.operations.get(opId);
    if (!removingOperation) return;
    // Return async iterator
    removingOperation.return?.();
    this.operations.delete(opId);
  }

  handleConnectionClose() {
    // Unsubscribe from the whole socket
    // This makes sure each async iterators are returned
    for (const opId of this.operations.keys()) this.handleGQLStop(opId);
    this.socket.close();
  }

  sendMessage(type: string, id?: string | null, result?: ExecutionResult) {
    const payload: FormattedExecutionResult | null = result
      ? this.gql.formatExecutionResult(result)
      : null;
    this.socket.send(
      JSON.stringify({ type, ...(id && { id }), ...(payload && { payload }) })
    );
  }
}
