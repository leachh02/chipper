// Lets Chipper open without a connection. Everything is fetched from the
// network first, so updates show up straight away, and the last copy is
// used when offline. Your backlog itself lives in IndexedDB, not here.
const CACHE = "chipper-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Only this site's own files; YouTube, Spotify and thumbnails go straight through
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Nor a Chipper server's API: synced data stays in IndexedDB, and the live
  // sync stream never ends
  if (url.href.startsWith(new URL("api/", self.registration.scope).href)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        // Any page of the app is index.html, cached as the app's root
        return (
          cached ??
          (request.mode === "navigate" ? caches.match(self.registration.scope) : Response.error())
        );
      }),
  );
});
