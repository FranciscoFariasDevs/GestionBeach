// frontend/src/layouts/DashboardLayout.jsx
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Reducido el ancho del drawer aún más, ahora a 200px
const drawerWidth = 200;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
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
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
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

// Componentes animados con framer-motion
const MotionListItem = motion(ListItem);
const MotionAvatar = motion(Avatar);

// Variantes de animación para los elementos del menú
const menuItemVariants = {
  hidden: { 
    opacity: 0, 
    x: -20 
  },
  visible: (custom) => ({ 
    opacity: 1, 
    x: 0,
    transition: { 
      delay: custom * 0.04, 
      duration: 0.35,
      ease: [0.43, 0.13, 0.23, 0.96] // easeOutExpo
    }
  }),
  exit: { 
    opacity: 0, 
    x: -15,
    transition: { 
      duration: 0.2 
    }
  }
};

// Variantes para el avatar
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
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    if (isMobile) {
      setOpen(false);
    } else {
      // Para versión desktop, añadir delay para la animación
      setTimeout(() => {
        setOpen(false);
      }, 200);
    }
  };

  useEffect(() => {
    // Actualizar estado del drawer cuando cambia el tamaño de la pantalla
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

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

  const toggleProductos = () => setProductosOpen(!productosOpen);
  const toggleCompras = () => setComprasOpen(!comprasOpen);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', orangeType: 'light' },
    { text: 'Estado Resultado', icon: <AssessmentIcon />, path: '/estado-resultado', orangeType: 'dark' },
    { text: 'Monitoreo', icon: <MonitorIcon />, path: '/monitoreo', orangeType: 'light' },
    { text: 'Remuneraciones', icon: <RemuneracionesIcon />, path: '/remuneraciones', orangeType: 'dark' },
    
    // NUEVA ENTRADA DE INVENTARIO
    { text: 'Inventario', icon: <InventoryIcon />, path: '/inventario', orangeType: 'light' },
    
    { text: 'Ventas', icon: <PointOfSaleIcon />, path: '/ventas', orangeType: 'dark' },

    // Productos con submenú
    {
      text: 'Productos',
      icon: <TrendingUpIcon />,
      isSubmenu: true,
      orangeType: 'light',
      isOpen: productosOpen,
      toggle: toggleProductos,
      subItems: [
        { text: 'Supermercados', path: '/productos/supermercados', icon: <StoreIcon /> },
        { text: 'Ferreterías', path: '/productos/ferreterias', icon: <StoreIcon /> },
        { text: 'Multitiendas', path: '/productos/multitiendas', icon: <StoreIcon /> },
      ],
    },

    // Compras con submenú
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
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/usuarios', orangeType: 'light' },
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

  const currentTitle =
    showEmail
      ? 'Correo Electrónico'
      : {
          '/dashboard': 'Dashboard',
          '/estado-resultado': 'Estado de Resultado',
          '/monitoreo': 'Monitoreo de Sucursales',
          '/remuneraciones': 'Sistema de Remuneraciones',
          '/inventario': 'Sistema de Gestión de Inventario',
          '/ventas': 'Ventas',
          '/compras/centros-costos': 'Gestión de Centros de Costos',
          '/compras/facturas-xml': 'Gestión de Facturas XML',
          '/productos/supermercados': 'Productos - Supermercados',
          '/productos/ferreterias': 'Productos - Ferreterías',
          '/productos/multitiendas': 'Productos - Multitiendas',
          '/tarjeta-empleado': 'Tarjeta de Empleado',
          '/empleados': 'Gestión de Empleados',
          '/usuarios': 'Gestión de Usuarios',
          '/perfiles': 'Gestión de Perfiles',
          '/modulos': 'Gestión de Módulos',
          '/configuracion': 'Configuración',
        }[location.pathname] || 'Beach Market';

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open && !isMobile}>
        <Toolbar>
          <IconButton 
            color="inherit" 
            onClick={handleDrawerOpen} 
            edge="start" 
            sx={{ mr: 2, ...(open && !isMobile && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {currentTitle}
          </Typography>
          <IconButton size="large" onClick={handleMenu} color="inherit">
            <AccountCircle />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem onClick={handleClose}>Perfil</MenuItem>
            <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBarStyled>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            overflowX: 'hidden' // Para evitar desplazamiento horizontal
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 1.5 }}>
            <MotionAvatar 
              variants={avatarVariants}
              initial="hidden"
              animate="visible"
              sx={{ bgcolor: 'primary.main', mr: 1.5, width: 36, height: 36 }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </MotionAvatar>
            <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.875rem' }}>
              {user?.username || 'Usuario'}
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerClose} size="small">
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
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
                          px: 1.5, 
                          minHeight: 38
                        }}
                      >
                        <ListItemIcon sx={{ color: orangeColors[item.orangeType], minWidth: '36px' }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text} 
                          primaryTypographyProps={{ fontSize: '0.875rem' }}
                        />
                        {item.isOpen ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                    </MotionListItem>
                    
                    <Collapse in={item.isOpen} timeout="auto" unmountOnExit>
                      <AnimatePresence>
                        {item.subItems.map((sub, idx) => (
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
                      // Reducir aún más el padding para hacerlo más compacto
                      py: 0.5,
                      px: 1.5,
                      minHeight: 38
                    }}
                  >
                    <ListItemIcon sx={{ color: orangeColors[item.orangeType], minWidth: '36px' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ fontSize: '0.875rem' }}
                    />
                  </ListItemButton>
                </MotionListItem>
              );
            })}
          </AnimatePresence>
        </List>
        <Divider />
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
                px: 1.5,
                minHeight: 38 
              }}
            >
              <ListItemIcon sx={{ minWidth: '36px' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Cerrar Sesión" 
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </ListItemButton>
          </MotionListItem>
        </List>
      </Drawer>

      <Main open={open && !isMobile}>
        <DrawerHeader />
        {showEmail ? <EmailFrame src="https://beachmarket.cl:2096" title="Correo Electrónico" /> : <Outlet />}
      </Main>
    </Box>
  );
}