const CACHE_VERSION = "doittimer-static-v3";
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

function broadcast(type, payload) {
  self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "doittimer:sw-log",
        event: type,
        ts: new Date().toISOString(),
        ...payload,
      });
    }
  }).catch(() => undefined);
}

self.addEventListener("install", (event) => {
  broadcast("install", { cacheVersion: CACHE_VERSION });
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  broadcast("activate:start", { cacheVersion: CACHE_VERSION });
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim())
      .then(() => broadcast("activate:complete", { cacheVersion: CACHE_VERSION })),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-touch-icon.png"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return;
  }

  if (request.mode === "navigate") {
    broadcast("fetch:navigate", { pathname: url.pathname, search: url.search });
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        broadcast("fetch:navigate:fallback", { pathname: url.pathname, search: url.search });
        const offlineResponse = await caches.match("/offline");
        return offlineResponse ?? Response.error();
      }),
    );
    return;
  }

  if (isStaticAsset(url)) {
    broadcast("fetch:static", { pathname: url.pathname, search: url.search });
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      }),
    );
  }
});
