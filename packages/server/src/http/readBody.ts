import { IncomingMessage } from 'http';

export function readBody(
  req: IncomingMessage & { body?: any },
  cb: (body: Record<string, any> | string | null) => void
): void {
  // If body has been parsed as a keyed object, use it.
  if ('body' in req && typeof req.body === 'object') return cb(req.body);

  if (req.method === 'GET') return cb(null);

  const oCtype = req.headers['content-type'];
  // Skip requests without content types.
  if (!oCtype) return cb(null);

  let rawBody = '';

  req.on('data', (chunk) => (rawBody += chunk));
  req.on('end', () => cb(rawBody));
}
