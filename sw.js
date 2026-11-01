/* Med Study: network-first updates, cached core content for offline reuse. */
const CACHE = "med-study-shell-v1.8.0-topics";
const CORE = [
  "./", "./index.html", "./styles.css", "./app.js", "./small-intestine-interact.js", "./gi-course.js", "./department-atlas.js", "./department-public.js",
  "./data/questions.json", "./data/lesson.json", "./data/atlas.json", "./data/subjects.json", "./data/histology-small-intestine.json", "./data/library.json", "./data/gi-deep-a.json", "./data/gi-deep-b.json", "./data/gi-department-questions.json", "./data/gi-curriculum.json", "./data/gi-inline-quiz.json", "./data/gi-final-quiz.json", "./data/gi-workbook.json", "./data/gi-atlas.json", "./data/department-public.json", "./data/gi-department-reference-map.json", "./data/small-intestine-quiz.json", "./data/small-intestine-slides.json", "./illustrations/small-intestine-schematic.svg",
  "./photos/duodenum.jpg", "./photos/jejunum.jpg", "./photos/ileum.jpg",
  "./photos/salivary-submandibular.jpg", "./photos/esophagus.jpg", "./photos/stomach-fundus.jpg",
  "./photos/colon.jpg", "./photos/liver.jpg", "./photos/pancreas.jpg",
  "./photos/tooth-enamel-organ.jpg", "./photos/gastro-esophageal-junction.jpg",
  "./photos/pyloric-stomach.jpg", "./photos/esophagus-cross-section.jpg", "./photos/tongue-foliate.jpg", "./photos/tongue-filiform.jpg",
  "./photos/palatine-tonsil.jpg", "./photos/parotid-gland.jpg", "./photos/mixed-salivary-gland.jpg", "./photos/tooth-dentin-enamel.jpg",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png",
  "./illustrations/gi-tongue.svg", "./illustrations/gi-stomach.svg", "./illustrations/gi-liver.svg", "./illustrations/gi-pancreas.svg",
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
