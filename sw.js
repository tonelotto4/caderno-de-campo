/* PELD Coleta · service worker: guarda o app no aparelho para abrir sem internet.
   Para forçar a atualização em todos os aparelhos, troque o número da versão abaixo. */
const CACHE = "peld-coleta-v2-4.1";
const ESSENCIAL = ["./index.html"];                       // sem isto o app não funciona offline
const EXTRAS = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ESSENCIAL.map(u => new Request(u, { cache: "reload" })));
    await Promise.all(EXTRAS.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Abre sempre a cópia guardada (rápido e offline) e atualiza em segundo plano quando houver internet. */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let cached = await cache.match(req, { ignoreSearch: true });
    if (!cached && req.mode === "navigate") cached = await cache.match("./index.html");
    const rede = fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(rede); return cached; }
    const res = await rede;
    if (res) return res;
    return new Response("Sem conexão e o app ainda não foi guardado no aparelho. Abra uma vez com internet.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })());
});
