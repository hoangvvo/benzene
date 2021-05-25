import { isAsyncIterator } from "../src/utils";

test("isAsyncIterator returns false if value is not", () => {
  expect(isAsyncIterator(undefined)).toBe(false);
  expect(isAsyncIterator(null)).toBe(false);
  expect(isAsyncIterator(true)).toBe(false);
  expect(isAsyncIterator(1)).toBe(false);
  expect(isAsyncIterator("")).toBe(false);
  expect(isAsyncIterator({})).toBe(false);
  expect(isAsyncIterator([])).toBe(false);
});

test("isAsyncIterator returns true if value is", () => {
  expect(
    isAsyncIterator({
      [Symbol.asyncIterator]() {
        return this;
      },
    })
  ).toBe(true);

  async function* asyncGeneratorFunc() {}

  expect(isAsyncIterator(asyncGeneratorFunc())).toBe(true);

  // But async generator function itself is not iterable
  expect(isAsyncIterator(asyncGeneratorFunc)).toBe(false);
});
