export function isAsyncIterator<T = unknown>(
  val: unknown
): val is AsyncIterableIterator<T> {
  return typeof Object(val)[Symbol.asyncIterator] === "function";
}
