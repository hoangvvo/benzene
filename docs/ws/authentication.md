# Authentication

`@benzene/ws` currently does not implement `onConnect` (due to [security & memory leak issues](https://github.com/apollographql/subscriptions-transport-ws/issues/349) on the upstream implementation). 

However, `options.context` can be used to authenticate via headers if you have session authentication implementation in HTTP requests. Let's peek into the above `getUserFromReq`.

```js
import { parse as parseCookie } from 'cookie';

async function getUserFromReq(req) {
  const cookies = parseCookie(req.headers.cookie);
  const { userId } = await redis.get(`session:${cookies.sid}`);
  return userId ? findByUserId(userId) : null;
}
```

Or perhaps if you use `expressSession`, you can do something like so:

```js
const session = require('express-session');

const sessionMiddleware = session({
  saveUninitialized: false,
  secret: 'keyboard cat',
  resave: false
});

function getUserFromReq(req) {
  return new Promise((resolve, reject) => {
    sessionParser(req, {}, (err) => {
      if (err) return reject(err);
      resolve(req.session.userId ? findByUserId(req.session.userId) : null);
    });
  })
}
```

In `options.context`, you may choose to reject the socket by throwing:

```js
const wsHandle = wsHandler(GQL, {
  context: async (socket, req) => {
    const user = await getUserFromReq(req);
    if (!user) {
      throw new Error('You are not authenticated!')
    }

    return { user };
  },
});
```

