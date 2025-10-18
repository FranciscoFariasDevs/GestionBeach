// frontend/src/pages/AdminCabanasPage.jsx - VERSIÓN MEJORADA CON TODAS LAS FEATURES
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Badge,
  Fade,
  Grow,
  Tooltip,
  alpha,
  CardMedia,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  WhatsApp as WhatsAppIcon,
  Event as EventIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Cottage as CottageIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Hotel as HotelIcon,
  Bathtub as BathtubIcon,
  LocationOn as LocationIcon,
  HotTub as HotTubIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';

// Colores únicos para cada cabaña
const COLORES_CABANAS = {
  'cabana1': '#FF1744',
  'cabana2': '#FF6F00',
  'cabana3': '#FFD600',
  'cabana4': '#00E676',
  'cabana5': '#00BCD4',
  'cabana6': '#2979FF',
  'cabana7': '#D500F9',
  'cabana8': '#FF6D00',
  'departamentoa': '#E91E63',
  'departamentob': '#9C27B0',
};

// Función para normalizar nombres
const normalizarNombre = (nombre) => {
  if (!nombre) return '';
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '');
};

const AdminCabanasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  // Estados principales
  const [tabValue, setTabValue] = useState(0);

  // Estados de Cabañas
  const [cabanas, setCabanas] = useState([]);
  const [loadingCabanas, setLoadingCabanas] = useState(false);
  const [dialogCabanaOpen, setDialogCabanaOpen] = useState(false);
  const [cabanaEdit, setCabanaEdit] = useState(null);

  // Estados de Reservas
  const [reservas, setReservas] = useState([]);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [dialogReservaOpen, setDialogReservaOpen] = useState(false);
  const [reservaEdit, setReservaEdit] = useState(null);

  // Estados para confirmación de pago
  const [dialogPagoOpen, setDialogPagoOpen] = useState(false);
  const [reservaParaPago, setReservaParaPago] = useState(null);


  // Form states
  const [formCabana, setFormCabana] = useState({
    nombre: '',
    descripcion: '',
    capacidad_personas: 2,
    numero_habitaciones: 1,
    numero_banos: 1,
    precio_noche: 0,
    precio_fin_semana: 0,
    estado: 'disponible',
    ubicacion: '',
    imagenes: []
  });

  // Estados para gestión de fotos
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formReserva, setFormReserva] = useState({
    cabana_id: '',
    cliente_nombre: '',
    cliente_apellido: '',
    cliente_telefono: '',
    cliente_email: '',
    cliente_rut: '',
    fecha_inicio: '',
    fecha_fin: '',
    cantidad_personas: 2,
    precio_por_noche: 0,
    precio_total: 0,
    estado: 'pendiente',
    origen: 'manual',
    notas: ''
  });

  // ============================================
  // EFECTOS
  // ============================================
  useEffect(() => {
    if (tabValue === 0) cargarCabanas();
    if (tabValue === 1) cargarReservas();
    if (tabValue === 2) {
      cargarReservas();
      if (cabanas.length === 0) cargarCabanas();
    }
  }, [tabValue]);


  // ============================================
  // FUNCIONES DE CARGA
  // ============================================
  const cargarCabanas = async () => {
    try {
      setLoadingCabanas(true);
      const response = await api.get('/cabanas/cabanas');
      const cabanasData = response.data?.cabanas || [];
      setCabanas(cabanasData);
    } catch (error) {
      console.error('Error loading cabañas:', error);
      enqueueSnackbar('Error al cargar cabañas', { variant: 'error' });
      setCabanas([]);
    } finally {
      setLoadingCabanas(false);
    }
  };

  const cargarReservas = async () => {
    try {
      setLoadingReservas(true);
      const response = await api.get('/cabanas/reservas');
      const reservasData = response.data?.reservas || [];
      setReservas(reservasData);
    } catch (error) {
      console.error('Error loading reservas:', error);
      enqueueSnackbar('Error al cargar reservas', { variant: 'error' });
      setReservas([]);
    } finally {
      setLoadingReservas(false);
    }
  };


  // ============================================
  // FUNCIONES PARA SUBIR IMÁGENES
  // ============================================
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Por favor selecciona un archivo de imagen', { variant: 'warning' });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('La imagen no debe superar 5MB', { variant: 'warning' });
      return;
    }

    // Convertir a base64 para preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormCabana(prev => ({
        ...prev,
        imagenes: [...(prev.imagenes || []), base64String]
      }));
      enqueueSnackbar('Imagen agregada correctamente', { variant: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleEliminarFoto = (index) => {
    setFormCabana(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index)
    }));
    enqueueSnackbar('Imagen eliminada', { variant: 'success' });
  };

  // ============================================
  // HANDLERS DE DIÁLOGOS
  // ============================================
  const handleOpenDialogCabana = (cabana = null) => {
    if (cabana) {
      setCabanaEdit(cabana);
      let imagenesArray = [];
      if (cabana.imagenes) {
        try {
          imagenesArray = typeof cabana.imagenes === 'string'
            ? JSON.parse(cabana.imagenes)
            : cabana.imagenes;
        } catch (e) {
          console.error('Error parsing imagenes:', e);
          imagenesArray = [];
        }
      }
      setFormCabana({
        ...cabana,
        imagenes: Array.isArray(imagenesArray) ? imagenesArray : []
      });
    } else {
      setCabanaEdit(null);
      setFormCabana({
        nombre: '',
        descripcion: '',
        capacidad_personas: 2,
        numero_habitaciones: 1,
        numero_banos: 1,
        precio_noche: 0,
        precio_fin_semana: 0,
        estado: 'disponible',
        ubicacion: '',
        imagenes: []
      });
    }
    setDialogCabanaOpen(true);
  };

  const handleCloseDialogCabana = () => {
    setDialogCabanaOpen(false);
    setCabanaEdit(null);
  };

  const handleSaveCabana = async () => {
    try {
      if (cabanaEdit) {
        await api.put(`/cabanas/cabanas/${cabanaEdit.id}`, formCabana);
        enqueueSnackbar('✅ Cabaña actualizada exitosamente', { variant: 'success' });
      } else {
        await api.post('/cabanas/cabanas', formCabana);
        enqueueSnackbar('✅ Cabaña creada exitosamente', { variant: 'success' });
      }
      handleCloseDialogCabana();
      cargarCabanas();
    } catch (error) {
      console.error('Error al guardar cabaña:', error);
      enqueueSnackbar(error.response?.data?.message || 'Error al guardar cabaña', { variant: 'error' });
    }
  };

  const handleDeleteCabana = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cabaña?')) return;
    try {
      await api.delete(`/cabanas/cabanas/${id}`);
      enqueueSnackbar('✅ Cabaña eliminada exitosamente', { variant: 'success' });
      cargarCabanas();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Error al eliminar cabaña', { variant: 'error' });
    }
  };

  const handleOpenDialogReserva = (reserva = null) => {
    if (reserva) {
      setReservaEdit(reserva);
      setFormReserva({
        cabana_id: reserva.cabana_id,
        cliente_nombre: reserva.cliente_nombre,
        cliente_apellido: reserva.cliente_apellido || '',
        cliente_telefono: reserva.cliente_telefono,
        cliente_email: reserva.cliente_email || '',
        cliente_rut: reserva.cliente_rut || '',
        fecha_inicio: reserva.fecha_inicio?.split('T')[0] || '',
        fecha_fin: reserva.fecha_fin?.split('T')[0] || '',
        cantidad_personas: reserva.cantidad_personas,
        precio_por_noche: reserva.precio_por_noche,
        precio_total: reserva.precio_total,
        estado: reserva.estado,
        origen: reserva.origen || 'manual',
        notas: reserva.notas || ''
      });
    } else {
      setReservaEdit(null);
      setFormReserva({
        cabana_id: '',
        cliente_nombre: '',
        cliente_apellido: '',
        cliente_telefono: '',
        cliente_email: '',
        cliente_rut: '',
        fecha_inicio: '',
        fecha_fin: '',
        cantidad_personas: 2,
        precio_por_noche: 0,
        precio_total: 0,
        estado: 'pendiente',
        origen: 'manual',
        notas: ''
      });
    }
    setDialogReservaOpen(true);
  };

  const handleCloseDialogReserva = () => {
    setDialogReservaOpen(false);
    setReservaEdit(null);
  };

  const handleSaveReserva = async () => {
    try {
      if (reservaEdit) {
        await api.put(`/cabanas/reservas/${reservaEdit.id}`, formReserva);
        enqueueSnackbar('✅ Reserva actualizada exitosamente', { variant: 'success' });
      } else {
        await api.post('/cabanas/reservas', formReserva);
        enqueueSnackbar('✅ Reserva creada exitosamente', { variant: 'success' });
      }
      handleCloseDialogReserva();
      cargarReservas();
    } catch (error) {
      console.error('Error al guardar reserva:', error);
      enqueueSnackbar(error.response?.data?.message || 'Error al guardar reserva', { variant: 'error' });
    }
  };

  const handleOpenDialogPago = (reserva) => {
    setReservaParaPago(reserva);
    setDialogPagoOpen(true);
  };

  const handleCloseDialogPago = () => {
    setDialogPagoOpen(false);
    setReservaParaPago(null);
  };

  const handleConfirmarPago = async (tipoPago) => {
    if (!reservaParaPago) return;

    try {
      const precioFinal = reservaParaPago.precio_final || 0;
      const montoPagado = tipoPago === 'completo' ? precioFinal : precioFinal / 2;
      const estadoPago = tipoPago === 'completo' ? 'pagado' : 'parcial';

      await api.put(`/cabanas/reservas/${reservaParaPago.id}`, {
        estado: 'confirmada',
        estado_pago: estadoPago,
        monto_pagado: montoPagado,
        metodo_pago: 'transferencia',
        usuario_modificacion: 'admin'
      });

      const mensaje = tipoPago === 'completo'
        ? '✅ Pago completo confirmado. Reserva actualizada a CONFIRMADA'
        : '✅ Pago parcial (50%) confirmado. Reserva actualizada a CONFIRMADA';

      enqueueSnackbar(mensaje, { variant: 'success' });
      handleCloseDialogPago();
      cargarReservas();
    } catch (error) {
      enqueueSnackbar('Error al confirmar pago', { variant: 'error' });
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await api.post(`/cabanas/reservas/${id}/checkin`);
      enqueueSnackbar('✅ Check-in realizado exitosamente', { variant: 'success' });
      cargarReservas();
    } catch (error) {
      enqueueSnackbar('Error al realizar check-in', { variant: 'error' });
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await api.post(`/cabanas/reservas/${id}/checkout`);
      enqueueSnackbar('✅ Check-out realizado exitosamente', { variant: 'success' });
      cargarReservas();
    } catch (error) {
      enqueueSnackbar('Error al realizar check-out', { variant: 'error' });
    }
  };

  const handleCancelarReserva = async (id) => {
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
    try {
      await api.delete(`/cabanas/reservas/${id}/cancelar`);
      enqueueSnackbar('✅ Reserva cancelada exitosamente', { variant: 'success' });
      cargarReservas();
    } catch (error) {
      enqueueSnackbar('Error al cancelar reserva', { variant: 'error' });
    }
  };


  // ============================================
  // CARDS DE ESTADÍSTICAS
  // ============================================
  const StatsCards = () => {
    const cabanasDisponibles = cabanas.filter(c => c.estado === 'disponible').length;
    const reservasActivas = reservas.filter(r => r.estado === 'confirmada' || r.estado === 'en_curso').length;
    const reservasPendientesPago = reservas.filter(r => r.estado_pago === 'pendiente').length;

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Grow in timeout={500}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700}>
                      {cabanasDisponibles}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      Cabañas Disponibles
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                    <CottageIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grow in timeout={700}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700}>
                      {reservasActivas}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      Reservas Activas
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                    <EventIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grow in timeout={900}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" fontWeight={700}>
                      {reservasPendientesPago}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      Pendientes de Pago
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                    <MoneyIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>
    );
  };

  // ============================================
  // RENDER TAB CABAÑAS (CON CARDS)
  // ============================================
  const renderTabCabanas = () => (
    <Fade in>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Gestión de Cabañas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administra las cabañas disponibles para reserva
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialogCabana()}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 25px rgba(102, 126, 234, 0.6)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            Nueva Cabaña
          </Button>
        </Box>

        {loadingCabanas ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {Array.isArray(cabanas) && cabanas.map((cabana, index) => (
              <Grid item xs={12} sm={6} md={4} key={cabana.id}>
                <Grow in timeout={300 + index * 100}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                        transform: 'translateY(-8px)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h5" fontWeight={700} gutterBottom>
                            {cabana.nombre}
                          </Typography>
                          <Chip
                            label={cabana.estado}
                            size="small"
                            color={cabana.estado === 'disponible' ? 'success' : 'warning'}
                            sx={{ fontWeight: 600, borderRadius: 2 }}
                          />
                        </Box>
                        <Avatar
                          sx={{
                            bgcolor: cabana.estado === 'disponible'
                              ? alpha('#4caf50', 0.1)
                              : alpha('#ff9800', 0.1),
                            color: cabana.estado === 'disponible' ? '#4caf50' : '#ff9800'
                          }}
                        >
                          <CottageIcon />
                        </Avatar>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                        {cabana.descripcion || 'Sin descripción'}
                      </Typography>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {cabana.capacidad_personas} personas
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <HotelIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {cabana.numero_habitaciones} hab.
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BathtubIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {cabana.numero_banos} baños
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2" noWrap>
                              {cabana.ubicacion || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Precio Temporada Baja
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          ${cabana.precio_noche?.toLocaleString('es-CL')} / noche
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Precio Temporada Alta
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="error">
                          ${cabana.precio_fin_semana?.toLocaleString('es-CL')} / noche
                        </Typography>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialogCabana(cabana)}
                        sx={{ borderRadius: 2, mr: 1 }}
                      >
                        Editar
                      </Button>
                      <Tooltip title="Eliminar">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteCabana(cabana.id)}
                          sx={{
                            border: '1px solid',
                            borderColor: 'error.main',
                            borderRadius: 2,
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Fade>
  );

  // ============================================
  // RENDER TAB RESERVAS - CON CANTIDAD DE TINAJAS Y TIMELINE
  // ============================================
  const renderTabReservas = () => {
    // Filtrar reservas pendientes (no pagadas)
    const reservasPendientes = reservas.filter(r => r.estado_pago === 'pendiente');

    return (
    <Fade in>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Cabañas Reservadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reservasPendientes.length > 0 && (
                <Chip
                  label={`${reservasPendientes.length} reserva${reservasPendientes.length > 1 ? 's' : ''} pendiente${reservasPendientes.length > 1 ? 's' : ''} de pago`}
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 600, borderRadius: 2, mr: 1 }}
                />
              )}
              Administra las reservas de cabañas
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialogReserva()}
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.5,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              boxShadow: '0 4px 20px rgba(240, 147, 251, 0.4)',
              '&:hover': {
                boxShadow: '0 6px 25px rgba(240, 147, 251, 0.6)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            Nueva Reserva
          </Button>
        </Box>

        {loadingReservas ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#667eea', 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cabaña</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Teléfono</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha Inicio</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha Fin</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tinajas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado Pago</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Precio</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(reservas) && reservas.map((reserva) => (
                  <TableRow
                    key={reserva.id}
                    sx={{
                      '&:hover': {
                        bgcolor: alpha('#667eea', 0.02),
                      }
                    }}
                  >
                    <TableCell>#{reserva.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CottageIcon fontSize="small" color="action" />
                        {reserva.nombre_cabana}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" color="action" />
                        {reserva.cliente_nombre} {reserva.cliente_apellido}
                      </Box>
                    </TableCell>
                    <TableCell>{reserva.cliente_telefono}</TableCell>
                    <TableCell>{new Date(reserva.fecha_inicio).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>{new Date(reserva.fecha_fin).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      {reserva.tiene_tinaja ? (
                        <Chip
                          icon={<HotTubIcon />}
                          label={`${reserva.cantidad_tinajas} Tinaja${reserva.cantidad_tinajas > 1 ? 's' : ''}`}
                          size="small"
                          color="info"
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        />
                      ) : (
                        <Chip
                          label="Sin tinajas"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reserva.estado}
                        size="small"
                        color={
                          reserva.estado === 'confirmada' ? 'success' :
                          reserva.estado === 'pendiente' ? 'warning' :
                          reserva.estado === 'cancelada' ? 'error' : 'info'
                        }
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          reserva.estado_pago === 'pagado' ? 'Pagado Completo' :
                          reserva.estado_pago === 'parcial' ? `Paga la Mitad (${reserva.monto_pagado ? `$${reserva.monto_pagado.toLocaleString('es-CL')}` : '50%'})` :
                          'Pendiente'
                        }
                        size="small"
                        color={
                          reserva.estado_pago === 'pagado' ? 'success' :
                          reserva.estado_pago === 'parcial' ? 'info' :
                          'warning'
                        }
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ${reserva.precio_final?.toLocaleString('es-CL')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', minWidth: 280 }}>
                        {/* Botón Confirmar Pago - MUY VISUAL */}
                        {reserva.estado === 'pendiente' && (
                          <Grow in timeout={300}>
                            <Button
                              size="large"
                              variant="contained"
                              startIcon={<MoneyIcon sx={{ fontSize: 24 }} />}
                              onClick={() => handleOpenDialogPago(reserva)}
                              sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                fontWeight: 900,
                                fontSize: '0.95rem',
                                background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: '0 6px 30px rgba(76, 175, 80, 0.6)',
                                  transform: 'scale(1.05) translateY(-2px)',
                                  background: 'linear-gradient(135deg, #45A049 0%, #388E3C 100%)',
                                }
                              }}
                            >
                              Confirmar Pago
                            </Button>
                          </Grow>
                        )}

                        {/* Botón Check-In - MUY VISUAL */}
                        {reserva.estado === 'confirmada' && !reserva.check_in_realizado && (
                          <Grow in timeout={400}>
                            <Button
                              size="large"
                              variant="contained"
                              startIcon={<CheckCircleIcon sx={{ fontSize: 24 }} />}
                              onClick={() => handleCheckIn(reserva.id)}
                              sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                fontWeight: 900,
                                fontSize: '0.95rem',
                                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                                boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: '0 6px 30px rgba(33, 150, 243, 0.6)',
                                  transform: 'scale(1.05) translateY(-2px)',
                                  background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                                }
                              }}
                            >
                              Check-In
                            </Button>
                          </Grow>
                        )}

                        {/* Botón Check-Out - MUY VISUAL */}
                        {reserva.check_in_realizado && !reserva.check_out_realizado && (
                          <Grow in timeout={500}>
                            <Button
                              size="large"
                              variant="contained"
                              startIcon={<CheckCircleIcon sx={{ fontSize: 24 }} />}
                              onClick={() => handleCheckOut(reserva.id)}
                              sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                fontWeight: 900,
                                fontSize: '0.95rem',
                                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: '0 6px 30px rgba(255, 152, 0, 0.6)',
                                  transform: 'scale(1.05) translateY(-2px)',
                                  background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                                }
                              }}
                            >
                              Check-Out
                            </Button>
                          </Grow>
                        )}

                        {/* Botón Editar - GRANDE Y VISUAL */}
                        <Grow in timeout={600}>
                          <Tooltip title="Editar Reserva" placement="top">
                            <Button
                              size="large"
                              variant="outlined"
                              onClick={() => handleOpenDialogReserva(reserva)}
                              sx={{
                                borderRadius: 3,
                                px: 2,
                                py: 1.5,
                                minWidth: 56,
                                borderWidth: 2,
                                borderColor: '#667eea',
                                color: '#667eea',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  borderWidth: 2,
                                  borderColor: '#667eea',
                                  bgcolor: alpha('#667eea', 0.1),
                                  transform: 'scale(1.1) rotate(5deg)',
                                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                                }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 24 }} />
                            </Button>
                          </Tooltip>
                        </Grow>

                        {/* Botón Cancelar - GRANDE Y VISUAL */}
                        {reserva.estado !== 'cancelada' && (
                          <Grow in timeout={700}>
                            <Tooltip title="Cancelar Reserva" placement="top">
                              <Button
                                size="large"
                                variant="outlined"
                                onClick={() => handleCancelarReserva(reserva.id)}
                                sx={{
                                  borderRadius: 3,
                                  px: 2,
                                  py: 1.5,
                                  minWidth: 56,
                                  borderWidth: 2,
                                  borderColor: '#f44336',
                                  color: '#f44336',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    borderWidth: 2,
                                    borderColor: '#d32f2f',
                                    bgcolor: alpha('#f44336', 0.1),
                                    transform: 'scale(1.1) rotate(-5deg)',
                                    boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
                                  }
                                }}
                              >
                                <CancelIcon sx={{ fontSize: 24 }} />
                              </Button>
                            </Tooltip>
                          </Grow>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Fade>
    );
  };

  // ============================================
  // RENDER TAB TIMELINE - SUPER MEJORADO
  // ============================================
  const renderTabTimeline = () => {
    return (
      <Fade in>
        <Box>
          {/* Header del Timeline */}
          <Paper
            elevation={6}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              mb: 4,
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 72, height: 72 }}>
                <EventIcon sx={{ fontSize: 42 }} />
              </Avatar>
              <Box>
                <Typography variant="h3" fontWeight={900}>
                  Timeline de Reservas
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.95, mt: 1 }}>
                  Vista detallada de todas las cabanas y sus reservas activas con acciones completas
                </Typography>
              </Box>
            </Box>
          </Paper>

          {loadingReservas ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          ) : cabanas.length > 0 ? (
            <Grid container spacing={4}>
              {cabanas.map((cabana, idx) => {
                const reservasCabana = reservas.filter(r => r.cabana_id === cabana.id && r.estado !== 'cancelada');
                const colorCabana = COLORES_CABANAS[normalizarNombre(cabana.nombre)] || '#667eea';

                return (
                  <Grid item xs={12} key={cabana.id}>
                    <Grow in timeout={300 + idx * 100}>
                      <Card
                        elevation={8}
                        sx={{
                          borderRadius: 4,
                          overflow: 'visible',
                          transition: 'all 0.4s ease',
                          border: `4px solid ${colorCabana}`,
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-8px)',
                            boxShadow: `0 16px 48px ${colorCabana}50`,
                          }
                        }}
                      >
                        {/* Header de la cabana con color unico */}
                        <Box
                          sx={{
                            background: `linear-gradient(135deg, ${colorCabana} 0%, ${colorCabana}DD 100%)`,
                            p: 3.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            position: 'relative',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'none\'/%3E%3Cpath d=\'M10 0L0 10l10 10 10-10z\' fill=\'%23ffffff\' opacity=\'0.05\'/%3E%3C/svg%3E")',
                              opacity: 0.1
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, position: 'relative', zIndex: 1 }}>
                            <Avatar sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              width: 72,
                              height: 72,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}>
                              <CottageIcon sx={{ fontSize: 40, color: 'white' }} />
                            </Avatar>
                            <Box>
                              <Typography variant="h3" fontWeight={900} sx={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                {cabana.nombre}
                              </Typography>
                              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.95)', mt: 0.5 }}>
                                Capacidad: {cabana.capacidad_personas} personas • {cabana.numero_habitaciones} habitacion{cabana.numero_habitaciones !== 1 ? 'es' : ''}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={`${reservasCabana.length} ${reservasCabana.length === 1 ? 'Reserva' : 'Reservas'}`}
                            size="large"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '1.2rem',
                              height: 56,
                              borderRadius: 3,
                              px: 4,
                              backdropFilter: 'blur(10px)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                              position: 'relative',
                              zIndex: 1
                            }}
                          />
                        </Box>

                        {/* Contenido: Reservas en cards mejoradas */}
                        <CardContent sx={{ p: 4, bgcolor: alpha(colorCabana, 0.04) }}>
                          {reservasCabana.length > 0 ? (
                            <Grid container spacing={3}>
                              {reservasCabana.map((reserva, rIdx) => (
                                <Grid item xs={12} sm={6} md={4} key={reserva.id}>
                                  <Fade in timeout={400 + rIdx * 100}>
                                    <Card
                                      elevation={6}
                                      sx={{
                                        borderRadius: 3,
                                        border: '3px solid',
                                        borderColor:
                                          reserva.estado_pago === 'pagado' ? '#4CAF50' :
                                          reserva.estado_pago === 'parcial' ? '#2196F3' : '#FFC107',
                                        transition: 'all 0.3s ease',
                                        overflow: 'hidden',
                                        '&:hover': {
                                          transform: 'translateY(-8px)',
                                          boxShadow: 8,
                                          borderWidth: '4px'
                                        }
                                      }}
                                    >
                                      {/* Header de reserva */}
                                      <Box
                                        sx={{
                                          background:
                                            reserva.estado_pago === 'pagado'
                                              ? 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)'
                                              : reserva.estado_pago === 'parcial'
                                              ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
                                              : 'linear-gradient(135deg, #FFC107 0%, #FFB300 100%)',
                                          p: 2.5,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <Typography variant="h5" fontWeight={900} sx={{ color: 'white' }}>
                                          Reserva #{reserva.id}
                                        </Typography>
                                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 48, height: 48 }}>
                                          <PersonIcon sx={{ color: 'white', fontSize: 28 }} />
                                        </Avatar>
                                      </Box>

                                      {/* Informacion de reserva */}
                                      <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                                          {reserva.cliente_nombre} {reserva.cliente_apellido}
                                        </Typography>
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                          <CalendarIcon fontSize="small" color="action" />
                                          <Typography variant="body1" color="text.secondary" fontWeight={500}>
                                            Check-in: {new Date(reserva.fecha_inicio).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                          <CalendarIcon fontSize="small" color="action" />
                                          <Typography variant="body1" color="text.secondary" fontWeight={500}>
                                            Check-out: {new Date(reserva.fecha_fin).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                          <PeopleIcon fontSize="small" color="action" />
                                          <Typography variant="body1" color="text.secondary" fontWeight={500}>
                                            {reserva.cantidad_personas} persona{reserva.cantidad_personas !== 1 ? 's' : ''}
                                          </Typography>
                                        </Box>

                                        {/* Estado de pago */}
                                        <Chip
                                          label={
                                            reserva.estado_pago === 'pagado' ? 'PAGADO COMPLETO' :
                                            reserva.estado_pago === 'parcial' ? `PAGO PARCIAL (${reserva.monto_pagado ? `$${reserva.monto_pagado.toLocaleString('es-CL')}` : '50%'})` :
                                            'PENDIENTE DE PAGO'
                                          }
                                          size="medium"
                                          sx={{
                                            width: '100%',
                                            fontWeight: 900,
                                            bgcolor:
                                              reserva.estado_pago === 'pagado' ? '#4CAF50' :
                                              reserva.estado_pago === 'parcial' ? '#2196F3' : '#FFC107',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            py: 2,
                                            mb: 1.5
                                          }}
                                        />

                                        {/* Tinajas */}
                                        {reserva.tiene_tinaja && (
                                          <Chip
                                            icon={<HotTubIcon />}
                                            label={`${reserva.cantidad_tinajas} Tinaja${reserva.cantidad_tinajas > 1 ? 's' : ''}`}
                                            size="medium"
                                            color="info"
                                            sx={{ mb: 2, fontWeight: 700, fontSize: '0.9rem' }}
                                          />
                                        )}

                                        {/* Precio */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, bgcolor: alpha('#667eea', 0.08), borderRadius: 2 }}>
                                          <MoneyIcon color="primary" />
                                          <Typography variant="h6" fontWeight={700} color="primary">
                                            ${reserva.precio_final?.toLocaleString('es-CL')}
                                          </Typography>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        {/* BOTONES DE ACCION - TODOS INCLUIDOS */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                          {/* Boton Confirmar Pago */}
                                          {reserva.estado === 'pendiente' && (
                                            <Grow in timeout={300}>
                                              <Button
                                                fullWidth
                                                size="large"
                                                variant="contained"
                                                startIcon={<MoneyIcon sx={{ fontSize: 22 }} />}
                                                onClick={() => handleOpenDialogPago(reserva)}
                                                sx={{
                                                  borderRadius: 2.5,
                                                  py: 1.5,
                                                  fontWeight: 900,
                                                  fontSize: '0.95rem',
                                                  background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                                                  boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
                                                  transition: 'all 0.3s ease',
                                                  '&:hover': {
                                                    boxShadow: '0 6px 24px rgba(76, 175, 80, 0.6)',
                                                    transform: 'scale(1.03)',
                                                    background: 'linear-gradient(135deg, #45A049 0%, #388E3C 100%)',
                                                  }
                                                }}
                                              >
                                                Confirmar Pago
                                              </Button>
                                            </Grow>
                                          )}

                                          {/* Boton Check-In */}
                                          {reserva.estado === 'confirmada' && !reserva.check_in_realizado && (
                                            <Grow in timeout={400}>
                                              <Button
                                                fullWidth
                                                size="large"
                                                variant="contained"
                                                startIcon={<CheckCircleIcon sx={{ fontSize: 22 }} />}
                                                onClick={() => handleCheckIn(reserva.id)}
                                                sx={{
                                                  borderRadius: 2.5,
                                                  py: 1.5,
                                                  fontWeight: 900,
                                                  fontSize: '0.95rem',
                                                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                                                  boxShadow: '0 4px 16px rgba(33, 150, 243, 0.4)',
                                                  color: 'white',
                                                  transition: 'all 0.3s ease',
                                                  '&:hover': {
                                                    boxShadow: '0 6px 24px rgba(33, 150, 243, 0.6)',
                                                    transform: 'scale(1.03)',
                                                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                                                  }
                                                }}
                                              >
                                                Check-In
                                              </Button>
                                            </Grow>
                                          )}

                                          {/* Boton Check-Out */}
                                          {reserva.check_in_realizado && !reserva.check_out_realizado && (
                                            <Grow in timeout={500}>
                                              <Button
                                                fullWidth
                                                size="large"
                                                variant="contained"
                                                startIcon={<CheckCircleIcon sx={{ fontSize: 22 }} />}
                                                onClick={() => handleCheckOut(reserva.id)}
                                                sx={{
                                                  borderRadius: 2.5,
                                                  py: 1.5,
                                                  fontWeight: 900,
                                                  fontSize: '0.95rem',
                                                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                                                  boxShadow: '0 4px 16px rgba(255, 152, 0, 0.4)',
                                                  color: 'white',
                                                  transition: 'all 0.3s ease',
                                                  '&:hover': {
                                                    boxShadow: '0 6px 24px rgba(255, 152, 0, 0.6)',
                                                    transform: 'scale(1.03)',
                                                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                                                  }
                                                }}
                                              >
                                                Check-Out
                                              </Button>
                                            </Grow>
                                          )}

                                          {/* Botones Editar y Cancelar en fila */}
                                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                                            <Grow in timeout={600}>
                                              <Tooltip title="Editar Reserva" placement="top">
                                                <Button
                                                  fullWidth
                                                  size="large"
                                                  variant="outlined"
                                                  onClick={() => handleOpenDialogReserva(reserva)}
                                                  sx={{
                                                    borderRadius: 2.5,
                                                    py: 1.5,
                                                    borderWidth: 2.5,
                                                    borderColor: '#667eea',
                                                    color: '#667eea',
                                                    fontWeight: 700,
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                      borderWidth: 2.5,
                                                      borderColor: '#667eea',
                                                      bgcolor: alpha('#667eea', 0.12),
                                                      transform: 'scale(1.05)',
                                                      boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                                                    }
                                                  }}
                                                >
                                                  <EditIcon sx={{ fontSize: 22 }} />
                                                </Button>
                                              </Tooltip>
                                            </Grow>

                                            {reserva.estado !== 'cancelada' && (
                                              <Grow in timeout={700}>
                                                <Tooltip title="Cancelar Reserva" placement="top">
                                                  <Button
                                                    fullWidth
                                                    size="large"
                                                    variant="outlined"
                                                    onClick={() => handleCancelarReserva(reserva.id)}
                                                    sx={{
                                                      borderRadius: 2.5,
                                                      py: 1.5,
                                                      borderWidth: 2.5,
                                                      borderColor: '#f44336',
                                                      color: '#f44336',
                                                      fontWeight: 700,
                                                      transition: 'all 0.3s ease',
                                                      '&:hover': {
                                                        borderWidth: 2.5,
                                                        borderColor: '#d32f2f',
                                                        bgcolor: alpha('#f44336', 0.12),
                                                        transform: 'scale(1.05)',
                                                        boxShadow: '0 4px 16px rgba(244, 67, 54, 0.3)',
                                                      }
                                                    }}
                                                  >
                                                    <CancelIcon sx={{ fontSize: 22 }} />
                                                  </Button>
                                                </Tooltip>
                                              </Grow>
                                            )}
                                          </Box>
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  </Fade>
                                </Grid>
                              ))}
                            </Grid>
                          ) : (
                            <Box
                              sx={{
                                textAlign: 'center',
                                py: 8,
                                px: 4,
                                bgcolor: 'white',
                                borderRadius: 4,
                                border: '3px dashed',
                                borderColor: alpha(colorCabana, 0.3)
                              }}
                            >
                              <EventIcon sx={{ fontSize: 100, color: alpha(colorCabana, 0.4), mb: 3 }} />
                              <Typography variant="h5" color="text.secondary" fontWeight={700}>
                                Sin reservas activas
                              </Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                                Esta cabana esta disponible para nuevas reservas
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grow>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <CottageIcon sx={{ fontSize: 100, color: 'text.disabled', mb: 3 }} />
              <Typography variant="h5" color="text.secondary" fontWeight={600}>
                No hay cabanas registradas
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    );
  };


  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header con gradiente */}
      <Box
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <CottageIcon sx={{ fontSize: 48 }} />
            <Typography variant="h3" fontWeight={800}>
              Gestión de Cabañas
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Sistema completo de administración de cabañas y reservas
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      {tabValue === 0 && <StatsCards />}

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          mb: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              py: 2,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 70,
            },
            '& .Mui-selected': {
              background: alpha('#667eea', 0.08),
            },
            '& .MuiTabs-indicator': {
              height: 4,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        >
          <Tab
            icon={<CottageIcon />}
            label="Cabañas"
            iconPosition="start"
          />
          <Tab
            icon={<CalendarIcon />}
            label="Reservas"
            iconPosition="start"
          />
          <Tab
            icon={<EventIcon />}
            label="Timeline"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Contenido de Tabs */}
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && renderTabCabanas()}
        {tabValue === 1 && renderTabReservas()}
        {tabValue === 2 && renderTabTimeline()}
      </Box>

      {/* Input oculto para seleccionar archivos */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileSelect}
      />

      {/* Diálogo de Cabaña - CON BOTÓN DE SUBIR IMÁGENES */}
      <Dialog
        open={dialogCabanaOpen}
        onClose={handleCloseDialogCabana}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: alpha('#667eea', 0.05), fontWeight: 700 }}>
          {cabanaEdit ? 'Editar Cabaña' : 'Nueva Cabaña'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formCabana.nombre}
                onChange={(e) => setFormCabana({ ...formCabana, nombre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estado"
                select
                value={formCabana.estado}
                onChange={(e) => setFormCabana({ ...formCabana, estado: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="disponible">Disponible</option>
                <option value="ocupada">Ocupada</option>
                <option value="mantenimiento">Mantenimiento</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={formCabana.descripcion}
                onChange={(e) => setFormCabana({ ...formCabana, descripcion: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Capacidad Personas"
                value={formCabana.capacidad_personas}
                onChange={(e) => setFormCabana({ ...formCabana, capacidad_personas: parseInt(e.target.value) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PeopleIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Habitaciones"
                value={formCabana.numero_habitaciones}
                onChange={(e) => setFormCabana({ ...formCabana, numero_habitaciones: parseInt(e.target.value) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HotelIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Baños"
                value={formCabana.numero_banos}
                onChange={(e) => setFormCabana({ ...formCabana, numero_banos: parseInt(e.target.value) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BathtubIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Precio Temporada Baja"
                value={formCabana.precio_noche}
                onChange={(e) => setFormCabana({ ...formCabana, precio_noche: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      $
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Precio Temporada Alta"
                value={formCabana.precio_fin_semana}
                onChange={(e) => setFormCabana({ ...formCabana, precio_fin_semana: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      $
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ubicación"
                value={formCabana.ubicacion}
                onChange={(e) => setFormCabana({ ...formCabana, ubicacion: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Sección de Gestión de Fotos - CON BOTÓN DE SUBIR */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon /> Gestión de Imágenes
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sube imágenes desde tu dispositivo
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Subir Imagen
              </Button>
            </Grid>

            {/* Galería de imágenes */}
            {formCabana.imagenes && formCabana.imagenes.length > 0 && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: alpha('#667eea', 0.05), borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Imágenes agregadas ({formCabana.imagenes.length})
                  </Typography>
                  <ImageList sx={{ mt: 2 }} cols={3} rowHeight={164}>
                    {formCabana.imagenes.map((img, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={img}
                          alt={`Imagen ${index + 1}`}
                          loading="lazy"
                          style={{ height: '100%', objectFit: 'cover' }}
                        />
                        <ImageListItemBar
                          title={`Imagen ${index + 1}`}
                          actionIcon={
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                              onClick={() => handleEliminarFoto(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseDialogCabana}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveCabana}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Reserva */}
      <Dialog
        open={dialogReservaOpen}
        onClose={handleCloseDialogReserva}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: alpha('#f093fb', 0.05), fontWeight: 700 }}>
          {reservaEdit ? 'Editar Reserva' : 'Nueva Reserva'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cabaña"
                select
                value={formReserva.cabana_id}
                onChange={(e) => setFormReserva({ ...formReserva, cabana_id: e.target.value })}
                SelectProps={{ native: true }}
                required
              >
                <option value="">Seleccionar cabaña</option>
                {cabanas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formReserva.cliente_nombre}
                onChange={(e) => setFormReserva({ ...formReserva, cliente_nombre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={formReserva.cliente_apellido}
                onChange={(e) => setFormReserva({ ...formReserva, cliente_apellido: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formReserva.cliente_telefono}
                onChange={(e) => setFormReserva({ ...formReserva, cliente_telefono: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formReserva.cliente_email}
                onChange={(e) => setFormReserva({ ...formReserva, cliente_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="RUT"
                value={formReserva.cliente_rut}
                onChange={(e) => setFormReserva({ ...formReserva, cliente_rut: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cantidad Personas"
                type="number"
                value={formReserva.cantidad_personas}
                onChange={(e) => setFormReserva({ ...formReserva, cantidad_personas: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Inicio"
                value={formReserva.fecha_inicio}
                onChange={(e) => setFormReserva({ ...formReserva, fecha_inicio: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Fin"
                value={formReserva.fecha_fin}
                onChange={(e) => setFormReserva({ ...formReserva, fecha_fin: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Precio por Noche"
                value={formReserva.precio_por_noche}
                onChange={(e) => setFormReserva({ ...formReserva, precio_por_noche: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Precio Total"
                value={formReserva.precio_total}
                onChange={(e) => setFormReserva({ ...formReserva, precio_total: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estado"
                select
                value={formReserva.estado}
                onChange={(e) => setFormReserva({ ...formReserva, estado: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
                <option value="completada">Completada</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={3}
                value={formReserva.notas}
                onChange={(e) => setFormReserva({ ...formReserva, notas: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseDialogReserva}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveReserva}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 4,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación de Pago */}
      <Dialog
        open={dialogPagoOpen}
        onClose={handleCloseDialogPago}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: alpha('#4caf50', 0.05), fontWeight: 700 }}>
          Confirmar Pago de Reserva
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {reservaParaPago && (
            <Box>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Reserva #{reservaParaPago.id} - {reservaParaPago.nombre_cabana}
                </Typography>
                <Typography variant="body2">
                  Cliente: {reservaParaPago.cliente_nombre} {reservaParaPago.cliente_apellido}
                </Typography>
                <Typography variant="body2">
                  Precio Total: ${reservaParaPago.precio_final?.toLocaleString('es-CL')}
                </Typography>
              </Alert>

              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Selecciona el tipo de pago:
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={() => handleConfirmarPago('completo')}
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                      boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)',
                      '&:hover': {
                        boxShadow: '0 6px 25px rgba(76, 175, 80, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <MoneyIcon sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="button" fontWeight={700}>
                        Pagado Completo
                      </Typography>
                      <Typography variant="caption" display="block">
                        ${reservaParaPago.precio_final?.toLocaleString('es-CL')}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="info"
                    size="large"
                    onClick={() => handleConfirmarPago('mitad')}
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)',
                      '&:hover': {
                        boxShadow: '0 6px 25px rgba(33, 150, 243, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <MoneyIcon sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="button" fontWeight={700}>
                        Paga la Mitad
                      </Typography>
                      <Typography variant="caption" display="block">
                        ${((reservaParaPago.precio_final || 0) / 2).toLocaleString('es-CL')} (50%)
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseDialogPago}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminCabanasPage;
