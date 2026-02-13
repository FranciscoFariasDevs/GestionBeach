// frontend/src/pages/MargenesPage.jsx - Márgenes por Vendedor (migrado de Margen.vb)
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Card, CardContent, InputAdornment, LinearProgress,
  Skeleton, Collapse, IconButton
} from '@mui/material';
import {
  Search as SearchIcon, AttachMoney as MoneyIcon, Store as StoreIcon,
  FileDownload as FileDownloadIcon, ShowChart as ChartIcon,
  KeyboardArrowDown, KeyboardArrowRight, Person as PersonIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api/api';

const formatPeso = (v) => v == null || isNaN(v) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');
const formatPct = (v) => v == null || isNaN(v) ? '0.00%' : v.toFixed(2) + '%';

const cellSx = { fontSize: '0.82rem', py: 0.5 };
const headSx = (bg) => ({ fontWeight: 700, bgcolor: bg, color: '#fff', py: 0.8, fontSize: '0.8rem', whiteSpace: 'nowrap' });

// ============ FILA DE VENDEDOR EXPANDIBLE ============
const FilaVendedor = memo(({ v, documentos, isNC }) => {
  const [open, setOpen] = useState(false);
  const docs = useMemo(() => documentos.filter(d => d.Vendedor === v.Vendedor), [documentos, v.Vendedor]);
  const rowBg = isNC ? 'rgba(255,0,0,0.06)' : {};

  return (
    <>
      <TableRow hover sx={{ bgcolor: rowBg, cursor: docs.length ? 'pointer' : 'default' }} onClick={() => docs.length && setOpen(!open)}>
        <TableCell sx={cellSx}>
          {docs.length > 0 && (
            <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
              {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
            </IconButton>
          )}
          {v.Vendedor}
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(255,200,200,0.3)' }}>{formatPeso(v.venta_sin_dcto)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(255,200,200,0.3)' }}>{formatPeso(v.utilidad_sin_dcto)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(255,200,200,0.3)', fontWeight: 600 }}>{formatPct(v.margen_sin_dcto)}</TableCell>
        <TableCell align="right" sx={cellSx}>{formatPeso(v.costo_neto)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(180,255,180,0.3)' }}>{formatPeso(v.venta_con_dcto)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(180,255,180,0.3)' }}>{formatPeso(v.utilidad_con_dcto)}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, bgcolor: 'rgba(180,255,180,0.3)', fontWeight: 700 }}>{formatPct(v.margen_con_dcto)}</TableCell>
      </TableRow>
      {open && docs.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} sx={{ p: 0, bgcolor: 'rgba(240,248,255,0.7)' }}>
            <Collapse in={open}>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>
                  Documentos de {v.Vendedor} ({docs.length})
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>N° Doc</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Tipo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(255,200,200,0.2)' }}>Venta S/D</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(255,200,200,0.2)' }}>Utilidad S/D</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(255,200,200,0.2)' }}>Margen S/D</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Costo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(180,255,180,0.2)' }}>Venta C/D</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(180,255,180,0.2)' }}>Utilidad C/D</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(180,255,180,0.2)' }}>Margen C/D</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {docs.map((d, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{d.numero_doc}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          <Chip label={d.tipo_doc} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: d.tipo_doc === 'BO' ? '#e3f2fd' : '#fff3e0' }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{formatPeso(d.venta_sin_dcto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{formatPeso(d.utilidad_sin_dcto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatPct(d.margen_sin_dcto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{formatPeso(d.costo_neto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{formatPeso(d.venta_con_dcto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>{formatPeso(d.utilidad_con_dcto)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatPct(d.margen_con_dcto)}</TableCell>
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

// ============ EXPORTAR CSV ============
const pctKeys = new Set(['margen_sin_dcto', 'margen_con_dcto']);
const moneyKeys = new Set(['venta_sin_dcto','utilidad_sin_dcto','costo_neto','venta_con_dcto','utilidad_con_dcto']);
const fmtVal = (k, v) => {
  if (v == null || v === '') return '';
  if (k === 'Vendedor') return `"${v}"`;
  if (pctKeys.has(k)) return (Number(v) || 0).toFixed(2).replace('.', ',');
  if (moneyKeys.has(k)) return Math.round(Number(v) || 0);
  return v;
};
const exportarCSV = (vendedores, filename) => {
  if (!vendedores.length) return;
  const cols = ['Vendedor','Venta S/Dcto','Utilidad S/Dcto','Margen S/Dcto','Costo Neto','Venta C/Dcto','Utilidad C/Dcto','Margen C/Dcto'];
  const keys = ['Vendedor','venta_sin_dcto','utilidad_sin_dcto','margen_sin_dcto','costo_neto','venta_con_dcto','utilidad_con_dcto','margen_con_dcto'];
  const header = cols.join(';');
  const rows = vendedores.map(v => keys.map(k => fmtVal(k, v[k])).join(';'));
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============ COMPONENTE PRINCIPAL ============
export default function MargenesPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 1));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendedores, setVendedores] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [totales, setTotales] = useState(null);

  useEffect(() => {
    api.get('/margenes/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales:', e));
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(''); setBusqueda('');
    try {
      const res = await api.get('/margenes/datos', {
        params: { sucursalId, fechaDesde: format(fechaDesde, 'yyyy-MM-dd'), fechaHasta: format(fechaHasta, 'yyyy-MM-dd') },
        timeout: 120000
      });
      setVendedores(res.data.vendedores);
      setDocumentos(res.data.documentos);
      setTotales(res.data.totales);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar margenes');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  const filtrados = useMemo(() => {
    if (!busqueda) return vendedores;
    return vendedores.filter(v => (v.Vendedor || '').toLowerCase().includes(busqueda.toLowerCase()));
  }, [vendedores, busqueda]);

  const sucursalNombre = useMemo(() => sucursales.find(s => s.id === parseInt(sucursalId))?.nombre || '', [sucursales, sucursalId]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* HEADER */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ChartIcon sx={{ fontSize: 36, color: '#FF9800' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Margenes por Vendedor</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>Venta, costo, utilidad y margen S/Dcto y C/Dcto por vendedor - con notas de credito</Typography>
          </Box>
        </Box>
      </Paper>

      {/* FILTROS */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}
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
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={!sucursalId || loading}
              sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(vendedores, `margenes_${sucursalNombre}_${format(new Date(), 'yyyyMMdd')}.csv`)}
              disabled={!vendedores.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}>Exportar</Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />}
        {error && <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,0,0,0.08)', borderRadius: 1 }}><Typography variant="body2" color="error">{error}</Typography></Box>}
      </Paper>

      {/* CARDS TOTALES */}
      {totales && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Venta S/Dcto', value: formatPeso(totales.venta_sin_dcto), color: '#c62828' },
            { label: 'Venta C/Dcto', value: formatPeso(totales.venta_con_dcto), color: '#2e7d32' },
            { label: 'Costo Neto', value: formatPeso(totales.costo_neto), color: '#e65100' },
            { label: 'Margen S/Dcto', value: formatPct(totales.margen_sin_dcto), color: '#c62828' },
            { label: 'Utilidad C/Dcto', value: formatPeso(totales.utilidad_con_dcto), color: '#2e7d32' },
            { label: 'Margen C/Dcto', value: formatPct(totales.margen_con_dcto), color: '#2e7d32' },
          ].map((c, i) => (
            <Grid item xs={6} sm={2} key={i}>
              <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{c.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* TABLA */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #eee' }}>
          <TextField size="small" fullWidth placeholder="Buscar vendedor..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>{[...Array(8)].map((_, i) => <Skeleton key={i} height={42} sx={{ mb: 0.5 }} />)}</Box>
        ) : !vendedores.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PersonIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Selecciona sucursal y fechas</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ px: 1.5, py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{filtrados.length} vendedores | Click para ver documentos</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 550 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx('#1a1a2e')}>Vendedor</TableCell>
                    <TableCell align="right" sx={headSx('#c62828')}>Venta S/D</TableCell>
                    <TableCell align="right" sx={headSx('#c62828')}>Utilidad S/D</TableCell>
                    <TableCell align="right" sx={headSx('#c62828')}>Margen S/D</TableCell>
                    <TableCell align="right" sx={headSx('#455a64')}>Costo Neto</TableCell>
                    <TableCell align="right" sx={headSx('#2e7d32')}>Venta C/D</TableCell>
                    <TableCell align="right" sx={headSx('#2e7d32')}>Utilidad C/D</TableCell>
                    <TableCell align="right" sx={headSx('#2e7d32')}>Margen C/D</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrados.map((v, i) => (
                    <FilaVendedor key={i} v={v} documentos={documentos} isNC={v.Vendedor === 'NOTAS DE CREDITO'} />
                  ))}
                  {/* FILA TOTALES */}
                  {totales && (
                    <TableRow sx={{ bgcolor: '#1a1a2e' }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>TOTAL</TableCell>
                      <TableCell align="right" sx={{ color: '#ffcdd2', fontWeight: 700 }}>{formatPeso(totales.venta_sin_dcto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ffcdd2', fontWeight: 700 }}>{formatPeso(totales.utilidad_sin_dcto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#ffcdd2', fontWeight: 700 }}>{formatPct(totales.margen_sin_dcto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>{formatPeso(totales.costo_neto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#c8e6c9', fontWeight: 700 }}>{formatPeso(totales.venta_con_dcto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#c8e6c9', fontWeight: 700 }}>{formatPeso(totales.utilidad_con_dcto)}</TableCell>
                      <TableCell align="right" sx={{ color: '#c8e6c9', fontWeight: 700 }}>{formatPct(totales.margen_con_dcto)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {sucursalNombre && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          {sucursalNombre} | {format(fechaDesde, 'dd/MM/yyyy')} - {format(fechaHasta, 'dd/MM/yyyy')}
        </Typography>
      )}
    </Box>
  );
}
