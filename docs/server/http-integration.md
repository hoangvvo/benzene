# HTTP Framework Integration

You can use `gqlHandle` in other compatible frameworks (those that accepts the `(req, res) => void` function)

## [Express](https://github.com/expressjs/express)

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-express)

```js
const express = require('express')
const app = express()

app.all('/graphql', gqlHandle);

app.listen(3000, () => {
  console.log(`🚀  Server ready at :3000`);
});
```

## [Micro](https://github.com/vercel/micro)

[Example](https://github.com/hoangvvo/benzene/tree/main/examples/with-micro)

```js
module.exports = gqlHandle;
```

## [Next.js](https://github.com/vercel/next.js/)

```js
// pages/api/graphql.js
export default gqlHandle;
```