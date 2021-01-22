# Benzene

Every **Benzene** package relies on the `Benzene` class, which contains all the logic in executing the GraphQL request. The class can be found in the `@benzene/core` package and is re-exported in `@benzene/http` and `@benzene/ws` (use either one interchangeably).

```js
import { Benzene } from "@benzene/http"
// is the same as
import { Benzene } from "@benzene/ws"
```

Most of the GraphQL behavior can be configured upon Benzene initialization, such as context creation or error handling. Those configurations will apply when you use that Benzene instance in `@benzene/http` and `@benzene/ws`. For example, on errors, both `@benzene/http` and `@benzene/ws` will call the same `formatError` from the `Benzene` instance.

This allows you to write such logic only once and use anywhere.