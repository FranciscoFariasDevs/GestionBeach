// frontend/src/hooks/usePermissions.js
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { defineAbilitiesFor, canAccessRoute, ACTIONS, MODULES } from '../config/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  // Crear las habilidades basadas en el usuario actual
  const ability = useMemo(() => {
    return defineAbilitiesFor(user);
  }, [user]);

  // Funciones de conveniencia para verificar permisos
  const can = (action, module) => ability.can(action, module);
  const cannot = (action, module) => ability.cannot(action, module);

  // Verificar acceso a rutas específicas
  const canAccess = (route) => canAccessRoute(ability, route);

  // Verificar si puede leer un módulo específico
  const canRead = (module) => can(ACTIONS.read, module);

  // Verificar si puede crear en un módulo específico
  const canCreate = (module) => can(ACTIONS.create, module);

  // Verificar si puede actualizar en un módulo específico
  const canUpdate = (module) => can(ACTIONS.update, module);

  // Verificar si puede eliminar en un módulo específico
  const canDelete = (module) => can(ACTIONS.delete, module);

  // Verificar si tiene control total sobre un módulo
  const canManage = (module) => can(ACTIONS.manage, module);

  // Verificar si es Super Admin o Administrador
  const isSuperUser = () => {
    if (!user) return false;
    return user.username === "NOVLUI" || 
           user.perfilId === 10 || // Super Admin
           user.perfilId === 16;   // Administrador
  };

  // Verificar perfil específico
  const hasProfile = (profileName) => {
    if (!user || !user.perfilId) return false;
    
    const profileMap = {
      'super_admin': [10],
      'administrador': [16],
      'gerencia': [11],
      'finanzas': [12],
      'recursos_humanos': [13],
      'jefe_local': [14],
      'solo_lectura': [15]
    };

    return profileMap[profileName]?.includes(user.perfilId) || false;
  };

  // Obtener todos los módulos accesibles para el usuario actual
  const getAccessibleModules = () => {
    if (!user) return [];
    
    return Object.values(MODULES).filter(module => 
      canRead(module)
    );
  };

  // Verificar acceso a módulos específicos del sistema
  const moduleAccess = {
    dashboard: () => canRead(MODULES.DASHBOARD),
    estadoResultado: () => canRead(MODULES.ESTADO_RESULTADO),
    monitoreo: () => canRead(MODULES.MONITOREO),
    remuneraciones: () => canRead(MODULES.REMUNERACIONES),
    inventario: () => canRead(MODULES.INVENTARIO),
    ventas: () => canRead(MODULES.VENTAS),
    productos: () => canRead(MODULES.PRODUCTOS),
    compras: () => canRead(MODULES.COMPRAS),
    tarjetaEmpleado: () => canRead(MODULES.TARJETA_EMPLEADO),
    empleados: () => canRead(MODULES.EMPLEADOS),
    usuarios: () => canRead(MODULES.USUARIOS),
    perfiles: () => canRead(MODULES.PERFILES),
    modulos: () => canRead(MODULES.MODULOS),
    configuracion: () => canRead(MODULES.CONFIGURACION),
    correo: () => canRead(MODULES.CORREO)
  };

  return {
    // Objeto ability principal de CASL
    ability,
    
    // Funciones básicas
    can,
    cannot,
    canAccess,
    
    // Acciones específicas
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canManage,
    
    // Utilidades
    isSuperUser,
    hasProfile,
    getAccessibleModules,
    
    // Acceso a módulos específicos
    moduleAccess,
    
    // Constantes útiles
    ACTIONS,
    MODULES
  };
};

export default usePermissions;