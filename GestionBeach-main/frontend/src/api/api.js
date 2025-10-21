// frontend/src/api/api.js
import axios from 'axios';

// ✅ FUNCIÓN PARA DETECTAR LA URL DEL BACKEND AUTOMÁTICAMENTE
const getBackendURL = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  console.log(`🔍 Frontend ejecutándose en: ${hostname}:${port}`);
  
  /*switch (hostname) {
    case 'localhost':
    case '127.0.0.1':
      console.log('🏠 Modo desarrollo local');
      return 'http://localhost:5000/api';
      
    case '192.168.100.150':
      console.log('🏠 Acceso desde red local');
      return 'http://192.168.100.150:5000/api';
      
    case '190.102.248.163':
      console.log('🌐 Acceso desde internet público');
      return 'http://190.102.248.163:5000/api';
      
      case 'http://intranet.beach.cl':
      console.log('🌐 Acceso desde internet público');
      return 'http://intranet.beach.cl:5000/api';
      
    default:
      console.log(`⚠️ Hostname desconocido: ${hostname}, usando backend local`);
      return 'http://192.168.100.150:5000/api';
  }*/

      switch (hostname) {
  case 'localhost':
  case '127.0.0.1':
    console.log('🏠 Modo desarrollo local');
    return 'http://localhost:5000/api';

  case '192.168.100.150':
    console.log('🏠 Acceso desde red local');
    return 'http://192.168.100.150:5000/api';

  case 'intranet.beach.cl':
    console.log('🌐 Acceso desde intranet.beach.cl');
    return 'https://api.beach.cl/api'; // ⚠️ apunta al backend por dominio

      case 'reservas.beach.cl':
    console.log('🌐 Acceso desde intranet.beach.cl');
    return 'https://api.beach.cl/api'; // ⚠️ apunta al backend por dominio

  default:
    console.log(`⚠️ Hostname desconocido: ${hostname}, usando backend local`);
    return 'http://192.168.100.150:5000/api';
}
};

// URL del backend con detección automática
const API_URL = process.env.REACT_APP_API_URL || getBackendURL();

console.log(`🔧 API_URL configurada: ${API_URL}`);

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
    '/inventario/test'
  ];
  
  return !publicRoutes.some(route => url.includes(route));
};

// ✅ Interceptor de request mejorado
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Solo agregar token si la ruta lo requiere
    if (requiresAuth(config.url) && token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token agregado a la request');
    } else if (requiresAuth(config.url) && !token) {
      console.warn('⚠️ Ruta requiere autenticación pero no hay token');
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
  (response) => {
    console.log(`✅ API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    };
    
    console.error('❌ API Error:', errorInfo);
    
    // Manejo específico de errores de autenticación
    if (error.response?.status === 401) {
      console.error('🚫 Error 401: Token inválido o expirado');
      localStorage.removeItem('token');
      
      // Redireccionar al login si no estamos ya ahí
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      console.error('🚫 Error 403: Sin permisos para esta operación');
    }
    
    // Diagnósticos específicos
    if (error.message === 'Network Error') {
      console.error('🚫 DIAGNÓSTICO: Posibles causas:');
      console.error('   - Backend no está corriendo');
      console.error('   - Puerto bloqueado por firewall');
      console.error('   - CORS mal configurado');
      console.error('   - Port forwarding incorrecto');
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
    console.log('🔓 Usuario deslogueado');
  },
  
  // Login (guardar token)
  login: (token) => {
    localStorage.setItem('token', token);
    console.log('🔐 Usuario logueado');
  },
  
  // Verificar si una ruta específica requiere auth
  requiresAuth: requiresAuth
};

export default api;