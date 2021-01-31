"use strict";

const uws = require("uWebSockets.js");
const { Benzene, makeHandler, parseGraphQLBody } = require("@benzene/http");
const schema = require("../schema");

const GQL = new Benzene({ schema });

const graphqlHTTP = makeHandler(GQL);

uws
  .App()
  .any("/graphql", (res, req) => {
    const cType = req.getHeader("content-type");
    const method = req.getMethod();
    readRaw(
      res,
      (buf) => {
        graphqlHTTP({
          method,
          headers: { "content-type": cType },
          body: parseGraphQLBody(buf.toString(), cType),
        }).then((result) => {
          Object.entries(result.headers).forEach(([key, value]) =>
            res.writeHeader(key, value)
          );
          res.end(JSON.stringify(result.payload));
        });
      },
      () => {}
    );
  })
  .listen(4000, () => {});

function readRaw(res, cb, err) {
  let buffer;
  /* Register data cb */
  res.onData((ab, isLast) => {
    let chunk = Buffer.from(ab);
    if (isLast) {
      if (buffer) {
        cb(Buffer.concat([buffer, chunk]));
      } else {
        cb(chunk);
      }
    } else {
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk]);
      } else {
        buffer = Buffer.concat([chunk]);
      }
    }
  });

  /* Register error cb */
  res.onAborted(err);
}
