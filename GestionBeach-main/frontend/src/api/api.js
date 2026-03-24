// frontend/src/api/api.js
import axios from 'axios';

// ✅ FUNCIÓN PARA DETECTAR LA URL DEL BACKEND AUTOMÁTICAMENTE
const getBackendURL = () => {
  const hostname = window.location.hostname;
  const isHTTPS  = window.location.protocol === 'https:';

  switch (hostname) {
    case 'localhost':
    case '127.0.0.1':
      // Dev local: siempre HTTP (localhost nunca fuerza HTTPS-Only en Firefox)
      return 'http://localhost:5000/api';

    case '192.168.100.150':
      // Red local:
      //   - HTTP  → backend directo en :5000 (desarrollo)
      //   - HTTPS → Firefox HTTPS-Only mode o Nginx con SSL → usar api.beach.cl (producción)
      return isHTTPS
        ? 'https://api.beach.cl/api'
        : 'http://192.168.100.150:5000/api';

    case 'intranet.beach.cl':
    case 'concurso.beach.cl':
    case 'reservas.beach.cl':
      return 'https://api.beach.cl/api';

    default:
      // Hostname desconocido: respetar el protocolo actual
      return isHTTPS
        ? 'https://api.beach.cl/api'
        : 'http://192.168.100.150:5000/api';
  }
};

// URL del backend con detección automática
const API_URL = process.env.REACT_APP_API_URL || getBackendURL();

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// ✅ FUNCIÓN PARA VERIFICAR SI HAY TOKEN
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      // Verificar si el token no está expirado (básico)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.warn('⚠️ Token expirado, removiendo...');
        localStorage.removeItem('token');
        return null;
      }
      
      return token;
    } catch (error) {
      console.warn('⚠️ Token inválido, removiendo...');
      localStorage.removeItem('token');
      return null;
    }
  }
  return null;
};

// ✅ FUNCIÓN PARA VERIFICAR SI LA RUTA REQUIERE AUTH
const requiresAuth = (url) => {
  // Rutas que NO requieren autenticación
  const publicRoutes = [
    '/ping',
    '/check-db',
    '/sucursales/test',
    '/sucursales/public',
    '/inventario/test',
    '/cabanas/cabanas',                   // 🏠 Obtener lista de cabañas (público)
    '/cabanas/reservas',                  // 📅 Obtener reservas (público para ver disponibilidad)
    '/cabanas/reservas/publico',          // 🌐 Crear reservas públicas
    '/cabanas/mantenciones/activas',      // 🔧 Obtener mantenciones activas (público)
    '/cabanas/tinajas',                   // 🛁 Obtener tinajas (público)
    '/cabanas/tinajas/reservas',          // 🛁 Reservas de tinajas (público)
    '/cabanas/disponibilidad',            // 📊 Verificar disponibilidad (público)
    '/webpay/',                           // 💳 Webpay (todas las rutas)
    '/codigos-descuento/validar',        // 🎫 Validar códigos de descuento
    '/codigos-descuento/incrementar-uso', // 🎫 Incrementar uso de códigos
    '/concurso-piscinas',                  // 🏊 Concurso público
     '/auth/login',         // 🔐 AGREGAR ESTA (CRÍTICO)
    '/auth/logout', 
  ];

  return !publicRoutes.some(route => url.includes(route));
};

// ✅ Interceptor de request mejorado
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    // Solo agregar token si la ruta lo requiere
    if (requiresAuth(config.url) && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Si el body es FormData, eliminar Content-Type para que el browser
    // lo genere automáticamente con el boundary correcto (multipart/form-data; boundary=...)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ Interceptor de response mejorado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo específico de errores de autenticación
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      console.error('🚫 Error 403: Sin permisos para esta operación');
    } else if (error.message === 'Network Error') {
      console.error('🚫 Network Error: backend no disponible o CORS mal configurado');
    }
    
    return Promise.reject(error);
  }
);

// ✅ FUNCIONES DE UTILIDAD PARA AUTENTICACIÓN
export const authUtils = {
  // Verificar si el usuario está logueado
  isAuthenticated: () => {
    return getAuthToken() !== null;
  },

  // Obtener token actual
  getToken: () => {
    return getAuthToken();
  },

  // Logout (limpiar token)
  logout: () => {
    localStorage.removeItem('token');
  },

  // Login (guardar token)
  login: (token) => {
    localStorage.setItem('token', token);
  },

  // Verificar si una ruta específica requiere auth
  requiresAuth: requiresAuth
};

// ✅ FUNCIÓN PARA CONSTRUIR URLs DE ARCHIVOS ESTÁTICOS (IMÁGENES, UPLOADS, ETC)
export const getStaticFileURL = (rutaArchivo) => {
  if (!rutaArchivo) return '';

  // URLs absolutas: si la página es HTTPS y la URL es HTTP → upgradear para evitar mixed content
  if (rutaArchivo.startsWith('http://') || rutaArchivo.startsWith('https://')) {
    if (window.location.protocol === 'https:' && rutaArchivo.startsWith('http://')) {
      return rutaArchivo.replace('http://', 'https://');
    }
    return rutaArchivo;
  }

  // Asegurarse de que la ruta comience con /
  const ruta = rutaArchivo.startsWith('/') ? rutaArchivo : `/${rutaArchivo}`;

  const hostname = window.location.hostname;
  const isHTTPS  = window.location.protocol === 'https:';

  // Construir la URL base correctamente según el entorno
  switch (hostname) {
    case 'localhost':
    case '127.0.0.1':
      return `http://localhost:5000${ruta}`;

    case '192.168.100.150':
      return isHTTPS
        ? `https://api.beach.cl${ruta}`
        : `http://192.168.100.150:5000${ruta}`;

    case 'intranet.beach.cl':
    case 'concurso.beach.cl':
    case 'reservas.beach.cl':
      return `https://api.beach.cl${ruta}`;

    default: {
      // Fallback: usar la baseURL de api removiendo /api
      const base = api.defaults.baseURL.replace('/api', '');
      // Upgradear a HTTPS si la página es HTTPS para evitar mixed content
      const safeBase = isHTTPS ? base.replace('http://', 'https://') : base;
      return `${safeBase}${ruta}`;
    }
  }
};

export default api;