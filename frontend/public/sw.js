// Kill-switch service worker.
//
// Prior versions used an aggressive cache-first strategy with a hardcoded
// CACHE_NAME, which trapped users on stale bundles after every deploy.
// CORTEX is online-first (every meaningful operation needs the backend),
// so we don't need a service worker at all.
//
// This worker exists only to undo itself for users who still have the old
// one registered:
//   1. skipWaiting so the new SW activates immediately.
//   2. Delete every Cache Storage entry.
//   3. Unregister this SW.
//   4. Reload each controlled tab once so it drops the stale bundles it's
//      been serving.
//
// No fetch handler is registered — the network serves everything directly.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      try {
        await client.navigate(client.url);
      } catch {
        // navigate() can fail when the client is a cross-origin redirect
        // or otherwise uncontrolled. Swallow — worst case the user reloads.
      }
    }
  })());
});
