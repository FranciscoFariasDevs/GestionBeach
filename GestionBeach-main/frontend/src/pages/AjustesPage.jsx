// frontend/src/pages/AjustesPage.jsx - Ajustes de Bodega (migrado de Ajustes.vb)
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Card, CardContent, InputAdornment, LinearProgress,
  Skeleton, Collapse, IconButton
} from '@mui/material';
import {
  Search as SearchIcon, Store as StoreIcon,
  FileDownload as FileDownloadIcon,
  KeyboardArrowDown, KeyboardArrowRight,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import api from '../api/api';

const formatPeso = (v) => v == null || isNaN(v) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');

const cellSx = { fontSize: '0.82rem', py: 0.5 };
const headSx = (bg) => ({ fontWeight: 700, bgcolor: bg, color: '#fff', py: 0.8, fontSize: '0.8rem', whiteSpace: 'nowrap' });

// Colores por tipo de ajuste
const getTipoColor = (tipo) => {
  if (!tipo) return { bg: '#e0e0e0', color: '#333' };
  const t = tipo.toLowerCase();
  if (t.includes('entrada') || t.includes('ingreso')) return { bg: '#e8f5e9', color: '#2e7d32' };
  if (t.includes('salida') || t.includes('egreso')) return { bg: '#ffebee', color: '#c62828' };
  if (t.includes('merma')) return { bg: '#fff3e0', color: '#e65100' };
  if (t.includes('devolucion') || t.includes('devolución')) return { bg: '#e3f2fd', color: '#1565c0' };
  if (t.includes('traslado')) return { bg: '#f3e5f5', color: '#7b1fa2' };
  // Colores variados para otros tipos (basado en hash simple)
  const colors = [
    { bg: '#e0f7fa', color: '#006064' },
    { bg: '#fce4ec', color: '#880e4f' },
    { bg: '#f1f8e9', color: '#33691e' },
    { bg: '#ede7f6', color: '#4527a0' },
  ];
  let hash = 0;
  for (let i = 0; i < tipo.length; i++) hash = (hash + tipo.charCodeAt(i)) % colors.length;
  return colors[hash];
};

// ============ FILA DE AJUSTE EXPANDIBLE ============
const FilaAjuste = memo(({ ajuste }) => {
  const [open, setOpen] = useState(false);
  const tipoColor = useMemo(() => getTipoColor(ajuste.tipo_ajuste), [ajuste.tipo_ajuste]);
  const fechaFmt = useMemo(() => {
    try { return format(new Date(ajuste.fecha), 'dd/MM/yyyy HH:mm'); } catch { return ajuste.fecha || ''; }
  }, [ajuste.fecha]);

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,152,0,0.05)' } }}
        onClick={() => setOpen(!open)}
      >
        <TableCell sx={{ ...cellSx, pl: 1 }}>
          <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
            {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
          </IconButton>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ajuste.id}</span>
        </TableCell>
        <TableCell sx={cellSx}>{ajuste.responsable}</TableCell>
        <TableCell sx={cellSx}>
          <Chip
            label={ajuste.tipo_ajuste || 'Sin tipo'}
            size="small"
            sx={{
              height: 20, fontSize: '0.7rem',
              bgcolor: tipoColor.bg, color: tipoColor.color,
              fontWeight: 600
            }}
          />
        </TableCell>
        <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{fechaFmt}</TableCell>
        <TableCell sx={{ ...cellSx, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ajuste.observacion || '—'}
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, fontWeight: 700, color: '#1565c0' }}>{formatPeso(ajuste.total)}</TableCell>
        <TableCell align="center" sx={cellSx}>
          <Chip label={ajuste.productos.length} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e3f2fd', color: '#1565c0' }} />
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={7} sx={{ p: 0, bgcolor: 'rgba(240,248,255,0.7)' }}>
            <Collapse in={open}>
              <Box sx={{ px: 3, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block', color: '#555' }}>
                  Productos del ajuste {ajuste.id} ({ajuste.productos.length} ítems)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Descripción</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Cantidad</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Unitario ($)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Total ($)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ajuste.productos.map((p, i) => (
                      <TableRow key={i} hover sx={{ bgcolor: 'rgba(255,253,231,0.5)' }}>
                        <TableCell sx={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{p.codigo}</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem' }}>{p.cantidad}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem' }}>{formatPeso(p.unitario)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{formatPeso(p.total_linea)}</TableCell>
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
const exportarCSV = (ajustes, filename) => {
  if (!ajustes.length) return;
  const cols = ['ID Ajuste', 'Responsable', 'Tipo Ajuste', 'Fecha', 'Observacion', 'Codigo', 'Descripcion', 'Cantidad', 'Unitario', 'Total Linea'];
  const header = cols.join(';');
  const rows = [];
  ajustes.forEach(a => {
    const fechaFmt = (() => { try { return format(new Date(a.fecha), 'dd/MM/yyyy HH:mm'); } catch { return a.fecha || ''; } })();
    a.productos.forEach(p => {
      rows.push([
        a.id,
        `"${(a.responsable || '').replace(/"/g, "'")}"`,
        `"${(a.tipo_ajuste || '').replace(/"/g, "'")}"`,
        fechaFmt,
        `"${(a.observacion || '').replace(/"/g, "'")}"`,
        p.codigo,
        `"${(p.descripcion || '').replace(/"/g, "'")}"`,
        p.cantidad,
        Math.round(p.unitario || 0),
        Math.round(p.total_linea || 0)
      ].join(';'));
    });
  });
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ============ COMPONENTE PRINCIPAL ============
export default function AjustesPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 7));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ajustes, setAjustes] = useState([]);

  useEffect(() => {
    api.get('/ajustes/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales Ajustes:', e));
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(''); setBusqueda('');
    try {
      const res = await api.get('/ajustes/datos', {
        params: {
          sucursalId,
          fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
          fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
        },
        timeout: 120000
      });
      setAjustes(res.data.ajustes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar ajustes');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  const filtrados = useMemo(() => {
    if (!busqueda) return ajustes;
    const q = busqueda.toLowerCase();
    return ajustes.filter(a =>
      String(a.id).includes(q) ||
      (a.responsable || '').toLowerCase().includes(q) ||
      (a.tipo_ajuste || '').toLowerCase().includes(q) ||
      (a.observacion || '').toLowerCase().includes(q)
    );
  }, [ajustes, busqueda]);

  const sucursalNombre = useMemo(
    () => sucursales.find(s => s.id === parseInt(sucursalId))?.nombre || '',
    [sucursales, sucursalId]
  );

  // Totales globales
  const totalesGlobales = useMemo(() => ({
    totalAjustes: ajustes.length,
    totalPesos: ajustes.reduce((s, a) => s + (a.total || 0), 0),
    totalProductos: ajustes.reduce((s, a) => s + a.productos.length, 0),
  }), [ajustes]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* HEADER */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InventoryIcon sx={{ fontSize: 36, color: '#FF9800' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Ajustes de Bodega</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Ajustes de inventario por sucursal — expandible por ajuste para ver productos
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* FILTROS */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select fullWidth size="small" label="Sucursal" value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><StoreIcon fontSize="small" /></InputAdornment> }}
            >
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker
              label="Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker
              label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button
              fullWidth variant="contained" onClick={handleBuscar}
              disabled={!sucursalId || loading}
              sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, fontWeight: 700, height: 40 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button
              fullWidth variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportarCSV(ajustes, `ajustes_${sucursalNombre}_${format(new Date(), 'yyyyMMdd')}.csv`)}
              disabled={!ajustes.length}
              sx={{ height: 40, borderColor: '#666', color: '#666' }}
            >
              Exportar
            </Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />}
        {error && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,0,0,0.08)', borderRadius: 1 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
      </Paper>

      {/* CARDS TOTALES */}
      {ajustes.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Total Ajustes', value: totalesGlobales.totalAjustes, color: '#1565c0', isNum: true },
            { label: 'Total $', value: formatPeso(totalesGlobales.totalPesos), color: '#2e7d32' },
            { label: 'N° Productos', value: totalesGlobales.totalProductos, color: '#e65100', isNum: true },
          ].map((c, i) => (
            <Grid item xs={4} sm={4} key={i}>
              <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {c.isNum ? c.value.toLocaleString('es-CL') : c.value}
                  </Typography>
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
          <TextField
            size="small" fullWidth placeholder="Buscar por ID, responsable, tipo, observación..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>{[...Array(8)].map((_, i) => <Skeleton key={i} height={42} sx={{ mb: 0.5 }} />)}</Box>
        ) : !ajustes.length ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <InventoryIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Selecciona sucursal y fechas para consultar</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx('#1a1a2e')}>ID Ajuste</TableCell>
                  <TableCell sx={headSx('#1a1a2e')}>Responsable</TableCell>
                  <TableCell sx={headSx('#0f3460')}>Tipo Ajuste</TableCell>
                  <TableCell sx={headSx('#0f3460')}>Fecha</TableCell>
                  <TableCell sx={headSx('#16213e')}>Observación</TableCell>
                  <TableCell align="right" sx={headSx('#1565c0')}>Total ($)</TableCell>
                  <TableCell align="center" sx={headSx('#37474f')}>N° Productos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map((a) => (
                  <FilaAjuste key={a.id} ajuste={a} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {sucursalNombre && ajustes.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          {sucursalNombre} | {format(fechaDesde, 'dd/MM/yyyy')} - {format(fechaHasta, 'dd/MM/yyyy')} | {filtrados.length} de {ajustes.length} ajustes
        </Typography>
      )}
    </Box>
  );
}
