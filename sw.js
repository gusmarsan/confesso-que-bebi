const CACHE_NAME = "confesso-que-bebi-pwa-v0.7.4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./acesso.html",
  "./reset.html",
  "./install.html",
  "./manifest.webmanifest",
  "./app-enhancements.js?v=0.7.4",
  "./app-dashboard-v06.js?v=0.7.4",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  let networkRequest = request;
  if (url.pathname.endsWith("/app-enhancements.js") || url.pathname.endsWith("/app-dashboard-v06.js")) {
    const freshUrl = new URL(request.url);
    freshUrl.searchParams.set("v", "0.7.4");
    networkRequest = new Request(freshUrl.toString(), request);
  }

  event.respondWith(
    fetch(networkRequest)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
  );
});
