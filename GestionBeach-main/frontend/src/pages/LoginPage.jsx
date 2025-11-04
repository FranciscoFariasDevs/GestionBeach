// frontend/src/pages/LoginPage.jsx - Actualizado
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
  Tooltip,
  Fab,
  Zoom,
  ClickAwayListener,
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  LockOutlined, 
  PersonOutline,
  Search,
  HeadsetMic, 
  AppsOutlined,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import logoImg from '../pages/logo.png';
import WeatherBar from '../components/WeatherBar'; // Importamos el componente de clima

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 450,
  width: '100%',
  padding: theme.spacing(3),
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  borderRadius: 16,
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
}));

const Logo = styled('img')(({ theme }) => ({
  width: 180,
  height: 'auto',
}));

// Contenedor para los botones flotantes con posición elevada
const FloatingButtonsContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 90, // Elevado para estar por encima del botón de Tawk
  right: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  zIndex: 10000,
}));

// Botón principal flotante (Apps) - Tamaño aumentado
const MainFloatingButton = styled(Fab)(({ theme }) => ({
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  width: 65, // Tamaño aumentado
  height: 65, // Tamaño aumentado
  zIndex: 10001, // Asegura que esté por encima de todo
}));

// Botones flotantes secundarios
const SecondaryFloatingButton = styled(Fab)(({ theme, show }) => ({
  marginBottom: theme.spacing(2),
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.3s ease',
  transform: show ? 'scale(1)' : 'scale(0)',
  opacity: show ? 1 : 0,
  height: 48,
  width: 48,
}));

// Estilo para el botón de soporte personalizado
const SoporteBoton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  fontWeight: 'bold',
  borderRadius: '30px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  backgroundColor: '#0078BE',
  '&:hover': {
    backgroundColor: '#005fa3',
  },
}));

// Componente CSS global para el estilo de Tawk.to
const TawkGlobalStyles = () => {
  const styles = `
    /* Ocultar o reposicionar el botón de Tawk.to */
    .tawk-min-container {
      bottom: 23px !important; /* Misma posición que nuestro botón, ligeramente más bajo */
      right: 23px !important;
      opacity: 0 !important; /* Invisible pero sigue funcionando */
      visibility: hidden !important;
      transform: scale(0.01) !important; /* Prácticamente invisible pero mantiene la funcionalidad */
      transform-origin: bottom right !important;
      height: 65px !important; /* Mismo tamaño que nuestro botón */
      width: 65px !important;
      overflow: hidden !important;
      border-radius: 50% !important;
    }
    
    /* Ocultar completamente el botón pero permitir que el contenedor funcione */
    .tawk-button {
      opacity: 0 !important;
      visibility: hidden !important;
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
    }
    
    /* Asegurar que el chat se vea normal */
    .tawk-chat-panel {
      bottom: 100px !important; /* Alejarlo del botón */
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTawkLoaded, setIsTawkLoaded] = useState(false);
  const [isTawkInitialized, setIsTawkInitialized] = useState(false);
  
  // Referencia para los nodos del DOM de Tawk.to
  const tawkMinContainerRef = useRef(null);
  const tawkButtonRef = useRef(null);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Cerrar menú al hacer clic fuera
  const handleClickAway = () => {
    setMenuOpen(false);
  };

  // Alternar el estado del menú
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    // Si ya está autenticado, redirigir a la página de bienvenida
    if (user) {
      navigate('/welcome');
    }

    // NO inicializamos Tawk.to aquí - esperamos a que el usuario haga clic en soporte
    // Solo limpiamos cualquier instancia previa para asegurarnos
    const cleanupPreviousTawk = () => {
      // Remover scripts previos de Tawk.to si existen
      document.querySelectorAll('script[src*="embed.tawk.to"]').forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });

      // Eliminar variables globales de Tawk si existen
      if (window.Tawk_API) {
        delete window.Tawk_API;
      }
      if (window.Tawk_LoadStart) {
        delete window.Tawk_LoadStart;
      }
    };

    cleanupPreviousTawk();

    // Limpiar al desmontar
    return () => {
      cleanupPreviousTawk();
    };
  }, [user, navigate]);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Función para inicializar y abrir el chat de soporte
  const abrirSoporte = () => {
    // Si Tawk ya está inicializado, solo abrimos el chat
    if (isTawkInitialized && window.Tawk_API) {
      if (window.Tawk_API.showWidget) {
        window.Tawk_API.showWidget();
      }
      
      if (window.Tawk_API.maximize) {
        window.Tawk_API.maximize();
      }
      return;
    }

    // Si no está inicializado, cargamos el script
    setIsTawkLoaded(false);
    
    // Inicializar Tawk.to
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    
    // Personalizar configuración - queremos solo abrir
    window.Tawk_API.onLoad = function() {
      setIsTawkLoaded(true);
      setIsTawkInitialized(true);
      
      // Maximizar inmediatamente al cargar
      setTimeout(() => {
        if (window.Tawk_API.maximize) {
          window.Tawk_API.maximize();
        }
      }, 100);
    };
    
    // Crear y cargar el script de Tawk.to
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/68079db46696ed190f44c8d6/1ipes02u1';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Agregar el script al documento
    document.head.appendChild(script);
    
    // Mostrar mensaje de carga mientras se inicializa
    setIsTawkLoaded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await login(username, password);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/welcome');
        }, 1000);
      } else {
        setError(result.message || 'Error de autenticación');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Estilos globales para Tawk.to - solo si ya se ha inicializado */}
      {isTawkInitialized && <TawkGlobalStyles />}
      
      {/* Barra de clima compacta */}
      <WeatherBar />
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          position: 'relative',
          mt: 4, // Reducido el margen superior para compensar la barra más pequeña
        }}
      >
        <Container maxWidth="sm">
          <StyledCard>
            <LogoContainer>
              <Logo src={logoImg} alt="Logo Empresa" />
            </LogoContainer>
            
            <Typography variant="h4" component="h1" align="center" mb={3} fontWeight="bold">
              Bienvenido
            </Typography>
            
            <Typography variant="h6" align="center" color="textSecondary" mb={4}>
              Ingrese a su cuenta
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>Inicio de sesión exitoso. Redirigiendo...</Alert>}
            
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Usuario"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                disabled={loading || success}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                disabled={loading || success}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || success}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'Iniciando sesión...' : 'Ingresar'}
              </Button>
            </form>
            
            {/* Botón de soporte técnico personalizado */}
            <SoporteBoton
              fullWidth
              variant="contained"
              startIcon={<HeadsetMic />}
              onClick={abrirSoporte}
              size="large"
            >
              {isTawkInitialized ? (isTawkLoaded ? 'SOPORTE EN LÍNEA' : 'CARGANDO SOPORTE...') : 'SOPORTE EN LÍNEA'}
            </SoporteBoton>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="body2" color="textSecondary" align="center">
              © {new Date().getFullYear()} Beach Market. Todos los derechos reservados.
            </Typography>
          </StyledCard>
        </Container>
        
        {/* Sistema de botones flotantes - Posicionado más arriba */}
        <ClickAwayListener onClickAway={handleClickAway}>
          <FloatingButtonsContainer>
            {/* Botón de Consultor (aparece cuando el menú está abierto) */}
            <Zoom in={menuOpen}>
              <SecondaryFloatingButton
                color="secondary"
                component={Link}
                to="/consultor"
                aria-label="consultar precios"
                show={menuOpen}
                size="medium"
              >
                <Search />
              </SecondaryFloatingButton>
            </Zoom>
            
            {/* Botón principal de Apps/Tools - Tamaño aumentado */}
            <Tooltip title={menuOpen ? "Cerrar menú" : "Herramientas"} placement="left">
              <MainFloatingButton
                color="info"
                aria-label="apps"
                onClick={toggleMenu}
                size="large"
              >
                {menuOpen ? <Close /> : <AppsOutlined />}
              </MainFloatingButton>
            </Tooltip>
          </FloatingButtonsContainer>
        </ClickAwayListener>
      </Box>
    </Box>
  );
};

export default LoginPage;