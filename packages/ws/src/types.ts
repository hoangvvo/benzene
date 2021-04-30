import { ValueOrPromise } from "@benzene/core";
import { ExecutionResult } from "graphql";
import { ConnectionInitMessage } from "./message";

/**
 * A minimum compatible WebSocket instance
 */
export interface WebSocket {
  /**
   * The subprotocol of the WebSocket. It must be
   * supported by the protocol used by @benzene/ws
   */
  protocol: string;
  /**
   * Enqueues the specified data to be transmitted to the client over the WebSocket connection
   * @param data The data to send to the client
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send}
   */
  send(data: string): void;
  /**
   * Closes the WebSocket connection or connection attempt, if any
   * @param code A numeric value indicating the status code explaining why the connection is being closed
   * @param reason A human-readable string explaining why the connection is closing.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close}
   */
  close(code?: number | undefined, reason?: string | undefined): void;
  /**
   * An EventHandler that is called when the WebSocket connection's readyState changes to CLOSED
   * @param event A CloseEvent is sent to clients using WebSockets when the connection is closed
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/onclose}
   */
  onclose(event: { code?: number; reason?: string }): void;
  /**
   * An EventHandler that is called when a message is received from the client
   * @param event Represents a message received by a target object.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/onmessage}
   */
  onmessage(event: { data: any }): void;
}

/**
 * An object that stores information about a WebSocket connection
 */
export interface ConnectionContext<TExtra> {
  // A map of all GraphQL subscriptions' async iterators
  subscriptions: Map<string, AsyncIterableIterator<ExecutionResult>>;
  // Whether the connection has been acknowledged
  acknowledged: boolean;
  // Whether the server has received connection init request from the client
  connectionInitReceived: boolean;
  // The "extra" variable
  extra?: TExtra;
}

export interface HandlerOptions<TExtra> {
  /**
   * A function to be called when a new WebSocket connection is established
   * @param ctx The ConnectionContext
   * @param connectionParams A optional payload sent from the client in its ConnectionInit message
   */
  onConnect?: (
    ctx: ConnectionContext<TExtra>,
    connectionParams: ConnectionInitMessage["payload"]
  ) => ValueOrPromise<Record<string, unknown> | boolean | void>;
}
