import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Card, CardContent, Grid, LinearProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import SearchIcon from '@mui/icons-material/Search';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../api/api';

const formatPeso = (v) => v == null || isNaN(v) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');

const headSx = { fontWeight: 700, bgcolor: '#1a237e', color: '#fff', py: 1, fontSize: '0.85rem' };

export default function ResumenValorizadoPage() {
  const [fecha, setFecha] = useState(new Date());
  const [datos, setDatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buscar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const fechaStr = format(fecha, 'dd/MM/yyyy');
      const { data } = await api.get('/resumen-valorizado/datos', { params: { fecha: fechaStr }, timeout: 30000 });
      setDatos(data.datos);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar');
      setDatos([]);
    } finally { setLoading(false); }
  }, [fecha]);

  const exportCSV = () => {
    if (!datos.length) return;
    const header = 'Sucursal;Valorizado;Fecha';
    const rows = datos.map(d => `"${d.sucursal}";${Math.round(d.valorizado || 0)};${d.fecha ? format(new Date(d.fecha), 'dd/MM/yyyy') : ''}`);
    rows.push(`"TOTAL";${Math.round(total)};`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `resumen_valorizado_${format(fecha, 'yyyyMMdd')}.csv`; a.click();
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)', color: '#fff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WarehouseIcon sx={{ fontSize: 36, color: '#FFD54F' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Resumen Valorizado</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>Stock valorizado por sucursal en una fecha determinada</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker label="Fecha" value={fecha} onChange={setFecha} format="dd/MM/yyyy"
            slotProps={{ textField: { size: 'small', sx: { width: 180 } } }} />
          <Button variant="contained" onClick={buscar} disabled={loading}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' }, fontWeight: 700, height: 40 }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : <><SearchIcon sx={{ mr: 1 }} />Buscar</>}
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV} disabled={!datos.length}
            sx={{ height: 40 }}>Exportar</Button>
        </Box>
        {loading && <LinearProgress sx={{ mt: 1 }} />}
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </Paper>

      {total > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderLeft: '4px solid #1a237e' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatPeso(total)}</Typography>
                <Typography variant="caption" color="text.secondary">Total Valorizado</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{datos.length}</Typography>
                <Typography variant="caption" color="text.secondary">Sucursales</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>Sucursal</TableCell>
                <TableCell sx={headSx} align="right">Valorizado</TableCell>
                <TableCell sx={headSx}>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.map((d, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{d.sucursal}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatPeso(d.valorizado)}</TableCell>
                  <TableCell>{d.fecha ? format(new Date(d.fecha), 'dd/MM/yyyy HH:mm') : ''}</TableCell>
                </TableRow>
              ))}
              {datos.length > 0 && (
                <TableRow sx={{ bgcolor: '#1a237e' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ color: '#FFD54F', fontWeight: 700, fontSize: '1rem' }}>{formatPeso(total)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
              {datos.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                    <WarehouseIcon sx={{ fontSize: 60, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">Selecciona una fecha y busca</Typography>
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
