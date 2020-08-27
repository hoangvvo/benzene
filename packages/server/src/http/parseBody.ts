import { parseBodyByContentType } from '@benzene/core';
import { IncomingMessage } from 'http';

export function parseBody(
  req: IncomingMessage | (IncomingMessage & { body: any }),
  cb: (err: any, body: Record<string, any> | null) => void
): void {
  // If body has been parsed as a keyed object, use it.
  if ('body' in req && typeof req.body === 'object') {
    return cb(null, req.body);
  }

  if (req.method === 'GET') return cb(null, null);

  const oCtype = req.headers['content-type'];
  // Skip requests without content types.
  if (!oCtype) return cb(null, null);

  let rawBody = '';

  req.on('data', (chunk) => (rawBody += chunk));
  req.on('error', (err) => cb(err, null));
  req.on('end', () => {
    try {
      cb(null, parseBodyByContentType(rawBody, oCtype));
    } catch (err) {
      err.status = 400;
      cb(err, null);
    }
  });
}
