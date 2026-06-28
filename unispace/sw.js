// UNISPACE Service Worker
// 목적: PWA 설치 요건 충족 + 앱 아이콘/매니페스트 캐시.
// 데이터(고객/업적 등)는 항상 최신이어야 하므로 네트워크 우선 전략을 사용합니다.

var CACHE_NAME = 'unispace-v3';
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

  // 네트워크 우선: 항상 최신 데이터. 실패 시에만 캐시.
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
