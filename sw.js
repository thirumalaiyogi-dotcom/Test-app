// சிட்டை — service worker
// 1) Push notifications even when the app is closed.
// 2) Customer app opens instantly: the last copy of index.html + fonts is kept on the phone and shown at once,
//    while a fresh copy downloads in the background (the new version appears from the next open).
//    Only the customer page and fonts are cached — admin / shop / delivery and all Supabase data always come live.
var CACHE = 'sittai-shell-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('sittai-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isCustomerPage(url, req) {
  if (url.origin !== self.location.origin || req.method !== 'GET') return false;
  var scope = new URL(self.registration.scope).pathname;
  var p = url.pathname;
  return req.mode === 'navigate' && (p === scope || p === scope + 'index.html');
}
function isFont(url) { return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'; }

self.addEventListener('fetch', function (e) {
  var req = e.request, url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (isCustomerPage(url, req)) {
    var key = new URL(self.registration.scope).href; // one copy, whatever ?v= is used
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(key).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(key, res.clone());
          return res;
        }).catch(function () { return hit; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
    return;
  }
  if (isFont(url) && req.method === 'GET') {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; });
      });
    }));
  }
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'சிட்டை', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'சிட்டை', {
    body: d.body || '',
    tag: d.tag || undefined,          // same order → one notification, updated in place
    renotify: !!d.tag,
    requireInteraction: !!d.sticky,   // new orders stay on screen until tapped
    vibrate: [300, 150, 300, 150, 300],
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = self.registration.scope;
  try {
    var u = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope);
    if (u.origin === self.location.origin) url = u.href;   // only open pages of this app — never another website
    if (url === self.registration.scope) url = self.registration.scope + 'index.html'; // customer app lives at index.html (its own install scope)
  } catch (err) {}
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
    for (var i = 0; i < wins.length; i++) {
      if (wins[i].url.split('#')[0].split('?')[0] === url && 'focus' in wins[i]) return wins[i].focus();
    }
    return self.clients.openWindow(url);
  }));
});
