import { ExecutionResult } from 'graphql';
import {
  GraphQLParams,
  GraphQL,
  FormattedExecutionResult,
  TContext,
  ValueOrPromise,
} from '@benzene/core';
import * as WebSocket from 'ws';
import { isAsyncIterable, forAwaitEach, createAsyncIterator } from 'iterall';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import {
  GQL_CONNECTION_INIT,
  GQL_CONNECTION_ACK,
  GQL_CONNECTION_ERROR,
  GQL_CONNECTION_TERMINATE,
  GQL_START,
  GQL_DATA,
  GQL_ERROR,
  GQL_COMPLETE,
  GQL_STOP,
} from './messageTypes';
import { ConnectionParams, OperationMessage, HandlerConfig } from './types';

export interface SubscriptionConnection {
  on(
    event: 'connection_init',
    listener: (connectionParams: ConnectionParams) => void
  ): this;
  emit(event: 'connection_init', payload: ConnectionParams): boolean;
  on(
    event: 'subscription_start',
    listener: (id: string, payload: GraphQLParams, context: TContext) => void
  ): this;
  emit(
    event: 'subscription_start',
    id: string,
    payload: GraphQLParams,
    context: TContext
  ): boolean;
  on(event: 'subscription_stop', listener: (id: string) => void): this;
  emit(event: 'subscription_stop', id: string): boolean;
  on(event: 'connection_terminate', listener: () => void): this;
  emit(event: 'connection_terminate'): boolean;
}

export class SubscriptionConnection extends EventEmitter {
  private operations: Map<string, AsyncIterator<ExecutionResult>> = new Map();
  // contextPromise because GQL_START may run right after GQL_CONNECTION_INIT
  contextPromise: ValueOrPromise<TContext> = {};
  constructor(
    public socket: WebSocket,
    public request: IncomingMessage,
    private gql: GraphQL,
    private options: HandlerConfig
  ) {
    super();
  }

  handleMessage(message: string) {
    let data: OperationMessage;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return this.sendError(undefined, new Error('Malformed message'));
    }
    switch (data.type) {
      case GQL_CONNECTION_INIT:
        this.handleConnectionInit(data);
        break;
      case GQL_START:
        this.handleGQLStart(
          data as OperationMessage & { id: string; payload: GraphQLParams }
        );
        break;
      case GQL_STOP:
        this.handleGQLStop(data.id as string);
        break;
      case GQL_CONNECTION_TERMINATE:
        this.handleConnectionClose();
        break;
    }
  }

  handleConnectionInit(data: OperationMessage) {
    // https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md#gql_connection_init
    try {
      // resolve context
      if (this.options.context) {
        this.contextPromise =
          typeof this.options.context === 'function'
            ? this.options.context(
                this.socket,
                this.request,
                data.payload as ConnectionParams
              )
            : this.options.context;
      }
      this.sendMessage(GQL_CONNECTION_ACK);
      // Emit
      this.emit('connection_init', data.payload as ConnectionParams);
    } catch (err) {
      this.sendMessage(GQL_CONNECTION_ERROR, data.id, {
        errors: [err],
      });
      this.handleConnectionClose();
    }
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

    const context = await this.contextPromise;
    const executionResult =
      'document' in cachedOrResult
        ? await this.gql[
            cachedOrResult.operation === 'subscription'
              ? 'subscribe'
              : 'execute'
          ]({
            document: cachedOrResult.document,
            contextValue: context,
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

    // Emit
    this.emit('subscription_start', data.id, data.payload, context);

    // @ts-ignore
    await forAwaitEach(executionIterable, (result: ExecutionResult) => {
      this.sendMessage(GQL_DATA, data.id, result);
    }).then(
      () => {
        // Subscription is finished
        this.sendMessage(GQL_COMPLETE, data.id);
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
    // Emit
    this.emit('subscription_stop', opId);
    this.operations.delete(opId);
  }

  handleConnectionClose() {
    setTimeout(() => {
      // Unsubscribe from the whole socket
      Object.keys(this.operations).forEach((opId) => this.handleGQLStop(opId));
      // Close connection after sending error message
      this.socket.close(1011);
      // Emit
      this.emit('connection_terminate');
    }, 10);
  }

  sendError(id: string | undefined, error: Error) {
    this.socket.send(
      JSON.stringify({
        type: GQL_ERROR,
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
