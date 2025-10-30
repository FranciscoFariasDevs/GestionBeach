// frontend/src/config/permissions.js
import { AbilityBuilder, Ability } from '@casl/ability';

// Definir todos los módulos del sistema - SINCRONIZADO CON BACKEND
export const MODULES = {
  DASHBOARD: 'dashboard',
  ESTADO_RESULTADO: 'estado-resultado',
  MONITOREO: 'monitoreo',
  REMUNERACIONES: 'remuneraciones',
  INVENTARIO: 'inventario',
  VENTAS: 'ventas',
  PRODUCTOS: 'productos',
  SUPERMERCADOS: 'productos/supermercados',
  FERRETERIAS: 'productos/ferreterias',
  MULTITIENDAS: 'productos/multitiendas',
  COMPRAS: 'compras',
  CENTROS_COSTOS: 'compras/centros-costos',
  FACTURAS_XML: 'compras/facturas-xml',
  TARJETA_EMPLEADO: 'tarjeta-empleado',
  EMPLEADOS: 'empleados',
  CABANAS: 'admin/cabanas',
  USUARIOS: 'usuarios',
  PERFILES: 'perfiles',
  MODULOS: 'modulos',
  CONFIGURACION: 'configuracion',
  CORREO: 'correo-electronico'
};

// Definir acciones
export const ACTIONS = {
  READ: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'manage' // Equivale a todas las acciones
};

// Mapeo de perfiles por ID (basado en tu BD)
export const PROFILE_MAP = {
  10: 'super_admin',
  11: 'gerencia', 
  12: 'finanzas',
  13: 'recursos_humanos',
  14: 'jefe_local',
  15: 'solo_lectura',
  16: 'administrador'
};

// Definir permisos por perfil
export const PERMISSIONS_BY_PROFILE = {
  super_admin: {
    // Super Admin: Acceso total
    modules: Object.values(MODULES),
    actions: [ACTIONS.manage] // Puede hacer todo
  },

  administrador: {
    // Administrador: Igual que Super Admin
    modules: Object.values(MODULES),
    actions: [ACTIONS.manage]
  },
  
  gerencia: {
    // Gerencia: Todo excepto configuración crítica de usuarios/perfiles
    modules: [
      MODULES.DASHBOARD,
      MODULES.ESTADO_RESULTADO,
      MODULES.MONITOREO,
      MODULES.REMUNERACIONES,
      MODULES.INVENTARIO,
      MODULES.VENTAS,
      MODULES.PRODUCTOS,
      MODULES.SUPERMERCADOS,
      MODULES.FERRETERIAS,
      MODULES.MULTITIENDAS,
      MODULES.COMPRAS,
      MODULES.CENTROS_COSTOS,
      MODULES.FACTURAS_XML,
      MODULES.TARJETA_EMPLEADO,
      MODULES.EMPLEADOS,
      MODULES.CABANAS,
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update, ACTIONS.delete]
  },

  finanzas: {
    // Finanzas: Módulos financieros y contables
    modules: [
      MODULES.DASHBOARD,
      MODULES.ESTADO_RESULTADO,
      MODULES.REMUNERACIONES,
      MODULES.COMPRAS,
      MODULES.CENTROS_COSTOS,
      MODULES.FACTURAS_XML,
      MODULES.CABANAS,
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update]
  },

  recursos_humanos: {
    // RRHH: Gestión de personal
    modules: [
      MODULES.DASHBOARD,
      MODULES.EMPLEADOS,
      MODULES.REMUNERACIONES,
      MODULES.TARJETA_EMPLEADO,
      MODULES.CABANAS,
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update]
  },

  jefe_local: {
    // Jefe de Local: Operaciones diarias
    modules: [
      MODULES.DASHBOARD,
      MODULES.VENTAS,
      MODULES.INVENTARIO,
      MODULES.PRODUCTOS,
      MODULES.SUPERMERCADOS,
      MODULES.FERRETERIAS,
      MODULES.MULTITIENDAS,
      MODULES.MONITOREO,
      MODULES.CABANAS,
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update]
  },

  solo_lectura: {
    // Solo Lectura: Solo consulta
    modules: [
      MODULES.DASHBOARD,
      MODULES.CABANAS
    ],
    actions: [ACTIONS.read]
  }
};

// Mapeo de nombres de módulos desde BD a rutas del sistema
const MODULE_NAME_TO_ROUTE = {
  'Dashboard': MODULES.DASHBOARD,
  'Estado Resultado': MODULES.ESTADO_RESULTADO,
  'Monitoreo': MODULES.MONITOREO,
  'Remuneraciones': MODULES.REMUNERACIONES,
  'Inventario': MODULES.INVENTARIO,
  'Ventas': MODULES.VENTAS,
  'Productos': MODULES.PRODUCTOS,
  'Supermercados': MODULES.SUPERMERCADOS,
  'Ferreterías': MODULES.FERRETERIAS,
  'Multitiendas': MODULES.MULTITIENDAS,
  'Compras': MODULES.COMPRAS,
  'Centros de Costos': MODULES.CENTROS_COSTOS,
  'Facturas XML': MODULES.FACTURAS_XML,
  'Tarjeta Empleado': MODULES.TARJETA_EMPLEADO,
  'Empleados': MODULES.EMPLEADOS,
  'Cabañas': MODULES.CABANAS,
  'Usuarios': MODULES.USUARIOS,
  'Perfiles': MODULES.PERFILES,
  'Módulos': MODULES.MODULOS,
  'Configuración': MODULES.CONFIGURACION,
  'Correo Electrónico': MODULES.CORREO
};

// Función para crear habilidades basadas en el perfil del usuario
export function defineAbilitiesFor(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (!user || !user.perfilId) {
    // Usuario sin perfil - sin permisos
    return build();
  }

  // Excepción especial para NOVLUI - acceso total
  if (user.username === "NOVLUI") {
    can(ACTIONS.manage, Object.values(MODULES));
    return build();
  }

  // NUEVO SISTEMA: Usar módulos que vienen desde el backend
  if (user.modules && Array.isArray(user.modules) && user.modules.length > 0) {
    console.log(`✅ Aplicando permisos desde módulos del backend:`, user.modules);

    // Convertir nombres de módulos de BD a rutas del sistema
    user.modules.forEach(moduleName => {
      const moduleRoute = MODULE_NAME_TO_ROUTE[moduleName];
      if (moduleRoute) {
        can(ACTIONS.READ, moduleRoute);
        can(ACTIONS.create, moduleRoute);
        can(ACTIONS.update, moduleRoute);
        can(ACTIONS.delete, moduleRoute);
      } else {
        console.warn(`⚠️ Módulo "${moduleName}" no mapeado a ruta`);
      }
    });

    // Siempre agregar Correo Electrónico para todos
    can(ACTIONS.READ, MODULES.CORREO);

    return build();
  }

  // FALLBACK: Sistema antiguo con PROFILE_MAP (para compatibilidad)
  const profileKey = PROFILE_MAP[user.perfilId];
  const permissions = PERMISSIONS_BY_PROFILE[profileKey];

  if (!permissions) {
    console.warn(`⚠️ Perfil ${user.perfilId} no encontrado en mapeo ni tiene módulos desde backend`);
    // Solo dar acceso a Dashboard y Correo
    can(ACTIONS.READ, MODULES.DASHBOARD);
    can(ACTIONS.READ, MODULES.CORREO);
    return build();
  }

  // Aplicar permisos según el perfil
  permissions.actions.forEach(action => {
    permissions.modules.forEach(module => {
      can(action, module);
    });
  });

  return build();
}

// Función auxiliar para verificar si un usuario puede acceder a una ruta
export function canAccessRoute(ability, route) {
  // Mapear rutas a módulos (CON Y SIN /dashboard/)
  const routeToModule = {
    // Rutas principales
    '/': MODULES.DASHBOARD,
    '/dashboard': MODULES.DASHBOARD,

    // Rutas con prefijo /dashboard/
    '/dashboard/estado-resultado': MODULES.ESTADO_RESULTADO,
    '/dashboard/monitoreo': MODULES.MONITOREO,
    '/dashboard/remuneraciones': MODULES.REMUNERACIONES,
    '/dashboard/inventario': MODULES.INVENTARIO,
    '/dashboard/ventas': MODULES.VENTAS,
    '/dashboard/productos/supermercados': MODULES.PRODUCTOS,
    '/dashboard/productos/ferreterias': MODULES.PRODUCTOS,
    '/dashboard/productos/multitiendas': MODULES.PRODUCTOS,
    '/dashboard/compras/centros-costos': MODULES.COMPRAS,
    '/dashboard/compras/facturas-xml': MODULES.COMPRAS,
    '/dashboard/compras/registro-compras': MODULES.COMPRAS,
    '/dashboard/tarjeta-empleado': MODULES.TARJETA_EMPLEADO,
    '/dashboard/empleados': MODULES.EMPLEADOS,
    '/dashboard/admin/cabanas': MODULES.CABANAS,
    '/dashboard/usuarios': MODULES.USUARIOS,
    '/dashboard/perfiles': MODULES.PERFILES,
    '/dashboard/modulos': MODULES.MODULOS,
    '/dashboard/configuracion': MODULES.CONFIGURACION,

    // Rutas sin prefijo /dashboard/ (para compatibilidad)
    '/estado-resultado': MODULES.ESTADO_RESULTADO,
    '/monitoreo': MODULES.MONITOREO,
    '/remuneraciones': MODULES.REMUNERACIONES,
    '/inventario': MODULES.INVENTARIO,
    '/ventas': MODULES.VENTAS,
    '/productos/supermercados': MODULES.PRODUCTOS,
    '/productos/ferreterias': MODULES.PRODUCTOS,
    '/productos/multitiendas': MODULES.PRODUCTOS,
    '/compras/centros-costos': MODULES.COMPRAS,
    '/compras/facturas-xml': MODULES.COMPRAS,
    '/compras/registro-compras': MODULES.COMPRAS,
    '/tarjeta-empleado': MODULES.TARJETA_EMPLEADO,
    '/empleados': MODULES.EMPLEADOS,
    '/admin/cabanas': MODULES.CABANAS,
    '/usuarios': MODULES.USUARIOS,
    '/perfiles': MODULES.PERFILES,
    '/modulos': MODULES.MODULOS,
    '/configuracion': MODULES.CONFIGURACION
  };

  const module = routeToModule[route];
  return module ? ability.can(ACTIONS.read, module) : false;
}

// Función para filtrar elementos del menú según permisos
export function filterMenuItems(ability, menuItems) {
  return menuItems.filter(item => {
    if (item.isSubmenu) {
      // Para submenús, filtrar subelementos
      const filteredSubItems = item.subItems?.filter(subItem => 
        canAccessRoute(ability, subItem.path)
      ) || [];
      
      // Solo mostrar el submenú si tiene elementos accesibles
      if (filteredSubItems.length > 0) {
        item.subItems = filteredSubItems;
        return true;
      }
      return false;
    }
    
    // Para elementos normales, verificar acceso directo
    if (item.path) {
      return canAccessRoute(ability, item.path);
    }
    
    // Para elementos especiales (como correo), siempre mostrar
    if (item.action) {
      return true;
    }
    
    return false;
  });
}