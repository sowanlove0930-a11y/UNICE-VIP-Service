/* firebase-messaging-sw.js
 * UNISPACE 푸시 알림 수신 (백그라운드)
 *
 * ⚠️ 설정 필요(PC에서): 아래 firebaseConfig의 값들을
 *    Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 에서 복사해 채워주세요.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ▼▼▼ PC에서 Firebase 콘솔 값으로 교체 ▼▼▼
var firebaseConfig = {
  apiKey: "AIzaSyB0tI00fw7WgtYcjJJpp3EWrMh7LqpHqvY",
  authDomain: "unispace-push.firebaseapp.com",
  projectId: "unispace-push",
  storageBucket: "unispace-push.firebasestorage.app",
  messagingSenderId: "439181771310",
  appId: "1:439181771310:web:1174d0fab279d4d9f995bf"
};
// ▲▲▲ 여기까지 교체 ▲▲▲

firebase.initializeApp(firebaseConfig);
var messaging = firebase.messaging();

// 백그라운드(앱 안 보일 때) 푸시 수신 → 알림 표시
messaging.onBackgroundMessage(function(payload) {
  var data = payload.data || {};
  var note = payload.notification || {};
  var title = note.title || data.title || '🔔 UNISPACE 알림';
  var options = {
    body: note.body || data.body || '',
    icon: 'unispace-192.png',
    badge: 'unispace-192.png',
    tag: data.tag || 'unispace-today',
    data: { url: data.url || './index.html?open=today' },
    requireInteraction: false
  };
  self.registration.showNotification(title, options);
});

// 알림 탭 → 오늘의 알림 페이지로 (B안: index 경유 후 자동 열기)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './index.html?open=today';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 이미 열린 창이 있으면 그쪽으로 포커스 + 이동
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if ('focus' in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      // 없으면 새 창
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
