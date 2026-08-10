/* UNICE PARTNERS service worker */
/* index는 network-first (배포 즉시 반영), 아이콘/manifest는 cache-first */
var CACHE_NAME = 'partnersapp-v1';
var STATIC_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './manifest.json'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c){ return c.addAll(STATIC_ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  /* GAS API 호출은 절대 캐시하지 않는다 */
  if (url.indexOf('script.google.com') >= 0) return;
  if (e.request.method !== 'GET') return;

  var isStatic = false;
  for (var i = 0; i < STATIC_ASSETS.length; i++) {
    if (url.indexOf(STATIC_ASSETS[i].replace('./', '/')) >= 0) { isStatic = true; break; }
  }

  if (isStatic) {
    /* cache-first */
    e.respondWith(
      caches.match(e.request).then(function(hit){
        return hit || fetch(e.request).then(function(res){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
          return res;
        });
      })
    );
    return;
  }

  /* index 및 기타: network-first, 오프라인 시 캐시 폴백 */
  e.respondWith(
    fetch(e.request).then(function(res){
      if (e.request.mode === 'navigate' && res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
      }
      return res;
    })['catch'](function(){
      return caches.match(e.request);
    })
  );
});
