/* يتيح فتح الموقع بسرعة وبدون إنترنت بعد أول زيارة. ارفع رقم الإصدار عند كل تحديث. */
const VERSION = "alhaji-v3";
const SHELL = ["./", "index.html", "css/style.css", "js/menu.js", "js/app.js", "img/logo.svg", "img/icon-192.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // ملفات الموقع: الشبكة أولاً حتى تظهر الأسعار المحدثة فوراً، والنسخة المحفوظة عند انقطاع الإنترنت
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }
  // الصور والخطوط الخارجية: المحفوظ أولاً
  if (/images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
      )
    );
  }
});
