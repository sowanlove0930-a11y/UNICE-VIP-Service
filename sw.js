// 캐시 버전 업 → 모든 기기 강제 초기화
const CACHE = 'unice-v5';
self.addEventListener('install', e => {
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  // 이전 캐시 전부 삭제
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
// 모든 요청 항상 네트워크에서 가져옴 (캐시 사용 안 함)
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
