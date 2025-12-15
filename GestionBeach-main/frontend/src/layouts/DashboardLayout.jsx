// frontend/src/layouts/DashboardLayout.jsx - CON PERMISOS CASL.js
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Collapse,
  Chip,
  Badge,
  Popover,
  Paper,
  Button,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PointOfSale as PointOfSaleIcon,
  Badge as BadgeIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  AccountCircle,
  People as PeopleIcon,
  ViewModule as ModuleIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Email as EmailIcon,
  TrendingUp as TrendingUpIcon,
  ExpandLess,
  ExpandMore,
  Store as StoreIcon,
  Person as PersonIcon,
  AttachMoney as RemuneracionesIcon,
  ShoppingCart as ComprasIcon,
  BusinessCenter as CentrosCostosIcon,
  Receipt as FacturasIcon,
  Monitor as MonitorIcon,
  Inventory as InventoryIcon,
  Security as SecurityIcon,
  Cottage as CottageIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  ReportProblem as ReportProblemIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { filterMenuItems } from '../config/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';

const drawerWidth = 200;
const miniDrawerWidth = 60;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: miniDrawerWidth,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: drawerWidth,
    }),
    [theme.breakpoints.down('md')]: {
      marginLeft: 0,
      padding: theme.spacing(2),
    },
  })
);

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: `calc(100% - ${miniDrawerWidth}px)`,
    marginLeft: `${miniDrawerWidth}px`,
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginLeft: 0,
    },
  })
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));

const EmailFrame = styled('iframe')({
  border: 'none',
  width: '100%',
  height: 'calc(100vh - 64px)',
  display: 'block',
});

const orangeColors = {
  light: '#FF9800',
  dark: '#F57C00',
};

const MotionListItem = motion(ListItem);
const MotionAvatar = motion(Avatar);

const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (custom) => ({ 
    opacity: 1, 
    x: 0,
    transition: { 
      delay: custom * 0.04, 
      duration: 0.35,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }),
  exit: { 
    opacity: 0, 
    x: -15,
    transition: { duration: 0.2 }
  }
};

const avatarVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6,
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile); // Iniciar cerrado en móvil
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const { ability, isSuperUser, hasProfile } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Estados para notificaciones de inventario
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleDrawerOpen = () => {
    console.log('🔓 Abriendo drawer - isMobile:', isMobile);
    setOpen(true);
  };

  const handleDrawerClose = () => {
    console.log('🔒 Cerrando drawer - isMobile:', isMobile);
    if (isMobile) {
      setOpen(false);
    } else {
      if (!isHovering) {
        setOpen(false);
      }
    }
  };

  // Auto-cerrar drawer después de 2 segundos al cargar (solo desktop)
  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // En móvil, asegurar que esté cerrado
      setOpen(false);
    }
  }, [isMobile]);

  // Handlers para hover
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovering(true);
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
      setOpen(false);
    }
  };

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEmailClick = () => {
    setShowEmail(true);
    if (isMobile) handleDrawerClose();
  };

  const toggleCompras = () => setComprasOpen(!comprasOpen);

  // Handlers para notificaciones
  const handleNotificationsClick = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  const handleNotificationClick = (notification) => {
    // Navegar a la página de inventario cuando se hace clic en una notificación
    navigate('/inventario');
    handleNotificationsClose();
  };

  // Cargar notificaciones de inventario
  const fetchInventoryNotifications = async () => {
    try {
      const response = await api.get('/inventario/notificaciones');
      if (response.data.success) {
        setNotifications(response.data.data);
        setNotificationCount(response.data.data.length);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  // Cargar notificaciones al montar el componente y cada 5 minutos
  useEffect(() => {
    fetchInventoryNotifications();
    const interval = setInterval(fetchInventoryNotifications, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  // Definir todos los elementos del menú (ANTES del filtrado)
  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', orangeType: 'light' },
    { text: 'Estado Resultado', icon: <AssessmentIcon />, path: '/estado-resultado', orangeType: 'dark' },
    { text: 'Monitoreo', icon: <MonitorIcon />, path: '/monitoreo', orangeType: 'light' },
    { text: 'Remuneraciones', icon: <RemuneracionesIcon />, path: '/remuneraciones', orangeType: 'dark' },
    { text: 'Inventario', icon: <InventoryIcon />, path: '/inventario', orangeType: 'light' },
    { text: 'Ventas', icon: <PointOfSaleIcon />, path: '/ventas', orangeType: 'dark' },
    { text: 'Productos', icon: <TrendingUpIcon />, path: '/productos', orangeType: 'light' },
    {
      text: 'Compras',
      icon: <ComprasIcon />,
      isSubmenu: true,
      orangeType: 'dark',
      isOpen: comprasOpen,
      toggle: toggleCompras,
      subItems: [
        { text: 'Gestión de Centros de Costos', path: '/compras/centros-costos', icon: <CentrosCostosIcon /> },
        { text: 'Facturas XML', path: '/compras/facturas-xml', icon: <FacturasIcon /> },
      ],
    },
    { text: 'Tarjeta Empleado', icon: <BadgeIcon />, path: '/tarjeta-empleado', orangeType: 'light' },
    { text: 'Empleados', icon: <PersonIcon />, path: '/empleados', orangeType: 'dark' },
    { text: 'Cabañas', icon: <CottageIcon />, path: '/admin/cabanas', orangeType: 'light' },
    { text: 'Códigos Descuento', icon: <ConfirmationNumberIcon />, path: '/codigos-descuento', orangeType: 'dark' },
    { text: 'Mis Tickets', icon: <AssignmentIcon />, path: '/mis-tickets', orangeType: 'light' },
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/usuarios', orangeType: 'dark' },
    { text: 'Perfiles', icon: <AssignmentIcon />, path: '/perfiles', orangeType: 'dark' },
    { text: 'Módulos', icon: <ModuleIcon />, path: '/modulos', orangeType: 'light' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion', orangeType: 'dark' },
    {
      text: 'Correo Electrónico',
      icon: <EmailIcon />,
      action: handleEmailClick,
      highlight: true,
      orangeType: 'light',
    },
  ];

  // ✅ FILTRADO DE PERMISOS ACTIVO - CABAÑAS INCLUIDA EN TODOS LOS PERFILES
  const menuItems = filterMenuItems(ability, allMenuItems);

  // Obtener título de la página actual
  const currentTitle = showEmail
    ? 'Correo Electrónico'
    : {
        '/dashboard': 'Dashboard',
        '/estado-resultado': 'Estado de Resultado',
        '/monitoreo': 'Monitoreo de Sucursales',
        '/remuneraciones': 'Sistema de Remuneraciones',
        '/inventario': 'Sistema de Gestión de Inventario',
        '/ventas': 'Ventas',
        '/productos': 'Productos',
        '/compras/centros-costos': 'Gestión de Centros de Costos',
        '/compras/facturas-xml': 'Gestión de Facturas XML',
        '/tarjeta-empleado': 'Tarjeta de Empleado',
        '/empleados': 'Gestión de Empleados',
        '/admin/cabanas': 'Gestión de Cabañas y Reservas',
        '/codigos-descuento': 'Códigos de Descuento',
        '/mis-tickets': 'Mis Tickets de Soporte',
        '/usuarios': 'Gestión de Usuarios',
        '/perfiles': 'Gestión de Perfiles',
        '/modulos': 'Gestión de Módulos',
        '/configuracion': 'Configuración',
      }[location.pathname] || 'Beach Market';

  // Obtener el perfil del usuario para mostrar
  const getUserProfileName = () => {
    if (!user?.perfilId) return 'Sin perfil';
    
    const profileNames = {
      10: 'Super Admin',
      11: 'Gerencia',
      12: 'Finanzas',
      13: 'Recursos Humanos',
      14: 'Jefe de Local',
      15: 'Solo Lectura',
      16: 'Administrador'
    };
    
    return profileNames[user.perfilId] || `Perfil ${user.perfilId}`;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open && !isMobile}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {currentTitle}
          </Typography>
          
          {/* Mostrar perfil del usuario si es Super User */}
          {isSuperUser() && (
            <Chip
              label={getUserProfileName()}
              icon={<SecurityIcon />}
              size="small"
              color="warning"
              sx={{ mr: 2, fontSize: '0.75rem' }}
            />
          )}

          {/* Botón de Notificaciones de Inventario */}
          <IconButton
            size="large"
            onClick={handleNotificationsClick}
            color="inherit"
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton size="large" onClick={handleMenu} color="inherit">
            <AccountCircle />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem onClick={handleClose}>
              <Typography variant="body2">
                {user?.username} - {getUserProfileName()}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                navigate('/mi-perfil');
                handleClose();
              }}
            >
              Mi Perfil
            </MenuItem>
            <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
          </Menu>

          {/* Popover de Notificaciones */}
          <Popover
            open={Boolean(notificationsAnchor)}
            anchorEl={notificationsAnchor}
            onClose={handleNotificationsClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Paper sx={{ width: 360, maxHeight: 480 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold">
                  Notificaciones de Inventario
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notificationCount} alertas activas
                </Typography>
              </Box>
              <List sx={{ p: 0, maxHeight: 380, overflow: 'auto' }}>
                {notifications.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay notificaciones
                    </Typography>
                  </Box>
                ) : (
                  notifications.map((notification, index) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemIcon>
                        <WarningIcon color={notification.tipo === 'vencido' ? 'error' : 'warning'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={notification.titulo}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              {notification.descripcion}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Sucursal: {notification.sucursal}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))
                )}
              </List>
              {notifications.length > 0 && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      navigate('/inventario');
                      handleNotificationsClose();
                    }}
                  >
                    Ver todos en Inventario
                  </Button>
                </Box>
              )}
            </Paper>
          </Popover>
        </Toolbar>
      </AppBarStyled>

      <Drawer
        sx={{
          width: open ? drawerWidth : miniDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isMobile && open ? drawerWidth : (open ? drawerWidth : miniDrawerWidth),
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="left"
        open={isMobile ? open : true}
        onClose={isMobile ? handleDrawerClose : undefined}
        ModalProps={isMobile ? {
          keepMounted: true, // Mejor rendimiento en móvil
        } : undefined}
        {...(!isMobile && {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        })}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: open ? 1.5 : 0.5, justifyContent: open ? 'flex-start' : 'center' }}>
            <MotionAvatar
              variants={avatarVariants}
              initial="hidden"
              animate="visible"
              sx={{
                bgcolor: isSuperUser() ? 'error.main' : 'primary.main',
                mr: open ? 1.5 : 0,
                width: 36,
                height: 36
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </MotionAvatar>
            {open && (
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.875rem' }}>
                  {user?.username || 'Usuario'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
                  {getUserProfileName()}
                </Typography>
              </Box>
            )}
          </Box>
          {open && !isMobile && (
            <IconButton onClick={handleDrawerClose} size="small">
              <ChevronLeftIcon />
            </IconButton>
          )}
        </DrawerHeader>
        <Divider />
        
        {/* Mostrar información de permisos para Super Users */}
        {isSuperUser() && open && (
          <Box sx={{ p: 1, bgcolor: 'warning.lighter' }}>
            <Typography variant="caption" color="warning.dark" align="center" display="block">
              🔓 Acceso Total
            </Typography>
          </Box>
        )}
        
        <List sx={{ py: 0.5 }}>
          <AnimatePresence>
            {menuItems.map((item, index) => {
              if (item.isSubmenu) {
                return (
                  <React.Fragment key={item.text}>
                    <MotionListItem 
                      disablePadding
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={index}
                      sx={{ display: 'block' }}
                    >
                      <ListItemButton
                        onClick={item.toggle}
                        sx={{
                          py: 0.5,
                          px: open ? 1.5 : 1,
                          minHeight: 38,
                          justifyContent: open ? 'flex-start' : 'center'
                        }}
                      >
                        <ListItemIcon sx={{ color: orangeColors[item.orangeType], minWidth: open ? '36px' : 'auto', justifyContent: 'center' }}>
                          {item.icon}
                        </ListItemIcon>
                        {open && (
                          <>
                            <ListItemText
                              primary={item.text}
                              primaryTypographyProps={{ fontSize: '0.875rem' }}
                            />
                            {item.isOpen ? <ExpandLess /> : <ExpandMore />}
                          </>
                        )}
                      </ListItemButton>
                    </MotionListItem>
                    
                    <Collapse in={item.isOpen && open} timeout="auto" unmountOnExit>
                      <AnimatePresence>
                        {item.subItems?.map((sub, idx) => (
                          <MotionListItem
                            key={sub.text}
                            disablePadding
                            variants={{
                              hidden: { opacity: 0, y: -5 },
                              visible: { 
                                opacity: 1, 
                                y: 0,
                                transition: { 
                                  delay: idx * 0.05, 
                                  duration: 0.25
                                }
                              },
                              exit: { 
                                opacity: 0, 
                                y: -5,
                                transition: { duration: 0.15 }
                              }
                            }}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <ListItemButton
                              sx={{ 
                                pl: 4, 
                                py: 0.5, 
                                minHeight: 34,
                                backgroundColor: location.pathname === sub.path 
                                  ? 'rgba(255, 152, 0, 0.1)' 
                                  : 'transparent'
                              }}
                              selected={location.pathname === sub.path}
                              onClick={() => {
                                navigate(sub.path);
                                setShowEmail(false);
                                if (isMobile) handleDrawerClose();
                              }}
                            >
                              <ListItemIcon sx={{ color: orangeColors.light, minWidth: '30px' }}>
                                {sub.icon}
                              </ListItemIcon>
                              <ListItemText 
                                primary={sub.text} 
                                primaryTypographyProps={{ fontSize: '0.815rem' }}
                              />
                            </ListItemButton>
                          </MotionListItem>
                        ))}
                      </AnimatePresence>
                    </Collapse>
                  </React.Fragment>
                );
              }

              const isSelected = item.action ? showEmail : location.pathname === item.path;
              return (
                <MotionListItem 
                  key={item.text}
                  disablePadding
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  custom={index}
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else {
                        navigate(item.path);
                        setShowEmail(false);
                        if (isMobile) handleDrawerClose();
                      }
                    }}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 152, 0, 0.12)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 152, 0, 0.2)',
                        },
                      },
                      py: 0.5,
                      px: open ? 1.5 : 1,
                      minHeight: 38,
                      justifyContent: open ? 'flex-start' : 'center'
                    }}
                  >
                    <ListItemIcon sx={{ color: orangeColors[item.orangeType], minWidth: open ? '36px' : 'auto', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                      />
                    )}
                  </ListItemButton>
                </MotionListItem>
              );
            })}
          </AnimatePresence>
        </List>
        <Divider />
        
        {/* Información de debugging para desarrollo */}
        {process.env.NODE_ENV === 'development' && open && (
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" color="text.disabled" display="block">
              Módulos accesibles: {menuItems.length}
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block">
              Perfil ID: {user?.perfilId}
            </Typography>
          </Box>
        )}
        
        <List sx={{ py: 0.5 }}>
          <MotionListItem
            disablePadding
            variants={menuItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={menuItems.length + 1}
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                py: 0.5,
                px: open ? 1.5 : 1,
                minHeight: 38,
                justifyContent: open ? 'flex-start' : 'center'
              }}
            >
              <ListItemIcon sx={{ minWidth: open ? '36px' : 'auto', justifyContent: 'center' }}>
                <LogoutIcon />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="Cerrar Sesión"
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              )}
            </ListItemButton>
          </MotionListItem>
        </List>
      </Drawer>

      <Main open={open && !isMobile}>
        <DrawerHeader />
        {showEmail ? <EmailFrame src="https://beachmarket.cl:2096" title="Correo Electrónico" /> : <Outlet />}
      </Main>

      {/* Botón flotante de Reportar Problema */}
      <Tooltip title="Reportar Problema" placement="left">
        <Fab
          color="error"
          aria-label="reportar problema"
          onClick={() => navigate('/reportar-problema')}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px 0 rgba(102, 126, 234, 0.4)',
          }}
        >
          <ReportProblemIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
}