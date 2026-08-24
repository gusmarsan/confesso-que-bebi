const CACHE_NAME = "confesso-que-bebi-pwa-v0.7.5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./acesso.html",
  "./reset.html",
  "./install.html",
  "./manifest.webmanifest",
  "./app-enhancements.js?v=0.7.4",
  "./app-dashboard-v06.js?v=0.7.4",
  "./history-charts-v075.js?v=0.7.5",
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

function isMainHtml(url) {
  return url.pathname.endsWith("/confesso-que-bebi/") || url.pathname.endsWith("/confesso-que-bebi/index.html");
}

async function withHistoryCharts(response) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  if (html.includes("history-charts-v075.js")) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  const injected = html.replace(
    "</body>",
    '<script type="module" src="./history-charts-v075.js?v=0.7.5"></script>\n</body>'
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

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
      .then(async response => {
        const served = isMainHtml(url) ? await withHistoryCharts(response) : response;
        const copy = served.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined);
        return served;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
  );
});
