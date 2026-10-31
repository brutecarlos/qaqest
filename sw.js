const CACHE = "qaqest-v2";
const SHELL = [
  "./",
  "index.html",
  "about.html",
  "guides.html",
  "guide-fundamentals.html",
  "guide-sdlc.html",
  "guide-static-testing.html",
  "guide-test-techniques.html",
  "guide-test-management.html",
  "guide-test-tools.html",
  "guide-exam-tips.html",
  "guide-techniques-cheat-sheet.html",
  "faq.html",
  "module.html",
  "quiz.html",
  "results.html",
  "css/styles.css",
  "js/storage.js",
  "js/layout.js",
  "js/home.js",
  "js/module.js",
  "js/quiz.js",
  "js/results.js",
  "js/adsense-config.js",
  "data/modules.json",
  "assets/favicon.svg",
  "manifest.webmanifest",
  "data/questions/agile-tester.json",
  "data/questions/al-ta.json",
  "data/questions/al-tm.json",
  "data/questions/al-tta.json",
  "data/questions/ctfl.json",
  "data/questions/performance-testing.json",
  "data/questions/test-automation.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GETs only: network first, cache fallback. Third-party
// requests (e.g. adsbygoogle) are never intercepted or cached.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
