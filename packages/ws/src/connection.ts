import { ExecutionResult } from 'graphql';
import {
  GraphQLParams,
  GraphQL,
  FormattedExecutionResult,
  TContext,
} from '@benzene/core';
import * as WebSocket from 'ws';
import { isAsyncIterable, forAwaitEach, createAsyncIterator } from 'iterall';
import * as MessageTypes from './messageTypes';
import { OperationMessage } from './types';

export class SubscriptionConnection {
  private operations: Map<string, AsyncIterator<ExecutionResult>> = new Map();

  constructor(
    public gql: GraphQL,
    public socket: WebSocket,
    public context: TContext
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
      return this.sendError(undefined, new Error('Malformed message'));
    }
    switch (data.type) {
      case MessageTypes.GQL_CONNECTION_INIT:
        this.handleConnectionInit();
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

  handleConnectionInit() {
    this.sendMessage(MessageTypes.GQL_CONNECTION_ACK);
  }

  async handleGQLStart(
    data: OperationMessage & { id: string; payload: GraphQLParams }
  ) {
    // https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md#gql_start
    const { query, variables, operationName } = data.payload;

    if (!query) {
      return this.sendError(data.id, new Error('Must provide query string.'));
    }

    const cachedOrResult = this.gql.getCachedGQL(query, operationName);

    const executionResult =
      'document' in cachedOrResult
        ? await this.gql[
            cachedOrResult.operation === 'subscription'
              ? 'subscribe'
              : 'execute'
          ]({
            document: cachedOrResult.document,
            contextValue: this.context,
            variableValues: variables,
            operationName,
            jit: cachedOrResult.jit,
          })
        : cachedOrResult;

    const executionIterable = isAsyncIterable(executionResult)
      ? //@ts-ignore
        (executionResult as AsyncIterator<ExecutionResult>)
      : createAsyncIterator<ExecutionResult>([
          executionResult as ExecutionResult,
        ]);

    this.operations.set(data.id, executionIterable);

    // @ts-ignore
    await forAwaitEach(executionIterable, (result: ExecutionResult) => {
      this.sendMessage(MessageTypes.GQL_DATA, data.id, result);
    }).then(
      () => {
        // Subscription is finished
        this.sendMessage(MessageTypes.GQL_COMPLETE, data.id);
      },
      (err) => {
        // If something thrown, it must be a system error, otherwise, it should have landed in the regular callback with as GQL_DATA
        // See `mapAsyncIterator`
        this.sendError(data.id, err);
      }
    );
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
      //  Close connection after sending error message
      this.socket.close();
    }, 10);
  }

  sendError(id: string | undefined, error: Error) {
    this.socket.send(
      JSON.stringify({
        type: MessageTypes.GQL_ERROR,
        ...(id && { id }),
        payload: { message: error.message },
      })
    );
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
