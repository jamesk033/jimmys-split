/* Jimmy's Split service worker.
   Pages always go to the network, because your workouts are private and change often.
   Static build files are cached so the app opens fast. With no connection, pages show /offline. */
const VERSION = "jimmys-split-v1";
const OFFLINE_PAGES = [];
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, images: never cached here
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    const keep = OFFLINE_PAGES.includes(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (keep && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(() =>
          (keep ? caches.match(url.pathname) : Promise.resolve(undefined)).then(
            (hit) => hit || caches.match("/offline").then((r) => r || new Response("Offline", { status: 503 })),
          ),
        ),
    );
  }
});
