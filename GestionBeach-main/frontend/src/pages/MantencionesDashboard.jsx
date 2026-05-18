import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Avatar,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  IconButton, Button, Dialog, DialogTitle, DialogContent,
  Paper, Divider, Tooltip, LinearProgress, Fade, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Tab, Tabs, Badge,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Build as BuildIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
  PlayArrow as ActiveIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  MergeType as MixtoIcon,
  Image as ImageIcon,
  Reply as ReplyIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
  Assignment as AssignmentIcon,
  ElectricBolt as ElectricIcon,
  Computer as ComputerIcon,
  BuildCircle as BuildCircleIcon,
  People as PeopleIcon,
  AccountBalance as FinanzasIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  BarChart as BarChartIcon,
  EmojiEvents as TrophyIcon,
  ViewKanban as KanbanIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { useSnackbar } from 'notistack';
import api, { getStaticFileURL } from '../api/api';
import AuthContext from '../contexts/AuthContext';
import DeleteIcon from '@mui/icons-material/Delete';

// ── Constantes ────────────────────────────────────────────────────────────────
const DEPT_COLORS = {
  Electricidad:     '#FF9800',
  'Informática':    '#2196F3',
  Mantenciones:     '#4CAF50',
  'Recursos Humanos': '#9C27B0',
  Finanzas:         '#F44336',
};
const DEPT_ICONS = {
  Electricidad:     <ElectricIcon sx={{ fontSize: 14 }} />,
  'Informática':    <ComputerIcon sx={{ fontSize: 14 }} />,
  Mantenciones:     <BuildCircleIcon sx={{ fontSize: 14 }} />,
  'Recursos Humanos': <PeopleIcon sx={{ fontSize: 14 }} />,
  Finanzas:         <FinanzasIcon sx={{ fontSize: 14 }} />,
};
const ESTADO_COLOR  = { activo:'#2196F3', en_proceso:'#FF9800', resuelto:'#4CAF50', cancelado:'#9E9E9E', vencido:'#F44336' };
const ESTADO_LABEL  = { activo:'Activo', en_proceso:'En Proceso', resuelto:'Resuelto', cancelado:'Cancelado', vencido:'Vencido' };
const PRIORIDAD_COLOR = { baja:'#4CAF50', media:'#2196F3', alta:'#FF9800', critica:'#F44336' };
const KANBAN_COLS   = ['activo', 'en_proceso', 'resuelto'];


function tiempoTranscurrido(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins  = Math.floor(diff / 60000);
  const horas = Math.floor(mins / 60);
  const dias  = Math.floor(horas / 24);
  if (dias > 0)  return `${dias}d`;
  if (horas > 0) return `${horas}h`;
  return `${mins}m`;
}

function DeptFlujo({ asignaciones }) {
  if (!asignaciones?.length) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
      {asignaciones.map((a, i) => {
        const color = DEPT_COLORS[a.departamento_nombre] || '#666';
        return (
          <React.Fragment key={a.id || i}>
            {i > 0 && <Box sx={{ color: '#bbb', fontSize: 11, alignSelf: 'center' }}>→</Box>}
            <Chip
              size="small"
              icon={a.estado === 'entregado'
                ? <CheckIcon style={{ color: 'white', fontSize: 10 }} />
                : (DEPT_ICONS[a.departamento_nombre] || <BuildIcon style={{ fontSize: 10 }} />)
              }
              label={a.departamento_nombre}
              sx={{
                bgcolor: a.estado === 'bloqueado' ? '#e0e0e0' : color,
                color: a.estado === 'bloqueado' ? '#999' : 'white',
                fontSize: '0.58rem', height: 18,
                opacity: a.estado === 'bloqueado' ? 0.55 : 1,
                '& .MuiChip-icon': { color: a.estado === 'bloqueado' ? '#999' : 'white' },
              }}
            />
          </React.Fragment>
        );
      })}
    </Stack>
  );
}

// ── Pequeña barra de progreso custom ─────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 8, bgcolor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 4, transition: 'width .6s' }} />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 28, color: 'text.secondary' }}>{value}</Typography>
    </Box>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, sub }) {
  return (
    <Card elevation={2} sx={{ borderRadius: 2.5, borderTop: `3px solid ${color}`, height: '100%' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: `${color}20`, color }}>{icon}</Avatar>
          <Box>
            <Typography variant="h4" fontWeight={900} lineHeight={1} sx={{ color }}>{value ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            {sub && <Typography variant="caption" display="block" color="text.disabled">{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Ticket Card (Kanban / Cards view) ─────────────────────────────────────────
function TicketCard({ t, onClick }) {
  return (
    <Card elevation={2} onClick={onClick}
      sx={{
        borderRadius: 2, cursor: 'pointer', position: 'relative', overflow: 'visible',
        borderLeft: `4px solid ${ESTADO_COLOR[t.estado] || '#666'}`,
        transition: 'all .2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
      }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="primary" fontWeight={800}>{t.numero_ticket}</Typography>
            <Typography variant="body2" fontWeight={700} noWrap title={t.asunto}>{t.asunto}</Typography>
          </Box>
          {t.imagen_url && (
            <Avatar src={getStaticFileURL(t.imagen_url)} variant="rounded" sx={{ width: 36, height: 36, flexShrink: 0 }} />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
          <Chip label={t.prioridad} size="small"
            sx={{ bgcolor: PRIORIDAD_COLOR[t.prioridad] || '#666', color: 'white', fontSize: '0.58rem', height: 17 }} />
          {t.es_mixto && <Chip icon={<MixtoIcon />} label="MIXTO" size="small" color="warning" sx={{ fontSize: '0.58rem', height: 17 }} />}
        </Stack>

        <DeptFlujo asignaciones={t.dept_asignaciones} />

        <Divider sx={{ my: 0.75 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <LocationIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>{t.sucursal_nombre || '—'}</Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled">{tiempoTranscurrido(t.fecha_creacion)}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <PersonIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary" noWrap>{t.reportante_nombre || '—'}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MantencionesDashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.superadmin === true || user?.superadmin === 1 || user?.username === 'NOVLUI';
  const puedeEliminar = isSuperAdmin || user?.perfilId === 11;

  // Data
  const [tickets,   setTickets]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loadingAna, setLoadingAna] = useState(false);

  // UI
  const [vista,     setVista]     = useState('tabla');   // tabla | cards | kanban
  const [tabActual, setTabActual] = useState(0);         // 0=solicitudes 1=analytics 2=leaderboard
  const [diasAnalytics, setDiasAnalytics] = useState(30);

  // Filtros
  const [busqueda,        setBusqueda]        = useState('');
  const [filtroEstado,    setFiltroEstado]    = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroDept,      setFiltroDept]      = useState('');
  const [filtroSucursal,  setFiltroSucursal]  = useState('');

  // Detalle / modal
  const [detalle,           setDetalle]           = useState(null);
  const [respuesta,         setRespuesta]         = useState('');
  const [archivoResp,       setArchivoResp]       = useState(null);
  const [previewArchivoResp, setPreviewArchivoResp] = useState(null);
  const [enviandoResp,      setEnviandoResp]      = useState(false);
  const [cambiandoEstado,   setCambiandoEstado]   = useState(false);

  const DEPARTAMENTOS = [
    { id: 1, nombre: 'Electricidad' },
    { id: 2, nombre: 'Informática' },
    { id: 3, nombre: 'Mantenciones' },
    { id: 4, nombre: 'Recursos Humanos' },
    { id: 5, nombre: 'Finanzas' },
  ];

  // ── Carga tickets ────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filtroEstado)    p.set('estado',         filtroEstado);
      if (filtroPrioridad) p.set('prioridad',      filtroPrioridad);
      if (filtroDept)      p.set('departamento_id', filtroDept);
      if (filtroSucursal)  p.set('sucursal_id',    filtroSucursal);
      if (busqueda)        p.set('busqueda',        busqueda);
      p.set('limite', '500');
      const r = await api.get(`/tickets/admin/mantenciones?${p}`);
      if (r.data.success) { setTickets(r.data.tickets); setStats(r.data.stats); }
    } catch { enqueueSnackbar('Error al cargar solicitudes', { variant: 'error' }); }
    setLoading(false);
  }, [filtroEstado, filtroPrioridad, filtroDept, filtroSucursal, busqueda, enqueueSnackbar]);

  // ── Carga analytics ──────────────────────────────────────────────────────────
  const cargarAnalytics = useCallback(async () => {
    setLoadingAna(true);
    try {
      const r = await api.get(`/tickets/admin/analytics?dias=${diasAnalytics}`);
      if (r.data.success) setAnalytics(r.data);
    } catch { enqueueSnackbar('Error al cargar analytics', { variant: 'error' }); }
    setLoadingAna(false);
  }, [diasAnalytics, enqueueSnackbar]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { api.get('/sucursales/all').then(r => setSucursales(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { if (tabActual === 1 || tabActual === 2) cargarAnalytics(); }, [tabActual, cargarAnalytics]);

  // ── Detalle ──────────────────────────────────────────────────────────────────
  const abrirDetalle = async (id) => {
    setDetalle({ loading: true });
    try {
      const r = await api.get(`/tickets/${id}`);
      if (r.data.success) setDetalle(r.data);
      else setDetalle(null);
    } catch { enqueueSnackbar('Error al cargar detalle', { variant: 'error' }); setDetalle(null); }
  };

  const cerrarDetalle = () => {
    setDetalle(null); setRespuesta(''); setArchivoResp(null);
    if (previewArchivoResp) { URL.revokeObjectURL(previewArchivoResp); setPreviewArchivoResp(null); }
  };

  const eliminarTicket = async (id) => {
    if (!window.confirm('¿Eliminar este ticket? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/tickets/${id}`);
      enqueueSnackbar('Ticket eliminado', { variant: 'success' });
      cerrarDetalle();
      cargar();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al eliminar', { variant: 'error' });
    }
  };

  const seleccionarFotoResp = (file) => {
    if (!file) return;
    if (previewArchivoResp) URL.revokeObjectURL(previewArchivoResp);
    setArchivoResp(file);
    setPreviewArchivoResp(URL.createObjectURL(file));
  };

  const quitarFotoResp = () => {
    if (previewArchivoResp) URL.revokeObjectURL(previewArchivoResp);
    setArchivoResp(null);
    setPreviewArchivoResp(null);
  };

  const cambiarEstado = async (nuevoEstado) => {
    if (!detalle?.ticket) return;
    setCambiandoEstado(true);
    try {
      await api.put(`/tickets/${detalle.ticket.id}/estado`, { estado: nuevoEstado });
      await abrirDetalle(detalle.ticket.id);
      cargar();
      enqueueSnackbar('Estado actualizado', { variant: 'success' });
    } catch { enqueueSnackbar('Error al cambiar estado', { variant: 'error' }); }
    setCambiandoEstado(false);
  };

  const enviarRespuesta = async () => {
    if (!respuesta.trim() && !archivoResp) return;
    setEnviandoResp(true);
    try {
      const fd = new FormData();
      fd.append('mensaje', respuesta.trim());
      if (archivoResp) fd.append('imagen', archivoResp);
      await api.post(`/tickets/${detalle.ticket.id}/responder`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRespuesta('');
      if (previewArchivoResp) { URL.revokeObjectURL(previewArchivoResp); setPreviewArchivoResp(null); }
      setArchivoResp(null);
      await abrirDetalle(detalle.ticket.id);
      enqueueSnackbar('Respuesta enviada', { variant: 'success' });
    } catch { enqueueSnackbar('Error al enviar respuesta', { variant: 'error' }); }
    setEnviandoResp(false);
  };

  // ── Helpers para analytics ───────────────────────────────────────────────────
  const maxTickets = analytics?.por_departamento?.reduce((m, d) => Math.max(m, d.total), 0) || 1;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: 'linear-gradient(135deg,#667eea,#764ba2)', background: 'linear-gradient(135deg,#667eea,#764ba2)', width: 44, height: 44 }}>
              <BuildIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={900} lineHeight={1.1}>Mantenciones</Typography>
              <Typography variant="body2" color="text.secondary">Solicitudes de soporte y mantención por sucursal</Typography>
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Tooltip title="Actualizar">
            <IconButton onClick={() => { cargar(); if (tabActual > 0) cargarAnalytics(); }} disabled={loading || loadingAna}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<BuildIcon />}
            href="/reportar-problema" target="_blank"
            sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 2 }}>
            Nueva Solicitud
          </Button>
        </Stack>
      </Stack>

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total',       value: stats?.total,      color: '#667eea', icon: <AssignmentIcon />, sub: 'tickets creados' },
          { label: 'Activos',     value: stats?.activos,    color: '#2196F3', icon: <ActiveIcon />,     sub: 'sin atender' },
          { label: 'En Proceso',  value: stats?.en_proceso, color: '#FF9800', icon: <TimeIcon />,       sub: 'siendo atendidos' },
          { label: 'Resueltos',   value: stats?.resueltos,  color: '#4CAF50', icon: <CheckIcon />,      sub: 'completados' },
          { label: 'Críticos',    value: stats?.criticos,   color: '#F44336', icon: <WarningIcon />,    sub: 'alta urgencia' },
        ].map(s => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tabActual} onChange={(_, v) => setTabActual(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', '& .MuiTab-root': { minHeight: 48, fontWeight: 600, fontSize: '0.85rem' } }}>
          <Tab icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start"
            label={<Badge badgeContent={stats?.activos || 0} color="error" max={99}><Box sx={{ pr: 0.5 }}>Solicitudes</Box></Badge>} />
          <Tab icon={<BarChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Analytics" />
          <Tab icon={<TrophyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Leaderboard" />
        </Tabs>

        {/* ── TAB 0: Solicitudes ─────────────────────────────────────────────── */}
        {tabActual === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Filtros */}
            <Grid container spacing={1.5} alignItems="center" mb={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField size="small" fullWidth placeholder="Buscar por asunto, sucursal, ticket…"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 1.6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={filtroEstado} label="Estado" onChange={e => setFiltroEstado(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(ESTADO_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 1.6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select value={filtroPrioridad} label="Prioridad" onChange={e => setFiltroPrioridad(e.target.value)}>
                    <MenuItem value="">Todas</MenuItem>
                    {['critica','alta','media','baja'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Departamento</InputLabel>
                  <Select value={filtroDept} label="Departamento" onChange={e => setFiltroDept(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    {DEPARTAMENTOS.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Sucursal</InputLabel>
                  <Select value={filtroSucursal} label="Sucursal" onChange={e => setFiltroSucursal(e.target.value)}>
                    <MenuItem value="">Todas</MenuItem>
                    {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 'auto' }}>
                <ToggleButtonGroup size="small" value={vista} exclusive onChange={(_, v) => v && setVista(v)}>
                  <ToggleButton value="tabla"><Tooltip title="Tabla"><ListIcon fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="cards"><Tooltip title="Cards"><GridIcon fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="kanban"><Tooltip title="Kanban"><KanbanIcon fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {loading && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}

            {/* Vista Tabla */}
            {vista === 'tabla' && (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      {['Ticket','Sucursal','Asunto','Departamentos','Estado','Prioridad','Reportante','Hace','Foto',''].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                          <Stack alignItems="center" spacing={1}>
                            <AssignmentIcon sx={{ fontSize: 40, color: '#ddd' }} />
                            <Typography>No hay solicitudes con los filtros seleccionados</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    {tickets.map(t => (
                      <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => abrirDetalle(t.id)}>
                        <TableCell>
                          <Typography variant="caption" fontWeight={800} color="primary">{t.numero_ticket}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <LocationIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            <Typography variant="caption" noWrap sx={{ maxWidth: 110 }}>{t.sucursal_nombre || '—'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200, fontWeight: 500 }}>{t.asunto}</Typography>
                          {t.es_mixto && <Chip label="MIXTO" size="small" color="warning" sx={{ fontSize: '0.5rem', height: 14, mt: 0.2 }} />}
                        </TableCell>
                        <TableCell><DeptFlujo asignaciones={t.dept_asignaciones} /></TableCell>
                        <TableCell>
                          <Chip label={ESTADO_LABEL[t.estado] || t.estado} size="small"
                            sx={{ bgcolor: ESTADO_COLOR[t.estado] || '#666', color: 'white', fontSize: '0.6rem', height: 20 }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={t.prioridad} size="small"
                            sx={{ bgcolor: PRIORIDAD_COLOR[t.prioridad] || '#666', color: 'white', fontSize: '0.6rem', height: 20, textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" noWrap sx={{ maxWidth: 100 }}>{t.reportante_nombre || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.disabled">{tiempoTranscurrido(t.fecha_creacion)}</Typography>
                        </TableCell>
                        <TableCell>
                          {t.imagen_url
                            ? <Avatar src={getStaticFileURL(t.imagen_url)} variant="rounded" sx={{ width: 30, height: 30 }} />
                            : <Box sx={{ width: 30, height: 30, bgcolor: '#f0f0f0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageIcon sx={{ fontSize: 14, color: '#bbb' }} />
                              </Box>
                          }
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1, fontSize: '0.7rem' }} onClick={() => abrirDetalle(t.id)}>Ver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Vista Cards */}
            {vista === 'cards' && (
              <Grid container spacing={2}>
                {tickets.length === 0 && !loading && (
                  <Grid size={12}>
                    <Paper sx={{ p: 5, textAlign: 'center', color: 'text.secondary', borderRadius: 2 }}>
                      <AssignmentIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} /><br />
                      No hay solicitudes con los filtros seleccionados
                    </Paper>
                  </Grid>
                )}
                {tickets.map(t => (
                  <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Fade in timeout={300}><TicketCard t={t} onClick={() => abrirDetalle(t.id)} /></Fade>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Vista Kanban */}
            {vista === 'kanban' && (
              <Grid container spacing={2} sx={{ minHeight: 400 }}>
                {KANBAN_COLS.map(col => {
                  const colTickets = tickets.filter(t => t.estado === col);
                  return (
                    <Grid key={col} size={{ xs: 12, md: 4 }}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, border: `2px solid ${ESTADO_COLOR[col]}30`, minHeight: 200 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ESTADO_COLOR[col] }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ color: ESTADO_COLOR[col] }}>
                            {ESTADO_LABEL[col]}
                          </Typography>
                          <Chip label={colTickets.length} size="small"
                            sx={{ bgcolor: ESTADO_COLOR[col], color: 'white', height: 18, fontSize: '0.65rem', ml: 'auto' }} />
                        </Stack>
                        <Stack spacing={1.5}>
                          {colTickets.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 3, color: 'text.disabled' }}>
                              <Typography variant="caption">Sin tickets</Typography>
                            </Box>
                          )}
                          {colTickets.map(t => (
                            <TicketCard key={t.id} t={t} onClick={() => abrirDetalle(t.id)} />
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* ── TAB 1: Analytics ──────────────────────────────────────────────── */}
        {tabActual === 1 && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight={800}>Analytics de Departamentos</Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Período</InputLabel>
                <Select value={diasAnalytics} label="Período" onChange={e => setDiasAnalytics(e.target.value)}>
                  <MenuItem value={7}>Últimos 7 días</MenuItem>
                  <MenuItem value={30}>Últimos 30 días</MenuItem>
                  <MenuItem value={90}>Últimos 90 días</MenuItem>
                  <MenuItem value={365}>Último año</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {loadingAna && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {analytics && (
              <Grid container spacing={3}>
                {/* Gráfico de barras por departamento */}
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card elevation={2} sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={800} mb={2}>Tickets por Departamento</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={analytics.por_departamento} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="departamento_nombre" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <ReTooltip />
                        <Legend />
                        <Bar dataKey="total"     name="Total"     fill="#667eea" radius={[3,3,0,0]} />
                        <Bar dataKey="resueltos" name="Resueltos" fill="#4CAF50" radius={[3,3,0,0]} />
                        <Bar dataKey="pendientes" name="Pendientes" fill="#FF9800" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Pie por prioridad */}
                <Grid size={{ xs: 12, sm: 6, lg: 5 }}>
                  <Card elevation={2} sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={800} mb={2}>Distribución por Prioridad</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={analytics.por_prioridad}
                          dataKey="total"
                          nameKey="prioridad"
                          cx="50%" cy="50%"
                          outerRadius={90}
                          label={({ prioridad, percent }) => `${prioridad} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {analytics.por_prioridad.map((e, i) => (
                            <Cell key={i} fill={PRIORIDAD_COLOR[e.prioridad] || '#999'} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Línea temporal */}
                {analytics.por_dia?.length > 0 && (
                  <Grid size={12}>
                    <Card elevation={2} sx={{ borderRadius: 2.5, p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={800} mb={2}>Evolución Temporal</Typography>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={analytics.por_dia} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <ReTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total"     name="Total"     stroke="#667eea" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="resueltos" name="Resueltos" stroke="#4CAF50" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="activos"   name="Activos"   stroke="#2196F3" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>
                )}

                {/* Top sucursales */}
                {analytics.por_sucursal?.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card elevation={2} sx={{ borderRadius: 2.5, p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={800} mb={2}>Top Sucursales con más Tickets</Typography>
                      <Stack spacing={1.5}>
                        {analytics.por_sucursal.slice(0, 8).map((s, i) => (
                          <Box key={i}>
                            <Stack direction="row" justifyContent="space-between" mb={0.3}>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>{s.sucursal}</Typography>
                            </Stack>
                            <MiniBar value={s.total} max={analytics.por_sucursal[0]?.total || 1} color="#667eea" />
                          </Box>
                        ))}
                      </Stack>
                    </Card>
                  </Grid>
                )}

                {/* Resumen por departamento con tiempo promedio */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card elevation={2} sx={{ borderRadius: 2.5, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={800} mb={2}>Rendimiento por Departamento</Typography>
                    <Stack spacing={2}>
                      {analytics.por_departamento.map(d => {
                        const color = DEPT_COLORS[d.departamento_nombre] || '#667eea';
                        const eficiencia = d.total > 0 ? Math.round((d.resueltos / d.total) * 100) : 0;
                        return (
                          <Box key={d.departamento_id}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                              <Stack direction="row" alignItems="center" spacing={0.8}>
                                <Avatar sx={{ width: 24, height: 24, bgcolor: `${color}20`, color, fontSize: 12 }}>
                                  {DEPT_ICONS[d.departamento_nombre]}
                                </Avatar>
                                <Typography variant="body2" fontWeight={700}>{d.departamento_nombre}</Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`${eficiencia}%`} size="small"
                                  sx={{ bgcolor: eficiencia >= 70 ? '#4CAF5020' : eficiencia >= 40 ? '#FF980020' : '#F4433620',
                                        color: eficiencia >= 70 ? '#2e7d32' : eficiencia >= 40 ? '#e65100' : '#c62828',
                                        fontSize: '0.65rem', height: 18, fontWeight: 700 }} />
                                <Typography variant="caption" color="text.disabled">{d.total} tickets</Typography>
                              </Stack>
                            </Stack>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={`Resueltos: ${d.resueltos}`}>
                                <Box sx={{ height: 6, flex: d.resueltos || 0, bgcolor: '#4CAF50', borderRadius: '3px 0 0 3px' }} />
                              </Tooltip>
                              <Tooltip title={`Pendientes: ${d.pendientes}`}>
                                <Box sx={{ height: 6, flex: d.pendientes || 0, bgcolor: '#FF9800' }} />
                              </Tooltip>
                              <Tooltip title={`Bloqueados: ${d.bloqueados}`}>
                                <Box sx={{ height: 6, flex: d.bloqueados || 0, bgcolor: '#e0e0e0', borderRadius: '0 3px 3px 0' }} />
                              </Tooltip>
                            </Stack>
                          </Box>
                        );
                      })}
                      {(!analytics.por_departamento || analytics.por_departamento.length === 0) && (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                          Sin datos para el período seleccionado
                        </Typography>
                      )}
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* ── TAB 2: Leaderboard ──────────────────────────────────────────────── */}
        {tabActual === 2 && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" fontWeight={800}>Ranking de Resolución</Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Período</InputLabel>
                <Select value={diasAnalytics} label="Período" onChange={e => setDiasAnalytics(e.target.value)}>
                  <MenuItem value={7}>7 días</MenuItem>
                  <MenuItem value={30}>30 días</MenuItem>
                  <MenuItem value={90}>90 días</MenuItem>
                  <MenuItem value={365}>1 año</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {loadingAna && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {analytics && (
              <Grid container spacing={3}>
                {/* Podio por departamento */}
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Card elevation={2} sx={{ borderRadius: 2.5, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                      <TrophyIcon sx={{ color: '#FFB300' }} />
                      <Typography variant="subtitle1" fontWeight={800}>Departamentos — Tickets Resueltos</Typography>
                    </Stack>
                    <Stack spacing={2}>
                      {analytics.por_departamento
                        .slice()
                        .sort((a, b) => b.resueltos - a.resueltos)
                        .map((d, i) => {
                          const color = DEPT_COLORS[d.departamento_nombre] || '#667eea';
                          const medals = ['🥇', '🥈', '🥉'];
                          return (
                            <Box key={d.departamento_id} sx={{
                              p: 2, borderRadius: 2, bgcolor: i === 0 ? '#FFF8E1' : i === 1 ? '#F5F5F5' : 'transparent',
                              border: i === 0 ? '2px solid #FFB300' : '1px solid #f0f0f0',
                            }}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Typography variant="h5">{medals[i] || `#${i + 1}`}</Typography>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}20`, color }}>
                                  {DEPT_ICONS[d.departamento_nombre] || <BuildIcon sx={{ fontSize: 16 }} />}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={800}>{d.departamento_nombre}</Typography>
                                  <Stack direction="row" spacing={1} sx={{ mt: 0.3 }}>
                                    <Chip label={`✅ ${d.resueltos} resueltos`} size="small"
                                      sx={{ bgcolor: '#4CAF5015', color: '#2e7d32', fontSize: '0.62rem', height: 18 }} />
                                    <Chip label={`📋 ${d.total} totales`} size="small"
                                      sx={{ bgcolor: '#667eea15', color: '#3949ab', fontSize: '0.62rem', height: 18 }} />
                                    {d.criticos > 0 && <Chip label={`🔴 ${d.criticos} críticos`} size="small"
                                      sx={{ bgcolor: '#F4433615', color: '#c62828', fontSize: '0.62rem', height: 18 }} />}
                                  </Stack>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="h6" fontWeight={900} sx={{ color }}>
                                    {d.total > 0 ? Math.round((d.resueltos / d.total) * 100) : 0}%
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled">eficiencia</Typography>
                                </Box>
                              </Stack>
                              <Box sx={{ mt: 1.5 }}>
                                <MiniBar value={d.resueltos} max={analytics.por_departamento.reduce((m, x) => Math.max(m, x.total), 1)} color={color} />
                              </Box>
                            </Box>
                          );
                        })}
                      {(!analytics.por_departamento || analytics.por_departamento.length === 0) && (
                        <Box sx={{ textAlign: 'center', py: 5 }}>
                          <TrophyIcon sx={{ fontSize: 48, color: '#ddd' }} />
                          <Typography color="text.secondary">Sin datos para el período</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Grid>

                {/* Top usuarios resolvedores */}
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Card elevation={2} sx={{ borderRadius: 2.5, p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                      <BoltIcon sx={{ color: '#667eea' }} />
                      <Typography variant="subtitle1" fontWeight={800}>Top Resolvedores (Personas)</Typography>
                    </Stack>
                    {analytics.top_resolvedores?.length > 0 ? (
                      <Stack spacing={1.5}>
                        {analytics.top_resolvedores.map((u, i) => (
                          <Stack key={u.id} direction="row" alignItems="center" spacing={1.5}
                            sx={{ p: 1.2, borderRadius: 2, bgcolor: i === 0 ? '#FFF8E1' : 'transparent', border: i === 0 ? '1px solid #FFB30040' : 'none' }}>
                            <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                            </Typography>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#667eea', fontSize: 13 }}>
                              {u.nombre_completo?.[0]?.toUpperCase() || '?'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap>{u.nombre_completo}</Typography>
                            </Box>
                            <Chip label={`${u.resueltos} ✓`} size="small"
                              sx={{ bgcolor: '#4CAF5020', color: '#2e7d32', fontWeight: 800, fontSize: '0.72rem' }} />
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 5 }}>
                        <PersonIcon sx={{ fontSize: 48, color: '#ddd' }} />
                        <Typography color="text.secondary">Nadie ha marcado tickets como entregados aún</Typography>
                      </Box>
                    )}
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* ─────────────────── MODAL DETALLE ─────────────────────────────────── */}
      <Dialog open={!!detalle} onClose={cerrarDetalle} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

        {detalle?.loading && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress size={48} /></Box>}

        {detalle && !detalle.loading && detalle.ticket && (() => {
          const t   = detalle.ticket;
          const res = detalle.respuestas || [];
          const depts = detalle.dept_asignaciones || t.dept_asignaciones || [];
          return (
            <>
              {/* Cabecera coloreada */}
              <Box sx={{ bgcolor: ESTADO_COLOR[t.estado] || '#667eea', px: 3, py: 2.5, color: 'white' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                      <Chip label={t.numero_ticket} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, fontSize: '0.72rem' }} />
                      <Chip label={ESTADO_LABEL[t.estado] || t.estado} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.7rem' }} />
                      <Chip label={t.prioridad} size="small" sx={{ bgcolor: PRIORIDAD_COLOR[t.prioridad], color: 'white', fontSize: '0.7rem', textTransform: 'capitalize' }} />
                    </Stack>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{t.asunto}</Typography>
                  </Box>
                  {puedeEliminar && (
                    <Tooltip title="Eliminar ticket" arrow>
                      <IconButton
                        size="small"
                        onClick={() => eliminarTicket(t.id)}
                        sx={{ color: 'rgba(255,255,255,0.6)', mt: -0.5, '&:hover': { color: '#ff5252' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton onClick={cerrarDetalle} sx={{ color: 'white', mt: -0.5 }}><CloseIcon /></IconButton>
                </Stack>
              </Box>

              <DialogContent sx={{ p: 0 }}>
                <Grid container sx={{ minHeight: 0 }}>
                  {/* Panel izquierdo: info + flujo + mensaje + respuestas */}
                  <Grid size={{ xs: 12, md: 8 }} sx={{ p: 2.5, borderRight: { md: '1px solid #f0f0f0' }, overflowY: 'auto', maxHeight: '70vh' }}>
                    {/* Info */}
                    <Stack spacing={0.8} mb={2}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocationIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        <Typography variant="body2"><strong>Sucursal:</strong> {t.sucursal_nombre || '—'}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        <Typography variant="body2"><strong>Reportante:</strong> {t.reportante_nombre || '—'}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TimeIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        <Typography variant="body2"><strong>Creado:</strong> {new Date(t.fecha_creacion).toLocaleString('es-CL')}</Typography>
                      </Stack>
                    </Stack>

                    {/* Flujo departamentos */}
                    {depts.length > 0 && (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" mb={0.5} display="block">FLUJO DE DEPARTAMENTOS</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {depts.map((a, i) => {
                            const color = DEPT_COLORS[a.departamento_nombre] || '#666';
                            return (
                              <Stack key={a.id || i} direction="row" alignItems="center" spacing={0.5}>
                                {i > 0 && <Typography sx={{ color: '#bbb' }}>→</Typography>}
                                <Chip
                                  icon={a.estado === 'entregado' ? <CheckIcon style={{ color: 'white', fontSize: 12 }} /> : (DEPT_ICONS[a.departamento_nombre] || <BuildIcon />)}
                                  label={`${a.departamento_nombre}${a.estado === 'entregado' ? ' ✓' : a.estado === 'pendiente' ? ' ⏳' : ' 🔒'}`}
                                  sx={{
                                    bgcolor: a.estado === 'bloqueado' ? '#e0e0e0' : color,
                                    color: a.estado === 'bloqueado' ? '#999' : 'white',
                                    fontWeight: 600, fontSize: '0.72rem',
                                    '& .MuiChip-icon': { color: a.estado === 'bloqueado' ? '#999' : 'white' },
                                  }}
                                />
                              </Stack>
                            );
                          })}
                        </Stack>
                      </Paper>
                    )}

                    {/* Mensaje original */}
                    <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f0f4ff', borderRadius: 2, borderLeft: '3px solid #667eea' }}>
                      <Typography variant="caption" fontWeight={700} color="primary" display="block" mb={0.5}>SOLICITUD ORIGINAL</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{t.mensaje}</Typography>
                      {t.imagen_url && (
                        <Box component="img" src={getStaticFileURL(t.imagen_url)} alt="Evidencia"
                          sx={{ display: 'block', maxWidth: '100%', maxHeight: 300, borderRadius: 1.5, mt: 1.5, cursor: 'pointer', objectFit: 'contain', bgcolor: '#000' }}
                          onClick={() => window.open(getStaticFileURL(t.imagen_url), '_blank')} />
                      )}
                    </Paper>

                    {/* Historial */}
                    {res.length > 0 && (
                      <Box mb={2}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            HISTORIAL DE RESPUESTAS ({res.length})
                          </Typography>
                          <Tooltip title="Actualizar conversación">
                            <IconButton size="small" onClick={() => abrirDetalle(detalle.ticket.id)}>
                              <RefreshIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        <Stack spacing={1}>
                          {res.map(r => (
                            <Paper key={r.id} elevation={0} sx={{
                              p: 1.5, borderRadius: 1.5,
                              bgcolor: r.es_interno ? '#fff3e0' : '#f9f9f9',
                              borderLeft: `3px solid ${r.es_interno ? '#FF9800' : '#e0e0e0'}`,
                            }}>
                              <Stack direction="row" justifyContent="space-between" mb={0.3}>
                                <Typography variant="caption" fontWeight={700}>{r.nombre_usuario}</Typography>
                                <Typography variant="caption" color="text.disabled">{new Date(r.fecha_creacion).toLocaleString('es-CL')}</Typography>
                              </Stack>
                              {r.mensaje && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.mensaje}</Typography>}
                              {r.imagen_url && (
                                <Box component="img" src={getStaticFileURL(r.imagen_url)} alt="img"
                                  sx={{ mt: 1, maxWidth: '100%', maxHeight: 200, borderRadius: 1, cursor: 'pointer', objectFit: 'contain' }}
                                  onClick={() => window.open(getStaticFileURL(r.imagen_url), '_blank')} />
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {res.length === 0 && (
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="caption" color="text.disabled">Sin respuestas aún</Typography>
                        <Tooltip title="Actualizar conversación">
                          <IconButton size="small" onClick={() => abrirDetalle(detalle.ticket.id)}>
                            <RefreshIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}

                    {/* Responder */}
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                        AGREGAR NOTA / RESPUESTA
                      </Typography>

                      <TextField multiline rows={3} fullWidth size="small"
                        placeholder="Escribe una respuesta o actualización…"
                        value={respuesta} onChange={e => setRespuesta(e.target.value)} sx={{ mb: 1.5 }} />

                      {/* Preview imagen adjunta */}
                      {previewArchivoResp && (
                        <Box sx={{ position: 'relative', mb: 1.5, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                          <Box component="img" src={previewArchivoResp} alt="preview"
                            sx={{ display: 'block', width: '100%', maxHeight: 180, objectFit: 'contain', bgcolor: '#111' }} />
                          <IconButton size="small" onClick={quitarFotoResp}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.55)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <Box sx={{ position: 'absolute', bottom: 4, left: 8 }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem' }}>
                              {archivoResp?.name}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Button size="small" component="label"
                          startIcon={<AttachFileIcon />}
                          variant={archivoResp ? 'contained' : 'outlined'}
                          color={archivoResp ? 'success' : 'primary'}
                          sx={{ fontSize: '0.72rem', flexShrink: 0 }}>
                          {archivoResp ? 'Foto lista ✓' : 'Adjuntar foto'}
                          <input type="file" accept="image/*" capture="environment" hidden
                            onChange={e => seleccionarFotoResp(e.target.files[0] || null)} />
                        </Button>
                        <Button variant="contained" size="small" fullWidth
                          startIcon={enviandoResp ? <CircularProgress size={12} color="inherit" /> : <SendIcon />}
                          onClick={enviarRespuesta}
                          disabled={enviandoResp || (!respuesta.trim() && !archivoResp)}
                          sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                          {enviandoResp ? 'Enviando…' : 'Enviar'}
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Panel derecho: acciones rápidas */}
                  <Grid size={{ xs: 12, md: 4 }} sx={{ p: 2.5, bgcolor: '#f8f9fa' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1.5}>CAMBIAR ESTADO</Typography>
                    <Stack spacing={1} mb={3}>
                      {Object.entries(ESTADO_COLOR).filter(([k]) => k !== 'vencido').map(([estado, color]) => (
                        <Button key={estado} fullWidth size="small" variant={t.estado === estado ? 'contained' : 'outlined'}
                          disabled={cambiandoEstado} onClick={() => cambiarEstado(estado)}
                          sx={{
                            borderColor: color, color: t.estado === estado ? 'white' : color,
                            bgcolor: t.estado === estado ? color : 'transparent',
                            '&:hover': { bgcolor: `${color}15` },
                            justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600,
                          }}>
                          {ESTADO_LABEL[estado]}
                          {t.estado === estado && <CheckIcon sx={{ ml: 'auto', fontSize: 16 }} />}
                        </Button>
                      ))}
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>AVANCE DEPARTAMENTOS</Typography>
                    <Stack spacing={1.5}>
                      {depts.map((a, i) => {
                        const color = DEPT_COLORS[a.departamento_nombre] || '#666';
                        const estadoIcon = a.estado === 'entregado' ? '✅' : a.estado === 'pendiente' ? '⏳' : '🔒';
                        const estadoLabel = a.estado === 'entregado' ? 'Entregado' : a.estado === 'pendiente' ? 'Pendiente' : 'Bloqueado';
                        return (
                          <Box key={a.id || i} sx={{ p: 1.2, borderRadius: 1.5, bgcolor: 'white', border: `1px solid ${color}30` }}>
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                              <Typography fontSize={14}>{estadoIcon}</Typography>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="caption" fontWeight={700} color={color} display="block">{a.departamento_nombre}</Typography>
                                <Typography variant="caption" color="text.disabled">{estadoLabel} · Orden {a.orden}</Typography>
                              </Box>
                            </Stack>
                            {a.fecha_entrega && (
                              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.3 }}>
                                {new Date(a.fecha_entrega).toLocaleDateString('es-CL')}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                      {depts.length === 0 && <Typography variant="caption" color="text.disabled">Sin departamentos asignados</Typography>}
                    </Stack>
                  </Grid>
                </Grid>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
