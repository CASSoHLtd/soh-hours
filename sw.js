const CACHE = "soh-d5b5fe4cd4";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // data requests go straight to Google
  const url = new URL(req.url);
  if (url.origin === location.origin && (req.mode === "navigate" || /\.(html|js|webmanifest)$|\/$/.test(url.pathname))) {
    // The app itself: always try for the latest version first (so updates show at once);
    // use the saved copy only with no signal or if the network takes over 4 seconds.
    e.respondWith(caches.open(CACHE).then(c => {
      const net = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
      const slow = new Promise(res => setTimeout(res, 4000)).then(() => c.match(req, { ignoreSearch: true }));
      return Promise.race([net, slow.then(hit => hit || net)])
        .catch(() => c.match(req, { ignoreSearch: true }).then(hit => hit || c.match("index.html")));
    }));
  } else if (url.origin === location.origin) {
    // Icons: saved copy first.
    e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
  }
});
