// frontend/src/pages/ReportarProblemaPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Card, CardContent, TextField, Button, Typography,
  MenuItem, Alert, LinearProgress, Fade, Zoom, Avatar, Chip, Stack,
  InputAdornment, Paper, ToggleButton, ToggleButtonGroup, IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  BugReport as BugIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Subject as SubjectIcon,
  Message as MessageIcon,
  Speed as SpeedIcon,
  ElectricBolt as ElectricIcon,
  Computer as ComputerIcon,
  Build as BuildIcon,
  People as PeopleIcon,
  AccountBalance as FinanzasIcon,
  MergeType as MixtoIcon,
  LocationOn as SucursalIcon,
  CameraAlt as CameraIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';

const DEPT_ICONOS = {
  ElectricBolt: <ElectricIcon />,
  Computer:     <ComputerIcon />,
  Build:        <BuildIcon />,
  People:       <PeopleIcon />,
  AccountBalance: <FinanzasIcon />,
};

const ReportarProblemaPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [asunto, setAsunto]                           = useState('');
  const [mensaje, setMensaje]                         = useState('');
  const [nombreReportante, setNombreReportante]       = useState('');
  const [emailReportante, setEmailReportante]         = useState('');
  const [telefonoReportante, setTelefonoReportante]   = useState('');
  const [prioridad, setPrioridad]                     = useState('media');
  const [departamentosSeleccionados, setDepartamentosSeleccionados] = useState([]);
  const [sucursalId, setSucursalId]                                 = useState('');
  const [imagen, setImagen]                                         = useState(null);
  const [previewImagen, setPreviewImagen]                           = useState(null);

  const [loading, setLoading]             = useState(false);
  const [ticketCreado, setTicketCreado]   = useState(false);
  const [ticketNumero, setTicketNumero]   = useState('');
  const [departamentos, setDepartamentos] = useState([]);
  const [sucursales, setSucursales]       = useState([]);

  useEffect(() => {
    if (user) setNombreReportante(user.nombre_completo || user.username || '');
  }, [user]);

  useEffect(() => {
    api.get('/tickets/departamentos').then(r => { if (r.data.success) setDepartamentos(r.data.departamentos); }).catch(() => {});
    api.get('/sucursales/all').then(r => { setSucursales(r.data || []); }).catch(() => {});
  }, []);

  const toggleDept = (id) => {
    setDepartamentosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const validarFormulario = () => {
    if (!sucursalId) { enqueueSnackbar('Selecciona la sucursal afectada', { variant: 'warning' }); return false; }
    if (!asunto.trim()) { enqueueSnackbar('Por favor ingresa el asunto', { variant: 'warning' }); return false; }
    if (!mensaje.trim()) { enqueueSnackbar('Por favor describe el problema', { variant: 'warning' }); return false; }
    if (departamentosSeleccionados.length === 0) { enqueueSnackbar('Selecciona al menos un departamento', { variant: 'warning' }); return false; }
    if (!user) {
      if (!nombreReportante.trim()) { enqueueSnackbar('Por favor ingresa tu nombre', { variant: 'warning' }); return false; }
      if (!emailReportante.trim()) { enqueueSnackbar('Por favor ingresa tu email', { variant: 'warning' }); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailReportante)) { enqueueSnackbar('Email inválido', { variant: 'warning' }); return false; }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('asunto',        asunto.trim());
      fd.append('mensaje',       mensaje.trim());
      fd.append('prioridad',     prioridad);
      fd.append('departamentos', JSON.stringify(departamentosSeleccionados));
      if (sucursalId)  fd.append('sucursal_id', sucursalId);
      if (imagen)      fd.append('imagen',      imagen);
      if (!user) {
        fd.append('nombre_reportante',   nombreReportante.trim());
        fd.append('email_reportante',    emailReportante.trim().toLowerCase());
        if (telefonoReportante.trim()) fd.append('telefono_reportante', telefonoReportante.trim());
      }
      const response = await api.post('/tickets/crear', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setTicketNumero(response.data.ticket.numero_ticket);
        setTicketCreado(true);
      }
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Error al crear el ticket', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAsunto(''); setMensaje(''); setNombreReportante(''); setEmailReportante('');
    setTelefonoReportante(''); setPrioridad('media');
    setDepartamentosSeleccionados([]); setSucursalId(''); setImagen(null); setPreviewImagen(null);
    setTicketCreado(false); setTicketNumero('');
  };

  const prioridades = [
    { valor: 'baja',    label: 'Baja',    color: '#4CAF50', tiempo: '72 horas' },
    { valor: 'media',   label: 'Media',   color: '#2196F3', tiempo: '24 horas' },
    { valor: 'alta',    label: 'Alta',    color: '#FF9800', tiempo: '4 horas'  },
    { valor: 'critica', label: 'Crítica', color: '#F44336', tiempo: '1 hora'   },
  ];

  const esMixto = departamentosSeleccionados.length > 1;

  if (ticketCreado) {
    const deptsNombres = departamentosSeleccionados
      .map(id => departamentos.find(d => d.id === id)?.nombre)
      .filter(Boolean);
    const sucursalNombre = sucursales.find(s => s.id === sucursalId)?.nombre || '';

    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Container maxWidth="md">
          <Zoom in timeout={800}>
            <Card sx={{ borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
              <CardContent sx={{ p: { xs: 3, md: 6 } }}>
                <Avatar sx={{ width: 120, height: 120, bgcolor: '#4CAF50', mx: 'auto', mb: 3 }}>
                  <CheckIcon sx={{ fontSize: 70 }} />
                </Avatar>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#4CAF50', mb: 2 }}>
                  ¡Ticket Creado!
                </Typography>
                {esMixto && (
                  <Chip icon={<MixtoIcon />} label="TICKET MIXTO" color="warning" sx={{ mb: 2, fontWeight: 700 }} />
                )}
                <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>Tu número de ticket es:</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#667eea', letterSpacing: 2 }}>
                    {ticketNumero}
                  </Typography>
                  {sucursalNombre && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <SucursalIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {sucursalNombre}
                    </Typography>
                  )}
                  {deptsNombres.length > 0 && (
                    <Stack direction="row" spacing={1} justifyContent="center" mt={2} flexWrap="wrap">
                      {deptsNombres.map(n => (
                        <Chip key={n} label={n} size="small" color="primary" />
                      ))}
                    </Stack>
                  )}
                </Paper>
                {esMixto && (
                  <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight="bold">Ticket mixto — flujo secuencial</Typography>
                    <Typography variant="body2">
                      Los departamentos trabajarán en orden. Cada uno debe entregar su parte antes de que el siguiente comience.
                    </Typography>
                  </Alert>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button variant="contained" size="large" onClick={resetForm} startIcon={<BugIcon />} fullWidth sx={{ bgcolor: '#667eea' }}>
                    Reportar Otro Problema
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/mis-tickets')} fullWidth>
                    Ver Mis Tickets
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
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'white', color: '#667eea', mx: 'auto', mb: 2 }}>
              <BugIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h2" sx={{ fontWeight: 900, color: 'white', mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}>
              Reportar Problema
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
              Selecciona el departamento y describe tu problema
            </Typography>
          </Box>
        </Fade>

        <Grid container spacing={3}>
          {/* Formulario */}
          <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
            <Zoom in timeout={800}>
              <Card component="form" onSubmit={handleSubmit} sx={{ borderRadius: 3, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
                <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Información del Problema
                  </Typography>

                  <Stack spacing={3} sx={{ mt: 3 }}>

                    {/* ── SELECTOR DE SUCURSAL ── */}
                    <TextField
                      select
                      label="Sucursal / Local afectado"
                      value={sucursalId}
                      onChange={(e) => setSucursalId(e.target.value)}
                      disabled={loading}
                      required
                      helperText="¿En qué sucursal ocurre el problema?"
                      InputProps={{ startAdornment: <InputAdornment position="start"><SucursalIcon color="primary" /></InputAdornment> }}
                    >
                      {sucursales.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                      ))}
                    </TextField>

                    {/* ── SELECTOR DE DEPARTAMENTOS ── */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Departamento(s) *
                        {esMixto && (
                          <Chip
                            icon={<MixtoIcon />}
                            label="TICKET MIXTO"
                            size="small"
                            color="warning"
                            sx={{ ml: 1, fontWeight: 700 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        Selecciona uno o más departamentos. Si seleccionas varios se crea un ticket mixto con flujo secuencial.
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {departamentos.map((dept) => {
                          const seleccionado = departamentosSeleccionados.includes(dept.id);
                          const orden = departamentosSeleccionados.indexOf(dept.id) + 1;
                          return (
                            <Chip
                              key={dept.id}
                              icon={DEPT_ICONOS[dept.icono] || <BuildIcon />}
                              label={seleccionado && esMixto ? `${orden}. ${dept.nombre}` : dept.nombre}
                              onClick={() => toggleDept(dept.id)}
                              variant={seleccionado ? 'filled' : 'outlined'}
                              sx={{
                                bgcolor: seleccionado ? dept.color : 'transparent',
                                color: seleccionado ? 'white' : dept.color,
                                borderColor: dept.color,
                                fontWeight: seleccionado ? 700 : 400,
                                fontSize: '0.85rem',
                                px: 1,
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.85 },
                                '& .MuiChip-icon': { color: seleccionado ? 'white' : dept.color },
                              }}
                            />
                          );
                        })}
                      </Stack>
                      {esMixto && (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                          <Typography variant="caption">
                            El orden en que aparecen los departamentos es el orden de trabajo. Haz clic para reordenar quitando y volviendo a seleccionar.
                          </Typography>
                        </Alert>
                      )}
                    </Box>

                    {/* Prioridad */}
                    <TextField
                      select label="Prioridad" value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value)} disabled={loading} required
                      InputProps={{ startAdornment: <InputAdornment position="start"><SpeedIcon color="primary" /></InputAdornment> }}
                      helperText="¿Qué tan urgente es tu problema?"
                    >
                      {prioridades.map((p) => (
                        <MenuItem key={p.valor} value={p.valor}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color }} />
                            <Typography fontWeight="bold">{p.label}</Typography>
                            <Typography variant="caption" color="text.secondary">(Respuesta en {p.tiempo})</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Asunto */}
                    <TextField
                      label="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)}
                      disabled={loading} required placeholder="Ej: Se mojó el servidor"
                      InputProps={{ startAdornment: <InputAdornment position="start"><SubjectIcon color="primary" /></InputAdornment> }}
                    />

                    {/* Mensaje */}
                    <TextField
                      label="Descripción del Problema" value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                      disabled={loading} required multiline rows={5}
                      placeholder="Describe detalladamente el problema..."
                      InputProps={{ startAdornment: <InputAdornment position="start"><MessageIcon color="primary" /></InputAdornment> }}
                    />

                    {user ? (
                      <Alert severity="info" icon={<PersonIcon />}>
                        <Typography variant="body1">
                          Reportando como: <strong>{user.nombre_completo || user.username}</strong>
                        </Typography>
                      </Alert>
                    ) : (
                      <>
                        <Typography variant="h6" fontWeight="bold" sx={{ pt: 2 }}>Tus Datos de Contacto</Typography>
                        <TextField label="Nombre Completo" value={nombreReportante} onChange={(e) => setNombreReportante(e.target.value)} disabled={loading} required
                          InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="primary" /></InputAdornment> }} />
                        <TextField label="Email" type="email" value={emailReportante} onChange={(e) => setEmailReportante(e.target.value)} disabled={loading} required
                          InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="primary" /></InputAdornment> }} />
                        <TextField label="Teléfono (Opcional)" value={telefonoReportante} onChange={(e) => setTelefonoReportante(e.target.value)} disabled={loading}
                          InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon color="primary" /></InputAdornment> }} />
                      </>
                    )}
                  </Stack>

                    {/* ── FOTO DE EVIDENCIA ── */}
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        <CameraIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Foto de evidencia <em style={{ fontWeight: 400, fontSize: '0.8rem' }}>(opcional)</em>
                      </Typography>
                      <Button component="label" variant="outlined" startIcon={<CameraIcon />} disabled={loading}
                        sx={{ borderStyle: 'dashed', width: '100%', py: 1.5 }}>
                        {imagen ? imagen.name : 'Adjuntar foto del problema'}
                        <input type="file" accept="image/*" hidden onChange={e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          setImagen(f);
                          const url = URL.createObjectURL(f);
                          setPreviewImagen(url);
                        }} />
                      </Button>
                      {previewImagen && (
                        <Box sx={{ position: 'relative', mt: 1 }}>
                          <Box component="img" src={previewImagen} alt="preview"
                            sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 2, bgcolor: '#000' }} />
                          <IconButton size="small" onClick={() => { setImagen(null); setPreviewImagen(null); }}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>

                  {loading && <LinearProgress sx={{ mt: 3 }} />}

                  <Button
                    type="submit" variant="contained" size="large" fullWidth disabled={loading}
                    startIcon={loading ? null : <SendIcon />}
                    sx={{
                      mt: 4, py: 2, fontSize: '1.1rem', fontWeight: 800,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    {loading ? 'Enviando...' : esMixto ? 'Crear Ticket Mixto' : 'Enviar Ticket'}
                  </Button>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          {/* Panel informativo */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Zoom in timeout={1000}>
              <Stack spacing={2}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Departamentos</Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {departamentos.map(d => (
                        <Stack key={d.id} direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                          <Typography variant="body2">{d.nombre}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Ticket Mixto</Typography>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      <Typography variant="caption">
                        Selecciona <strong>más de un departamento</strong> cuando el problema requiere intervención de varios equipos (ej: electricidad + informática).
                      </Typography>
                    </Alert>
                    <Alert severity="warning">
                      <Typography variant="caption">
                        Los departamentos trabajarán en <strong>orden secuencial</strong>. El segundo empieza cuando el primero marca "entregado".
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>

                <Card sx={{ borderRadius: 3, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Tiempos de Respuesta</Typography>
                    <Stack spacing={1}>
                      {prioridades.map(p => (
                        <Stack key={p.valor} direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
                          <Typography variant="body2"><strong>{p.label}:</strong> {p.tiempo}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Zoom>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ReportarProblemaPage;
