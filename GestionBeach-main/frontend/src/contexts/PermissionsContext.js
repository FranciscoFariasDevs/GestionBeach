// frontend/src/contexts/PermissionsContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/api';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions debe ser usado dentro de PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userModules, setUserModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar módulos del usuario actual
  const loadUserModules = async () => {
    if (!user?.id || !isAuthenticated) {
      setUserModules([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando módulos para usuario:', user.id);
      
      // Obtener información completa del usuario incluyendo módulos
      const response = await api.get(`/usuarios/${user.id}`);
      const userData = response.data;
      
      console.log('📋 Datos del usuario:', userData);
      
      if (userData.moduleNames && Array.isArray(userData.moduleNames)) {
        setUserModules(userData.moduleNames);
        console.log('✅ Módulos cargados:', userData.moduleNames);
      } else {
        console.warn('⚠️ Usuario sin módulos asignados');
        setUserModules([]);
      }
      
    } catch (error) {
      console.error('❌ Error cargando módulos del usuario:', error);
      setError('Error al cargar permisos');
      setUserModules([]);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambie el usuario
  useEffect(() => {
    loadUserModules();
  }, [user?.id, isAuthenticated]);

  // Verificar si el usuario tiene acceso a un módulo específico
  const hasModuleAccess = (moduleName) => {
    if (!moduleName) return false;
    
    // Los administradores tienen acceso a todo
    if (user?.perfil_nombre === 'Administrador' || user?.perfil_id === 1) {
      return true;
    }
    
    // Verificar si el módulo está en la lista de módulos del usuario
    const hasAccess = userModules.includes(moduleName);
    
    console.log(`🔐 Verificando acceso a "${moduleName}":`, hasAccess);
    return hasAccess;
  };

  // Verificar acceso a múltiples módulos
  const hasAnyModuleAccess = (moduleNames) => {
    if (!Array.isArray(moduleNames)) return false;
    return moduleNames.some(name => hasModuleAccess(name));
  };

  // Filtrar elementos del menú basado en permisos
  const filterMenuItems = (menuItems) => {
    if (!Array.isArray(menuItems)) return [];
    
    return menuItems.filter(item => {
      // Si es administrador, mostrar todo
      if (user?.perfil_nombre === 'Administrador' || user?.perfil_id === 1) {
        return true;
      }
      
      // Si tiene submenú, verificar si tiene acceso a algún subitem
      if (item.subItems && Array.isArray(item.subItems)) {
        const hasSubAccess = item.subItems.some(subItem => 
          hasModuleAccess(subItem.moduleName || subItem.text)
        );
        return hasSubAccess;
      }
      
      // Para elementos normales, verificar acceso directo
      const moduleName = item.moduleName || item.text;
      return hasModuleAccess(moduleName);
    });
  };

  // Recargar permisos manualmente
  const refreshPermissions = () => {
    loadUserModules();
  };

  const value = {
    userModules,
    loading,
    error,
    hasModuleAccess,
    hasAnyModuleAccess,
    filterMenuItems,
    refreshPermissions
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};