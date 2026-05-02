// Service Worker para Web Push Notifications
self.addEventListener('push', (event) => {
  let data = { titulo: 'GestionBeach', mensaje: 'Tienes una nueva notificación', ruta: '/' };
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}

  const options = {
    body: data.mensaje || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: { url: data.ruta || '/' },
    actions: [{ action: 'open', title: 'Ver' }],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.titulo || 'GestionBeach', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
