// frontend/src/pages/RentabilidadPage.jsx - Rentabilidad Ferreterías (migrado de Rentabilidad.vb + VerResumenHora.vb)
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Card, CardContent, InputAdornment, LinearProgress,
  Skeleton, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
  FileDownload as FileDownloadIcon,
  Store as StoreIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  ShowChart as ChartIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api/api';

const MAX_FILAS = 500;

const formatPeso = (v) => {
  if (v == null || isNaN(v)) return '$0';
  return '$' + Math.round(v).toLocaleString('es-CL');
};
const formatPct = (v) => {
  if (v == null || isNaN(v)) return '0%';
  return (v * 100).toFixed(1) + '%';
};
const formatFecha = (f) => {
  if (!f) return '-';
  try { return format(new Date(f), 'dd/MM/yyyy', { locale: es }); } catch { return f; }
};

// ============ TABLA PRINCIPAL ============
const TablaRentabilidad = memo(({ registros, busqueda, loading }) => {
  const filtrados = useMemo(() => {
    if (!busqueda) return registros;
    const b = busqueda.toLowerCase();
    return registros.filter(r =>
      (r.codigo || '').toLowerCase().includes(b) ||
      (r.descripcion || '').toLowerCase().includes(b)
    );
  }, [registros, busqueda]);

  const visibles = useMemo(() => filtrados.slice(0, MAX_FILAS), [filtrados]);

  const totales = useMemo(() => {
    const v = filtrados.reduce((s, r) => s + (r.venta || 0), 0);
    const c = filtrados.reduce((s, r) => s + (r.costo || 0), 0);
    const u = filtrados.reduce((s, r) => s + (r.utilidad || 0), 0);
    return { venta: v, costo: c, utilidad: u, rentabilidad: v > 0 ? u / v : 0 };
  }, [filtrados]);

  if (loading) {
    return <Box sx={{ p: 3 }}>{[...Array(10)].map((_, i) => <Skeleton key={i} height={42} sx={{ mb: 0.5 }} />)}</Box>;
  }

  if (!registros.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <ChartIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Selecciona sucursal y rango de fechas</Typography>
        <Typography variant="body2" color="text.secondary">Presiona "Buscar" para calcular rentabilidad</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {filtrados.length > MAX_FILAS
            ? `Mostrando ${MAX_FILAS} de ${filtrados.length} registros (usa el buscador)`
            : `${filtrados.length} registros`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`Venta: ${formatPeso(totales.venta)}`} color="primary" variant="outlined" />
          <Chip size="small" label={`Costo: ${formatPeso(totales.costo)}`} color="default" variant="outlined" />
          <Chip size="small" label={`Utilidad: ${formatPeso(totales.utilidad)}`} color="success" variant="outlined" />
          <Chip size="small" label={`Rent: ${formatPct(totales.rentabilidad)}`}
            sx={{ bgcolor: totales.rentabilidad > 0.3 ? '#2e7d32' : totales.rentabilidad > 0.15 ? '#ed6c02' : '#d32f2f', color: '#fff', fontWeight: 700 }} />
        </Box>
      </Box>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['Fecha','Hora','Codigo','Descripcion','Cantidad','Venta','Costo','Utilidad','Rent.'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}
                  align={['Cantidad','Venta','Costo','Utilidad','Rent.'].includes(h) ? 'right' : 'left'}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((r, i) => {
              const rentColor = r.rentabilidad > 0.3 ? '#2e7d32' : r.rentabilidad > 0.15 ? '#ed6c02' : r.rentabilidad > 0 ? '#e65100' : '#d32f2f';
              return (
                <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.04)' } }}>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{formatFecha(r.fecha)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{String(r.hora).padStart(2, '0')}:00</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.codigo}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</TableCell>
                  <TableCell align="right">{r.cantidad}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatPeso(r.venta)}</TableCell>
                  <TableCell align="right">{formatPeso(r.costo)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: r.utilidad >= 0 ? '#2e7d32' : '#d32f2f' }}>{formatPeso(r.utilidad)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: rentColor }}>{formatPct(r.rentabilidad)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
});

// ============ EXPORTAR CSV ============
const exportarCSV = (data, filename) => {
  if (!data.length) return;
  const cols = [
    { key: 'fecha', label: 'Fecha' }, { key: 'hora', label: 'Hora' },
    { key: 'codigo', label: 'Codigo' }, { key: 'descripcion', label: 'Descripcion' },
    { key: 'cantidad', label: 'Cantidad' }, { key: 'venta', label: 'Venta' },
    { key: 'costo', label: 'Costo' }, { key: 'utilidad', label: 'Utilidad' },
    { key: 'rentabilidad', label: 'Rentabilidad' }
  ];
  const header = cols.map(c => c.label).join(';');
  const rows = data.map(row => cols.map(c => {
    let v = row[c.key];
    if (v == null) return '';
    if (typeof v === 'string' && v.includes(';')) return `"${v}"`;
    return v;
  }).join(';'));
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============ COMPONENTE PRINCIPAL ============
export default function RentabilidadPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 7));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registros, setRegistros] = useState([]);
  const [totales, setTotales] = useState(null);
  const [resumenHoras, setResumenHoras] = useState([]);
  const [showResumen, setShowResumen] = useState(false);

  useEffect(() => {
    api.get('/rentabilidad/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales:', e));
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    setError('');
    setBusqueda('');
    try {
      const res = await api.get('/rentabilidad/datos', {
        params: {
          sucursalId,
          fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
          fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
        },
        timeout: 120000
      });
      setRegistros(res.data.registros);
      setTotales(res.data.totales);
      setResumenHoras(res.data.resumen_horas);
      if (res.data.resumen_horas.length > 0) setShowResumen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar rentabilidad');
    } finally {
      setLoading(false);
    }
  }, [sucursalId, fechaDesde, fechaHasta]);

  const sucursalNombre = useMemo(() =>
    sucursales.find(s => s.id === parseInt(sucursalId))?.nombre || '',
    [sucursales, sucursalId]
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* HEADER */}
      <Paper sx={{
        p: 2, mb: 2,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff', borderRadius: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MoneyIcon sx={{ fontSize: 36, color: '#4caf50' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Rentabilidad</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Venta, costo, utilidad y rentabilidad por producto, dia y hora
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* FILTROS */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><StoreIcon fontSize="small" /></InputAdornment> }}>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={4} sm={1.5}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={!sucursalId || loading}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={4} sm={1.5}>
            <Button fullWidth variant="outlined" startIcon={<TimeIcon />} onClick={() => setShowResumen(true)}
              disabled={!resumenHoras.length}
              sx={{ height: 40, borderColor: '#FF9800', color: '#FF9800' }}>
              Horas
            </Button>
          </Grid>
          <Grid item xs={4} sm={1}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(registros, `rentabilidad_${sucursalNombre}_${format(new Date(), 'yyyyMMdd')}.csv`)}
              disabled={!registros.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}>
              CSV
            </Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }} />}
        {error && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,0,0,0.08)', borderRadius: 1 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
      </Paper>

      {/* CARDS RESUMEN */}
      {totales && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Venta Total', value: formatPeso(totales.venta), color: '#1565c0', icon: <TrendingUpIcon /> },
            { label: 'Costo Total', value: formatPeso(totales.costo), color: '#e65100', icon: <MoneyIcon /> },
            { label: 'Utilidad', value: formatPeso(totales.utilidad), color: '#2e7d32', icon: <MoneyIcon /> },
            { label: 'Rentabilidad', value: formatPct(totales.rentabilidad), color: totales.rentabilidad > 0.3 ? '#2e7d32' : '#ed6c02', icon: <ChartIcon /> },
          ].map((c, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {React.cloneElement(c.icon, { sx: { color: c.color } })}
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{c.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* TABLA */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #eee' }}>
          <TextField size="small" fullWidth placeholder="Buscar por codigo o descripcion..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Box>
        <TablaRentabilidad registros={registros} busqueda={busqueda} loading={loading} />
      </Paper>

      {sucursalNombre && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Sucursal: {sucursalNombre} | Periodo: {format(fechaDesde, 'dd/MM/yyyy')} - {format(fechaHasta, 'dd/MM/yyyy')}
        </Typography>
      )}

      {/* DIALOG RESUMEN MEJOR HORA POR DIA (VerResumenHora.vb) */}
      <Dialog open={showResumen} onClose={() => setShowResumen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon sx={{ color: '#FF9800' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Mejor Hora de Venta por Dia</Typography>
          </Box>
          <IconButton onClick={() => setShowResumen(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 450 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Dia</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>Mejor Hora</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }} align="right">Venta Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenHoras.map((r, i) => (
                  <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(76,175,80,0.04)' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{formatFecha(r.dia)}</TableCell>
                    <TableCell>
                      <Chip label={r.rango_hora} size="small" icon={<TimeIcon />}
                        sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#2e7d32' }}>{formatPeso(r.venta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
