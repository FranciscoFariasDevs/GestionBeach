import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Chip,
  Card, CardContent, Grid, InputAdornment, LinearProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import StoreIcon from '@mui/icons-material/Store';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../api/api';

const TIPOS = [
  { value: 'sobre_stock', label: 'Sobre Stock', color: '#e65100', icon: <TrendingUpIcon /> },
  { value: 'bajo_minimo', label: 'Bajo Stock Minimo', color: '#f9a825', icon: <WarningIcon /> },
  { value: 'bajo_critico', label: 'Bajo Stock Critico', color: '#c62828', icon: <ErrorIcon /> },
  { value: 'todo', label: 'Todo', color: '#1a237e', icon: <InventoryIcon /> },
];

const headSx = (bg) => ({ fontWeight: 700, bgcolor: bg, color: '#fff', py: 0.8, fontSize: '0.82rem', whiteSpace: 'nowrap' });

export default function StocksPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [tipo, setTipo] = useState('sobre_stock');
  const [productos, setProductos] = useState([]);
  const [cantidad, setCantidad] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    api.get('/stocks/sucursales').then(r => setSucursales(r.data)).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(''); setFiltro('');
    try {
      const { data } = await api.get('/stocks/datos', { params: { sucursalId, tipo }, timeout: 120000 });
      setProductos(data.productos);
      setCantidad(data.cantidad);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar stocks');
      setProductos([]);
    } finally { setLoading(false); }
  }, [sucursalId, tipo]);

  const filtrados = useMemo(() => {
    if (!filtro) return productos;
    const f = filtro.toLowerCase();
    return productos.filter(p =>
      (p.codigo || '').toLowerCase().includes(f) ||
      (p.descripcion || '').toLowerCase().includes(f) ||
      (p.familia || '').toLowerCase().includes(f)
    );
  }, [productos, filtro]);

  const tipoInfo = TIPOS.find(t => t.value === tipo);

  const getRowColor = (p) => {
    if (p.existencia > p.stock_maximo && p.stock_maximo > 0) return 'rgba(230,81,0,0.06)';
    if (p.existencia < p.stock_critico) return 'rgba(198,40,40,0.08)';
    if (p.existencia < p.stock_minimo) return 'rgba(249,168,37,0.08)';
    return {};
  };

  const exportCSV = () => {
    if (!filtrados.length) return;
    const header = 'Codigo;Descripcion;Familia;Existencia;Stock Maximo;Stock Minimo;Stock Critico';
    const rows = filtrados.map(p => `"${p.codigo}";"${p.descripcion}";"${p.familia || ''}";${p.existencia};${p.stock_maximo};${p.stock_minimo};${p.stock_critico}`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `stocks_${tipo}.csv`; a.click();
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InventoryIcon sx={{ fontSize: 36, color: '#4FC3F7' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Analisis de Stocks</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>Sobre stock, bajo stock minimo y bajo stock critico por sucursal</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId} onChange={e => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><StoreIcon fontSize="small" /></InputAdornment> }}>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Tipo de Stock" value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={buscar} disabled={!sucursalId || loading}
              sx={{ bgcolor: tipoInfo?.color || '#1a237e', '&:hover': { opacity: 0.9 }, fontWeight: 700, height: 40 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV}
              disabled={!productos.length} sx={{ height: 40 }}>Exportar</Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1 }} />}
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </Paper>

      {cantidad > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderLeft: `4px solid ${tipoInfo?.color}` }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{cantidad}</Typography>
                <Typography variant="caption" color="text.secondary">Productos</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderLeft: '4px solid #1a237e' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Chip label={tipoInfo?.label} sx={{ bgcolor: tipoInfo?.color, color: '#fff', fontWeight: 700 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #eee' }}>
          <TextField size="small" fullWidth placeholder="Buscar por codigo, descripcion, familia..."
            value={filtro} onChange={e => setFiltro(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx('#1a1a2e')}>Codigo</TableCell>
                <TableCell sx={headSx('#1a1a2e')}>Descripcion</TableCell>
                <TableCell sx={headSx('#1a1a2e')}>Familia</TableCell>
                <TableCell sx={headSx('#455a64')} align="right">Existencia</TableCell>
                <TableCell sx={headSx('#e65100')} align="right">Stock Max.</TableCell>
                <TableCell sx={headSx('#f9a825')} align="right">Stock Min.</TableCell>
                <TableCell sx={headSx('#c62828')} align="right">Stock Critico</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map((p, i) => (
                <TableRow key={i} hover sx={{ bgcolor: getRowColor(p) }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>{p.codigo}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{p.descripcion}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{p.familia}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.existencia}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{p.stock_maximo}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{p.stock_minimo}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.82rem', color: p.existencia < p.stock_critico ? '#c62828' : 'inherit', fontWeight: p.existencia < p.stock_critico ? 700 : 400 }}>{p.stock_critico}</TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <InventoryIcon sx={{ fontSize: 60, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">Selecciona sucursal y tipo de stock</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
