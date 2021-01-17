import { Benzene, HTTPResponse, runHttpQuery } from '../../../ws/__tests__/@benzene/core';
import { parse as parseQS } from 'querystring';
import { readBody } from './readBody';
import { HandlerConfig } from './types';
import { IncomingMessage, ServerResponse } from 'http';
import { GraphQLError } from '../../../core/__tests__/graphql';

export function httpHandler(gql: Benzene, options: HandlerConfig = {}) {
  function sendResponse(res: ServerResponse, result: HTTPResponse) {
    res
      .writeHead(result.status, result.headers)
      .end(JSON.stringify(result.payload));
  }
  function sendErrorResponse(res: ServerResponse, error: any) {
    sendResponse(res, {
      status: error.status || 500,
      payload: gql.formatExecutionResult({ errors: [error] }),
      headers: { 'content-type': 'application/json' },
    });
  }
  return function handler(
    req: IncomingMessage & { path?: string; query?: Record<string, string> },
    res: ServerResponse
  ) {
    const idx = req.url!.indexOf('?');
    if (
      options.path &&
      (req.path || (idx !== -1 ? req.url!.substring(0, idx) : req.url)) !==
        options.path
    )
      return sendResponse(res, {
        status: 404,
        payload: { errors: [new GraphQLError('not found')] },
        headers: {},
      });
    readBody(req, async (body) => {
      let context;
      if (options.context)
        try {
          context =
            typeof options.context === 'function'
              ? await options.context(req)
              : options.context;
        } catch (error) {
          error.message = `Context creation failed: ${error.message}`;
          return sendErrorResponse(res, error);
        }
      sendResponse(
        res,
        await runHttpQuery(gql, {
          context: context || {},
          httpMethod: req.method as string,
          queryParams:
            req.query ||
            (idx !== -1
              ? (parseQS(req.url!.substring(idx + 1)) as Record<string, string>)
              : null),
          body,
          headers: req.headers as Record<string, string>,
        })
      );
    });
  };
}
