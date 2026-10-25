// lightkone's service worker: the app opens offline. The library and the
// last 25 PDFs opened are kept by the app itself (IndexedDB); this caches
// the shell. /api/ and /mcp/ always go to the network.
const SHELL = "lightkone-shell";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      let files = ["/app/", "/", "/manifest.webmanifest", "/icon.svg"];
      try {
        const res = await fetch("/precache.json", { cache: "no-store" });
        if (res.ok) files = (await res.json()).files;
      } catch {}
      await Promise.all(files.map((f) => cache.add(new Request(f, { cache: "reload" })).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/mcp/")) return;
  if (req.mode === "navigate") {
    // Network first, so a new version shows when online; the shell when not.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) (await caches.open(SHELL)).put(url.pathname.startsWith("/app") ? "/app/" : req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(SHELL);
          return (await cache.match(url.pathname.startsWith("/app") ? "/app/" : req)) ?? (await cache.match("/app/")) ?? Response.error();
        }
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && /^\/(assets|pdfjs)\//.test(url.pathname)) cache.put(req, res.clone());
      return res;
    })(),
  );
});
