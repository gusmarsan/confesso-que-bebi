const CACHE_NAME = "confesso-que-bebi-pwa-v0.7.6-fix1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./acesso.html",
  "./reset.html",
  "./install.html",
  "./manifest.webmanifest",
  "./app-enhancements.js?v=0.7.6",
  "./app-dashboard-v06.js?v=0.7.6",
  "./history-charts-v075.js?v=0.7.6",
  "./backup-xlsx-v076.js?v=0.7.6",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(request, {cache:"no-store"})
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
  );
});
