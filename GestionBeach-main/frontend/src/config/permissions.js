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
  16: 'administrador',
  17: 'encargada_turno_lord'
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
  },

  encargada_turno_lord: {
    // Encargada de Turno Lord: Ventas y productos
    modules: [
      MODULES.VENTAS,
      MODULES.PRODUCTOS,
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update]
  }
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

  // Obtener perfil del usuario
  const profileKey = PROFILE_MAP[user.perfilId];
  const permissions = PERMISSIONS_BY_PROFILE[profileKey];

  if (!permissions) {
    console.warn(`Perfil no encontrado para perfilId: ${user.perfilId}`);
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
  // RUTAS PÚBLICAS (accesibles para TODOS los usuarios autenticados)
  const publicRoutes = ['/welcome'];
  if (publicRoutes.includes(route)) {
    return true;
  }

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
    '/dashboard/productos': MODULES.PRODUCTOS,
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
    '/productos': MODULES.PRODUCTOS,
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