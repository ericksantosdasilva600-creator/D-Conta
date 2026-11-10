// Dá Conta: funciona offline. Páginas: rede primeiro; sem internet, usa a última cópia salva daquela página.
const CACHE = "nyvo-v25";
const SHELL = ["./", "./app/", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./privacidade.html"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.endsWith(".mp4")) return;
  if (req.mode === "navigate") {
    const inApp = url.pathname.includes("/app");
    const key = inApp ? "./app/" : url.pathname;
    event.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; })
      .catch(() => caches.match(key).then((hit) => hit || caches.match("./app/"))));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => list[0] ? list[0].focus() : self.clients.openWindow("./app/")));
});
