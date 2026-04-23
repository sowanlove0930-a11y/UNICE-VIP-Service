// 보험청구 케어맵 Service Worker
const CACHE_NAME = 'coverage-caremap-v1';
const CACHE_FILES = [
  '/coverage.html',
  '/icon-192.png',
  '/icon-512.png'
];

// 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// 활성화 (구버전 캐시 삭제)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 요청 처리 (네트워크 우선, 실패 시 캐시)
self.addEventListener('fetch', event => {
  // API 요청은 캐시 사용 안 함
  if (event.request.url.includes('anthropic.com') || 
      event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공 시 캐시 업데이트
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시 사용
        return caches.match(event.request);
      })
  );
});
