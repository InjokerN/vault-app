/* VAULT shell 缓存 —— 只缓存 UI，不缓存任何数据（ADR-033） */
const VERSION = 'v20';
const CACHE = 'vault-shell-' + VERSION;
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // 字体与 GitHub API 一律直连，不缓存
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  /* shell 资源：网络优先 → 成功就写回缓存，断网才回退缓存。
     理由：缓存优先会让改过的 app.js / styles.css 永远刷不到（2026-11-06 手机端踩到）。 */
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'vault-version' && e.source) e.source.postMessage({ vaultSw: VERSION });
});
