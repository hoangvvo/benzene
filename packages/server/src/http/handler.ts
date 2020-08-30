import { GraphQL, HttpQueryResponse, runHttpQuery } from '@benzene/core';
import { readBody } from './readBody';
import parseUrl from '@polka/url';
import { HandlerConfig } from './types';
import { IncomingMessage, ServerResponse } from 'http';

export function createHandler(gql: GraphQL, options: HandlerConfig = {}) {
  function sendResponse(res: ServerResponse, result: HttpQueryResponse) {
    res.writeHead(result.status, result.headers).end(result.body);
  }
  function sendErrorResponse(res: ServerResponse, error: any) {
    sendResponse(res, {
      status: error.status || 500,
      body: JSON.stringify(gql.formatExecutionResult({ errors: [error] })),
      headers: { 'content-type': 'application/json' },
    });
  }
  return function handler(
    req: IncomingMessage & { path?: string },
    res: ServerResponse
  ) {
    if (
      options.path &&
      (req.path || parseUrl(req, true).pathname) !== options.path
    )
      return sendResponse(res, { status: 404, body: 'not found', headers: {} });
    readBody(req, async (err, body) => {
      if (err) return sendErrorResponse(res, err);
      let context;
      if (options.context)
        try {
          context =
            typeof options.context === 'function'
              ? await options.context(req)
              : options.context;
        } catch (error) {
          error.message = `Context creation failed: ${error.message}`;
          sendErrorResponse(res, error);
        }
      sendResponse(
        res,
        await runHttpQuery(gql, {
          context: context || {},
          httpMethod: req.method as string,
          queryParams: parseUrl(req, true).query || null,
          body,
          headers: req.headers as Record<string, string>,
        })
      );
    });
  };
}
