// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perfiles, setPerfiles] = useState([]);
  const [modulos, setModulos] = useState([]);

  // Verificar si hay un token al iniciar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Configurar token en las cabeceras
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verificar si el token es válido
          const response = await api.get('/auth/check');
          
          if (response.data.authenticated) {
            setUser(response.data.user);
            
            // Cargar perfiles y módulos si el usuario está autenticado
            try {
              const perfilesResponse = await api.get('/perfiles');
              setPerfiles(perfilesResponse.data);
              
              const modulosResponse = await api.get('/modulos');
              setModulos(modulosResponse.data);
            } catch (error) {
              console.error('Error al cargar perfiles o módulos:', error);
            }
          } else {
            // Token inválido, eliminar
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        } catch (error) {
          console.error('Error al verificar autenticación:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Función para iniciar sesión
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      const { token, user } = response.data;
      
      // Guardar token en localStorage
      localStorage.setItem('token', token);
      
      // Configurar token en las cabeceras
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Guardar información del usuario
      setUser(user);
      
      // Cargar perfiles y módulos después de iniciar sesión
      try {
        const perfilesResponse = await api.get('/perfiles');
        setPerfiles(perfilesResponse.data);
        
        const modulosResponse = await api.get('/modulos');
        setModulos(modulosResponse.data);
      } catch (error) {
        console.error('Error al cargar perfiles o módulos:', error);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Usuario o contraseña incorrecta'
      };
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Eliminar token y usuario independientemente del resultado
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setPerfiles([]);
      setModulos([]);
    }
  };

  // Verificar si el usuario tiene acceso a un módulo por ID
  const hasAccess = (moduleId) => {
    // Excepción para el usuario NOVLUI - siempre tiene acceso a todo
    if (user && user.username === "NOVLUI") return true;
    
    // Verificación normal para otros usuarios
    if (!user || !user.modules) return false;
    return user.modules.includes(parseInt(moduleId));
  };

  // Verificar si el usuario tiene acceso a una ruta específica
  const hasRouteAccess = (route) => {
    // Excepción para el usuario NOVLUI - siempre tiene acceso a todas las rutas
    if (user && user.username === "NOVLUI") return true;
    
    // Verificación normal para otros usuarios
    if (!user || !user.modules || !modulos.length) return false;
    
    // Encontrar el módulo correspondiente a la ruta
    const modulo = modulos.find(m => m.ruta === route);
    if (!modulo) return false;
    
    // Verificar si el usuario tiene acceso a ese módulo
    return user.modules.includes(modulo.id);
  };

  // Obtener el perfil del usuario actual
  const getUserPerfil = () => {
    if (!user || !user.perfilId || !perfiles.length) return null;
    return perfiles.find(p => p.id === user.perfilId);
  };

  const value = {
    user,
    loading,
    perfiles,
    modulos,
    login,
    logout,
    hasAccess,
    hasRouteAccess,
    getUserPerfil,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;