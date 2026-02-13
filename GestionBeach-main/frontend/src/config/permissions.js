// frontend/src/config/permissions.js
import { AbilityBuilder, Ability } from '@casl/ability';

// Definir todos los módulos del sistema - claves de ruta
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
  SORTEO_CONCURSO: 'sorteo-concurso',
  CODIGOS_DESCUENTO: 'codigos-descuento',
  TICKETS: 'mis-tickets',
  USUARIOS: 'usuarios',
  PERFILES: 'perfiles',
  MODULOS: 'modulos',
  CONFIGURACION: 'configuracion',
  CORREO: 'correo-electronico',
  RECURSOS_HUMANOS: 'recursos-humanos',
  BOLETAS_FOLIOS: 'recursos-humanos/boletas-folios',
  RESUMEN_EJECUTIVO: 'recursos-humanos/resumen-ejecutivo',
  CONSULTAR_PRODUCTO: 'productos/consultar',
  ROTACION_FERRETERIAS: 'productos/rotacion-ferreterias',
  RENTABILIDAD: 'productos/rentabilidad',
  MARGENES: 'productos/margenes',
  GUIAS: 'productos/guias',
  RESUMEN_VALORIZADO: 'productos/resumen-valorizado',
  STOCKS: 'productos/stocks',
  ANULACIONES: 'productos/anulaciones',
  CARGAR_INVENTARIO: 'productos/cargar-inventario'
};

// Definir acciones
export const ACTIONS = {
  READ: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'manage'
};

// Función para crear habilidades basadas en los módulos del usuario (desde BD)
// user.modules = array de IDs de módulos
// modulosList = lista completa de {id, nombre, claves} desde /api/modulos
//
// Las "claves" vienen del archivo central backend/config/modulosConfig.js
// y se propagan automáticamente via la API. No hay mapeo hardcodeado aquí.
export function defineAbilitiesFor(user, modulosList) {
  const { can, cannot, build } = new AbilityBuilder(Ability);

  if (!user || !user.perfilId) {
    return build();
  }

  // Excepción especial para NOVLUI - acceso total
  if (user.username === "NOVLUI") {
    can(ACTIONS.manage, Object.values(MODULES));
    return build();
  }

  // SISTEMA DINÁMICO: usar módulos de la BD + claves del config central
  if (user.modules && user.modules.length > 0 && modulosList && modulosList.length > 0) {
    // Crear mapa ID → claves desde la lista de módulos
    const idToClaves = {};
    modulosList.forEach(m => {
      if (m.claves && m.claves.length > 0) {
        idToClaves[m.id] = m.claves;
      }
    });

    // Resolver IDs de módulos del usuario a claves del frontend
    const frontendModules = new Set();
    user.modules.forEach(modId => {
      const claves = idToClaves[modId];
      if (claves) {
        claves.forEach(clave => frontendModules.add(clave));
      }
    });

    // Aplicar permisos: read, create, update para todos los módulos resueltos
    const actions = [ACTIONS.READ, ACTIONS.create, ACTIONS.update];
    frontendModules.forEach(mod => {
      actions.forEach(action => can(action, mod));
    });

    return build();
  }

  // Sin módulos en BD - sin permisos
  console.warn(`Perfil ${user.perfilId} sin módulos asignados en la BD`);
  return build();
}

// Función auxiliar para verificar si un usuario puede acceder a una ruta
export function canAccessRoute(ability, route) {
  // RUTAS PÚBLICAS (accesibles para TODOS los usuarios autenticados)
  const publicRoutes = ['/welcome', '/mi-perfil'];
  if (publicRoutes.includes(route)) {
    return true;
  }

  // Mapear rutas a módulos (CON Y SIN /dashboard/)
  const routeToModule = {
    '/': MODULES.DASHBOARD,
    '/dashboard': MODULES.DASHBOARD,

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
    '/dashboard/sorteo-concurso': MODULES.SORTEO_CONCURSO,
    '/dashboard/codigos-descuento': MODULES.CODIGOS_DESCUENTO,
    '/dashboard/mis-tickets': MODULES.TICKETS,
    '/dashboard/usuarios': MODULES.USUARIOS,
    '/dashboard/perfiles': MODULES.PERFILES,
    '/dashboard/modulos': MODULES.MODULOS,
    '/dashboard/configuracion': MODULES.CONFIGURACION,

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
    '/sorteo-concurso': MODULES.SORTEO_CONCURSO,
    '/codigos-descuento': MODULES.CODIGOS_DESCUENTO,
    '/mis-tickets': MODULES.TICKETS,
    '/usuarios': MODULES.USUARIOS,
    '/perfiles': MODULES.PERFILES,
    '/modulos': MODULES.MODULOS,
    '/configuracion': MODULES.CONFIGURACION,

    '/dashboard/recursos-humanos/boletas-folios': MODULES.RECURSOS_HUMANOS,
    '/dashboard/recursos-humanos/resumen-ejecutivo': MODULES.RECURSOS_HUMANOS,
    '/recursos-humanos/boletas-folios': MODULES.RECURSOS_HUMANOS,
    '/recursos-humanos/resumen-ejecutivo': MODULES.RECURSOS_HUMANOS,

    '/dashboard/productos/consultar': MODULES.PRODUCTOS,
    '/productos/consultar': MODULES.PRODUCTOS,
    '/dashboard/productos/rotacion-ferreterias': MODULES.PRODUCTOS,
    '/productos/rotacion-ferreterias': MODULES.PRODUCTOS,
    '/dashboard/productos/rentabilidad': MODULES.PRODUCTOS,
    '/productos/rentabilidad': MODULES.PRODUCTOS,
    '/dashboard/productos/margenes': MODULES.PRODUCTOS,
    '/productos/margenes': MODULES.PRODUCTOS,
    '/dashboard/productos/guias': MODULES.PRODUCTOS,
    '/productos/guias': MODULES.PRODUCTOS,
    '/dashboard/productos/resumen-valorizado': MODULES.PRODUCTOS,
    '/productos/resumen-valorizado': MODULES.PRODUCTOS,
    '/dashboard/productos/stocks': MODULES.PRODUCTOS,
    '/productos/stocks': MODULES.PRODUCTOS,

    '/dashboard/productos/anulaciones': MODULES.PRODUCTOS,
    '/productos/anulaciones': MODULES.PRODUCTOS,

    '/dashboard/productos/cargar-inventario': MODULES.PRODUCTOS,
    '/productos/cargar-inventario': MODULES.PRODUCTOS
  };

  const module = routeToModule[route];
  return module ? ability.can(ACTIONS.READ, module) : false;
}

// Función para filtrar elementos del menú según permisos
export function filterMenuItems(ability, menuItems) {
  return menuItems.filter(item => {
    if (item.isSubmenu) {
      const filteredSubItems = item.subItems?.filter(subItem => {
        if (subItem.action) {
          return ability.can(ACTIONS.READ, MODULES.CORREO);
        }
        return canAccessRoute(ability, subItem.path);
      }) || [];

      if (filteredSubItems.length > 0) {
        item.subItems = filteredSubItems;
        return true;
      }
      return false;
    }

    if (item.path) {
      return canAccessRoute(ability, item.path);
    }

    if (item.action) {
      return ability.can(ACTIONS.READ, MODULES.CORREO);
    }

    return false;
  });
}
