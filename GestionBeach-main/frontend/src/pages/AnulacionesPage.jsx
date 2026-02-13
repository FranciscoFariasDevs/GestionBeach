import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Chip, Card, CardContent, Grid,
  Dialog, DialogContent, DialogTitle, IconButton, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon, FileDownload as ExcelIcon,
  Close as CloseIcon, Block as BlockIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api/api';

const fmt = (v) => (!v && v !== 0) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL') : '';
const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = hoy.slice(0, 8) + '01';

const AnulacionesPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(inicioMes);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detalle modal
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => {
    const fetchSuc = async () => {
      try {
        const res = await api.get('/anulaciones/sucursales');
        setSucursales(res.data);
        if (res.data.length > 0) setSucursalId(res.data[0].id);
      } catch { setError('Error al cargar sucursales'); }
    };
    fetchSuc();
  }, []);

  const buscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await api.get('/anulaciones/datos', {
        params: { sucursalId, fechaDesde, fechaHasta }, timeout: 60000
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar anulaciones');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  useEffect(() => { if (sucursalId) buscar(); }, [sucursalId]);

  const verDetalle = async (anulacion) => {
    setVentaSeleccionada(anulacion);
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleData(null);
    try {
      const res = await api.get('/anulaciones/detalle', {
        params: { sucursalId, numVenta: anulacion.NumVenta }, timeout: 30000
      });
      setDetalleData(res.data);
    } catch { setDetalleData({ productos: [] }); }
    finally { setDetalleLoading(false); }
  };

  const exportToExcel = () => {
    if (!data?.anulaciones?.length) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      [`ANULACIONES - ${data.sucursal}`],
      [`Desde: ${fechaDesde}  Hasta: ${fechaHasta}`],
      [''],
      ['N Venta', 'Responsable', 'Neto', 'Iva', 'Total', 'Fecha Ingreso']
    ];
    data.anulaciones.forEach(a => {
      rows.push([a.NumVenta, a.Responsable, a.Neto, a.Iva, a.Total, fmtFecha(a.FechaIngreso)]);
    });
    rows.push([''], ['', '', '', '', fmt(data.total_monto), '']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const pesoFmt = '"$"#,##0';
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (const c of [2, 3, 4]) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && typeof ws[addr].v === 'number') ws[addr].z = pesoFmt;
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Anulaciones');
    XLSX.writeFile(wb, `Anulaciones_${data.sucursal?.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  return (
    <Container maxWidth={false} sx={{ mt: 1, mb: 4, px: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#333' }}>Anulaciones</Typography>
          <Typography variant="body2" color="text.secondary">Ordenes anuladas por sucursal y rango de fechas</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<ExcelIcon />} onClick={exportToExcel}
          disabled={!data || loading || !data.anulaciones?.length}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#4caf50', color: '#4caf50', '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76,175,80,0.04)' } }}>
          Excel
        </Button>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Sucursal" value={sucursalId}
          onChange={(e) => setSucursalId(e.target.value)}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <TextField type="date" size="small" label="Desde" value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <TextField type="date" size="small" label="Hasta" value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        <Button variant="contained" size="small" onClick={buscar} disabled={loading || !sucursalId}
          sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' } }}>
          <SearchIcon sx={{ fontSize: 18, mr: 0.5 }} /> Buscar
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress sx={{ color: '#FF9800' }} />
          <Typography color="text.secondary">Consultando anulaciones...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && data && (
        <>
          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(244,67,54,0.1)', display: 'flex' }}>
                      <BlockIcon sx={{ color: '#f44336', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Anulaciones</Typography>
                      <Typography variant="h5" fontWeight={800}>{data.total_registros}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,152,0,0.1)', display: 'flex' }}>
                      <BlockIcon sx={{ color: '#FF9800', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Neto</Typography>
                      <Typography variant="h5" fontWeight={800}>{fmt(data.total_neto)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(244,67,54,0.1)', display: 'flex' }}>
                      <BlockIcon sx={{ color: '#c62828', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Monto Total</Typography>
                      <Typography variant="h5" fontWeight={800} color="#c62828">{fmt(data.total_monto)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla */}
          <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['N Venta', 'Responsable', 'Neto', 'Iva', 'Total', 'Fecha'].map((h, i) => (
                      <TableCell key={h} align={i >= 2 && i <= 4 ? 'right' : 'left'}
                        sx={{ fontWeight: 700, py: 1.2, px: 1.5, fontSize: '0.82rem', bgcolor: '#fafafa', borderBottom: '2px solid #f44336', color: '#444', whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.anulaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        Sin anulaciones en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.anulaciones.map((a, i) => (
                      <TableRow key={a.NumVenta + '-' + i} hover onClick={() => verDetalle(a)}
                        sx={{ cursor: 'pointer', '&:nth-of-type(odd)': { bgcolor: 'rgba(244,67,54,0.02)' }, '&:hover': { bgcolor: 'rgba(244,67,54,0.06) !important' } }}>
                        <TableCell sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>{a.NumVenta}</TableCell>
                        <TableCell sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem', maxWidth: 280 }}>
                          <Typography variant="body2" noWrap title={a.Responsable}>{a.Responsable}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem' }}>{fmt(a.Neto)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem', color: '#888' }}>{fmt(a.Iva)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem', fontWeight: 700, color: '#c62828' }}>{fmt(a.Total)}</TableCell>
                        <TableCell sx={{ py: 0.8, px: 1.5, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmtFecha(a.FechaIngreso)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {data.anulaciones.length > 0 && (
              <Box sx={{ px: 2.5, py: 1.5, borderTop: '2px solid #eee', bgcolor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">{data.total_registros} anulaciones</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight={700} fontSize="0.95rem" color="#333">TOTAL</Typography>
                  <Typography variant="body1" fontWeight={800} fontSize="1.1rem" color="#c62828">{fmt(data.total_monto)}</Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </>
      )}

      {/* Modal detalle */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <Box sx={{ background: 'linear-gradient(135deg, #b71c1c 0%, #c62828 50%, #d32f2f 100%)', color: 'white', px: 3, py: 2, position: 'relative' }}>
          {detalleLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' }, bgcolor: 'rgba(255,255,255,0.15)' }} />}
          <IconButton onClick={() => setDetalleOpen(false)} sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.7)' }} size="small">
            <CloseIcon />
          </IconButton>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontSize: '0.7rem' }}>Detalle Anulacion</Typography>
          {ventaSeleccionada && (
            <Box sx={{ display: 'flex', gap: 3, mt: 0.5, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>N VENTA</Typography>
                <Typography variant="h6" fontWeight={700} fontFamily="monospace">{ventaSeleccionada.NumVenta}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>RESPONSABLE</Typography>
                <Typography variant="body1" fontWeight={600}>{ventaSeleccionada.Responsable}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>TOTAL</Typography>
                <Typography variant="body1" fontWeight={800} sx={{ color: '#ffcc80' }}>{fmt(ventaSeleccionada.Total)}</Typography>
              </Box>
            </Box>
          )}
        </Box>
        <DialogContent sx={{ p: 2 }}>
          {detalleLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#f44336' }} /></Box>
          )}
          {detalleData && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Codigo', 'Descripcion', 'Cantidad', 'Margen', 'Margen Aplicado', 'Total'].map((h, i) => (
                      <TableCell key={h} align={i >= 2 ? 'right' : 'left'}
                        sx={{ fontWeight: 700, fontSize: '0.78rem', borderBottom: '2px solid #f44336' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detalleData.productos.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin productos</TableCell></TableRow>
                  ) : detalleData.productos.map((p, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>{p.Codigo}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.Descripcion}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.Cantidad}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{p.Margen}%</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{p.MargenAplicado}%</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#c62828' }}>{fmt(p.Total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default AnulacionesPage;
