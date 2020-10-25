import { ExecutionResult, GraphQLError } from 'graphql';
import {
  GraphQLParams,
  GraphQL,
  FormattedExecutionResult,
  TContext,
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
    private context: TContext,
    private listeners: Pick<HandlerConfig, 'onStart' | 'onComplete'>
  ) {
    // Listen to events
    this.socket.on('message', (data) => this.onMessage(data.toString()));
    this.socket.on('error', () => this.socket.close());
    this.socket.on('close', () => this.onClose());
  }

  onMessage(message: string) {
    let data: OperationMessage;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return this.sendMessage(MessageTypes.GQL_ERROR, undefined, {
        errors: [new GraphQLError('Malformed message')],
      });
    }
    switch (data.type) {
      case MessageTypes.GQL_START:
        this.handleGQLStart(
          data as OperationMessage & { id: string; payload: GraphQLParams }
        );
        break;
      case MessageTypes.GQL_STOP:
        this.handleGQLStop(data.id as string);
        break;
      // Backward compatibility layer
      // https://github.com/hoangvvo/benzene/blob/main/packages/ws/PROTOCOL.md#differences-from-subscriptions-transport-ws
      case MessageTypes.GQL_CONNECTION_INIT:
        this.sendMessage(MessageTypes.GQL_CONNECTION_ACK);
        break;
      case MessageTypes.GQL_CONNECTION_TERMINATE:
        this.socket.close(1000);
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
    };

    if (cachedOrResult.operation !== 'subscription') {
      if (this.listeners.onStart)
        this.listeners.onStart.call(this, data.id, execArg);
      const result = await this.gql.execute(execArg, cachedOrResult.jit);
      this.sendMessage(MessageTypes.GQL_DATA, data.id, result);
    } else {
      let result: AsyncIterableIterator<ExecutionResult>;
      try {
        // @ts-ignore: This is possibly ExecutionResult, but it should not
        // proceed after isAsyncIterable check anyway
        result = await this.gql.subscribe(execArg, cachedOrResult.jit);
        if ('errors' in result)
          // Something prevents a subscription from being created properly
          // such as invalid query or variables. result = ExecutionResult
          return this.sendMessage(
            MessageTypes.GQL_ERROR,
            data.id,
            result as ExecutionResult
          );
      } catch (error) {
        // This error is thrown from this.gql.subscribe
        return this.sendMessage(MessageTypes.GQL_ERROR, data.id, {
          // TODO: Need better tracing
          errors: [new GraphQLError(error.message)],
        });
      }
      this.operations.set(data.id, result);
      if (this.listeners.onStart)
        this.listeners.onStart.call(this, data.id, execArg);
      for await (const value of result) {
        this.sendMessage(MessageTypes.GQL_DATA, data.id, value);
      }
    }
    // Complete
    if (this.listeners.onComplete)
      this.listeners.onComplete.call(this, data.id);
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

  onClose() {
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
