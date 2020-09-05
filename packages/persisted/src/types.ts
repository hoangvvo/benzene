import { ValueOrPromise } from '@benzene/core';

export interface KeyValueStore<V = string> {
  get(key: string): ValueOrPromise<V | undefined | null>;
  set(key: string, value: V): ValueOrPromise<any>;
  delete(key: string): ValueOrPromise<any>;
}
