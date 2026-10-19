// UNISPACE Service Worker (PWA cache + FCM push + check-in background sync)
// PWA: network-first for fresh data, cache fallback.
// Push: firebase background message handler + notification click.
// Sync: delivers a pending 출근 체크인 as soon as the phone is online (Android).

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
  var opens = ['recruit', 'today', 'perf', 'bojtop', 'stdfp', 'checkup', 'moneywalk'];
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
var CACHE_NAME = 'unispace-v81';
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
  // cross-origin requests (Apps Script, Google APIs, CDN) go straight to the network.
  // Intercepting redirected cross-origin responses makes the browser drop them.
  var u = String(req.url || '');
  if(u.indexOf(self.location.origin) !== 0){ return; }
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

// ===== check-in background sync (Android Chrome; iOS has no 'sync' event) =====
// the app stores the check-in request URL under 'unispace_checkin_sync' in the
// shared IndexedDB (db 'unispace_big', store 'kv') and registers the
// 'unispace-checkin' tag. when the phone is back online the browser wakes this
// worker - even with the app closed - and the request goes out. the URL carries
// the press time (sentAt), which the server records as the check-in time, and
// the server dedupes by (date, fp), so a request the app already delivered is
// a harmless no-op.
function _swIdb(mode, fn){
  return new Promise(function(resolve){
    try {
      var req = indexedDB.open('unispace_big', 1);
      req.onupgradeneeded = function(){ try { req.result.createObjectStore('kv'); } catch(e) {} };
      req.onsuccess = function(){
        var db = req.result, r = null;
        try {
          var tx = db.transaction('kv', mode);
          r = fn(tx.objectStore('kv'));
          tx.oncomplete = function(){ try { db.close(); } catch(e) {} resolve(r && r.result !== undefined ? r.result : null); };
          tx.onerror = function(){ try { db.close(); } catch(e) {} resolve(null); };
          tx.onabort = function(){ try { db.close(); } catch(e) {} resolve(null); };
        } catch(e) { try { db.close(); } catch(e2) {} resolve(null); }
      };
      req.onerror = function(){ resolve(null); };
      req.onblocked = function(){ resolve(null); };
    } catch(e) { resolve(null); }
  });
}
function _swCheckinFlush(){
  return _swIdb('readonly', function(st){ return st.get('unispace_checkin_sync'); }).then(function(raw){
    var pend = null;
    try { pend = JSON.parse(raw || 'null'); } catch(e) {}
    if (!pend || !pend.url) return null;
    return fetch(pend.url + '&sw=1&_=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ return r.text(); })
      .then(function(txt){
        var res = null;
        try { res = JSON.parse(txt); } catch(e) {}
        var done = res && (res.ok === true || (res.msg && String(res.msg).indexOf('이미') >= 0));
        if (!done) throw new Error('checkin not accepted');   // the browser retries the sync later
        return _swIdb('readwrite', function(st){ return st.delete('unispace_checkin_sync'); });
      });
  });
}
self.addEventListener('sync', function(e){
  if (e.tag === 'unispace-checkin') e.waitUntil(_swCheckinFlush());
});
