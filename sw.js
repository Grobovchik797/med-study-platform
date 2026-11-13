/* Med Study: network-first updates, cached core content for offline reuse. */
const CACHE = "med-study-shell-v1.10.0-blood-physiology";
const CORE = [
  "./", "./index.html", "./styles.css", "./blood-study.css", "./blood-study.js", "./app.js", "./small-intestine-interact.js", "./gi-course.js", "./cranial-nerves.js", "./study-tools.js", "./department-atlas.js", "./department-public.js", "./edubiotech-atlas.js", "./edubiotech-original.js",
  "./data/physiology-blood.json", "./data/physiology-blood-exam.json", "./data/physiology-blood-atlas.json", "./data/physiology-blood-lectures.json",
  "./data/questions.json", "./data/lesson.json", "./data/atlas.json", "./data/subjects.json", "./data/histology-small-intestine.json", "./data/library.json", "./data/gi-deep-a.json", "./data/gi-deep-b.json", "./data/gi-department-questions.json", "./data/gi-curriculum.json", "./data/cranial-nerves.json", "./data/cranial-nerves-viii-xii.json", "./data/gi-inline-quiz.json", "./data/gi-final-quiz.json", "./data/gi-answer-reasons.json", "./data/update-journal.json", "./data/gi-colloquium-guide.json", "./data/gi-edubiotech-atlas.json", "./data/gi-edubiotech-original.json", "./data/gi-edubiotech-tem.json", "./data/gi-workbook.json", "./data/gi-atlas.json", "./data/department-public.json", "./data/gi-department-reference-map.json", "./data/small-intestine-quiz.json", "./data/small-intestine-slides.json", "./illustrations/small-intestine-schematic.svg",
  "./illustrations/blood/01_лейкоцитарная_формула.svg",
  "./illustrations/blood/02_состав_крови.svg",
  "./illustrations/blood/03_ABO_антигены_антитела.svg",
  "./illustrations/blood/04_ABO_эритроциты_плазма.svg",
  "./illustrations/blood/05_каскад_свертывания.svg",
  "./illustrations/blood/06_эритрон_железо.svg",
  "./illustrations/blood/07_диссоциация_оксигемоглобина.svg",
  "./illustrations/blood/08_буферные_системы.svg",
  "./illustrations/blood/09_ABO_наследование.svg",
  "./illustrations/blood/10_виды_лейкоцитов.svg",
  "./photos/duodenum.jpg", "./photos/jejunum.jpg", "./photos/ileum.jpg",
  "./photos/salivary-submandibular.jpg", "./photos/esophagus.jpg", "./photos/stomach-fundus.jpg",
  "./photos/colon.jpg", "./photos/liver.jpg", "./photos/pancreas.jpg", "./photos/liver-central-vein.jpg", "./photos/liver-portal-triad.jpg", "./photos/gastric-parietal-tem.jpg", "./photos/gastric-chief-tem.jpg",
  "./photos/department/ПОДЖЕЛУДОЧНАЯ ЖЕЛЕЗА (PDF стр. 5).jpg",
  "./photos/tooth-enamel-organ.jpg", "./photos/gastro-esophageal-junction.jpg",
  "./photos/pyloric-stomach.jpg", "./photos/esophagus-cross-section.jpg", "./photos/tongue-foliate.jpg", "./photos/tongue-filiform.jpg",
  "./photos/palatine-tonsil.jpg", "./photos/parotid-gland.jpg", "./photos/mixed-salivary-gland.jpg", "./photos/tooth-dentin-enamel.jpg",
  // All 36 owner-approved specimen photos and author marks are available offline.
  "./photos/edubiotech/t23-01.jpg",
  "./photos/edubiotech/t23-01-v1.jpg",
  "./photos/edubiotech/t23-02.jpg",
  "./photos/edubiotech/t23-02-v1.jpg",
  "./photos/edubiotech/t23-03.jpg",
  "./photos/edubiotech/t23-03-v1.jpg",
  "./photos/edubiotech/t23-04.jpg",
  "./photos/edubiotech/t23-04-v1.jpg",
  "./photos/edubiotech/t23-05.jpg",
  "./photos/edubiotech/t23-06.jpg",
  "./photos/edubiotech/t23-07.jpg",
  "./photos/edubiotech/t23-07-v1.jpg",
  "./photos/edubiotech/t23-08.jpg",
  "./photos/edubiotech/t23-08-v1.jpg",
  "./photos/edubiotech/t23-09.jpg",
  "./photos/edubiotech/t23-09-v1.jpg",
  "./photos/edubiotech/t24-01.jpg",
  "./photos/edubiotech/t24-01-v1.jpg",
  "./photos/edubiotech/t24-02.jpg",
  "./photos/edubiotech/t24-02-v1.jpg",
  "./photos/edubiotech/t24-03.jpg",
  "./photos/edubiotech/t24-03-v1.jpg",
  "./photos/edubiotech/t24-04.jpg",
  "./photos/edubiotech/t24-04-v1.jpg",
  "./photos/edubiotech/t24-05.jpg",
  "./photos/edubiotech/t24-06.jpg",
  "./photos/edubiotech/t25-01.jpg",
  "./photos/edubiotech/t25-01-v1.jpg",
  "./photos/edubiotech/t25-02.jpg",
  "./photos/edubiotech/t25-02-v1.jpg",
  "./photos/edubiotech/t25-03.jpg",
  "./photos/edubiotech/t25-03-v1.jpg",
  "./photos/edubiotech/t25-04.jpg",
  "./photos/edubiotech/t25-05.jpg",
  "./photos/edubiotech/t25-06.jpg",
  "./photos/edubiotech/t25-06-v1.jpg",
  "./photos/edubiotech-tem/enterocyte-tem.jpg", "./photos/edubiotech-tem/bile-canaliculus-tem.jpg", "./photos/edubiotech-tem/pancreas-acinar-tem.jpg",
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
  // Real microscopy photos change only with a versioned release. Use offline copies
  // immediately on repeat visits instead of re-downloading huge JPGs on each mode change.
  if (url.pathname.startsWith(basePath + "photos/")) {
    event.respondWith(
      caches.open(CACHE).then(cache => cache.match(event.request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(cache.put(event.request, copy));
          }
          return response;
        });
      })).catch(() => Response.error())
    );
    return;
  }
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
