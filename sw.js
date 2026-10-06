const CACHE = 'vocabpwa-v37';
const ASSETS = ['./', './index.html', './data.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 修 P16：动态缓存原对所有 GET 成功响应无上限 put（含 Tesseract wasm/traineddata 等大件）→
  // 1) 仅缓存同源响应，跨域（CDN）不进缓存；2) 同源动态缓存限量 60 条，超出按 FIFO 淘汰。
  let sameOrigin = true;
  try { sameOrigin = new URL(e.request.url).origin === self.location.origin; } catch (err) {}
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (sameOrigin && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy).then(() => trimCache(c))).catch(() => {});
      }
      return resp;
    }).catch(() => sameOrigin ? caches.match('./index.html') : Promise.reject(new Error('offline'))))
  );
});

const DYNAMIC_MAX = 60;
async function trimCache(c) {
  try {
    const keys = await c.keys();
    if (keys.length > DYNAMIC_MAX) {
      for (const k of keys.slice(0, keys.length - DYNAMIC_MAX)) await c.delete(k);
    }
  } catch (err) {}
}
