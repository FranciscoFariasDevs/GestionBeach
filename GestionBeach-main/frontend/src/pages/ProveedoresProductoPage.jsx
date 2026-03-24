// frontend/src/pages/ProveedoresProductoPage.jsx
// Migración de Proveedores.vb — Dirección de Producto por Proveedor
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Chip, Card, CardContent, Grid,
  Dialog, DialogContent, DialogTitle, IconButton, LinearProgress,
  Collapse
} from '@mui/material';
import {
  Search as SearchIcon, FileDownload as ExcelIcon,
  Close as CloseIcon, Business as ProveedorIcon,
  ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api/api';

const fmt   = (v) => (!v && v !== 0) ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');
const fmtPct = (v) => v ? v + '%' : '0%';
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL') : '';
const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = hoy.slice(0, 8) + '01';

// Colores por participación
const getPctColor = (pct) => {
  const p = parseFloat(pct) || 0;
  if (p >= 20) return '#1565c0';
  if (p >= 10) return '#2e7d32';
  if (p >= 5)  return '#e65100';
  return '#546e7a';
};

// Fila de proveedor con detalle expandible
function FilaProveedor({ row, sucursalId, fechaDesde, fechaHasta }) {
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const cargarDetalle = useCallback(async () => {
    if (detalle !== null) { setOpen(v => !v); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await api.get('/proveedores-producto/detalle', {
        params: { sucursalId, fechaDesde, fechaHasta, rut: row.Rut },
        timeout: 60000
      });
      setDetalle(res.data?.productos || []);
    } catch { setDetalle([]); }
    finally { setLoading(false); }
  }, [row.Rut, sucursalId, fechaDesde, fechaHasta, detalle]);

  const pctColor = getPctColor(row.Participacion);

  return (
    <>
      <TableRow
        hover
        onClick={cargarDetalle}
        sx={{ cursor: 'pointer', '& td': { py: 1.2 } }}
      >
        <TableCell sx={{ width: 36, pl: 1 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }}/> : <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }}/>}
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{row.Proveedor}</Typography>
          <Typography variant="caption" color="text.disabled">{row.Rut}</Typography>
        </TableCell>
        <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmt(row.Neto)}</TableCell>
        <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmt(row.Iva)}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(row.Total)}</TableCell>
        <TableCell align="center">
          <Chip
            label={fmtPct(row.Participacion)}
            size="small"
            sx={{
              bgcolor: `${pctColor}18`,
              color: pctColor,
              fontWeight: 700,
              fontSize: '0.7rem',
              minWidth: 54,
            }}
          />
        </TableCell>
        <TableCell align="center">
          <Chip label={row.CantDocumentos || 0} size="small" sx={{ fontSize: '0.68rem', height: 20 }}/>
        </TableCell>
      </TableRow>

      {/* Detalle expandible */}
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {loading ? (
              <Box sx={{ p: 2 }}><LinearProgress/></Box>
            ) : detalle && detalle.length > 0 ? (
              <Box sx={{ bgcolor: '#fafafa', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.63rem', py: 0.7, bgcolor: '#f0f0f0' }}}>
                      <TableCell sx={{ pl: 5 }}>Doc</TableCell>
                      <TableCell>Folio</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Código</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">Neto</TableCell>
                      <TableCell align="right">IVA</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.map((d, i) => (
                      <TableRow key={i} sx={{ '& td': { fontSize: '0.72rem', py: 0.4 }}}>
                        <TableCell sx={{ pl: 5 }}>
                          <Chip label={d.Doc} size="small" sx={{
                            height: 16, fontSize: '0.6rem',
                            bgcolor: d.Doc === 'BO' ? 'rgba(21,101,192,0.1)' : 'rgba(46,125,50,0.1)',
                            color:   d.Doc === 'BO' ? '#1565c0' : '#2e7d32',
                          }}/>
                        </TableCell>
                        <TableCell>{d.Folio}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{fmtFecha(d.Fecha)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{d.Codigo}</TableCell>
                        <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.Descripcion}
                        </TableCell>
                        <TableCell align="right">{d.Cantidad}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmt(d.Neto)}</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmt(d.Iva)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(d.Total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ p: 2, pl: 5 }}>
                <Typography variant="caption" color="text.disabled">Sin documentos para este proveedor en el período</Typography>
              </Box>
            )}
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const ProveedoresProductoPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(inicioMes);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api.get('/proveedores-producto/sucursales')
      .then(res => {
        setSucursales(res.data);
        if (res.data.length > 0) setSucursalId(res.data[0].id);
      })
      .catch(() => setError('Error al cargar sucursales'));
  }, []);

  const buscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await api.get('/proveedores-producto/datos', {
        params: { sucursalId, fechaDesde, fechaHasta }, timeout: 120000
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar proveedores');
    } finally { setLoading(false); }
  }, [sucursalId, fechaDesde, fechaHasta]);

  useEffect(() => { if (sucursalId) buscar(); }, [sucursalId]); // eslint-disable-line

  const exportToExcel = () => {
    if (!data?.proveedores?.length) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      [`PROVEEDORES — ${data.sucursal}`],
      [`Desde: ${fechaDesde}  Hasta: ${fechaHasta}`],
      [''],
      ['Proveedor', 'Rut', 'Neto', 'IVA', 'Total', 'Participación (%)', 'Documentos']
    ];
    data.proveedores.forEach(p => {
      rows.push([p.Proveedor, p.Rut, p.Neto, p.Iva, p.Total, p.Participacion + '%', p.CantDocumentos]);
    });
    rows.push(['', '', data.total_neto, data.total_iva, data.total_monto]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, `Proveedores_${data.sucursal?.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const proveedoresFiltrados = (data?.proveedores || []).filter(p =>
    !busqueda || p.Proveedor?.toLowerCase().includes(busqueda.toLowerCase()) || p.Rut?.includes(busqueda)
  );

  return (
    <Container maxWidth={false} sx={{ mt: 1, mb: 4, px: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Dirección de Producto — Proveedores</Typography>
          <Typography variant="body2" color="text.secondary">Ventas por proveedor con detalle de documentos (Boletas y Facturas)</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<ExcelIcon/>} onClick={exportToExcel}
          disabled={!data || loading || !data.proveedores?.length}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#4caf50', color: '#4caf50',
            '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76,175,80,0.04)' } }}>
          Excel
        </Button>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select size="small" label="Sucursal" value={sucursalId}
          onChange={e => setSucursalId(e.target.value)}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <TextField type="date" size="small" label="Desde" value={fechaDesde}
          onChange={e => setFechaDesde(e.target.value)} InputLabelProps={{ shrink: true }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}/>
        <TextField type="date" size="small" label="Hasta" value={fechaHasta}
          onChange={e => setFechaHasta(e.target.value)} InputLabelProps={{ shrink: true }}
          sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}/>
        <Button variant="contained" size="small" onClick={buscar} disabled={loading || !sucursalId}
          sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
          <SearchIcon sx={{ fontSize: 18, mr: 0.5 }}/> Buscar
        </Button>
        {data && (
          <TextField size="small" placeholder="Filtrar proveedor…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}/>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress sx={{ color: '#1565c0' }}/>
          <Typography color="text.secondary">Consultando proveedores…</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && data && (
        <>
          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Proveedores', value: data.total_registros, suffix: '', color: '#1565c0', icon: <ProveedorIcon sx={{ color: '#1565c0', fontSize: 26 }}/> },
              { label: 'Total Neto',  value: fmt(data.total_neto),  suffix: '', color: '#2e7d32', icon: null },
              { label: 'IVA',         value: fmt(data.total_iva),   suffix: '', color: '#e65100', icon: null },
              { label: 'Total c/IVA', value: fmt(data.total_monto), suffix: '', color: '#1565c0', icon: null },
            ].map(k => (
              <Grid item xs={6} sm={3} key={k.label}>
                <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                  <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                    <Typography variant="h5" fontWeight={800} color={k.color}>{k.value}</Typography>
                    <Typography variant="caption" color="text.disabled">{data.sucursal}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Tabla principal */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.72rem', bgcolor: '#f5f5f5' }}}>
                    <TableCell sx={{ width: 36 }}/>
                    <TableCell>Proveedor / RUT</TableCell>
                    <TableCell align="right">Neto</TableCell>
                    <TableCell align="right">IVA</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Participación</TableCell>
                    <TableCell align="center">Documentos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proveedoresFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                        <Typography variant="body2" color="text.disabled">
                          {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin datos'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    proveedoresFiltrados.map((row, i) => (
                      <FilaProveedor
                        key={`${row.Rut}-${i}`}
                        row={row}
                        sucursalId={sucursalId}
                        fechaDesde={fechaDesde}
                        fechaHasta={fechaHasta}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer totales */}
            {proveedoresFiltrados.length > 0 && (
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 1,
                display: 'flex', gap: 4, justifyContent: 'flex-end', bgcolor: '#f9f9f9' }}>
                <Typography variant="caption" color="text.secondary">
                  {proveedoresFiltrados.length} proveedores
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  Total: {fmt(proveedoresFiltrados.reduce((s, r) => s + (r.Total || 0), 0))}
                </Typography>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default ProveedoresProductoPage;
