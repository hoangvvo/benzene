# HTTP Framework Integration

You can use `gqlHandle` in other compatible frameworks (those that accepts the `(req, res) => void` function).

Starting with this:

```js
const { GraphQL, httpHandler } = require('@benzene/server');

const GQL = new GraphQL({ schema });
const gqlHandle = httpHandler(GQL, options);
```

## Express

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-express)

```js
const express = require('express');
const app = express();

app.all('/graphql', gqlHandle);

app.listen(3000, () => {
  console.log(`🚀  Server ready at :3000`);
});
```

## Micro

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-micro)

```js
module.exports = gqlHandle;
```

## Next.js

```js
// pages/api/graphql.js
export default gqlHandle;
```