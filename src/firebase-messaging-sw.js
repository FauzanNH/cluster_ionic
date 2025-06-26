// Firebase Service Worker for Background Notifications

importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC0H9zSOATNOrwSqLuCPRay-2RaZIlXQ0I",
  authDomain: "buana-asri-cluster.firebaseapp.com",
  projectId: "buana-asri-cluster",
  storageBucket: "buana-asri-cluster.firebasestorage.app",
  messagingSenderId: "331708364468",
  appId: "1:331708364468:web:7ffa4b2cfa2ce756f5c9e1"
});

const messaging = firebase.messaging();

// Menangani notifikasi background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title || 'Notifikasi Baru';
  const notificationOptions = {
    body: payload.notification.body || 'Anda menerima notifikasi baru',
    icon: './assets/icons/icon-72x72.png',
    badge: './assets/icons/badge-icon.png',
    data: payload.data || {},
    tag: 'notification-' + Date.now() // Unique tag untuk setiap notifikasi
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Menangani klik notifikasi
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click: ', event);
  
  event.notification.close();
  
  // Handle navigation ketika notifikasi diklik
  if (event.notification.data && event.notification.data.halaman) {
    // Buka halaman tertentu berdasarkan data notifikasi
    const urlToOpen = new URL(event.notification.data.halaman, self.location.origin).href;
    
    const promiseChain = clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((windowClients) => {
      // Cek apakah ada window/tab yang sudah terbuka
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Jika tidak ada window yang terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    });
    
    event.waitUntil(promiseChain);
  }
}); 