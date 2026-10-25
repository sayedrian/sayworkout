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

// Reminders (user, 2026-10-26): the push comes from the Reminders job in the private repo
// (supplements, protein 19:00, gut 20:00). Tapping it opens the app on the Daily tab.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Workout', {
    body: d.body || '', tag: d.tag || 'reminder', icon: 'icon-192.png', badge: 'icon-192.png', data: { tab: d.tab || 'fuel' } }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./#' + ((e.notification.data && e.notification.data.tab) || 'fuel'), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    return c ? c.focus().then(w => (w || c).navigate(url)).catch(() => self.clients.openWindow(url)) : self.clients.openWindow(url);
  }));
});
