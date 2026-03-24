import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Tabs, Tab,
  Chip, Collapse, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import api from '../api/api';

dayjs.locale('es');

const formatPeso = (v) => {
  if (v == null || isNaN(v)) return '$ 0';
  return '$ ' + Math.round(Number(v)).toLocaleString('es-CL');
};

const formatFecha = (f) => {
  if (!f) return '';
  return dayjs(f).format('DD/MM/YYYY HH:mm');
};

// ============ TAB 1: ENVIO DE GUIAS ============
const TabEnvioGuias = memo(({ sucursales }) => {
  const [sucursalId, setSucursalId] = useState('');
  const [destinos, setDestinos] = useState([]);
  const [destinoId, setDestinoId] = useState('');
  const [destinoKeyword, setDestinoKeyword] = useState('');
  const [fechaDesde, setFechaDesde] = useState(dayjs());
  const [fechaHasta, setFechaHasta] = useState(dayjs());
  const [guias, setGuias] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [expandedFolio, setExpandedFolio] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    api.get('/guias/sucursales-destino').then(r => setDestinos(r.data)).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    if (!sucursalId || !destinoKeyword) return;
    setLoading(true);
    setExpandedFolio(null);
    setDetalle(null);
    try {
      const { data } = await api.get('/guias/envio', {
        params: {
          sucursalId, destinoKeyword, destinoId,
          fechaDesde: fechaDesde.format('YYYY-MM-DD'),
          fechaHasta: fechaHasta.format('YYYY-MM-DD')
        },
        timeout: 120000
      });
      setGuias(data.guias);
      setTotales(data.totales);
    } catch (err) {
      console.error(err);
      setGuias([]);
    }
    setLoading(false);
  }, [sucursalId, destinoKeyword, destinoId, fechaDesde, fechaHasta]);

  const toggleDetalle = useCallback(async (folio) => {
    if (expandedFolio === folio) {
      setExpandedFolio(null);
      setDetalle(null);
      return;
    }
    setExpandedFolio(folio);
    setLoadingDetalle(true);
    try {
      const { data } = await api.get('/guias/detalle', {
        params: { sucursalOrigenId: sucursalId, sucursalDestinoId: destinoId, folio }
      });
      setDetalle(data);
    } catch (err) {
      console.error(err);
      setDetalle(null);
    }
    setLoadingDetalle(false);
  }, [expandedFolio, sucursalId, destinoId]);

  const guiasFiltradas = useMemo(() => {
    if (!filtro) return guias;
    const f = filtro.toLowerCase();
    return guias.filter(g =>
      String(g.folio).includes(f) ||
      (g.comuna || '').toLowerCase().includes(f) ||
      (g.observacion || '').toLowerCase().includes(f) ||
      (g.ingreso || '').toLowerCase().includes(f)
    );
  }, [guias, filtro]);

  const handleDestinoChange = (e) => {
    const id = e.target.value;
    setDestinoId(id);
    const dest = destinos.find(d => d.id === id);
    setDestinoKeyword(dest ? dest.keyword : '');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select label="Sucursal Origen" value={sucursalId} onChange={e => setSucursalId(e.target.value)}
          size="small" sx={{ minWidth: 250 }}>
          {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <TextField select label="Sucursal Destino" value={destinoId} onChange={handleDestinoChange}
          size="small" sx={{ minWidth: 250 }}>
          {destinos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
        </TextField>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
        </LocalizationProvider>
        <Button variant="contained" onClick={buscar} disabled={loading || !sucursalId || !destinoKeyword}
          startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}>
          Buscar
        </Button>
      </Box>

      {totales && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`${totales.cantidad} guias`} color="primary" />
          <Chip label={`Total: ${formatPeso(totales.total)}`} color="success" />
        </Box>
      )}

      <TextField size="small" placeholder="Filtrar por folio, comuna, observacion, estado..."
        value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ mb: 2, width: 400 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }} />
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Comuna</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Direccion</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }} align="right">Neto</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }} align="right">IVA</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }} align="center">Productos</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Observacion</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Mueve Inv.</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1a237e', color: '#fff' }}>Ingreso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {guiasFiltradas.map((g, i) => (
              <React.Fragment key={g.folio + '-' + i}>
                <TableRow hover sx={{ cursor: 'pointer', bgcolor: g.ingreso === 'Ingresada' ? '#e8f5e9' : g.ingreso === 'Pendiente' ? '#fff3e0' : 'inherit' }}
                  onClick={() => toggleDetalle(g.folio)}>
                  <TableCell padding="checkbox">
                    <IconButton size="small">
                      {expandedFolio === g.folio ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{g.folio}</TableCell>
                  <TableCell>{formatFecha(g.fecha_emision)}</TableCell>
                  <TableCell>{g.comuna}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.direccion}</TableCell>
                  <TableCell align="right">{formatPeso(g.neto)}</TableCell>
                  <TableCell align="right">{formatPeso(g.iva)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatPeso(g.total)}</TableCell>
                  <TableCell align="center">{g.cant_productos}</TableCell>
                  <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.observacion}</TableCell>
                  <TableCell>{g.mueve_inventario}</TableCell>
                  <TableCell>{g.estado}</TableCell>
                  <TableCell>
                    <Chip size="small" label={g.ingreso}
                      color={g.ingreso === 'Ingresada' ? 'success' : g.ingreso === 'Pendiente' ? 'warning' : 'default'} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={13} sx={{ p: 0, borderBottom: expandedFolio === g.folio ? 1 : 0 }}>
                    <Collapse in={expandedFolio === g.folio}>
                      {loadingDetalle ? (
                        <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                      ) : detalle && (
                        <Box sx={{ p: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {/* Productos de la guia */}
                          <Box sx={{ flex: 1, minWidth: 400 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>
                              Productos de la Guia ({detalle.productos_guia.length})
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Codigo</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Cant.</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detalle.productos_guia.map((p, j) => (
                                  <TableRow key={j}>
                                    <TableCell>{p.codigo}</TableCell>
                                    <TableCell>{p.producto}</TableCell>
                                    <TableCell align="right">{p.cantidad}</TableCell>
                                    <TableCell align="right">{formatPeso(p.precio_unitario)}</TableCell>
                                    <TableCell align="right">{formatPeso(p.total)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                          {/* Ajuste en destino */}
                          <Box sx={{ flex: 1, minWidth: 400 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: detalle.ajuste.estado === 'Ingresada' ? '#2e7d32' : '#e65100' }}>
                              {detalle.ajuste.estado === 'Ingresada'
                                ? `Ajuste en Destino (${detalle.ajuste.cant_productos} prod.) - ${formatFecha(detalle.ajuste.fecha)}`
                                : 'No ingresada en destino'}
                            </Typography>
                            {detalle.ajuste.productos.length > 0 ? (
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Codigo</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Cant.</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detalle.ajuste.productos.map((p, j) => (
                                    <TableRow key={j}>
                                      <TableCell>{p.codigo}</TableCell>
                                      <TableCell>{p.producto}</TableCell>
                                      <TableCell align="right">{p.cantidad}</TableCell>
                                      <TableCell align="right">{formatPeso(p.precio)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                                Sin datos de ajuste
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {guiasFiltradas.length === 0 && !loading && (
              <TableRow><TableCell colSpan={13} align="center" sx={{ py: 4 }}>Sin datos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

// ============ TAB 2: GUIAS EMITIDAS ============
const TabGuiasEmitidas = memo(({ sucursales }) => {
  const [sucursalId, setSucursalId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(dayjs());
  const [fechaHasta, setFechaHasta] = useState(dayjs());
  const [guias, setGuias] = useState([]);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleFolio, setDetalleFolio] = useState('');
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const buscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/guias/emitidas', {
        params: { sucursalId, fechaDesde: fechaDesde.format('YYYY-MM-DD'), fechaHasta: fechaHasta.format('YYYY-MM-DD') },
        timeout: 120000
      });
      setGuias(data.guias);
      setTotales(data.totales);
    } catch (err) {
      console.error(err);
      setGuias([]);
    }
    setLoading(false);
  }, [sucursalId, fechaDesde, fechaHasta]);

  const verDetalle = useCallback(async (folio) => {
    setDetalleFolio(folio);
    setDetalleOpen(true);
    setLoadingDetalle(true);
    try {
      const { data } = await api.get('/guias/detalle-emitida', { params: { sucursalId, folio } });
      setDetalleData(data.productos);
    } catch (err) {
      console.error(err);
      setDetalleData(null);
    }
    setLoadingDetalle(false);
  }, [sucursalId]);

  const guiasFiltradas = useMemo(() => {
    if (!filtro) return guias;
    const f = filtro.toLowerCase();
    return guias.filter(g =>
      String(g.folio).includes(f) ||
      (g.cliente || '').toLowerCase().includes(f) ||
      (g.rut || '').includes(f) ||
      (g.observacion || '').toLowerCase().includes(f)
    );
  }, [guias, filtro]);

  const exportCSV = useCallback(() => {
    if (guiasFiltradas.length === 0) return;
    const headers = ['Folio', 'RUT', 'Cliente', 'Direccion', 'Neto', 'IVA', 'Total', 'Observacion', 'Fecha'];
    const rows = guiasFiltradas.map(g => [
      g.folio, g.rut, `"${g.cliente || ''}"`, `"${g.direccion || ''}"`,
      Math.round(g.neto || 0), Math.round(g.iva || 0), Math.round(g.total || 0),
      `"${g.observacion || ''}"`, formatFecha(g.fecha)
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guias_emitidas_${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
  }, [guiasFiltradas]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select label="Sucursal" value={sucursalId} onChange={e => setSucursalId(e.target.value)}
          size="small" sx={{ minWidth: 250 }}>
          {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
        </LocalizationProvider>
        <Button variant="contained" onClick={buscar} disabled={loading || !sucursalId}
          startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}>
          Buscar
        </Button>
        <Button variant="outlined" onClick={exportCSV} disabled={guias.length === 0}
          startIcon={<FileDownloadIcon />}>
          Excel
        </Button>
      </Box>

      {totales && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`${totales.cantidad} guias`} color="primary" />
          <Chip label={`Total: ${formatPeso(totales.total)}`} color="success" />
        </Box>
      )}

      <TextField size="small" placeholder="Filtrar por folio, cliente, RUT, observacion..."
        value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ mb: 2, width: 400 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>RUT</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>Direccion</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }} align="right">Neto</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }} align="right">IVA</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>Observacion</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#1b5e20', color: '#fff' }}>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {guiasFiltradas.map((g, i) => (
              <TableRow key={g.folio + '-' + i} hover sx={{ cursor: 'pointer' }} onDoubleClick={() => verDetalle(g.folio)}>
                <TableCell sx={{ fontWeight: 'bold' }}>{g.folio}</TableCell>
                <TableCell>{g.rut}</TableCell>
                <TableCell>{g.cliente}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.direccion}</TableCell>
                <TableCell align="right">{formatPeso(g.neto)}</TableCell>
                <TableCell align="right">{formatPeso(g.iva)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatPeso(g.total)}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.observacion}</TableCell>
                <TableCell>{formatFecha(g.fecha)}</TableCell>
              </TableRow>
            ))}
            {guiasFiltradas.length === 0 && !loading && (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>Sin datos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog detalle */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle Guia Folio: {detalleFolio}</DialogTitle>
        <DialogContent>
          {loadingDetalle ? (
            <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
          ) : detalleData && detalleData.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Codigo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Descripcion</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Cantidad</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio Final</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalleData.map((p, j) => (
                  <TableRow key={j}>
                    <TableCell>{p.codigo}</TableCell>
                    <TableCell>{p.descripcion}</TableCell>
                    <TableCell align="right">{p.cantidad}</TableCell>
                    <TableCell align="right">{formatPeso(p.precio_final)}</TableCell>
                    <TableCell align="right">{formatPeso(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography sx={{ py: 2 }}>Sin productos</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

// ============ TAB 3: CENTRO DE COSTOS (productos_direccion.vb) ============
const TabCentroCostos = memo(({ sucursales }) => {
  const [sucursalId, setSucursalId]     = useState('');
  const [fechaDesde, setFechaDesde]     = useState(dayjs());
  const [fechaHasta, setFechaHasta]     = useState(dayjs());
  const [clientes, setClientes]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filtro, setFiltro]             = useState('');
  const [expandedDir, setExpandedDir]   = useState(null);
  const [detalle, setDetalle]           = useState({});
  const [loadingDetalle, setLoadingDetalle] = useState(null);

  const buscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    setExpandedDir(null);
    setDetalle({});
    try {
      const { data } = await api.get('/guias/centro-costos', {
        params: { sucursalId, fechaDesde: fechaDesde.format('YYYY-MM-DD'), fechaHasta: fechaHasta.format('YYYY-MM-DD') },
        timeout: 120000
      });
      setClientes(data.clientes || []);
    } catch (err) {
      console.error(err);
      setClientes([]);
    }
    setLoading(false);
  }, [sucursalId, fechaDesde, fechaHasta]);

  const toggleDetalle = useCallback(async (direccion) => {
    if (expandedDir === direccion) { setExpandedDir(null); return; }
    setExpandedDir(direccion);
    if (detalle[direccion]) return; // ya cargado
    setLoadingDetalle(direccion);
    try {
      const { data } = await api.get('/guias/centro-costos-detalle', {
        params: { sucursalId, direccion, fechaDesde: fechaDesde.format('YYYY-MM-DD'), fechaHasta: fechaHasta.format('YYYY-MM-DD') },
        timeout: 120000
      });
      setDetalle(prev => ({ ...prev, [direccion]: data.productos || [] }));
    } catch (err) {
      console.error(err);
      setDetalle(prev => ({ ...prev, [direccion]: [] }));
    }
    setLoadingDetalle(null);
  }, [expandedDir, detalle, sucursalId, fechaDesde, fechaHasta]);

  const clientesFiltrados = useMemo(() => {
    if (!filtro) return clientes;
    const f = filtro.toLowerCase();
    return clientes.filter(c =>
      (c.razon_social || '').toLowerCase().includes(f) ||
      (c.rut || '').includes(f) ||
      (c.direccion || '').toLowerCase().includes(f)
    );
  }, [clientes, filtro]);

  const CC_COLOR = '#2e7d32';

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField select label="Sucursal" value={sucursalId} onChange={e => setSucursalId(e.target.value)}
          size="small" sx={{ minWidth: 250 }}>
          {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
        </TextField>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
          <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { width: 160 } } }} />
        </LocalizationProvider>
        <Button variant="contained" onClick={buscar} disabled={loading || !sucursalId}
          startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}
          sx={{ bgcolor: CC_COLOR, '&:hover': { bgcolor: '#1b5e20' } }}>
          Buscar
        </Button>
      </Box>

      {clientes.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip label={`${clientes.length} centros de costos`} sx={{ bgcolor: CC_COLOR, color: '#fff', fontWeight: 700 }} />
        </Box>
      )}

      <TextField size="small" placeholder="Filtrar por razón social, RUT, dirección..."
        value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ mb: 2, width: 400 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: CC_COLOR, color: '#fff', width: 40 }} />
              <TableCell sx={{ fontWeight: 'bold', bgcolor: CC_COLOR, color: '#fff' }}>RUT</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: CC_COLOR, color: '#fff' }}>Razón Social</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: CC_COLOR, color: '#fff' }}>Dirección</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientesFiltrados.map((c, i) => (
              <React.Fragment key={`${c.rut}-${i}`}>
                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleDetalle(c.direccion)}>
                  <TableCell padding="checkbox">
                    <IconButton size="small">
                      {expandedDir === c.direccion ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.78rem' }}>{c.rut}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.razon_social}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{c.direccion}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} sx={{ py: 0, border: 0 }}>
                    <Collapse in={expandedDir === c.direccion} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 1.5, bgcolor: '#f1f8e9', borderRadius: 1, m: 0.5 }}>
                        {loadingDetalle === c.direccion ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" color="text.secondary">Cargando productos...</Typography>
                          </Box>
                        ) : detalle[c.direccion]?.length > 0 ? (
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#c8e6c9' }}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Folio</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Código</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Descripción</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }} align="right">Cantidad</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }} align="right">Valor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Familia</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.72rem' }}>Fecha Emisión</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {detalle[c.direccion].map((p, j) => (
                                <TableRow key={j} hover>
                                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700, color: CC_COLOR }}>{p.folio}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem' }}>{p.codigo}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem' }}>{p.descripcion}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem' }} align="right">{p.cantidad}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem', fontWeight: 700 }} align="right">{formatPeso(p.valor)}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{p.familia}</TableCell>
                                  <TableCell sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{p.fecha_emision}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                            Sin productos registrados para esta dirección en el período
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {clientesFiltrados.length === 0 && !loading && (
              <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                {clientes.length === 0 ? 'Selecciona una sucursal y rango de fechas para buscar' : 'Sin resultados'}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

// ============ PAGINA PRINCIPAL ============
const GuiasPage = () => {
  const [tab, setTab] = useState(0);
  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    api.get('/guias/sucursales').then(r => setSucursales(r.data)).catch(err => console.error(err));
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
          sx={{ '& .MuiTab-root': { fontWeight: 'bold', fontSize: '0.9rem' } }}>
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label="Envio de Guias" />
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Guias Emitidas" />
          <Tab icon={<CompareArrowsIcon />} iconPosition="start" label="Centro de Costos" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {tab === 0 && <TabEnvioGuias sucursales={sucursales} />}
        {tab === 1 && <TabGuiasEmitidas sucursales={sucursales} />}
        {tab === 2 && <TabCentroCostos sucursales={sucursales} />}
      </Paper>
    </Box>
  );
};

export default GuiasPage;
