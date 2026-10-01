// சிட்டை — service worker: shows push notifications even when the app is closed.
// It does not cache anything (the apps always load fresh from the website).
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

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
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
    for (var i = 0; i < wins.length; i++) {
      if (wins[i].url.split('#')[0].split('?')[0] === url && 'focus' in wins[i]) return wins[i].focus();
    }
    return self.clients.openWindow(url);
  }));
});
