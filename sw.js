/* Med Study: network-first updates, cached core content for offline reuse. */
const CACHE = "med-study-shell-v0.6.0";
const CORE = [
  "./", "./index.html", "./styles.css", "./app.js",
  "./data/questions.json", "./data/lesson.json", "./data/atlas.json", "./data/subjects.json",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./illustrations/pathways.svg", "./illustrations/receptors.svg", "./illustrations/organs.svg"
];
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("med-study-shell-") && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const basePath = new URL(self.registration.scope).pathname;
  if (url.origin !== self.location.origin || !url.pathname.startsWith(basePath)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("./index.html", { ignoreSearch: true });
          if (fallback) return fallback;
        }
        return Response.error();
      })
  );
});
