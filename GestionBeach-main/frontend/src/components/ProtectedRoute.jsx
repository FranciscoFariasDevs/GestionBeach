// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock as LockIcon, Home as HomeIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// Componente para mostrar cuando no hay permisos
const NoPermissionsPage = ({ requiredRoute }) => {
  const { user } = useAuth();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        p: 3
      }}
    >
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          textAlign: 'center', 
          maxWidth: 500,
          borderRadius: 2
        }}
      >
        <LockIcon 
          sx={{ 
            fontSize: 64, 
            color: 'warning.main', 
            mb: 2 
          }} 
        />
        
        <Typography variant="h5" gutterBottom color="text.primary">
          Acceso Restringido
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          No tienes permisos para acceder a esta sección del sistema.
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Tu perfil actual: <strong>{user?.perfil || 'No definido'}</strong>
        </Typography>
        
        <Typography variant="caption" color="text.disabled" paragraph>
          Ruta solicitada: {requiredRoute}
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => window.location.href = '/dashboard'}
          sx={{ mt: 2 }}
        >
          Volver al Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

// Componente principal ProtectedRoute
const ProtectedRoute = ({ children, requireAuth = true, requiredRoute = null }) => {
  const { user, loading } = useAuth();
  const { canAccess } = usePermissions();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}
      >
        <Typography>Cargando...</Typography>
      </Box>
    );
  }

  // Si requiere autenticación y no hay usuario, redirigir a login
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se especifica una ruta requerida, verificar permisos
  if (requiredRoute && user) {
    const hasAccess = canAccess(requiredRoute);
    
    if (!hasAccess) {
      return <NoPermissionsPage requiredRoute={requiredRoute} />;
    }
  }

  // Si se pasa la ruta actual como verificación automática
  if (user && !requiredRoute) {
    const currentRoute = location.pathname;
    const hasAccess = canAccess(currentRoute);
    
    // Para rutas no mapeadas o acceso permitido, mostrar contenido
    if (currentRoute === '/' || currentRoute === '/dashboard' || hasAccess) {
      return children;
    }
    
    // Sin acceso a la ruta actual
    return <NoPermissionsPage requiredRoute={currentRoute} />;
  }

  // Renderizar children si pasa todas las verificaciones
  return children;
};

// HOC para proteger componentes específicos
export const withPermissions = (WrappedComponent, requiredModule = null, requiredAction = 'read') => {
  return function ProtectedComponent(props) {
    const { can, MODULES, ACTIONS } = usePermissions();
    
    if (requiredModule && !can(ACTIONS[requiredAction], MODULES[requiredModule])) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="warning.main">
            Sin permisos para acceder a este módulo
          </Typography>
        </Box>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Componente para proteger secciones dentro de una página
export const ProtectedSection = ({ 
  children, 
  module, 
  action = 'read', 
  fallback = null,
  hideIfNoAccess = false 
}) => {
  const { can, MODULES, ACTIONS } = usePermissions();
  
  const hasAccess = can(ACTIONS[action], MODULES[module]);
  
  if (!hasAccess) {
    if (hideIfNoAccess) {
      return null;
    }
    
    return fallback || (
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Sección restringida
        </Typography>
      </Box>
    );
  }
  
  return children;
};

export default ProtectedRoute;