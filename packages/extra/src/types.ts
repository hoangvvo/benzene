export interface KeyValueStore<V = string> {
  get(key: string): V | undefined | null;
  set(key: string, value: V): any;
  delete(key: string): any;
}
