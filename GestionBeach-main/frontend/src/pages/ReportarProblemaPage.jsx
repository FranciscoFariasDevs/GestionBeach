// frontend/src/pages/ReportarProblemaPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  MenuItem,
  Alert,
  LinearProgress,
  Fade,
  Zoom,
  Avatar,
  Chip,
  Stack,
  InputAdornment,
  Paper,
  Grid,
} from '@mui/material';
import {
  BugReport as BugIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Subject as SubjectIcon,
  Message as MessageIcon,
  Category as CategoryIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { keyframes } from '@mui/system';
import api from '../api/api';

// Animaciones
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const ReportarProblemaPage = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Estados del formulario
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nombreReportante, setNombreReportante] = useState('');
  const [emailReportante, setEmailReportante] = useState('');
  const [telefonoReportante, setTelefonoReportante] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [categoria, setCategoria] = useState('');

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [ticketCreado, setTicketCreado] = useState(false);
  const [ticketNumero, setTicketNumero] = useState('');
  const [categorias, setCategorias] = useState([]);

  // Cargar categorías
  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      const response = await api.get('/tickets/categorias');
      if (response.data.success) {
        setCategorias(response.data.categorias);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const validarFormulario = () => {
    if (!asunto.trim()) {
      enqueueSnackbar('Por favor ingresa el asunto', { variant: 'warning' });
      return false;
    }
    if (!mensaje.trim()) {
      enqueueSnackbar('Por favor describe el problema', { variant: 'warning' });
      return false;
    }
    if (!nombreReportante.trim()) {
      enqueueSnackbar('Por favor ingresa tu nombre', { variant: 'warning' });
      return false;
    }
    if (!emailReportante.trim()) {
      enqueueSnackbar('Por favor ingresa tu email', { variant: 'warning' });
      return false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailReportante)) {
      enqueueSnackbar('Por favor ingresa un email válido', { variant: 'warning' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setLoading(true);

    try {
      const response = await api.post('/tickets/crear', {
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        nombre_reportante: nombreReportante.trim(),
        email_reportante: emailReportante.trim().toLowerCase(),
        telefono_reportante: telefonoReportante.trim() || null,
        departamento: departamento.trim() || null,
        prioridad,
        categoria: categoria || null,
      });

      if (response.data.success) {
        setTicketNumero(response.data.ticket.numero_ticket);
        setTicketCreado(true);
        enqueueSnackbar('Ticket creado exitosamente', { variant: 'success' });
      }

    } catch (error) {
      console.error('Error al crear ticket:', error);
      const errorMsg = error.response?.data?.message || 'Error al crear el ticket';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAsunto('');
    setMensaje('');
    setNombreReportante('');
    setEmailReportante('');
    setTelefonoReportante('');
    setDepartamento('');
    setPrioridad('media');
    setCategoria('');
    setTicketCreado(false);
    setTicketNumero('');
  };

  const prioridades = [
    { valor: 'baja', label: 'Baja', color: '#4CAF50', tiempo: '72 horas' },
    { valor: 'media', label: 'Media', color: '#2196F3', tiempo: '24 horas' },
    { valor: 'alta', label: 'Alta', color: '#FF9800', tiempo: '4 horas' },
    { valor: 'critica', label: 'Crítica', color: '#F44336', tiempo: '1 hora' },
  ];

  if (ticketCreado) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Zoom in timeout={800}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
                overflow: 'visible',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 6 } }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: '#4CAF50',
                    mx: 'auto',
                    mb: 3,
                    animation: `${pulse} 2s ease-in-out infinite`,
                    boxShadow: '0 10px 30px rgba(76, 175, 80, 0.4)',
                  }}
                >
                  <CheckIcon sx={{ fontSize: 70 }} />
                </Avatar>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    color: '#4CAF50',
                    mb: 2,
                  }}
                >
                  ¡Ticket Creado!
                </Typography>

                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    mb: 3,
                    bgcolor: '#f5f5f5',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Tu número de ticket es:
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: '#667eea',
                      letterSpacing: 2,
                    }}
                  >
                    {ticketNumero}
                  </Typography>
                </Paper>

                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    ¿Qué sigue?
                  </Typography>
                  <Typography variant="body2">
                    • Recibirás un email de confirmación a <strong>{emailReportante}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • Nuestro equipo revisará tu ticket a la brevedad
                  </Typography>
                  <Typography variant="body2">
                    • Te notificaremos cuando haya novedades
                  </Typography>
                </Alert>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={resetForm}
                    startIcon={<BugIcon />}
                    fullWidth
                    sx={{
                      bgcolor: '#667eea',
                      '&:hover': { bgcolor: '#5568d3' },
                    }}
                  >
                    Reportar Otro Problema
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => window.location.href = '/'}
                    fullWidth
                  >
                    Volver al Inicio
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Zoom>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Círculos decorativos */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: { xs: 150, md: 300 },
            height: { xs: 150, md: 300 },
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `${pulse} ${3 + i}s ease-in-out infinite`,
            zIndex: 0,
          }}
        />
      ))}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'white',
                color: '#667eea',
                mx: 'auto',
                mb: 2,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              <BugIcon sx={{ fontSize: 40 }} />
            </Avatar>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                color: 'white',
                mb: 1,
                fontSize: { xs: '2rem', md: '3rem' },
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              Reportar Problema
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 400,
              }}
            >
              Describe tu problema y nuestro equipo te ayudará
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={3}>
          {/* Formulario */}
          <Grid item xs={12} md={8}>
            <Zoom in timeout={800}>
              <Card
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
                  animation: `${slideIn} 0.6s ease-out`,
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Información del Problema
                  </Typography>

                  <Stack spacing={3} sx={{ mt: 3 }}>
                    {/* Categoría */}
                    <TextField
                      select
                      label="Categoría"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    >
                      {categorias.map((cat) => (
                        <MenuItem key={cat.id} value={cat.nombre}>
                          <Chip
                            label={cat.nombre}
                            size="small"
                            sx={{
                              bgcolor: cat.color,
                              color: 'white',
                              mr: 1,
                            }}
                          />
                          {cat.descripcion}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Prioridad */}
                    <TextField
                      select
                      label="Prioridad"
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value)}
                      disabled={loading}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SpeedIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      helperText="¿Qué tan urgente es tu problema?"
                    >
                      {prioridades.map((p) => (
                        <MenuItem key={p.valor} value={p.valor}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: p.color,
                              }}
                            />
                            <Typography fontWeight="bold">{p.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              (Respuesta en {p.tiempo})
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Asunto */}
                    <TextField
                      label="Asunto"
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      disabled={loading}
                      required
                      placeholder="Ej: Error al iniciar sesión"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SubjectIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Mensaje */}
                    <TextField
                      label="Descripción del Problema"
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      disabled={loading}
                      required
                      multiline
                      rows={5}
                      placeholder="Describe detalladamente el problema que estás experimentando..."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MessageIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Typography variant="h6" fontWeight="bold" sx={{ pt: 2 }}>
                      Tus Datos de Contacto
                    </Typography>

                    {/* Nombre */}
                    <TextField
                      label="Nombre Completo"
                      value={nombreReportante}
                      onChange={(e) => setNombreReportante(e.target.value)}
                      disabled={loading}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Email */}
                    <TextField
                      label="Email"
                      type="email"
                      value={emailReportante}
                      onChange={(e) => setEmailReportante(e.target.value)}
                      disabled={loading}
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Teléfono */}
                    <TextField
                      label="Teléfono (Opcional)"
                      value={telefonoReportante}
                      onChange={(e) => setTelefonoReportante(e.target.value)}
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Departamento */}
                    <TextField
                      label="Departamento/Área (Opcional)"
                      value={departamento}
                      onChange={(e) => setDepartamento(e.target.value)}
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>

                  {loading && <LinearProgress sx={{ mt: 3 }} />}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? null : <SendIcon />}
                    sx={{
                      mt: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        animation: `${shimmer} 2s infinite`,
                      },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                      },
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar Ticket'}
                  </Button>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          {/* Panel informativo */}
          <Grid item xs={12} md={4}>
            <Zoom in timeout={1000}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
                  bgcolor: 'white',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    ℹ️ Información
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2" fontWeight="bold">
                        Tiempo de Respuesta
                      </Typography>
                      <Typography variant="caption">
                        Responderemos según la prioridad del ticket
                      </Typography>
                    </Alert>

                    <Alert severity="success">
                      <Typography variant="body2" fontWeight="bold">
                        Notificaciones
                      </Typography>
                      <Typography variant="caption">
                        Te avisaremos por email sobre el progreso
                      </Typography>
                    </Alert>

                    <Alert severity="warning">
                      <Typography variant="body2" fontWeight="bold">
                        Información Completa
                      </Typography>
                      <Typography variant="caption">
                        Proporciona todos los detalles posibles para una solución más rápida
                      </Typography>
                    </Alert>

                    <Paper elevation={2} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        📋 Consejos:
                      </Typography>
                      <Typography variant="caption" component="div">
                        • Describe el problema paso a paso
                      </Typography>
                      <Typography variant="caption" component="div">
                        • Incluye mensajes de error si los hay
                      </Typography>
                      <Typography variant="caption" component="div">
                        • Menciona cuándo comenzó el problema
                      </Typography>
                    </Paper>
                  </Stack>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ReportarProblemaPage;
