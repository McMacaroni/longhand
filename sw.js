/* Longhand offline cache.
   Bump the version string below whenever you upload a new index.html,
   otherwise devices may keep serving the old one. */
const CACHE = "longhand-v1";
const ASSETS = ["./", "./index.html"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(a => cache.add(a)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Network first, cache as the fallback: you always get the newest version
   when there is a connection, and the last good one when there isn't. */
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === "navigate") {
        const home = await caches.match("./index.html") || await caches.match("./");
        if (home) return home;
      }
      throw err;
    }
  })());
});
