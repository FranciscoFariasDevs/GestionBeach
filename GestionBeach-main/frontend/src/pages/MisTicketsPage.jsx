// frontend/src/pages/MisTicketsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ConfirmationNumber as TicketIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  PlayArrow as ActiveIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  BugReport as BugIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Assignment as AssignmentIcon,
  Image as ImageIcon,
  AttachFile as AttachFileIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import { useSnackbar } from 'notistack';
import { keyframes } from '@mui/system';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';

// Animaciones
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const MisTicketsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  // Estados
  const [tabActual, setTabActual] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [tabDialogo, setTabDialogo] = useState(0); // 0 = Conversación, 1 = Timeline
  const [imagenAdjunta, setImagenAdjunta] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null);
  const [busquedaTickets, setBusquedaTickets] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [tabActual]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      await Promise.all([
        cargarTickets(),
        cargarEstadisticas(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarTickets = async () => {
    try {
      const estado = ['todos', 'activo', 'resuelto', 'cancelado', 'vencido'][tabActual];
      const response = await api.get('/tickets/mis-tickets', {
        params: { estado, limite: 50 }
      });

      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      console.error('Error al cargar tickets:', error);
      enqueueSnackbar('Error al cargar tickets', { variant: 'error' });
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await api.get('/tickets/admin/estadisticas');
      if (response.data.success) {
        setEstadisticas(response.data.estadisticas);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const abrirDetalle = async (ticketId) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      if (response.data.success) {
        setTicketSeleccionado(response.data);
        setDialogoAbierto(true);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      enqueueSnackbar('Error al cargar detalle del ticket', { variant: 'error' });
    }
  };

  const enviarRespuesta = async () => {
    if (!respuesta.trim() && !imagenAdjunta) {
      enqueueSnackbar('Por favor escribe una respuesta o adjunta una imagen', { variant: 'warning' });
      return;
    }

    setEnviandoRespuesta(true);

    try {
      // Usar FormData para enviar imagen
      const formData = new FormData();
      formData.append('mensaje', respuesta.trim());
      if (imagenAdjunta) {
        formData.append('imagen', imagenAdjunta);
      }

      const response = await api.post(
        `/tickets/${ticketSeleccionado.ticket.id}/responder`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        enqueueSnackbar('Respuesta enviada', { variant: 'success' });
        setRespuesta('');
        setImagenAdjunta(null);
        setPreviewImagen(null);
        // Recargar detalle
        abrirDetalle(ticketSeleccionado.ticket.id);
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      enqueueSnackbar('Error al enviar respuesta', { variant: 'error' });
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  // Manejar selección de imagen
  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        enqueueSnackbar('La imagen no puede superar 5MB', { variant: 'error' });
        return;
      }
      // Liberar URL anterior antes de crear la nueva
      if (previewImagen) URL.revokeObjectURL(previewImagen);
      setImagenAdjunta(file);
      setPreviewImagen(URL.createObjectURL(file));
    }
  };

  const eliminarImagen = () => {
    if (previewImagen) URL.revokeObjectURL(previewImagen);
    setImagenAdjunta(null);
    setPreviewImagen(null);
  };

  const cambiarEstado = async (nuevoEstado) => {
    setCambiandoEstado(true);

    try {
      const response = await api.put(`/tickets/${ticketSeleccionado.ticket.id}/estado`, {
        estado: nuevoEstado,
        comentario: `Estado cambiado a ${nuevoEstado}`
      });

      if (response.data.success) {
        enqueueSnackbar('Estado actualizado exitosamente', { variant: 'success' });
        // Recargar detalle y lista
        await abrirDetalle(ticketSeleccionado.ticket.id);
        await cargarTickets();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      enqueueSnackbar('Error al cambiar estado', { variant: 'error' });
    } finally {
      setCambiandoEstado(false);
    }
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      activo: '#2196F3',
      en_proceso: '#FF9800',
      resuelto: '#4CAF50',
      cancelado: '#9E9E9E',
      vencido: '#F44336',
    };
    return colores[estado] || '#666';
  };

  const obtenerIconoEstado = (estado) => {
    const iconos = {
      activo: <ActiveIcon />,
      en_proceso: <TimeIcon />,
      resuelto: <CheckIcon />,
      cancelado: <CancelIcon />,
      vencido: <WarningIcon />,
    };
    return iconos[estado] || <TicketIcon />;
  };

  const obtenerColorPrioridad = (prioridad) => {
    const colores = {
      baja: '#4CAF50',
      media: '#2196F3',
      alta: '#FF9800',
      critica: '#F44336',
    };
    return colores[prioridad] || '#666';
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tiempoTranscurrido = (fecha) => {
    const ahora = new Date();
    const creacion = new Date(fecha);
    const diff = Math.floor((ahora - creacion) / 1000 / 60); // minutos

    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} hrs`;
    return `Hace ${Math.floor(diff / 1440)} días`;
  };

  const ticketsFiltrados = tickets.filter(t => {
    const term = busquedaTickets.toLowerCase();
    const matchText = !term ||
      t.titulo?.toLowerCase().includes(term) ||
      t.descripcion?.toLowerCase().includes(term) ||
      t.creador_nombre?.toLowerCase().includes(term) ||
      t.asignado_nombre?.toLowerCase().includes(term);
    const matchPrio = !filtroPrioridad || t.prioridad === filtroPrioridad;
    return matchText && matchPrio;
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 70,
                height: 70,
                bgcolor: 'white',
                color: '#667eea',
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 35 }} />
            </Avatar>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                color: 'white',
                mb: 1,
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              Mis Tickets
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
              }}
            >
              Gestiona tus solicitudes de soporte
            </Typography>
          </Box>
        </Fade>

        {/* Estadísticas */}
        {estadisticas && (
          <Fade in timeout={800}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: '#2196F3',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {estadisticas.activos || 0}
                    </Typography>
                    <Typography variant="caption">Activos</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: '#FF9800',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {estadisticas.en_proceso || 0}
                    </Typography>
                    <Typography variant="caption">En Proceso</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: '#4CAF50',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {estadisticas.resueltos || 0}
                    </Typography>
                    <Typography variant="caption">Resueltos</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: '#9E9E9E',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {estadisticas.cancelados || 0}
                    </Typography>
                    <Typography variant="caption">Cancelados</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: '#F44336',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {estadisticas.vencidos || 0}
                    </Typography>
                    <Typography variant="caption">Vencidos</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={6} sm={4} md={2}>
                <Card
                  sx={{
                    bgcolor: 'white',
                    textAlign: 'center',
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {estadisticas.total || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Fade>
        )}

        {/* Tabs y contenido */}
        <Card sx={{ borderRadius: 3, boxShadow: 5 }}>
          <Tabs
            value={tabActual}
            onChange={(e, newValue) => setTabActual(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: '#f5f5f5',
            }}
          >
            <Tab label="Todos" icon={<TicketIcon />} iconPosition="start" />
            <Tab
              label="Activos"
              icon={<Badge badgeContent={estadisticas?.activos || 0} color="primary"><ActiveIcon /></Badge>}
              iconPosition="start"
            />
            <Tab
              label="Resueltos"
              icon={<CheckIcon />}
              iconPosition="start"
            />
            <Tab label="Cancelados" icon={<CancelIcon />} iconPosition="start" />
            <Tab
              label="Vencidos"
              icon={<Badge badgeContent={estadisticas?.vencidos || 0} color="error"><WarningIcon /></Badge>}
              iconPosition="start"
            />
          </Tabs>

          {/* Barra de búsqueda y filtros */}
          <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 0, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar por título, descripción, creador..."
              value={busquedaTickets}
              onChange={(e) => setBusquedaTickets(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }}/> }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Prioridad</InputLabel>
              <Select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} label="Prioridad">
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="baja">Baja</MenuItem>
                <MenuItem value="media">Media</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="critica">Crítica</MenuItem>
              </Select>
            </FormControl>
            {(busquedaTickets || filtroPrioridad) && (
              <Button size="small" startIcon={<FilterListIcon/>} onClick={() => { setBusquedaTickets(''); setFiltroPrioridad(''); }} variant="outlined" color="inherit">
                Limpiar
              </Button>
            )}
          </Box>

          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {loading ? (
              <Box sx={{ py: 4 }}>
                <LinearProgress />
                <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
                  Cargando tickets...
                </Typography>
              </Box>
            ) : ticketsFiltrados.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: '#f5f5f5',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <TicketIcon sx={{ fontSize: 50, color: '#bbb' }} />
                </Avatar>
                <Typography variant="h6" color="text.secondary">
                  {busquedaTickets || filtroPrioridad ? 'Sin resultados con estos filtros' : 'No hay tickets en esta categoría'}
                </Typography>
              </Box>
            ) : (
              <List>
                {ticketsFiltrados.map((ticket, index) => (
                  <Fade in key={ticket.id} timeout={300 + index * 100}>
                    <Paper
                      elevation={2}
                      sx={{
                        mb: 2,
                        p: 2,
                        borderLeft: `6px solid ${obtenerColorEstado(ticket.estado)}`,
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.3s',
                        },
                        animation: `${slideUp} 0.5s ease-out`,
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8} md={6}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar
                              sx={{
                                bgcolor: obtenerColorEstado(ticket.estado),
                                width: 50,
                                height: 50,
                              }}
                            >
                              {obtenerIconoEstado(ticket.estado)}
                            </Avatar>

                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" fontWeight="bold" gutterBottom>
                                {ticket.asunto}
                              </Typography>

                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                                <Chip
                                  label={ticket.numero_ticket}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />

                                <Chip
                                  label={ticket.estado.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  sx={{
                                    bgcolor: obtenerColorEstado(ticket.estado),
                                    color: 'white',
                                    fontWeight: 'bold',
                                  }}
                                />

                                <Chip
                                  label={ticket.prioridad.toUpperCase()}
                                  size="small"
                                  sx={{
                                    bgcolor: obtenerColorPrioridad(ticket.prioridad),
                                    color: 'white',
                                  }}
                                />

                                {ticket.categoria_nombre && (
                                  <Chip
                                    label={ticket.categoria_nombre}
                                    size="small"
                                    sx={{
                                      bgcolor: ticket.categoria_color,
                                      color: 'white',
                                    }}
                                  />
                                )}
                              </Stack>

                              <Typography variant="body2" color="text.secondary" noWrap>
                                {ticket.mensaje}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        <Grid item xs={12} sm={4} md={3}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            <TimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                            {tiempoTranscurrido(ticket.fecha_creacion)}
                          </Typography>

                          {ticket.reportante_nombre && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              <PersonIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                              Reportado por: {ticket.usuario_id === user?.id ? 'Tú' : ticket.reportante_nombre}
                            </Typography>
                          )}

                          {ticket.asignado_nombre && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              <AssignmentIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                              Asignado a: {ticket.asignado_nombre}
                            </Typography>
                          )}

                          {ticket.resuelto_nombre && ticket.estado === 'resuelto' && (
                            <Typography variant="caption" color="success.main" display="block" fontWeight="bold">
                              <CheckIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                              Resuelto por: {ticket.resuelto_nombre}
                            </Typography>
                          )}

                          {ticket.num_respuestas > 0 && (
                            <Typography variant="caption" color="primary" display="block" fontWeight="bold">
                              💬 {ticket.num_respuestas} respuesta{ticket.num_respuestas > 1 ? 's' : ''}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => abrirDetalle(ticket.id)}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            Ver Detalle
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Fade>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Diálogo de Detalle */}
      <Dialog
        open={dialogoAbierto}
        onClose={() => { setDialogoAbierto(false); eliminarImagen(); }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        {ticketSeleccionado && (
          <>
            <DialogTitle sx={{ bgcolor: obtenerColorEstado(ticketSeleccionado.ticket.estado), color: 'white' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {ticketSeleccionado.ticket.asunto}
                  </Typography>
                  <Typography variant="caption">
                    {ticketSeleccionado.ticket.numero_ticket}
                  </Typography>
                </Box>

                <IconButton onClick={() => setDialogoAbierto(false)} sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
              {/* Información del ticket */}
              <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={ticketSeleccionado.ticket.estado}
                        label="Estado"
                        onChange={(e) => cambiarEstado(e.target.value)}
                        disabled={cambiandoEstado}
                        sx={{
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: obtenerColorEstado(ticketSeleccionado.ticket.estado),
                            borderWidth: 2,
                          },
                        }}
                      >
                        <MenuItem value="activo">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <ActiveIcon sx={{ color: '#2196F3' }} />
                            <Typography>Activo</Typography>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="en_proceso">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TimeIcon sx={{ color: '#FF9800' }} />
                            <Typography>En Proceso</Typography>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="resuelto">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CheckIcon sx={{ color: '#4CAF50' }} />
                            <Typography>Resuelto</Typography>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="cancelado">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CancelIcon sx={{ color: '#9E9E9E' }} />
                            <Typography>Cancelado</Typography>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="vencido">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <WarningIcon sx={{ color: '#F44336' }} />
                            <Typography>Vencido</Typography>
                          </Stack>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Prioridad:
                    </Typography>
                    <Chip
                      label={ticketSeleccionado.ticket.prioridad.toUpperCase()}
                      size="medium"
                      sx={{
                        bgcolor: obtenerColorPrioridad(ticketSeleccionado.ticket.prioridad),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Creado: {formatearFecha(ticketSeleccionado.ticket.fecha_creacion)}
                    </Typography>
                  </Grid>

                  {ticketSeleccionado.ticket.asignado_nombre && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Asignado a: <strong>{ticketSeleccionado.ticket.asignado_nombre}</strong>
                      </Typography>
                    </Grid>
                  )}

                  {ticketSeleccionado.ticket.resuelto_nombre && ticketSeleccionado.ticket.estado === 'resuelto' && (
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        ✓ Resuelto por: <strong>{ticketSeleccionado.ticket.resuelto_nombre}</strong>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Tabs: Conversación / Timeline */}
              <Tabs
                value={tabDialogo}
                onChange={(e, newValue) => setTabDialogo(newValue)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab
                  label={`Conversación (${(ticketSeleccionado.respuestas?.length || 0) + 1})`}
                  icon={<ReplyIcon />}
                  iconPosition="start"
                />
                <Tab
                  label={`Historial (${ticketSeleccionado.historial?.length || 0})`}
                  icon={<HistoryIcon />}
                  iconPosition="start"
                />
              </Tabs>

              {/* TAB 0: Conversación estilo Chat */}
              {tabDialogo === 0 && (
                <Box sx={{ maxHeight: '50vh', overflow: 'auto', mb: 2 }}>
                  {/* Mensaje original del ticket */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{
                      maxWidth: '85%',
                      bgcolor: '#e3f2fd',
                      borderRadius: '18px 18px 18px 4px',
                      p: 2,
                      boxShadow: 1
                    }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: '#2196F3', fontSize: '0.75rem' }}>
                          {ticketSeleccionado.ticket.reportante_nombre?.charAt(0) || 'U'}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" color="primary">
                          {ticketSeleccionado.ticket.reportante_nombre || 'Usuario'} (Reportante)
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {ticketSeleccionado.ticket.mensaje}
                      </Typography>

                      {/* Mostrar imagen si existe */}
                      {ticketSeleccionado.ticket.imagen_url && (
                        <Box sx={{ mt: 2 }}>
                          <img
                            src={`${process.env.REACT_APP_API_URL || ''}${ticketSeleccionado.ticket.imagen_url}`}
                            alt="Adjunto del ticket"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 200,
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL || ''}${ticketSeleccionado.ticket.imagen_url}`, '_blank')}
                          />
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {formatearFecha(ticketSeleccionado.ticket.fecha_creacion)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Respuestas como chat */}
                  {ticketSeleccionado.respuestas?.map((resp, index) => {
                    const esReportante = resp.usuario_id === ticketSeleccionado.ticket.usuario_id;
                    return (
                      <Box key={resp.id} sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: esReportante ? 'flex-start' : 'flex-end',
                        mb: 2
                      }}>
                        <Box sx={{
                          maxWidth: '85%',
                          bgcolor: esReportante ? '#e3f2fd' : '#f3e5f5',
                          borderRadius: esReportante ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          p: 2,
                          boxShadow: 1
                        }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Avatar sx={{
                              width: 24,
                              height: 24,
                              bgcolor: esReportante ? '#2196F3' : '#9C27B0',
                              fontSize: '0.75rem'
                            }}>
                              {resp.nombre_usuario?.charAt(0) || 'S'}
                            </Avatar>
                            <Typography variant="caption" fontWeight="bold" color={esReportante ? 'primary' : 'secondary'}>
                              {resp.nombre_usuario} {!esReportante && '(Soporte)'}
                            </Typography>
                          </Stack>

                          {resp.mensaje && (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {resp.mensaje}
                            </Typography>
                          )}

                          {/* Imagen adjunta en respuesta */}
                          {resp.imagen_url && (
                            <Box sx={{ mt: resp.mensaje ? 1.5 : 0 }}>
                              <img
                                src={`${process.env.REACT_APP_API_URL || ''}${resp.imagen_url}`}
                                alt="Imagen adjunta"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: 200,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  border: '1px solid rgba(0,0,0,0.1)'
                                }}
                                onClick={() => window.open(`${process.env.REACT_APP_API_URL || ''}${resp.imagen_url}`, '_blank')}
                              />
                            </Box>
                          )}

                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {formatearFecha(resp.fecha_creacion)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* TAB 1: Timeline Visual */}
              {tabDialogo === 1 && (
                <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                  <Timeline position="alternate">
                    {/* Evento de creación */}
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {formatearFecha(ticketSeleccionado.ticket.fecha_creacion)}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="primary">
                          <TicketIcon sx={{ fontSize: 16 }} />
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2" fontWeight="bold">Ticket Creado</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Por {ticketSeleccionado.ticket.reportante_nombre}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>

                    {/* Historial de cambios */}
                    {ticketSeleccionado.historial?.map((evento, index) => {
                      const getEventoStyle = () => {
                        switch(evento.accion) {
                          case 'estado_cambiado':
                            if (evento.valor_nuevo === 'resuelto') return { color: 'success', icon: <CheckIcon sx={{ fontSize: 16 }} /> };
                            if (evento.valor_nuevo === 'en_proceso') return { color: 'warning', icon: <ScheduleIcon sx={{ fontSize: 16 }} /> };
                            if (evento.valor_nuevo === 'cancelado') return { color: 'error', icon: <CancelIcon sx={{ fontSize: 16 }} /> };
                            return { color: 'info', icon: <EditIcon sx={{ fontSize: 16 }} /> };
                          case 'asignado':
                            return { color: 'secondary', icon: <PersonAddIcon sx={{ fontSize: 16 }} /> };
                          case 'respuesta':
                            return { color: 'info', icon: <ReplyIcon sx={{ fontSize: 16 }} /> };
                          case 'imagen_agregada':
                            return { color: 'primary', icon: <ImageIcon sx={{ fontSize: 16 }} /> };
                          default:
                            return { color: 'grey', icon: <HistoryIcon sx={{ fontSize: 16 }} /> };
                        }
                      };
                      const style = getEventoStyle();

                      return (
                        <TimelineItem key={index}>
                          <TimelineOppositeContent color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {formatearFecha(evento.fecha_cambio)}
                          </TimelineOppositeContent>
                          <TimelineSeparator>
                            <TimelineDot color={style.color}>
                              {style.icon}
                            </TimelineDot>
                            {index < ticketSeleccionado.historial.length - 1 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {evento.accion === 'estado_cambiado' && `Estado: ${evento.valor_anterior} → ${evento.valor_nuevo}`}
                              {evento.accion === 'asignado' && 'Ticket asignado'}
                              {evento.accion === 'respuesta' && 'Nueva respuesta'}
                              {evento.accion === 'imagen_agregada' && 'Imagen agregada'}
                              {evento.accion === 'creado' && 'Ticket creado'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Por {evento.usuario_nombre || 'Sistema'}
                            </Typography>
                            {evento.descripcion && (
                              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                "{evento.descripcion}"
                              </Typography>
                            )}
                          </TimelineContent>
                        </TimelineItem>
                      );
                    })}
                  </Timeline>
                </Box>
              )}

              {/* Formulario de respuesta con soporte de imagen */}
              {ticketSeleccionado.ticket.estado !== 'resuelto' && ticketSeleccionado.ticket.estado !== 'cancelado' && tabDialogo === 0 && (
                <Paper elevation={2} sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    disabled={enviandoRespuesta}
                    variant="outlined"
                    sx={{
                      mb: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'white'
                      }
                    }}
                  />

                  {/* Preview de imagen adjunta */}
                  {previewImagen && (
                    <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
                      <img
                        src={previewImagen}
                        alt="Preview"
                        style={{
                          maxWidth: 200,
                          maxHeight: 150,
                          borderRadius: 8,
                          border: '2px solid #667eea'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={eliminarImagen}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: '#f44336',
                          color: 'white',
                          '&:hover': { bgcolor: '#d32f2f' },
                          width: 24,
                          height: 24
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    {/* Botón de adjuntar imagen */}
                    <Box>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="imagen-respuesta"
                        type="file"
                        onChange={handleImagenChange}
                        disabled={enviandoRespuesta}
                      />
                      <label htmlFor="imagen-respuesta">
                        <Tooltip title="Adjuntar imagen (máx 5MB)">
                          <IconButton
                            component="span"
                            disabled={enviandoRespuesta}
                            sx={{
                              color: imagenAdjunta ? '#4CAF50' : '#667eea',
                              '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.1)' }
                            }}
                          >
                            <ImageIcon />
                          </IconButton>
                        </Tooltip>
                      </label>
                      {imagenAdjunta && (
                        <Chip
                          label={imagenAdjunta.name}
                          size="small"
                          onDelete={eliminarImagen}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={enviarRespuesta}
                      disabled={enviandoRespuesta || (!respuesta.trim() && !imagenAdjunta)}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 2,
                        px: 3
                      }}
                    >
                      {enviandoRespuesta ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </Stack>
                </Paper>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setDialogoAbierto(false)}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MisTicketsPage;
