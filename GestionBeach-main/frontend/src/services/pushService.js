import api from '../api/api';

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registrarPushNotificaciones() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] No soportado en este navegador');
    return false;
  }

  try {
    // Pedir permiso solo si no está decidido
    if (Notification.permission === 'denied') return false;
    if (Notification.permission !== 'granted') {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') return false;
    }

    // Registrar service worker
    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    // Obtener clave pública VAPID del servidor
    const { data } = await api.get('/push/vapid-public-key');
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Enviar suscripción al backend
    await api.post('/push/subscribe', subscription.toJSON());
    console.log('[Push] Suscripción registrada');
    return true;
  } catch (err) {
    console.error('[Push] Error al registrar:', err);
    return false;
  }
}

export async function cancelarPushNotificaciones() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('[Push] Error al cancelar:', err);
  }
}
