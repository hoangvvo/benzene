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
      case MessageTypes.GQL_START:
        this.handleGQLStart(
          data as OperationMessage & { id: string; payload: GraphQLParams }
        );
        break;
      case MessageTypes.GQL_STOP:
        this.handleGQLStop(data.id as string);
        break;
      case MessageTypes.GQL_CONNECTION_TERMINATE:
        this.handleConnectionClose();
        break;
    }
  }

  async handleGQLStart(
    data: OperationMessage & { id: string; payload: GraphQLParams }
  ) {
    // https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md#gql_start
    const { query, variables, operationName } = data.payload;

    if (!query) {
      return this.sendMessage(MessageTypes.GQL_ERROR, undefined, {
        errors: [new GraphQLError('Must provide query string.')],
      });
    }

    const cachedOrResult = this.gql.getCachedGQL(query, operationName);

    if (!('document' in cachedOrResult)) {
      // There is an validation/syntax error, cannot continue
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
        // Send GQL_ERROR because the operation cannot be continued
        // See https://github.com/graphql/graphql-js/blob/master/src/subscription/subscribe.js#L52-L54
        return this.sendMessage(MessageTypes.GQL_ERROR, data.id, result);
      }
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
    const removingOperation = this.operations.get(opId);
    if (!removingOperation) return;
    removingOperation.return?.();
    this.operations.delete(opId);
  }

  handleConnectionClose() {
    setTimeout(() => {
      // Unsubscribe from the whole socket
      Object.keys(this.operations).forEach((opId) => this.handleGQLStop(opId));
      this.socket.close();
    }, 10);
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
