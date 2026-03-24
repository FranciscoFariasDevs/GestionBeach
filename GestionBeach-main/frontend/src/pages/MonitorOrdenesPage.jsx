// frontend/src/pages/MonitorOrdenesPage.jsx - Monitor Ordenes de Compra (migrado de VB.NET)
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, LinearProgress, Tabs, Tab,
  Collapse, IconButton, Alert
} from '@mui/material';
import {
  Store as StoreIcon,
  FileDownload as FileDownloadIcon,
  LocalShipping as LocalShippingIcon,
  KeyboardArrowDown, KeyboardArrowRight,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import api from '../api/api';

const formatPeso = (v) => v == null || isNaN(v) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');
const formatFecha = (v) => {
  if (!v) return '-';
  try { return format(new Date(v), 'dd/MM/yyyy'); } catch { return v; }
};

const headSx = (bg) => ({ fontWeight: 700, bgcolor: bg || '#1a1a2e', color: '#fff', py: 0.8, fontSize: '0.78rem', whiteSpace: 'nowrap' });
const cellSx = { fontSize: '0.8rem', py: 0.5 };

// ============ FILA DE ORDEN EXPANDIBLE ============
const FilaOrden = memo(({ orden, productos }) => {
  const [open, setOpen] = useState(false);
  const prods = useMemo(
    () => productos.filter(p => String(p.folio_ingreso) === String(orden.folio_ingreso)),
    [productos, orden.folio_ingreso]
  );

  const estadoColor = orden.estado === 'VIGENTE' ? 'success' : 'default';

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: prods.length ? 'pointer' : 'default' }}
        onClick={() => prods.length && setOpen(!open)}
      >
        <TableCell sx={cellSx}>
          {prods.length > 0 && (
            <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
              {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
            </IconButton>
          )}
          <span style={{ fontFamily: 'monospace' }}>{orden.folio_ingreso}</span>
        </TableCell>
        <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>{orden.nro_oc}</TableCell>
        <TableCell sx={cellSx}>{orden.proveedor || '-'}</TableCell>
        <TableCell sx={cellSx}>{orden.tipo_proveedor}</TableCell>
        <TableCell align="right" sx={cellSx}>{formatPeso(orden.afecto)}</TableCell>
        <TableCell align="right" sx={cellSx}>{formatPeso(orden.iva)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, fontWeight: 700 }}>{formatPeso(orden.total)}</TableCell>
        <TableCell sx={cellSx}>{formatFecha(orden.fecha_creacion)}</TableCell>
        <TableCell sx={cellSx}>{formatFecha(orden.fecha_recepcion)}</TableCell>
        <TableCell sx={cellSx}>{orden.plazos_dias || '-'}</TableCell>
        <TableCell sx={cellSx}>{orden.fechas_vencimiento || '-'}</TableCell>
        <TableCell sx={cellSx}>{orden.usuario || '-'}</TableCell>
        <TableCell sx={cellSx}>
          <Chip
            label={orden.estado}
            size="small"
            color={estadoColor}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </TableCell>
      </TableRow>
      {open && prods.length > 0 && (
        <TableRow>
          <TableCell colSpan={13} sx={{ p: 0, bgcolor: 'rgba(255,250,205,0.7)' }}>
            <Collapse in={open}>
              <Box sx={{ px: 3, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#555' }}>
                  Productos del folio {orden.folio_ingreso} ({prods.length} items)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Codigo</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Descripcion</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Unidad</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Cantidad</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Valor Unit.</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prods.map((p, i) => (
                      <TableRow key={i} hover sx={{ bgcolor: 'rgba(255,253,231,0.5)' }}>
                        <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>{p.codigo}</TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</TableCell>
                        <TableCell sx={{ fontSize: '0.72rem' }}>{p.unidad}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{p.cantidad}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem' }}>{formatPeso(p.valor_unitario)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{formatPeso(p.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

// ============ EXPORTAR CSV GENERICO ============
const exportarCSV = (filas, columnas, claves, filename) => {
  if (!filas.length) return;
  const header = columnas.join(';');
  const rows = filas.map(f => claves.map(k => {
    const v = f[k];
    if (v == null) return '';
    if (typeof v === 'number') return Math.round(v);
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(';'));
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============ TAB 1: MONITOR ORDENES ============
function TabMonitorOrdenes({ sucursales }) {
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 7));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError('');
    try {
      const res = await api.get('/monitor-ordenes/ordenes', {
        params: {
          sucursalId,
          fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
          fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
        },
        timeout: 120000
      });
      setOrdenes(res.data.ordenes || []);
      setProductos(res.data.productos || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar ordenes');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  const totAfecto = useMemo(() => ordenes.reduce((s, o) => s + (o.afecto || 0), 0), [ordenes]);
  const totIva = useMemo(() => ordenes.reduce((s, o) => s + (o.iva || 0), 0), [ordenes]);
  const totTotal = useMemo(() => ordenes.reduce((s, o) => s + (o.total || 0), 0), [ordenes]);

  return (
    <>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <StoreIcon fontSize="small" sx={{ mr: 1, color: '#999' }} /> }}>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Fecha Recepcion Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Fecha Recepcion Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={!sucursalId || loading}
              sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(
                ordenes,
                ['Folio', 'N° OC', 'Proveedor', 'Tipo Prov.', 'Afecto', 'IVA', 'Total', 'Fecha Creacion', 'Fecha Recepcion', 'Plazos', 'Vencimientos', 'Usuario', 'Estado'],
                ['folio_ingreso', 'nro_oc', 'proveedor', 'tipo_proveedor', 'afecto', 'iva', 'total', 'fecha_creacion', 'fecha_recepcion', 'plazos_dias', 'fechas_vencimiento', 'usuario', 'estado'],
                `monitor_ordenes_${format(new Date(), 'yyyyMMdd')}.csv`
              )}
              disabled={!ordenes.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}>Exportar</Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {!ordenes.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <LocalShippingIcon sx={{ fontSize: 60, color: '#aaa', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {loading ? 'Consultando...' : 'Selecciona sucursal y fechas'}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 550 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx('#1a1a2e')}>Folio Ingreso</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>N° OC</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Proveedor</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Tipo Prov.</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>Afecto ($)</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>IVA ($)</TableCell>
                  <TableCell align="right" sx={headSx('#2e7d32')}>Total ($)</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Fecha Creacion</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Fecha Recepcion</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Plazos (dias)</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Fechas Vencimiento</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Usuario</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordenes.map((o, i) => (
                  <FilaOrden key={i} orden={o} productos={productos} />
                ))}
                <TableRow sx={{ bgcolor: '#1a1a2e' }}>
                  <TableCell colSpan={4} sx={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
                    TOTAL ({ordenes.length} ordenes)
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>{formatPeso(totAfecto)}</TableCell>
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>{formatPeso(totIva)}</TableCell>
                  <TableCell align="right" sx={{ color: '#c8e6c9', fontWeight: 700 }}>{formatPeso(totTotal)}</TableCell>
                  <TableCell colSpan={6} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
}

// ============ TAB 2: CONSOLIDADO ============
function TabConsolidado({ sucursales }) {
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(new Date());
  const [fechaHasta, setFechaHasta] = useState(new Date(new Date().setMonth(new Date().getMonth() + 2)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filas, setFilas] = useState([]);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError('');
    try {
      const res = await api.get('/monitor-ordenes/consolidado', {
        params: {
          sucursalId,
          fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
          fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
        },
        timeout: 120000
      });
      setFilas(res.data.filas || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar consolidado');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  // Agrupar por anio + semana
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const fila of filas) {
      const clave = `${fila.anio}-${String(fila.semana).padStart(2, '0')}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { anio: fila.anio, semana: fila.semana, filas: [], totAfecto: 0, totIva: 0, totTotal: 0 });
      }
      const g = mapa.get(clave);
      g.filas.push(fila);
      g.totAfecto += fila.afecto || 0;
      g.totIva += fila.iva || 0;
      g.totTotal += fila.total || 0;
    }
    return Array.from(mapa.values()).sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.semana - b.semana);
  }, [filas]);

  return (
    <>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <StoreIcon fontSize="small" sx={{ mr: 1, color: '#999' }} /> }}>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Vencimiento Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Vencimiento Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={!sucursalId || loading}
              sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(
                filas,
                ['Folio', 'N° OC', 'Proveedor', 'Tipo Prov.', 'Afecto', 'IVA', 'Total', 'Fecha Vencimiento', 'Plazo (dias)', 'Usuario', 'Estado', 'Ano', 'Semana'],
                ['folio_ingreso', 'nro_oc', 'proveedor', 'tipo_proveedor', 'afecto', 'iva', 'total', 'fecha_vencimiento', 'plazo_dias', 'usuario', 'estado', 'anio', 'semana'],
                `consolidado_${format(new Date(), 'yyyyMMdd')}.csv`
              )}
              disabled={!filas.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}>Exportar</Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {!filas.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <LocalShippingIcon sx={{ fontSize: 60, color: '#aaa', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {loading ? 'Consultando...' : 'Selecciona sucursal y rango de vencimiento'}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx('#1a1a2e')}>Folio</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>N° OC</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Proveedor</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>Afecto</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>IVA</TableCell>
                  <TableCell align="right" sx={headSx('#2e7d32')}>Total</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Fecha Vencimiento</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Plazo</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Usuario</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grupos.map((grupo) => (
                  <React.Fragment key={`${grupo.anio}-${grupo.semana}`}>
                    {/* Cabecera de grupo */}
                    <TableRow>
                      <TableCell colSpan={10} sx={{
                        bgcolor: '#0f3460',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        py: 0.8,
                        borderTop: '2px solid #FF9800'
                      }}>
                        Ano {grupo.anio} — Semana {grupo.semana} &nbsp;|&nbsp;
                        Afecto: {formatPeso(grupo.totAfecto)} &nbsp;|&nbsp;
                        IVA: {formatPeso(grupo.totIva)} &nbsp;|&nbsp;
                        TOTAL: {formatPeso(grupo.totTotal)}
                      </TableCell>
                    </TableRow>
                    {/* Filas del grupo */}
                    {grupo.filas.map((f, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ ...cellSx, fontFamily: 'monospace', pl: 3 }}>{f.folio_ingreso}</TableCell>
                        <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>{f.nro_oc}</TableCell>
                        <TableCell sx={cellSx}>{f.proveedor || '-'}</TableCell>
                        <TableCell align="right" sx={cellSx}>{formatPeso(f.afecto)}</TableCell>
                        <TableCell align="right" sx={cellSx}>{formatPeso(f.iva)}</TableCell>
                        <TableCell align="right" sx={{ ...cellSx, fontWeight: 700 }}>{formatPeso(f.total)}</TableCell>
                        <TableCell sx={cellSx}>{formatFecha(f.fecha_vencimiento)}</TableCell>
                        <TableCell sx={cellSx}>{f.plazo_dias} dias</TableCell>
                        <TableCell sx={cellSx}>{f.usuario || '-'}</TableCell>
                        <TableCell sx={cellSx}>
                          <Chip label={f.estado} size="small" color="success" sx={{ height: 18, fontSize: '0.68rem' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Footer por semana */}
                    <TableRow sx={{ bgcolor: 'rgba(15,52,96,0.07)' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '0.78rem', pl: 3 }}>
                        Subtotal semana {grupo.semana} ({grupo.filas.length} registros)
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{formatPeso(grupo.totAfecto)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{formatPeso(grupo.totIva)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#2e7d32' }}>{formatPeso(grupo.totTotal)}</TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
}

// ============ TAB 3: MONITOR CENTRAL ============
function TabMonitorCentral() {
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 30));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ocs, setOcs] = useState([]);
  const [tiempoMs, setTiempoMs] = useState(null);

  const handleBuscar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/monitor-ordenes/monitor-central', {
        params: {
          fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
          fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
        },
        timeout: 180000
      });
      setOcs(res.data.ocs || []);
      setTiempoMs(res.data.tiempo_ms || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar monitor central');
    } finally { setLoading(false); }
  }, [fechaDesde, fechaHasta]);

  const getEstadoChip = (estado) => {
    if (estado === 'INGRESADA') return <Chip label="INGRESADA" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />;
    if (estado === 'PARCIAL') return <Chip label="PARCIAL" size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />;
    return <Chip label="PENDIENTE" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />;
  };

  return (
    <>
      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
        Esta consulta puede demorar ya que conecta a todas las sucursales simultaneamente. Por favor espere hasta 3 minutos.
      </Alert>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={3}>
            <DatePicker label="Fecha Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <DatePicker label="Fecha Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={loading}
              sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(
                ocs,
                ['N° OC', 'Sucursal Origen', 'Neto ($)', 'IVA ($)', 'Total ($)', 'Fecha', 'Estado Ingreso'],
                ['nro_oc', 'sucursal_origen', 'neto', 'iva', 'total', 'fecha', 'estado_ingreso'],
                `monitor_central_${format(new Date(), 'yyyyMMdd')}.csv`
              )}
              disabled={!ocs.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}>Exportar</Button>
          </Grid>
          {tiempoMs && (
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Consulta completada en {(tiempoMs / 1000).toFixed(1)}s
              </Typography>
            </Grid>
          )}
        </Grid>
        {loading && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Consultando todas las sucursales... esto puede demorar hasta 3 minutos.
            </Typography>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {!ocs.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <LocalShippingIcon sx={{ fontSize: 60, color: '#aaa', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {loading ? 'Consultando todas las sucursales...' : 'Selecciona rango de fechas y busca'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              El Monitor Central muestra OC inter-sucursales y verifica su ingreso en cada local.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx('#1a1a2e')}>N° OC</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Sucursal Origen</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>Neto ($)</TableCell>
                  <TableCell align="right" sx={headSx('#37474f')}>IVA ($)</TableCell>
                  <TableCell align="right" sx={headSx('#2e7d32')}>Total ($)</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Fecha</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Estado Ingreso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ocs.map((oc, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ ...cellSx, fontFamily: 'monospace' }}>{oc.nro_oc}</TableCell>
                    <TableCell sx={cellSx}>{oc.sucursal_origen}</TableCell>
                    <TableCell align="right" sx={cellSx}>{formatPeso(oc.neto)}</TableCell>
                    <TableCell align="right" sx={cellSx}>{formatPeso(oc.iva)}</TableCell>
                    <TableCell align="right" sx={{ ...cellSx, fontWeight: 700 }}>{formatPeso(oc.total)}</TableCell>
                    <TableCell sx={cellSx}>{formatFecha(oc.fecha)}</TableCell>
                    <TableCell sx={cellSx}>{getEstadoChip(oc.estado_ingreso)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function MonitorOrdenesPage() {
  const [tab, setTab] = useState(0);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    api.get('/monitor-ordenes/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales:', e));
  }, []);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* HEADER */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LocalShippingIcon sx={{ fontSize: 36, color: '#FF9800' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Monitor Ordenes de Compra</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Monitor OC, Consolidado por semana y Monitor Central inter-sucursales
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* TABS */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, fontSize: '0.9rem' },
            '& .Mui-selected': { color: '#FF9800' },
            '& .MuiTabs-indicator': { bgcolor: '#FF9800' },
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Tab label="Monitor Ordenes" />
          <Tab label="Consolidado" />
          <Tab label="Monitor Central" />
        </Tabs>
      </Paper>

      {tab === 0 && <TabMonitorOrdenes sucursales={sucursales} />}
      {tab === 1 && <TabConsolidado sucursales={sucursales} />}
      {tab === 2 && <TabMonitorCentral />}
    </Box>
  );
}
