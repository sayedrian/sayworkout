// Lets the workout app open with no signal in the gym.
// Network first: whenever there is signal you get the latest page; the saved copy is
// used only when the network fails. Only this site's own files are cached — calls to
// api.github.com (your workouts and token) are never touched.
const CACHE = 'workout-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const scope = new URL(self.registration.scope);
  if (e.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // always ask the server whether the file changed (no 10-minute stale copy); the saved copy is only for offline
  e.respondWith(
    fetch(url.href, { cache:'no-cache' })   // by URL: a page-load request can't be copied with options
      .then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
