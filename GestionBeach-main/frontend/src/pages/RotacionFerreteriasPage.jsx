// frontend/src/pages/RotacionFerreteriasPage.jsx - Rotación Ferreterías (migrado de Sin Rotacion.vb)
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Card, CardContent, InputAdornment, LinearProgress,
  Skeleton, IconButton, Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingDown as TrendingDownIcon,
  PersonOff as PersonOffIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
  FileDownload as FileDownloadIcon,
  CalendarMonth as CalendarIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api/api';

const MAX_FILAS_VISIBLES = 500;

const formatPeso = (v) => {
  if (v == null || isNaN(v)) return '$0';
  return '$' + Math.round(v).toLocaleString('es-CL');
};

const formatFecha = (f) => {
  if (!f) return 'Sin registro';
  try {
    return format(new Date(f), 'dd/MM/yyyy', { locale: es });
  } catch { return f; }
};

// ============ TAB PANEL ============
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ============ TABLA PRODUCTOS SIN ROTACION ============
const TablaProductos = memo(({ productos, busqueda, loading }) => {
  const filtrados = useMemo(() => {
    if (!busqueda) return productos;
    const b = busqueda.toLowerCase();
    return productos.filter(p =>
      (p.Codigo || '').toLowerCase().includes(b) ||
      (p.Descripcion || '').toLowerCase().includes(b) ||
      (p.Familia || '').toLowerCase().includes(b)
    );
  }, [productos, busqueda]);

  const visibles = useMemo(() => filtrados.slice(0, MAX_FILAS_VISIBLES), [filtrados]);
  const totalValorizado = useMemo(() => filtrados.reduce((s, p) => s + (p.valorizado || 0), 0), [filtrados]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} height={45} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  if (!productos.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <InventoryIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Selecciona una sucursal y rango de fechas</Typography>
        <Typography variant="body2" color="text.secondary">Luego presiona "Buscar" para ver los productos sin rotacion</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {filtrados.length > MAX_FILAS_VISIBLES
            ? `Mostrando ${MAX_FILAS_VISIBLES} de ${filtrados.length} productos (usa el buscador para filtrar)`
            : `${filtrados.length} productos sin rotacion`}
        </Typography>
        <Chip
          icon={<MoneyIcon />}
          label={`Valorizado: ${formatPeso(totalValorizado)}`}
          color="warning"
          variant="outlined"
          size="small"
        />
      </Box>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Codigo</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Descripcion</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Familia</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Stock</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Margen %</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Costo SAF</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Valorizado</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Ultima Venta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((p, i) => (
              <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.04)' } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.Codigo}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.Descripcion}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{p.Familia}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{p.Stock}</TableCell>
                <TableCell align="right">{p.margen != null ? `${p.margen}%` : '-'}</TableCell>
                <TableCell align="right">{formatPeso(p.costo_final_saf)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#e65100' }}>{formatPeso(p.valorizado)}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{formatFecha(p.ultima_venta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
});

// ============ TABLA CLIENTES SIN COMPRA ============
const TablaClientes = memo(({ clientes, busqueda, loading }) => {
  const filtrados = useMemo(() => {
    if (!busqueda) return clientes;
    const b = busqueda.toLowerCase();
    return clientes.filter(c =>
      (c.rut || '').toLowerCase().includes(b) ||
      (c.razon_social || '').toLowerCase().includes(b) ||
      (c.correo || '').toLowerCase().includes(b)
    );
  }, [clientes, busqueda]);

  const visibles = useMemo(() => filtrados.slice(0, MAX_FILAS_VISIBLES), [filtrados]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} height={45} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  if (!clientes.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <PersonOffIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Sin datos de clientes</Typography>
        <Typography variant="body2" color="text.secondary">Selecciona sucursal y fechas, luego presiona "Buscar"</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, px: 1 }}>
        {filtrados.length > MAX_FILAS_VISIBLES
          ? `Mostrando ${MAX_FILAS_VISIBLES} de ${filtrados.length} clientes`
          : `${filtrados.length} clientes sin compra en el periodo`}
      </Typography>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>RUT</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Razon Social</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Telefono</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Correo</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Ultima Venta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((c, i) => (
              <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.04)' } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.rut}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{c.razon_social}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{c.telefono || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{c.correo || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{formatFecha(c.ultima_venta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
});

// ============ TABLA COMPRAS SIN ROTACION ============
const TablaCompras = memo(({ compras, busqueda, loading }) => {
  const filtrados = useMemo(() => {
    if (!busqueda) return compras;
    const b = busqueda.toLowerCase();
    return compras.filter(c =>
      (c.codigo || '').toLowerCase().includes(b) ||
      (c.descripcion || '').toLowerCase().includes(b) ||
      String(c.numero_orden || '').includes(b)
    );
  }, [compras, busqueda]);

  const visibles = useMemo(() => filtrados.slice(0, MAX_FILAS_VISIBLES), [filtrados]);
  const totalIngresado = useMemo(() => filtrados.reduce((s, c) => s + (c.total_ingresado || 0), 0), [filtrados]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[...Array(8)].map((_, i) => <Skeleton key={i} height={45} sx={{ mb: 0.5 }} />)}
      </Box>
    );
  }

  if (!compras.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <ShoppingCartCheckoutIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">Sin datos de compras</Typography>
        <Typography variant="body2" color="text.secondary">Selecciona sucursal y fechas, luego presiona "Buscar"</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {filtrados.length > MAX_FILAS_VISIBLES
            ? `Mostrando ${MAX_FILAS_VISIBLES} de ${filtrados.length} compras`
            : `${filtrados.length} ordenes de compra`}
        </Typography>
        <Chip
          icon={<MoneyIcon />}
          label={`Total ingresado: ${formatPeso(totalIngresado)}`}
          color="info"
          variant="outlined"
          size="small"
        />
      </Box>
      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>N° Orden</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Codigo</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Descripcion</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Cant. Ingresada</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Margen %</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Total Ingresado</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }} align="right">Stock Actual</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: '#1a1a2e', color: '#fff' }}>Fecha Ingreso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((c, i) => (
              <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.04)' } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.numero_orden}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.codigo}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.descripcion}</TableCell>
                <TableCell align="right">{c.cantidad_ingresada}</TableCell>
                <TableCell align="right">{c.margen != null ? `${c.margen}%` : '-'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatPeso(c.total_ingresado)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{c.stock_actual}</TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>{formatFecha(c.fecha_ingreso)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
});

// ============ EXPORTAR A CSV ============
const exportarCSV = (data, filename, columnas) => {
  if (!data.length) return;
  const header = columnas.map(c => c.label).join(';');
  const rows = data.map(row => columnas.map(c => {
    let val = row[c.key];
    if (val == null) return '';
    if (typeof val === 'string' && val.includes(';')) return `"${val}"`;
    return val;
  }).join(';'));
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ============ COMPONENTE PRINCIPAL ============
export default function RotacionFerreteriasPage() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(subMonths(new Date(), 3));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [tab, setTab] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [compras, setCompras] = useState([]);

  // Cargar sucursales
  useEffect(() => {
    api.get('/rotacion-ferreterias/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales:', e));
  }, []);

  // Cargar solo el tab activo (lazy loading - no las 3 a la vez)
  const cargarTab = useCallback(async (tabIndex, params) => {
    const endpoints = [
      { url: '/rotacion-ferreterias/productos-sin-rotacion', setter: setProductos, key: 'productos' },
      { url: '/rotacion-ferreterias/clientes-sin-compra', setter: setClientes, key: 'clientes' },
      { url: '/rotacion-ferreterias/compras-sin-rotacion', setter: setCompras, key: 'compras' },
    ];
    const ep = endpoints[tabIndex];
    try {
      const res = await api.get(ep.url, { params });
      ep.setter(res.data[ep.key]);
    } catch (err) {
      setError(err.response?.data?.message || `Error al cargar ${ep.key}`);
    }
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    setError('');
    setBusqueda('');
    setProductos([]);
    setClientes([]);
    setCompras([]);

    const params = {
      sucursalId,
      fechaDesde: format(fechaDesde, 'yyyy-MM-dd'),
      fechaHasta: format(fechaHasta, 'yyyy-MM-dd')
    };

    try {
      // Cargar solo el tab activo primero (rapido)
      await cargarTab(tab, params);
      // Cargar los otros 2 en background sin bloquear UI
      const otros = [0, 1, 2].filter(i => i !== tab);
      Promise.allSettled(otros.map(i => cargarTab(i, params)));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar datos');
    } finally {
      setLoading(false);
    }
  }, [sucursalId, fechaDesde, fechaHasta, tab, cargarTab]);

  const handleExportar = useCallback(() => {
    const sucNombre = sucursales.find(s => s.id === parseInt(sucursalId))?.nombre || 'sucursal';
    const fecha = format(new Date(), 'yyyyMMdd');

    if (tab === 0 && productos.length) {
      exportarCSV(productos, `productos_sin_rotacion_${sucNombre}_${fecha}.csv`, [
        { key: 'Codigo', label: 'Codigo' },
        { key: 'Descripcion', label: 'Descripcion' },
        { key: 'Familia', label: 'Familia' },
        { key: 'Stock', label: 'Stock' },
        { key: 'margen', label: 'Margen' },
        { key: 'costo_final_saf', label: 'Costo Final SAF' },
        { key: 'valorizado', label: 'Valorizado' },
        { key: 'ultima_venta', label: 'Ultima Venta' },
      ]);
    } else if (tab === 1 && clientes.length) {
      exportarCSV(clientes, `clientes_sin_compra_${sucNombre}_${fecha}.csv`, [
        { key: 'rut', label: 'RUT' },
        { key: 'razon_social', label: 'Razon Social' },
        { key: 'telefono', label: 'Telefono' },
        { key: 'correo', label: 'Correo' },
        { key: 'ultima_venta', label: 'Ultima Venta' },
      ]);
    } else if (tab === 2 && compras.length) {
      exportarCSV(compras, `compras_sin_rotacion_${sucNombre}_${fecha}.csv`, [
        { key: 'numero_orden', label: 'N Orden' },
        { key: 'codigo', label: 'Codigo' },
        { key: 'descripcion', label: 'Descripcion' },
        { key: 'cantidad_ingresada', label: 'Cantidad' },
        { key: 'margen', label: 'Margen' },
        { key: 'total_ingresado', label: 'Total Ingresado' },
        { key: 'stock_actual', label: 'Stock Actual' },
        { key: 'fecha_ingreso', label: 'Fecha Ingreso' },
      ]);
    }
  }, [tab, productos, clientes, compras, sucursalId, sucursales]);

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
          <TrendingDownIcon sx={{ fontSize: 36, color: '#FF9800' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Rotacion Ferreterias</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Analisis de productos, clientes y compras sin rotacion
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* FILTROS */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Sucursal"
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><StoreIcon fontSize="small" /></InputAdornment> }}
            >
              {sucursales.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker
              label="Desde"
              value={fechaDesde}
              onChange={setFechaDesde}
              format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker
              label="Hasta"
              value={fechaHasta}
              onChange={setFechaHasta}
              format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleBuscar}
              disabled={!sucursalId || loading}
              sx={{
                bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' },
                fontWeight: 700, height: 40
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportar}
              disabled={loading || (!productos.length && !clientes.length && !compras.length)}
              sx={{ height: 40, borderColor: '#FF9800', color: '#FF9800' }}
            >
              Exportar
            </Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' } }} />}
        {error && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,0,0,0.08)', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" fontSize="small" />
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
      </Paper>

      {/* CARDS RESUMEN */}
      {(productos.length > 0 || clientes.length > 0 || compras.length > 0) && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderLeft: '4px solid #e65100',
              cursor: 'pointer', transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.02)' },
              bgcolor: tab === 0 ? 'rgba(230,81,0,0.06)' : 'inherit'
            }} onClick={() => setTab(0)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDownIcon sx={{ color: '#e65100' }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{productos.length.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">Productos sin rotacion</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderLeft: '4px solid #1565c0',
              cursor: 'pointer', transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.02)' },
              bgcolor: tab === 1 ? 'rgba(21,101,192,0.06)' : 'inherit'
            }} onClick={() => setTab(1)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOffIcon sx={{ color: '#1565c0' }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{clientes.length.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">Clientes sin compra</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              borderLeft: '4px solid #2e7d32',
              cursor: 'pointer', transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.02)' },
              bgcolor: tab === 2 ? 'rgba(46,125,50,0.06)' : 'inherit'
            }} onClick={() => setTab(2)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShoppingCartCheckoutIcon sx={{ color: '#2e7d32' }} />
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{compras.length.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">Compras sin rotacion</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setBusqueda(''); }}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
              '& .Mui-selected': { color: '#FF9800' },
              '& .MuiTabs-indicator': { bgcolor: '#FF9800' }
            }}
          >
            <Tab icon={<TrendingDownIcon />} iconPosition="start" label={`Productos sin rotacion (${productos.length})`} />
            <Tab icon={<PersonOffIcon />} iconPosition="start" label={`Clientes sin compra (${clientes.length})`} />
            <Tab icon={<ShoppingCartCheckoutIcon />} iconPosition="start" label={`Compras sin rotacion (${compras.length})`} />
          </Tabs>
        </Box>

        {/* Buscador */}
        <Box sx={{ p: 1.5, bgcolor: '#fafafa', borderBottom: '1px solid #eee' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={
              tab === 0 ? 'Buscar por codigo, descripcion o familia...' :
              tab === 1 ? 'Buscar por RUT, razon social o correo...' :
              'Buscar por N° orden, codigo o descripcion...'
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            }}
          />
        </Box>

        <TabPanel value={tab} index={0}>
          <TablaProductos productos={productos} busqueda={busqueda} loading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <TablaClientes clientes={clientes} busqueda={busqueda} loading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <TablaCompras compras={compras} busqueda={busqueda} loading={loading} />
        </TabPanel>
      </Paper>

      {/* Footer */}
      {sucursalNombre && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Sucursal: {sucursalNombre} | Periodo: {format(fechaDesde, 'dd/MM/yyyy')} - {format(fechaHasta, 'dd/MM/yyyy')}
        </Typography>
      )}
    </Box>
  );
}
