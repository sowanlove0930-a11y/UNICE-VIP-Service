// UNISPACE Service Worker (PWA cache + FCM push)
// PWA: network-first for fresh data, cache fallback.
// Push: firebase background message handler + notification click.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

var firebaseConfig = {
  apiKey: "AIzaSyB0tI00fw7WgtYcjJJpp3EWrMh7LqpHqvY",
  authDomain: "unispace-push.firebaseapp.com",
  projectId: "unispace-push",
  storageBucket: "unispace-push.firebasestorage.app",
  messagingSenderId: "439181771310",
  appId: "1:439181771310:web:1174d0fab279d4d9f995bf"
};
firebase.initializeApp(firebaseConfig);
var messaging = firebase.messaging();

// background push received -> show notification
messaging.onBackgroundMessage(function(payload) {
  var data = payload.data || {};
  var note = payload.notification || {};
  var title = note.title || data.title || 'UNISPACE 알림';
  var options = {
    body: note.body || data.body || '',
    icon: '/unispace/unispace-192.png',
    badge: '/unispace/unispace-badge.png',
    tag: data.tag || 'unispace-today',
    data: { url: data.url || './index.html?open=today' },
    requireInteraction: false
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './index.html?open=today';
  var wantOpen = '';
  var opens = ['recruit', 'today', 'perf', 'bojtop', 'stdfp', 'checkup'];
  for (var oi = 0; oi < opens.length; oi++) {
    if (target.indexOf('open=' + opens[oi]) >= 0) { wantOpen = opens[oi]; break; }
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if ('focus' in c) {
          try { c.postMessage({ type: 'UNISPACE_OPEN', open: wantOpen }); } catch(e){}
          try { c.navigate(target); } catch(e){}
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ===== PWA cache (network-first) =====
var CACHE_NAME = 'unispace-v70';
var PRECACHE = [
  './manifest.json',
  './unispace-192.png',
  './unispace-512.png',
  './unispace-maskable-512.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE).catch(function(){ return null; });
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME) return caches.delete(k);
        return null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET'){ return; }
  e.respondWith(
    fetch(req).then(function(res){
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || Response.error();
      });
    })
  );
});
