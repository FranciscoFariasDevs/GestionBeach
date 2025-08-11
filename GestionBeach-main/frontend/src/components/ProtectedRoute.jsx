// frontend/src/components/ProtectedRoute.jsx - COMPONENTE PARA PROTEGER RUTAS
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const ProtectedRoute = ({ children, requiredModule, fallbackPath = '/dashboard' }) => {
  const { isAuthenticated, loading, hasAccessByName, user } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          flexDirection: 'column'
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verificando permisos...</Typography>
      </Box>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se especifica un módulo requerido, verificar acceso
  if (requiredModule) {
    const tieneAcceso = hasAccessByName(requiredModule);
    
    if (!tieneAcceso) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">
            <Typography variant="h6">Acceso Denegado</Typography>
            <Typography>
              No tienes permisos para acceder al módulo "{requiredModule}".
              Contacta al administrador si necesitas acceso a esta funcionalidad.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Usuario: <strong>{user?.username}</strong>
              </Typography>
              <Typography variant="body2">
                Perfil: <strong>{user?.perfil_nombre || 'Sin perfil asignado'}</strong>
              </Typography>
            </Box>
          </Alert>
        </Box>
      );
    }
  }

  // Si tiene acceso, mostrar el componente
  return children;
};

export default ProtectedRoute;