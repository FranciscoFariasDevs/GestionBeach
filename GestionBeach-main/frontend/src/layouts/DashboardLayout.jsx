// frontend/src/layouts/DashboardLayout.jsx - CON PERMISOS CASL.js
import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
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
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  Summarize as SummarizeIcon,
  AccountTree as AccountTreeIcon,
  ViewKanban as ViewKanbanIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { filterMenuItems } from '../config/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/api';
import ChatWidget from '../components/ChatWidget';
import BuscadorInteligente from '../components/BuscadorInteligente';
import { registrarPushNotificaciones } from '../services/pushService';

const drawerWidth = 200;
const miniDrawerWidth = 60;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    paddingLeft: theme.spacing(8),
    paddingRight: theme.spacing(8),
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
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
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
  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const { ability, isSuperUser, hasProfile } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);
  const [correoOpen, setCorreoOpen] = useState(false);
  const [rrhhOpen, setRrhhOpen] = useState(false);
  const [productosOpen, setProductosOpen] = useState(false);
  const [estadoResultadoOpen, setEstadoResultadoOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Estados para notificaciones de inventario
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [ticketNotifications, setTicketNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Estados para notificaciones del sistema (BD + Socket.IO)
  const [sistemaNotifs, setSistemaNotifs] = useState([]);
  const [sistemaNoLeidas, setSistemaNoLeidas] = useState(0);
  const socketRef = useRef(null);

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

  const handleEmailClick = (url) => {
    // Abrir webmail en nueva pestaña (no se puede cargar en iframe por seguridad de cPanel)
    window.open(url, '_blank', 'noopener,noreferrer');
    if (isMobile) handleDrawerClose();
  };

  const toggleCompras = () => setComprasOpen(!comprasOpen);
  const toggleCorreo = () => setCorreoOpen(!correoOpen);
  const toggleRrhh = () => setRrhhOpen(!rrhhOpen);
  const toggleProductos = () => setProductosOpen(!productosOpen);
  const toggleEstadoResultado = () => setEstadoResultadoOpen(!estadoResultadoOpen);

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
        let filteredNotifications = response.data.data;

        // Filtrar notificaciones de supermercado solo para encargada de turno (perfil_id: 17)
        // Otros perfiles NO deben ver notificaciones de supermercado
        if (user?.perfilId !== 17) {
          filteredNotifications = filteredNotifications.filter(notif =>
            !notif.sucursal || !notif.sucursal.toLowerCase().includes('supermercado')
          );
        }

        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  // Cargar notificaciones de tickets (nuevo sistema mejorado)
  const fetchTicketNotifications = async () => {
    try {
      const response = await api.get('/tickets/notificaciones/todas');
      if (response.data.success) {
        const newNotifications = response.data.notificaciones || [];
        const prevCount = ticketNotifications.length;

        setTicketNotifications(newNotifications);

        // Efecto visual si hay nuevas notificaciones
        if (newNotifications.length > prevCount && prevCount > 0) {
          // Vibrar el badge (se maneja con CSS animation)
          console.log('🔔 Nueva notificación de ticket recibida');
        }
      }
    } catch (error) {
      console.error('Error al cargar notificaciones de tickets:', error);
    }
  };

  // Marcar todas las notificaciones como leídas
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/tickets/notificaciones/marcar-todas');
      setTicketNotifications([]);
    } catch (error) {
      console.error('Error al marcar notificaciones:', error);
    }
  };

  // Marcar una notificación específica como leída
  const handleMarkAsRead = async (notifId) => {
    try {
      await api.put(`/tickets/notificaciones/${notifId}/leer`);
      setTicketNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  // (conteo centralizado en useEffect que incluye sistema)

  // Cargar notificaciones al montar el componente y cada minuto (más frecuente para tickets)
  useEffect(() => {
    if (user) {
      fetchInventoryNotifications();
      fetchTicketNotifications();

      // Polling cada 60 segundos para notificaciones de tickets (tiempo real)
      const ticketInterval = setInterval(fetchTicketNotifications, 60 * 1000);

      // Polling cada 5 minutos para inventario (menos urgente)
      const inventoryInterval = setInterval(fetchInventoryNotifications, 5 * 60 * 1000);

      return () => {
        clearInterval(ticketInterval);
        clearInterval(inventoryInterval);
      };
    }
  }, [user]);

  // Notificaciones del sistema (BD) — carga inicial + Socket.IO
  const fetchSistemaNotifs = async () => {
    try {
      const r = await api.get('/notificaciones');
      setSistemaNotifs(r.data.notificaciones || []);
      setSistemaNoLeidas(r.data.no_leidas || 0);
    } catch {}
  };

  useEffect(() => {
    setNotificationCount(
      (notifications?.length || 0) + (ticketNotifications?.length || 0) + sistemaNoLeidas
    );
  }, [notifications, ticketNotifications, sistemaNoLeidas]);

  useEffect(() => {
    if (!user) return;
    fetchSistemaNotifs();

    // Intentar registrar push notifications (pide permiso al usuario si no lo ha dado)
    registrarPushNotificaciones().catch(() => {});

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://192.168.100.150:5000';
    const socket = socketIO(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('registrar_usuario', { id: user.id, nombre: user.nombre });
    });

    socket.on('nueva_notificacion', (notif) => {
      setSistemaNotifs(prev => [notif, ...prev].slice(0, 50));
      setSistemaNoLeidas(n => n + 1);
    });

    return () => socket.disconnect();
  }, [user]);

  const marcarSistemaLeida = async (id, ruta) => {
    try { await api.put(`/notificaciones/${id}/leer`); } catch {}
    setSistemaNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: 1 } : n));
    setSistemaNoLeidas(n => Math.max(0, n - 1));
    if (ruta) { setNotificationsAnchor(null); navigate(ruta); }
  };

  const marcarSistemaTodasLeidas = async () => {
    try { await api.put('/notificaciones/leer-todas'); } catch {}
    setSistemaNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    setSistemaNoLeidas(0);
  };

  const eliminarSistemaNotif = async (e, id) => {
    e.stopPropagation();
    try { await api.delete(`/notificaciones/${id}`); } catch {}
    setSistemaNotifs(prev => {
      const updated = prev.filter(n => n.id !== id);
      const noLeidas = updated.filter(n => !n.leida).length;
      setSistemaNoLeidas(noLeidas);
      return updated;
    });
  };

  // Atajo global Ctrl+K para abrir el buscador semántico
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setBuscadorOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Definir todos los elementos del menú (ANTES del filtrado)
  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', orangeType: 'light' },
    {
      text: 'Estado Resultado',
      icon: <AssessmentIcon />,
      isSubmenu: true,
      orangeType: 'dark',
      isOpen: estadoResultadoOpen,
      toggle: toggleEstadoResultado,
      subItems: [
        { text: 'Visualización', path: '/estado-resultado', icon: <AssessmentIcon /> },
        { text: 'Ingreso de Gastos', path: '/estado-resultado/ingreso-gastos', icon: <AssignmentIcon /> },
      ],
    },
    { text: 'Monitoreo', icon: <MonitorIcon />, path: '/monitoreo', orangeType: 'light' },
    { text: 'Remuneraciones', icon: <RemuneracionesIcon />, path: '/remuneraciones', orangeType: 'dark' },
    { text: 'Inventario', icon: <InventoryIcon />, path: '/inventario', orangeType: 'light' },
    { text: 'Ventas', icon: <PointOfSaleIcon />, path: '/ventas', orangeType: 'dark' },
    {
      text: 'Productos',
      icon: <TrendingUpIcon />,
      isSubmenu: true,
      orangeType: 'light',
      isOpen: productosOpen,
      toggle: toggleProductos,
      subItems: [
        //{ text: 'Los Mas Vendidos', path: '/productos', icon: <TrendingUpIcon /> },
        { text: 'Consultar Producto', path: '/productos/consultar', icon: <InventoryIcon /> },
        { text: 'Rentabilidad', path: '/productos/rentabilidad', icon: <TrendingUpIcon /> },
        { text: 'Márgenes', path: '/productos/margenes', icon: <TrendingUpIcon /> },
        { text: 'Guias', path: '/productos/guias', icon: <TrendingUpIcon /> },
        { text: 'Resumen Valorizado', path: '/productos/resumen-valorizado', icon: <TrendingUpIcon /> },
        { text: 'Stocks', path: '/productos/stocks', icon: <TrendingUpIcon /> },
        { text: 'Ajustes', path: '/productos/ajustes', icon: <TrendingUpIcon /> },
        { text: 'Proveedores Producto', path: '/productos/proveedores', icon: <TrendingUpIcon /> },
        { text: 'Anulaciones', path: '/productos/anulaciones', icon: <PointOfSaleIcon /> },
      ],
    },
    { text: 'Los Más Vendidos', icon: <TrendingUpIcon />, path: '/los-mas-vendidos', orangeType: 'light' },
    { text: 'Rotación Ferreterias', icon: <TrendingUpIcon />, path: '/productos/rotacion-ferreterias', orangeType: 'dark' },
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
        { text: 'Planificación Compras-Pagos', path: '/compras/planificacion', icon: <TrendingUpIcon /> },
        { text: 'Monitor Ordenes', path: '/compras/monitor-ordenes', icon: <AssignmentIcon /> },
      ],
    },
    { text: 'Tarjeta Empleado', icon: <BadgeIcon />, path: '/tarjeta-empleado', orangeType: 'light' },
    { text: 'Empleados', icon: <PersonIcon />, path: '/empleados', orangeType: 'dark' },
    { text: 'Organigrama', icon: <AccountTreeIcon />, path: '/organigrama', orangeType: 'light' },
    { text: 'Kanban', icon: <ViewKanbanIcon />, path: '/kanban', orangeType: 'light' },
    { text: 'Cotizaciones', icon: <FacturasIcon />, path: '/cotizaciones', orangeType: 'dark' },
    {
      text: 'Recursos Humanos',
      icon: <GroupIcon />,
      isSubmenu: true,
      orangeType: 'light',
      isOpen: rrhhOpen,
      toggle: toggleRrhh,
      subItems: [
        { text: 'Boletas y Folios', path: '/recursos-humanos/boletas-folios', icon: <DescriptionIcon /> },
        { text: 'Resumen Ejecutivo', path: '/recursos-humanos/resumen-ejecutivo', icon: <SummarizeIcon /> },
      ],
    },
    { text: 'Cabañas', icon: <CottageIcon />, path: '/admin/cabanas', orangeType: 'light' },
    { text: 'Códigos Descuento', icon: <ConfirmationNumberIcon />, path: '/codigos-descuento', orangeType: 'dark' },
    { text: 'Mantenciones', icon: <BuildIcon />, path: '/mantenciones', orangeType: 'dark' },
    { text: 'Mis Tickets', icon: <AssignmentIcon />, path: '/mis-tickets', orangeType: 'light' },
    { text: 'Usuarios', icon: <PeopleIcon />, path: '/usuarios', orangeType: 'dark' },
    { text: 'Perfiles', icon: <AssignmentIcon />, path: '/perfiles', orangeType: 'dark' },
    { text: 'Módulos', icon: <ModuleIcon />, path: '/modulos', orangeType: 'light' },
    { text: 'Grupos de Chat', icon: <GroupIcon />, path: '/grupos-chat', orangeType: 'dark' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion', orangeType: 'dark' },
    {
      text: 'Correo Electrónico',
      icon: <EmailIcon />,
      isSubmenu: true,
      orangeType: 'light',
      isOpen: correoOpen,
      toggle: toggleCorreo,
      subItems: [
        { text: 'Beach', action: () => handleEmailClick('https://beach.cl:2096'), icon: <EmailIcon /> },
        { text: 'BeachMarket', action: () => handleEmailClick('https://beachmarket.cl:2096'), icon: <EmailIcon /> },
      ],
    },
  ];

  // ✅ FILTRADO DE PERMISOS ACTIVO - Módulos filtrados según perfil del usuario
  const menuItems = filterMenuItems(ability, allMenuItems).filter(item =>
    !(user?.perfilId === 12 && item.path === '/mis-tickets')
  );

  // Obtener título de la página actual
  const currentTitle = showEmail
    ? 'Correo Electrónico'
    : {
        '/dashboard': 'Dashboard',
        '/estado-resultado': 'Estado de Resultado',
        '/estado-resultado/ingreso-gastos': 'Ingreso de Gastos',
        '/monitoreo': 'Monitoreo de Sucursales',
        '/remuneraciones': 'Sistema de Remuneraciones',
        '/inventario': 'Sistema de Gestión de Inventario',
        '/ventas': 'Ventas',
        '/productos': 'Productos',
        '/compras/centros-costos': 'Gestión de Centros de Costos',
        '/compras/facturas-xml': 'Gestión de Facturas XML',
        '/compras/planificacion': 'Planificación Compras-Pagos',
        '/compras/monitor-ordenes': 'Monitor Ordenes de Compra',
        '/tarjeta-empleado': 'Tarjeta de Empleado',
        '/empleados': 'Gestión de Empleados',
        '/admin/cabanas': 'Gestión de Cabañas y Reservas',
        '/codigos-descuento': 'Códigos de Descuento',
        '/mantenciones': 'Mantenciones — Solicitudes',
        '/mis-tickets': 'Mis Tickets de Soporte',
        '/usuarios': 'Gestión de Usuarios',
        '/perfiles': 'Gestión de Perfiles',
        '/modulos': 'Gestión de Módulos',
        '/configuracion': 'Configuración',
        '/recursos-humanos/boletas-folios': 'Boletas y Folios',
        '/recursos-humanos/resumen-ejecutivo': 'Resumen Ejecutivo',
        '/productos/consultar': 'Consultar Producto',
        '/productos/rotacion-ferreterias': 'Rotacion Ferreterias',
        '/productos/rentabilidad': 'Rentabilidad',
        '/productos/margenes': 'Margenes por Vendedor',
        '/productos/guias': 'Guias de Despacho',
        '/productos/resumen-valorizado': 'Resumen Valorizado',
        '/productos/stocks': 'Analisis de Stocks',
        '/productos/ajustes': 'Ajustes de Bodega',
        '/productos/proveedores': 'Proveedores Producto',
        '/productos/anulaciones': 'Anulaciones',
        '/organigrama': 'Organigrama Empresarial',
        '/cotizaciones': 'Cotizaciones',
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

          {/* Buscador semántico */}
          <Tooltip title="Buscar (Ctrl+K)">
            <Box
              onClick={() => setBuscadorOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mr: 1.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                transition: 'background 0.2s',
              }}
            >
              <SearchIcon sx={{ fontSize: 18, opacity: 0.85 }} />
              <Typography variant="body2" sx={{ opacity: 0.75, fontSize: '0.8rem', display: { xs: 'none', sm: 'block' } }}>
                Buscar…
              </Typography>
              <Chip label="Ctrl K" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.15)', color: 'inherit', display: { xs: 'none', md: 'flex' } }} />
            </Box>
          </Tooltip>

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
                {user?.nombre || user?.username} - {getUserProfileName()}
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

          {/* Popover de Notificaciones - Mejorado */}
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
            <Paper sx={{ width: 400, maxHeight: 520 }}>
              {/* Header con gradiente */}
              <Box sx={{
                p: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Notificaciones
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {ticketNotifications.length} tickets • {notifications.length} inventario • {sistemaNoLeidas} sistema
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {sistemaNoLeidas > 0 && (
                    <Button size="small" variant="outlined" onClick={marcarSistemaTodasLeidas}
                      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.65rem',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                      <DoneAllIcon sx={{ fontSize: 14, mr: 0.5 }} />Sistema
                    </Button>
                  )}
                  {ticketNotifications.length > 0 && (
                    <Button size="small" variant="outlined" onClick={handleMarkAllAsRead}
                      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.65rem',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                      <DoneAllIcon sx={{ fontSize: 14, mr: 0.5 }} />Tickets
                    </Button>
                  )}
                </Box>
              </Box>

              <List sx={{ p: 0, maxHeight: 420, overflow: 'auto' }}>
                {notifications.length === 0 && ticketNotifications.length === 0 && sistemaNotifs.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay notificaciones pendientes
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Notificaciones del Sistema (planificación, kanban, cotizaciones) */}
                    {sistemaNotifs.length > 0 && (
                      <>
                        <Divider sx={{ my: 0 }}>
                          <Chip label="Sistema" size="small" color="primary" />
                        </Divider>
                        {sistemaNotifs.map((n, i) => (
                          <ListItem
                            key={`sis-${n.id}`}
                            alignItems="flex-start"
                            button
                            onClick={() => marcarSistemaLeida(n.id, n.ruta)}
                            secondaryAction={
                              <IconButton size="small" onClick={(e) => eliminarSistemaNotif(e, n.id)}>
                                <DeleteIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                              </IconButton>
                            }
                            sx={{
                              borderBottom: 1, borderColor: 'divider',
                              bgcolor: n.leida ? 'transparent' : '#f0f4ff',
                              '&:hover': { filter: 'brightness(0.97)' },
                              py: 1, pr: 5,
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: n.leida ? '#bdbdbd' : '#667eea' }}>
                                <InfoIcon sx={{ fontSize: 16 }} />
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" fontWeight={n.leida ? 400 : 700} noWrap>
                                  {n.titulo}
                                </Typography>
                              }
                              secondary={
                                <>
                                  {n.mensaje && (
                                    <Typography variant="body2" color="text.secondary" sx={{
                                      overflow: 'hidden', textOverflow: 'ellipsis',
                                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                    }}>
                                      {n.mensaje}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block' }}>
                                    {new Date(n.fecha_creacion).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </>
                    )}

                    {/* Notificaciones de Tickets - Mejoradas */}
                    {ticketNotifications.map((notif, index) => {
                      // Determinar icono y color según tipo
                      const getNotifStyle = () => {
                        switch(notif.tipo) {
                          case 'nuevo_ticket':
                            return { icon: <ConfirmationNumberIcon />, color: '#2196F3', bg: '#e3f2fd' };
                          case 'respuesta':
                            return { icon: <EmailIcon />, color: '#FF9800', bg: '#fff3e0' };
                          case 'estado_cambiado':
                          case 'resuelto':
                            return { icon: <CheckCircleIcon />, color: '#4CAF50', bg: '#e8f5e9' };
                          default:
                            return { icon: <NotificationsIcon />, color: '#9C27B0', bg: '#f3e5f5' };
                        }
                      };
                      const style = getNotifStyle();

                      return (
                        <ListItem
                          key={`ticket-${notif.id || index}`}
                          button
                          onClick={() => {
                            if (notif.id) handleMarkAsRead(notif.id);
                            navigate('/mis-tickets');
                            handleNotificationsClose();
                          }}
                          sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: style.bg,
                            '&:hover': { bgcolor: style.bg, filter: 'brightness(0.95)' },
                            py: 1.5
                          }}
                        >
                          <ListItemIcon sx={{ color: style.color, minWidth: 44 }}>
                            <Avatar sx={{ bgcolor: style.color, width: 32, height: 32 }}>
                              {React.cloneElement(style.icon, { sx: { fontSize: 18 } })}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                {notif.titulo}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}>
                                  {notif.mensaje}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                                  {notif.numero_ticket && `#${notif.numero_ticket} • `}
                                  {notif.fecha_creacion && new Date(notif.fecha_creacion).toLocaleString('es-CL', {
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      );
                    })}

                    {/* Separador si hay ambos tipos */}
                    {ticketNotifications.length > 0 && notifications.length > 0 && (
                      <Divider sx={{ my: 1 }}>
                        <Chip label="Inventario" size="small" />
                      </Divider>
                    )}

                    {/* Notificaciones de Inventario */}
                    {notifications.map((notification, index) => (
                      <ListItem
                        key={`inv-${index}`}
                        button
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          borderBottom: 1,
                          borderColor: 'divider',
                          bgcolor: notification.tipo === 'vencido' ? '#ffebee' : '#fff8e1',
                          '&:hover': { filter: 'brightness(0.95)' },
                          py: 1.5
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Avatar sx={{
                            bgcolor: notification.tipo === 'vencido' ? '#f44336' : '#ff9800',
                            width: 32,
                            height: 32
                          }}>
                            <WarningIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight="bold">
                              {notification.titulo}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary">
                                {notification.descripcion}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                Sucursal: {notification.sucursal}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}
              </List>

              {/* Footer con acceso rápido */}
              <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                <Button
                  size="small"
                  onClick={() => {
                    navigate('/mis-tickets');
                    handleNotificationsClose();
                  }}
                  sx={{ color: '#667eea' }}
                >
                  Ver todos los tickets
                </Button>
              </Box>
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
              {(user?.nombre || user?.username)?.charAt(0).toUpperCase() || 'U'}
            </MotionAvatar>
            {open && (
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.875rem' }}>
                  {user?.nombre || user?.username || 'Usuario'}
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
                                backgroundColor: sub.path && location.pathname === sub.path
                                  ? 'rgba(255, 152, 0, 0.1)'
                                  : 'transparent'
                              }}
                              selected={sub.path && location.pathname === sub.path}
                              onClick={() => {
                                if (sub.action) {
                                  sub.action();
                                } else if (sub.path) {
                                  navigate(sub.path);
                                  setShowEmail(false);
                                }
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

      {/* Chat interno en tiempo real */}
      <ChatWidget />

      {/* Buscador semántico global */}
      <BuscadorInteligente open={buscadorOpen} onClose={() => setBuscadorOpen(false)} />

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