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
} from '@mui/icons-material';
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
    if (!respuesta.trim()) {
      enqueueSnackbar('Por favor escribe una respuesta', { variant: 'warning' });
      return;
    }

    setEnviandoRespuesta(true);

    try {
      const response = await api.post(`/tickets/${ticketSeleccionado.ticket.id}/responder`, {
        mensaje: respuesta.trim()
      });

      if (response.data.success) {
        enqueueSnackbar('Respuesta enviada', { variant: 'success' });
        setRespuesta('');
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

          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {loading ? (
              <Box sx={{ py: 4 }}>
                <LinearProgress />
                <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
                  Cargando tickets...
                </Typography>
              </Box>
            ) : tickets.length === 0 ? (
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
                  No hay tickets en esta categoría
                </Typography>
              </Box>
            ) : (
              <List>
                {tickets.map((ticket, index) => (
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
        onClose={() => setDialogoAbierto(false)}
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

              {/* Mensaje original */}
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Descripción:
              </Typography>
              <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#fff' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {ticketSeleccionado.ticket.mensaje}
                </Typography>
              </Paper>

              {/* Respuestas */}
              {ticketSeleccionado.respuestas && ticketSeleccionado.respuestas.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    💬 Respuestas ({ticketSeleccionado.respuestas.length}):
                  </Typography>

                  <List>
                    {ticketSeleccionado.respuestas.map((resp, index) => (
                      <ListItem
                        key={resp.id}
                        alignItems="flex-start"
                        sx={{
                          bgcolor: '#f9f9f9',
                          borderRadius: 2,
                          mb: 1,
                          border: '1px solid #e0e0e0',
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#667eea' }}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>

                        <ListItemText
                          primary={
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" fontWeight="bold">
                                {resp.nombre_usuario}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatearFecha(resp.fecha_creacion)}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                              {resp.mensaje}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {/* Formulario de respuesta */}
              {ticketSeleccionado.ticket.estado !== 'resuelto' && ticketSeleccionado.ticket.estado !== 'cancelado' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    ✍️ Agregar Respuesta:
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Escribe tu respuesta o consulta adicional..."
                    disabled={enviandoRespuesta}
                    sx={{ mb: 2 }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={enviarRespuesta}
                    disabled={enviandoRespuesta || !respuesta.trim()}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    {enviandoRespuesta ? 'Enviando...' : 'Enviar Respuesta'}
                  </Button>
                </>
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
