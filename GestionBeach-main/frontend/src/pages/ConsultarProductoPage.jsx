import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Container, Card, CardContent, Typography, Box, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, CircularProgress, Alert, Chip,
  Button, Paper, InputAdornment, ToggleButtonGroup, ToggleButton,
  Dialog, DialogContent, IconButton, Divider, Skeleton, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as ExcelIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  LocalShipping as FleteIcon,
  Percent as PercentIcon,
  ShoppingCart as CartIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';
import { Tabs, Tab } from '@mui/material';
import * as XLSX from 'xlsx';
import api from '../api/api';

const fmt = (val) => {
  if (!val && val !== 0) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
};

const fmtDec = (val) => {
  if (!val && val !== 0) return '0';
  return Number(val).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Maximo de filas visibles en la tabla (rendimiento)
const MAX_FILAS_VISIBLES = 300;

const ConsultarProductoPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [filtro, setFiltro] = useState('vigente');
  const [busqueda, setBusqueda] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [error, setError] = useState(null);

  // Estado del modal de detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const response = await api.get('/consultar-producto/sucursales');
        setSucursales(response.data);
        if (response.data.length > 0) setSucursalId(response.data[0].id);
      } catch (err) {
        setError('Error al cargar sucursales');
      } finally {
        setLoadingSucursales(false);
      }
    };
    fetchSucursales();
  }, []);

  const fetchProductos = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/consultar-producto?sucursalId=${sucursalId}&filtro=${filtro}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar productos');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sucursalId, filtro]);

  useEffect(() => {
    if (sucursalId) fetchProductos();
  }, [sucursalId, filtro, fetchProductos]);

  // Filtrado memoizado - no se recalcula cuando cambia el modal
  const productosFiltrados = useMemo(() => {
    if (!data?.productos) return [];
    if (!busqueda) return data.productos;
    const term = busqueda.toLowerCase();
    return data.productos.filter(p =>
      (p.codigo || '').toLowerCase().includes(term) ||
      (p.descripcion || '').toLowerCase().includes(term) ||
      (p.familia || '').toLowerCase().includes(term)
    );
  }, [data, busqueda]);

  const totalValorizadoFiltrado = useMemo(() =>
    productosFiltrados.reduce((sum, p) => sum + (p.valorizado || 0), 0),
    [productosFiltrados]
  );

  // Filas visibles limitadas para rendimiento DOM
  const productosVisibles = useMemo(() =>
    productosFiltrados.slice(0, MAX_FILAS_VISIBLES),
    [productosFiltrados]
  );

  const handleVerDetalle = useCallback(async (producto) => {
    setProductoSeleccionado(producto);
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalleError(null);
    setDetalleData(null);
    try {
      const response = await api.get(`/consultar-producto/detalle?sucursalId=${sucursalId}&codigo=${encodeURIComponent(producto.codigo)}`);
      setDetalleData(response.data);
    } catch (err) {
      setDetalleError(err.response?.data?.message || 'Error al obtener detalle');
    } finally {
      setDetalleLoading(false);
    }
  }, [sucursalId]);

  const handleCerrarDetalle = useCallback(() => {
    setDetalleOpen(false);
  }, []);

  const exportToExcel = () => {
    if (!data || productosFiltrados.length === 0) return;
    const wb = XLSX.utils.book_new();
    const sucNombre = data.sucursal?.nombre || 'Sucursal';
    const sheetData = [
      [`CONSULTAR PRODUCTO - ${sucNombre}`],
      [`Filtro: ${filtro === 'vigente' ? 'Vigentes' : filtro === 'no_vigente' ? 'No Vigentes' : 'Limpio (sin cero)'}`],
      [busqueda ? `Busqueda: ${busqueda}` : ''],
      [''],
      ['Codigo', 'Descripcion', 'Stock', 'Familia', 'P.Compra', 'Margen', 'Neto', 'Precio Final', 'Valorizado'],
    ];
    productosFiltrados.forEach(p => {
      sheetData.push([p.codigo, p.descripcion, p.stock, p.familia, p.precio_compra, p.margen, p.neto, p.precio_final, p.valorizado]);
    });
    sheetData.push(['']);
    sheetData.push(['', '', '', '', '', '', '', 'TOTAL VALORIZADO', totalValorizadoFiltrado]);
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    const pesoFmt = '"$"#,##0';
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (const c of [4, 6, 7, 8]) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && typeof ws[addr].v === 'number') ws[addr].z = pesoFmt;
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `Productos_${sucNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  return (
    <Container maxWidth={false} sx={{ mt: 1, mb: 4, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#333' }}>Consultar Producto</Typography>
          <Typography variant="body2" color="text.secondary">Consulta de productos por sucursal (Sistema SAF)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="Sucursal" value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            disabled={loadingSucursales}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </TextField>
          <Button
            variant="outlined" size="small" startIcon={<ExcelIcon />}
            onClick={exportToExcel} disabled={!data || loading || productosFiltrados.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#4caf50', color: '#4caf50', '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76,175,80,0.04)' } }}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup value={filtro} exclusive onChange={(e, val) => { if (val) setFiltro(val); }} size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', borderRadius: 2, px: 2 } }}>
          <ToggleButton value="vigente" sx={{ '&.Mui-selected': { bgcolor: 'rgba(76,175,80,0.12)', color: '#2e7d32' } }}>Vigentes</ToggleButton>
          <ToggleButton value="no_vigente" sx={{ '&.Mui-selected': { bgcolor: 'rgba(244,67,54,0.12)', color: '#c62828' } }}>No Vigentes</ToggleButton>
          <ToggleButton value="limpiar" sx={{ '&.Mui-selected': { bgcolor: 'rgba(33,150,243,0.12)', color: '#1565c0' } }}>
            <FilterIcon sx={{ mr: 0.5, fontSize: 18 }} /> Limpio
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small" placeholder="Buscar por codigo, descripcion o familia..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#999' }} /></InputAdornment>, sx: { borderRadius: 2 } }}
          sx={{ minWidth: 320 }}
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexDirection: 'column', gap: 2 }}>
          <CircularProgress sx={{ color: '#FF9800' }} />
          <Typography color="text.secondary">Consultando productos en {sucursales.find(s => s.id === sucursalId)?.nombre || '...'}...</Typography>
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
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,152,0,0.1)', display: 'flex' }}><InventoryIcon sx={{ color: '#FF9800', fontSize: 26 }} /></Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Productos</Typography>
                      <Typography variant="h5" fontWeight={800}>{productosFiltrados.length.toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(76,175,80,0.1)', display: 'flex' }}><MoneyIcon sx={{ color: '#4caf50', fontSize: 26 }} /></Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Valorizado</Typography>
                      <Typography variant="h5" fontWeight={800}>{fmt(totalValorizadoFiltrado)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(33,150,243,0.1)', display: 'flex' }}><CategoryIcon sx={{ color: '#2196f3', fontSize: 26 }} /></Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Sucursal</Typography>
                      <Typography variant="h6" fontWeight={700} noWrap>{data.sucursal?.nombre}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla de productos - MEMOIZADA */}
          <TablaProductos
            productos={productosVisibles}
            totalFiltrados={productosFiltrados.length}
            totalProductos={data.total_productos}
            totalValorizado={totalValorizadoFiltrado}
            busqueda={busqueda}
            onVerDetalle={handleVerDetalle}
          />
        </>
      )}

      {/* MODAL DETALLE PRODUCTO */}
      {detalleOpen && (
        <DetalleProductoModal
          open={detalleOpen}
          onClose={handleCerrarDetalle}
          producto={productoSeleccionado}
          detalle={detalleData}
          loading={detalleLoading}
          error={detalleError}
          sucursalId={sucursalId}
        />
      )}
    </Container>
  );
};

// ============ TABLA MEMOIZADA - no re-renderiza al abrir modal ============
const TablaProductos = memo(({ productos, totalFiltrados, totalProductos, totalValorizado, busqueda, onVerDetalle }) => (
  <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
    <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {['Codigo', 'Descripcion', 'Stock', 'Familia', 'P.Compra', 'Margen', 'Neto', 'Precio Final', 'Valorizado'].map((h, i) => (
              <TableCell key={h} align={i >= 2 && i !== 3 ? 'right' : 'left'}
                sx={{ fontWeight: 700, py: 1.2, px: 1.5, fontSize: '0.82rem', bgcolor: '#fafafa', borderBottom: '2px solid #FF9800', color: '#444', whiteSpace: 'nowrap' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {productos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                {busqueda ? 'Sin resultados para la busqueda' : 'Sin productos para este filtro'}
              </TableCell>
            </TableRow>
          ) : (
            productos.map((p, i) => (
              <TableRow key={p.codigo + '-' + i} hover onClick={() => onVerDetalle(p)}
                sx={{ cursor: 'pointer', '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.02)' }, '&:hover': { bgcolor: 'rgba(255,152,0,0.06) !important' } }}>
                <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontFamily: 'monospace', color: '#555', whiteSpace: 'nowrap' }}>{p.codigo}</TableCell>
                <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#222', maxWidth: 300 }}>
                  <Typography variant="body2" noWrap title={p.descripcion}>{p.descripcion}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5 }}>
                  <Chip label={p.stock} size="small" sx={{ fontWeight: 700, fontSize: '0.78rem', height: 22, bgcolor: p.stock > 0 ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)', color: p.stock > 0 ? '#2e7d32' : '#c62828' }} />
                </TableCell>
                <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.8rem', color: '#777' }}>{p.familia}</TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#555' }}>{fmt(p.precio_compra)}</TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#888' }}>{p.margen}%</TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#555' }}>{fmt(p.neto)}</TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontWeight: 600, color: '#222' }}>{fmt(p.precio_final)}</TableCell>
                <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontWeight: 700, color: p.valorizado > 0 ? '#1565c0' : '#999' }}>{fmt(p.valorizado)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
    <Box sx={{ px: 2.5, py: 1.5, borderTop: '2px solid #eee', bgcolor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {productos.length < totalFiltrados
          ? `Mostrando ${productos.length.toLocaleString()} de ${totalFiltrados.toLocaleString()} productos (usa el buscador para filtrar)`
          : `${totalFiltrados.toLocaleString()} productos`}
        {busqueda && ` (filtrado de ${totalProductos.toLocaleString()})`}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" fontWeight={700} fontSize="0.95rem" color="#333">TOTAL VALORIZADO</Typography>
        <Typography variant="body1" fontWeight={800} fontSize="1.1rem" color="#1565c0">{fmt(totalValorizado)}</Typography>
      </Box>
    </Box>
  </Paper>
));

// ============ MODAL DETALLE - componente separado con tabs ============
const DetalleProductoModal = memo(({ open, onClose, producto, detalle, loading, error, sucursalId }) => {
  const [tab, setTab] = useState(0);
  const [historico, setHistorico] = useState(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [tarjeta, setTarjeta] = useState(null);
  const [tarjetaLoading, setTarjetaLoading] = useState(false);
  // Filtros de fecha para Historico - por defecto 1 enero del año actual hasta hoy
  const anioActual = new Date().getFullYear();
  const [histFechaDesde, setHistFechaDesde] = useState(`${anioActual}-01-01`);
  const [histFechaHasta, setHistFechaHasta] = useState(new Date().toISOString().slice(0, 10));

  const cargarHistorico = useCallback(async (fDesde, fHasta) => {
    if (historicoLoading || !producto) return;
    setHistoricoLoading(true);
    try {
      const { data } = await api.get('/consultar-producto/historico', {
        params: { sucursalId, codigo: producto.codigo, fechaDesde: fDesde || histFechaDesde, fechaHasta: fHasta || histFechaHasta }, timeout: 60000
      });
      setHistorico(data);
    } catch { setHistorico({ documentos: [], total_docs: 0 }); }
    finally { setHistoricoLoading(false); }
  }, [producto, sucursalId, historicoLoading, histFechaDesde, histFechaHasta]);

  const cargarTarjeta = useCallback(async () => {
    if (tarjeta || tarjetaLoading || !producto) return;
    setTarjetaLoading(true);
    try {
      const { data } = await api.get('/consultar-producto/tarjeta-existencia', {
        params: { sucursalId, codigo: producto.codigo }, timeout: 120000
      });
      setTarjeta(data);
    } catch { setTarjeta({ movimientos: [] }); }
    finally { setTarjetaLoading(false); }
  }, [producto, sucursalId, tarjeta, tarjetaLoading]);

  const handleTabChange = useCallback((_, v) => {
    setTab(v);
    if (v === 1 && !historico) cargarHistorico();
    if (v === 2) cargarTarjeta();
  }, [cargarHistorico, cargarTarjeta, historico]);

  // Reset al cambiar producto
  React.useEffect(() => { setHistorico(null); setTarjeta(null); setTab(0); }, [producto?.codigo]);

  if (!producto) return null;

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL') : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', maxHeight: '90vh' } }}>
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
        color: 'white', px: 3, pt: 2.5, pb: 0, position: 'relative'
      }}>
        {(loading || historicoLoading || tarjetaLoading) && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' }, bgcolor: 'rgba(255,255,255,0.15)' }} />
        )}
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }} size="small">
          <CloseIcon />
        </IconButton>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontSize: '0.7rem' }}>Detalle Producto</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mt: 0.3, lineHeight: 1.3 }}>{producto.descripcion}</Typography>
        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>CODIGO</Typography>
            <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ fontSize: '0.95rem' }}>{producto.codigo}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>STOCK</Typography>
            <Box>
              <Chip label={producto.stock} size="small" sx={{ fontWeight: 800, fontSize: '0.82rem', height: 24, bgcolor: producto.stock > 0 ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)', color: 'white' }} />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>FAMILIA</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.95rem' }}>{producto.familia || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>PRECIO FINAL</Typography>
            <Typography variant="body2" fontWeight={800} sx={{ fontSize: '1.05rem', color: '#ffcc80' }}>{fmt(producto.precio_final)}</Typography>
          </Box>
        </Box>
        <Tabs value={tab} onChange={handleTabChange} sx={{ mt: 1.5, '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'none', minHeight: 40 }, '& .Mui-selected': { color: '#fff' }, '& .MuiTabs-indicator': { bgcolor: '#FF9800' } }}>
          <Tab icon={<PercentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Detalle" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Historico" />
          <Tab icon={<ListAltIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Tarjeta Existencia" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

        {/* TAB 0: DETALLE */}
        {tab === 0 && (
          <>
            {loading && (
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Skeleton variant="text" width={180} height={28} sx={{ mb: 1 }} />
                    {[...Array(14)].map((_, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                        <Skeleton variant="text" width={140} height={22} />
                        <Skeleton variant="text" width={80} height={22} />
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Skeleton variant="text" width={160} height={28} sx={{ mb: 1 }} />
                    {[...Array(11)].map((_, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                        <Skeleton variant="text" width={130} height={22} />
                        <Skeleton variant="text" width={90} height={22} />
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </Box>
            )}
            {detalle && (
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <SectionHeader icon={<PercentIcon />} title="Cadena de Descuentos" color="#7b1fa2" />
                    <Box sx={{ bgcolor: '#fafafa', borderRadius: 2, p: 2, border: '1px solid #f0f0f0' }}>
                      <DetalleRow label="Precio Lista Chilemat" value={fmt(detalle.precio_lista)} bold />
                      <Divider sx={{ my: 0.8 }} />
                      <DetalleRow label="[-] Descuento 1" value={`${fmtDec(detalle.descuento1)}%`} dimIfZero={detalle.descuento1} />
                      <DetalleRow label="[-] Descuento 2" value={`${fmtDec(detalle.descuento2)}%`} dimIfZero={detalle.descuento2} />
                      <DetalleRow label="[-] Descuento 3" value={`${fmtDec(detalle.descuento3)}%`} dimIfZero={detalle.descuento3} />
                      <DetalleRow label="[-] Descuento 4" value={`${fmtDec(detalle.descuento4)}%`} dimIfZero={detalle.descuento4} />
                      <DetalleRow label="[-] Descuento 5" value={`${fmtDec(detalle.descuento5)}%`} dimIfZero={detalle.descuento5} />
                      <DetalleRow label="[-] Descuento 6" value={`${fmtDec(detalle.descuento6)}%`} dimIfZero={detalle.descuento6} />
                      <DetalleRow label="[-] Descuento 7" value={`${fmtDec(detalle.descuento7)}%`} dimIfZero={detalle.descuento7} />
                      <DetalleRow label="[-] Descuento 8" value={`${fmtDec(detalle.descuento8)}%`} dimIfZero={detalle.descuento8} />
                      <DetalleRow label="[-] Descuento 9" value={`${fmtDec(detalle.descuento9)}%`} dimIfZero={detalle.descuento9} />
                      <DetalleRow label="[-] Descuento 10" value={`${fmtDec(detalle.descuento10)}%`} dimIfZero={detalle.descuento10} />
                      <Divider sx={{ my: 0.8 }} />
                      <DetalleRow label="[-] Desc. Oferta 1" value={`${fmtDec(detalle.descuento_oferta1)}%`} dimIfZero={detalle.descuento_oferta1} />
                      <DetalleRow label="[-] Desc. Oferta 2" value={`${fmtDec(detalle.descuento_oferta2)}%`} dimIfZero={detalle.descuento_oferta2} />
                    </Box>
                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #880e4f 0%, #ad1457 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>Precio Costo Neto</Typography>
                      <Typography variant="body1" fontWeight={800} fontFamily="monospace" sx={{ fontSize: '1.05rem' }}>{fmt(detalle.precio_costo_neto)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SectionHeader icon={<FleteIcon />} title="Estructura de Costos" color="#e65100" />
                    <Box sx={{ bgcolor: '#fafafa', borderRadius: 2, p: 2, border: '1px solid #f0f0f0' }}>
                      <DetalleRow label="[+] Flete Unitario" value={`${fmtDec(detalle.flete_porcentaje)}%`} />
                      <DetalleRow label="Factor Flete" value={fmtDec(detalle.factor_flete)} />
                      <DetalleRow label="[=] Precio Final" value={fmt(detalle.precio_final_detalle)} />
                      <Divider sx={{ my: 0.8 }} />
                      <DetalleRow label="[+] Comision Cadena" value={`${fmtDec(detalle.comision_cadena)}%`} dimIfZero={detalle.comision_cadena} />
                      <DetalleRow label="[+] Costos Variables" value={`${fmtDec(detalle.costos_variables)}%`} dimIfZero={detalle.costos_variables} />
                      <DetalleRow label="[=] Costo Final SAF" value={fmt(detalle.costo_final_saf)} bold />
                      <Divider sx={{ my: 0.8 }} />
                      <DetalleRow label="Margen" value={`${fmtDec(detalle.margen)}%`} />
                      <DetalleRow label="Precio Venta Neto" value={fmt(detalle.precio_venta_neto)} />
                      <DetalleRow label="[+] IVA" value={`${fmtDec(detalle.iva)}%`} />
                    </Box>
                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CartIcon sx={{ fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>Precio Venta</Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={800} fontFamily="monospace" sx={{ fontSize: '1.15rem' }}>{fmt(detalle.precio_venta_total)}</Typography>
                    </Box>
                    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReceiptIcon sx={{ fontSize: 18, color: '#757575' }} />
                        <Typography variant="body2" fontWeight={600} color="#555" sx={{ fontSize: '0.84rem' }}>RTU</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="#333">{detalle.rtu}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}

        {/* TAB 1: HISTORICO */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            {/* Filtros de fecha */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField type="date" size="small" label="Desde" value={histFechaDesde}
                onChange={(e) => setHistFechaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField type="date" size="small" label="Hasta" value={histFechaHasta}
                onChange={(e) => setHistFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Button variant="contained" size="small" onClick={() => { setHistorico(null); cargarHistorico(histFechaDesde, histFechaHasta); }}
                disabled={historicoLoading}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' } }}>
                <SearchIcon sx={{ fontSize: 18, mr: 0.5 }} /> Buscar
              </Button>
            </Box>
            {historicoLoading && (
              <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#FF9800' }} /></Box>
            )}
            {historico && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`${historico.total_docs} documentos`} color="primary" size="small" />
                  <Chip label={`${historico.cantidad_total} unidades vendidas`} color="success" size="small" />
                  <Chip label={`Neto total: ${fmt(historico.neto_total)}`} sx={{ bgcolor: '#e65100', color: '#fff' }} size="small" />
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Folio', 'Tipo', 'RUT', 'Cliente', 'Cant.', 'Neto', 'Precio c/IVA', 'Fecha'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', bgcolor: '#fafafa', borderBottom: '2px solid #FF9800', whiteSpace: 'nowrap' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historico.documentos.length === 0 ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin ventas este año</TableCell></TableRow>
                      ) : historico.documentos.map((d, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{d.Folio}</TableCell>
                          <TableCell><Chip label={d.Doc} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: d.Doc === 'BO' ? '#e3f2fd' : '#fff3e0' }} /></TableCell>
                          <TableCell sx={{ fontSize: '0.78rem' }}>{d['Rut Cliente']}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.Cliente}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.Cantidad}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(d.Neto)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmt(d.PrecioConIva)}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtFecha(d.Fecha)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {/* TAB 2: TARJETA EXISTENCIA */}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            {tarjetaLoading && (
              <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#FF9800' }} /></Box>
            )}
            {tarjeta && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={`${tarjeta.movimientos.length} movimientos`} color="primary" size="small" />
                  <Chip label={`Stock actual: ${tarjeta.stock_actual ?? '-'}`} color="success" size="small" />
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {['Fecha', 'Tipo', 'Folio', 'Detalle', 'Entrada', 'Salida', 'Saldo'].map(h => (
                          <TableCell key={h} align={['Entrada','Salida','Saldo'].includes(h) ? 'right' : 'left'}
                            sx={{ fontWeight: 700, fontSize: '0.78rem', bgcolor: '#fafafa', borderBottom: '2px solid #FF9800', whiteSpace: 'nowrap' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tarjeta.movimientos.length === 0 ? (
                        <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin movimientos</TableCell></TableRow>
                      ) : tarjeta.movimientos.map((m, i) => (
                        <TableRow key={i} hover sx={{
                          bgcolor: m.Entrada > 0 ? 'rgba(76,175,80,0.04)' : m.Salida > 0 ? 'rgba(244,67,54,0.04)' : 'transparent'
                        }}>
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtFecha(m.Fecha)}</TableCell>
                          <TableCell><Chip label={m.Tipo || '-'} size="small" sx={{ height: 20, fontSize: '0.7rem',
                            bgcolor: m.Tipo === 'OC' ? '#e3f2fd' : m.Tipo === 'BO' ? '#fff3e0' : m.Tipo === 'FA' ? '#f3e5f5' : m.Tipo === 'GU' ? '#e8f5e9' : '#f5f5f5'
                          }} /></TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{m.Folio || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Detalle || '-'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600, color: m.Entrada > 0 ? '#2e7d32' : '#ccc' }}>{m.Entrada > 0 ? fmtDec(m.Entrada) : '-'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600, color: m.Salida > 0 ? '#c62828' : '#ccc' }}>{m.Salida > 0 ? fmtDec(m.Salida) : '-'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{fmtDec(m.Saldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
});

const SectionHeader = ({ icon, title, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Box sx={{ p: 0.6, borderRadius: 1.2, bgcolor: `${color}15`, display: 'flex', '& .MuiSvgIcon-root': { fontSize: 18, color } }}>{icon}</Box>
    <Typography variant="subtitle2" fontWeight={700} sx={{ color, fontSize: '0.85rem' }}>{title}</Typography>
  </Box>
);

const DetalleRow = ({ label, value, bold, dimIfZero }) => {
  const isDim = dimIfZero !== undefined && !dimIfZero;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4, px: 0.5, borderRadius: 0.8, opacity: isDim ? 0.4 : 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
      <Typography variant="body2" sx={{ color: bold ? '#333' : '#666', fontWeight: bold ? 700 : 400, fontSize: '0.82rem' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600, color: bold ? '#1a237e' : '#333', fontSize: '0.82rem', fontFamily: 'monospace' }}>{value}</Typography>
    </Box>
  );
};

export default ConsultarProductoPage;
