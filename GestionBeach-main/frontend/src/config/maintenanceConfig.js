// ========================================
// 🔧 CONFIGURACIÓN DE MODO MANTENIMIENTO
// ========================================
//
// Para ACTIVAR el modo mantenimiento: cambia isMaintenanceMode a true
// Para DESACTIVAR el modo mantenimiento: cambia isMaintenanceMode a false
//
// 👉 INSTRUCCIONES:
// 1. Abre este archivo
// 2. Cambia el valor de isMaintenanceMode
// 3. Guarda el archivo
// 4. Recarga la página en el navegador
//
// ========================================

const maintenanceConfig = {
  // 🚦 CAMBIA ESTE VALOR PARA ACTIVAR/DESACTIVAR MANTENIMIENTO
  isMaintenanceMode: false,  // ✅ false = sitio normal | ⚠️ true = modo mantenimiento

  // Configuraciones adicionales
  message: 'Estamos en mantenimiento. Vuelve pronto.',
  estimatedTime: '5-10 minutos',

  // Lista de rutas que NO deben estar en mantenimiento (acceso siempre permitido)
  allowedRoutes: [
    '/admin',  // Ruta de administración siempre accesible
  ],
};

export default maintenanceConfig;
