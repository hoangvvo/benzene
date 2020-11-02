import { Benzene, handleRequest } from '@benzene/worker';
import schema from 'pokemon-graphql-schema';

addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

const GQL = new Benzene({ schema });

addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/graphql')
    return event.respondWith(
      handleRequest(GQL, event.request, {
        context: () => ({ hello: 'world' }),
      })
    );
});
