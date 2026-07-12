/* UNICE 서포터즈 PWA Service Worker */
var CACHE_NAME = "unice-sup-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME){ return caches.delete(k); }
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var url = e.request.url;
  /* GAS API, 구글, 외부 동적 데이터는 항상 네트워크 (캐시 금지) */
  if(url.indexOf("script.google.com") > -1 || url.indexOf("googleusercontent") > -1){
    return;
  }
  /* 명함 이미지(cards) 는 네트워크 우선, 실패 시 캐시 */
  if(url.indexOf("/cards/") > -1){
    e.respondWith(
      fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }
  /* 나머지 앱 셸: 캐시 우선, 없으면 네트워크 */
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        return res;
      });
    })
  );
});
