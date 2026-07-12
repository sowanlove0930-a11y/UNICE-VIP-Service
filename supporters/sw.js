/* UNICE 서포터즈 PWA Service Worker */
var CACHE_NAME = "unice-sup-v3";
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
  /* HTML 문서는 네트워크 우선: 항상 최신 버전을 먼저 가져오고, 오프라인일 때만 캐시 */
  if(e.request.mode === "navigate" || url.indexOf(".html") > -1 || url.indexOf("/cards/") > -1){
    e.respondWith(
      fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }
  /* 아이콘/매니페스트 등 정적 자원: 캐시 우선 (빠른 로딩) */
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); });
        return res;
      });
    })
  );
});
