const CACHE_NAME = "confesso-que-bebi-pwa-v0.7.7-fast1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./acesso.html",
  "./reset.html",
  "./install.html",
  "./manifest.webmanifest",
  "./app-enhancements.js?v=0.7.7",
  "./app-dashboard-v06.js?v=0.7.7",
  "./history-charts-v075.js?v=0.7.7",
  "./backup-xlsx-v076.js?v=0.7.7",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const networkUpdate = fetch(request)
    .then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    });

  event.waitUntil(networkUpdate.then(() => undefined).catch(() => undefined));

  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached;
      try {
        return await networkUpdate;
      } catch {
        if (request.mode === "navigate") {
          return (await caches.match("./index.html")) || (await caches.match("./"));
        }
        return Response.error();
      }
    })
  );
});
