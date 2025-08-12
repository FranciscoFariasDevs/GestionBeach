// frontend/src/config/permissions.js
import { AbilityBuilder, Ability } from '@casl/ability';

// Definir todos los módulos del sistema
export const MODULES = {
  DASHBOARD: 'dashboard',
  ESTADO_RESULTADO: 'estado-resultado',
  MONITOREO: 'monitoreo',
  REMUNERACIONES: 'remuneraciones',
  INVENTARIO: 'inventario',
  VENTAS: 'ventas',
  PRODUCTOS: 'productos',
  COMPRAS: 'compras',
  TARJETA_EMPLEADO: 'tarjeta-empleado',
  EMPLEADOS: 'empleados',
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
      MODULES.COMPRAS,
      MODULES.TARJETA_EMPLEADO,
      MODULES.EMPLEADOS,
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
      MODULES.CORREO
    ],
    actions: [ACTIONS.read, ACTIONS.create, ACTIONS.update]
  },
  
  solo_lectura: {
    // Solo Lectura: Solo consulta
    modules: [
      MODULES.DASHBOARD
    ],
    actions: [ACTIONS.read]
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
  // Mapear rutas a módulos
  const routeToModule = {
    '/dashboard': MODULES.DASHBOARD,
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
    '/tarjeta-empleado': MODULES.TARJETA_EMPLEADO,
    '/empleados': MODULES.EMPLEADOS,
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