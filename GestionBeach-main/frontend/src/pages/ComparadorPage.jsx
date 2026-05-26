// frontend/src/pages/ComparadorPage.jsx
// Comparador de precios y stock entre sucursales (migrado de Comparador.vb)
import React, { useState, useCallback, useRef, memo, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Alert, InputAdornment,
  ToggleButtonGroup, ToggleButton, Skeleton, Divider,
  Dialog, DialogContent, IconButton, LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Store as StoreIcon,
  CompareArrows as CompareIcon,
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
  QrCode as CodigoIcon,
  Description as DescripcionIcon,
  FileDownload as ExcelIcon,
  Info as InfoIcon,
  ListAlt as TarjetaIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import * as XLSX from 'xlsx';
import api from '../api/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const HEADER_BG   = '#1a237e';
const MIN_CHARS   = 3;
const DEBOUNCE_MS = 600;

const COLOR = {
  selected: { bg: '#fff9c4', border: '#f9a825' },
  allSuc:   { bg: '#c8e6c9', border: '#2e7d32' },
  multiSuc: { bg: '#e8f5e9', border: '#81c784' },
  normal:   { bg: null,      border: 'none'    },
};

const fmtPeso  = (v) => v == null ? '$0' : '$' + Math.round(v).toLocaleString('es-CL');
const fmtStock = (v) => v == null ? '0'  : Number(v).toLocaleString('es-CL');
const fmtDec   = (v) => (v == null || v === '') ? '0' : Number(v).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL') : '';

// ─── Tabla de una sucursal ────────────────────────────────────────────────────
const TablaSucursal = memo(({ sucursal, selectedCodigo, onSelect, loading, codigoCountMap, totalOnline }) => {
  const { productos = [], error } = sucursal;

  const headCell = (label, align = 'left', width) => (
    <TableCell align={align} sx={{ fontWeight: 700, bgcolor: HEADER_BG, color: '#fff', py: 0.7, fontSize: '0.73rem', whiteSpace: 'nowrap', ...(width ? { width } : {}) }}>
      {label}
    </TableCell>
  );

  if (loading) return (
    <Box sx={{ p: 1 }}>
      {[...Array(6)].map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 0.3 }} />)}
    </Box>
  );

  if (error) return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <OfflineIcon color="error" sx={{ fontSize: 36 }} />
      <Typography variant="body2" color="error" align="center" sx={{ fontSize: '0.8rem' }}>{error}</Typography>
    </Box>
  );

  if (productos.length === 0) return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>Sin resultados</Typography>
    </Box>
  );

  return (
    <TableContainer sx={{ maxHeight: 420, overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {headCell('Código',      'left',  '100px')}
            {headCell('Descripción', 'left')}
            {headCell('Stock',       'right', '72px')}
            {headCell('Precio',      'right', '90px')}
          </TableRow>
        </TableHead>
        <TableBody>
          {productos.map((p, idx) => {
            const isSelected = p.codigo === selectedCodigo;
            const count      = codigoCountMap?.get(p.codigo) ?? 1;
            const enTodas    = totalOnline > 1 && count >= totalOnline;
            const col        = isSelected ? COLOR.selected : enTodas ? COLOR.allSuc : count >= 2 ? COLOR.multiSuc : COLOR.normal;
            const evenBg     = idx % 2 === 0 ? 'rgba(0,0,0,0.025)' : '#fff';

            return (
              <TableRow
                key={`${p.codigo}-${idx}`}
                hover
                onClick={() => onSelect(isSelected ? null : p.codigo, sucursal.id)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: col.bg ?? evenBg,
                  borderLeft: `3px solid ${col.border}`,
                  '&:hover': { bgcolor: isSelected ? '#fff3a0' : enTodas ? '#b2dfdb' : count >= 2 ? '#dcedc8' : alpha(HEADER_BG, 0.06) },
                  transition: 'background-color 0.12s',
                }}
              >
                <TableCell sx={{ fontSize: '0.76rem', fontFamily: 'monospace', py: 0.4, whiteSpace: 'nowrap' }}>{p.codigo}</TableCell>
                <TableCell sx={{ fontSize: '0.76rem', py: 0.4 }}>{p.descripcion}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.76rem', py: 0.4, fontWeight: p.stock > 0 ? 600 : 400, color: p.stock > 0 ? 'success.main' : 'text.secondary' }}>
                  {fmtStock(p.stock)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.76rem', py: 0.4, fontFamily: 'monospace' }}>{fmtPeso(p.precio)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ─── Card de sucursal ─────────────────────────────────────────────────────────
const CardSucursal = memo(({ sucursal, selectedCodigo, onSelect, loading, codigoCountMap, totalOnline }) => {
  const offline = Boolean(sucursal.error);
  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${offline ? '#ffcdd2' : '#e8eaf6'}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: offline ? '#ffebee' : alpha(HEADER_BG, 0.07), borderBottom: `1px solid ${offline ? '#ffcdd2' : '#e8eaf6'}` }}>
        <StoreIcon sx={{ fontSize: 18, color: offline ? 'error.main' : HEADER_BG, flexShrink: 0 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: offline ? 'error.main' : HEADER_BG, flex: 1 }}>
          {sucursal.nombre}
        </Typography>
        {loading ? <CircularProgress size={14} /> : offline ? (
          <Chip icon={<OfflineIcon sx={{ fontSize: '14px !important' }} />} label="Sin conexión" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
        ) : (
          <Chip label={`${sucursal.total ?? sucursal.productos?.length ?? 0} productos`} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha(HEADER_BG, 0.1), color: HEADER_BG, fontWeight: 600 }} />
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TablaSucursal sucursal={sucursal} selectedCodigo={selectedCodigo} onSelect={onSelect} loading={loading} codigoCountMap={codigoCountMap} totalOnline={totalOnline} />
      </Box>
    </Paper>
  );
});

// ─── Leyenda de colores ───────────────────────────────────────────────────────
const Leyenda = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
    {[
      { color: COLOR.allSuc.bg,   border: COLOR.allSuc.border,   label: 'En todas las sucursales' },
      { color: COLOR.multiSuc.bg, border: COLOR.multiSuc.border, label: 'En 2+ sucursales' },
      { color: COLOR.selected.bg, border: COLOR.selected.border, label: 'Seleccionado' },
    ].map(({ color, border, label }) => (
      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
        <Box sx={{ width: 16, height: 16, borderRadius: '3px', bgcolor: color, border: `2px solid ${border}`, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
    ))}
  </Box>
);

// ─── Dialog Tarjeta de Existencia ─────────────────────────────────────────────
const TarjetaExistenciaDialog = memo(({ open, onClose, codigo, descripcion, sucursalesOnline, defaultSucursalId }) => {
  const anioActual     = new Date().getFullYear();
  const [sucursalId,   setSucursalId]   = useState(defaultSucursalId || '');
  const [fechaDesde,   setFechaDesde]   = useState(`${anioActual}-01-01`);
  const [fechaHasta,   setFechaHasta]   = useState(new Date().toISOString().slice(0, 10));
  const [tarjeta,      setTarjeta]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [maximizada,   setMaximizada]   = useState(false);

  // Actualizar sucursal cuando cambia el default (al seleccionar otra fila)
  useEffect(() => { if (defaultSucursalId) setSucursalId(defaultSucursalId); }, [defaultSucursalId]);
  // Limpiar al cerrar
  useEffect(() => { if (!open) { setTarjeta(null); setMaximizada(false); } }, [open]);

  const cargarTarjeta = useCallback(async () => {
    if (!sucursalId || !codigo) return;
    setLoading(true);
    setTarjeta(null);
    try {
      const { data } = await api.get('/consultar-producto/tarjeta-existencia', {
        params: { sucursalId, codigo, fechaDesde, fechaHasta },
        timeout: 120000,
      });
      setTarjeta(data);
    } catch {
      setTarjeta({ movimientos: [], stock_actual: '-', total_entradas: 0, total_salidas: 0 });
    } finally {
      setLoading(false);
    }
  }, [sucursalId, codigo, fechaDesde, fechaHasta]);

  const sucursalNombre = sucursalesOnline.find(s => String(s.id) === String(sucursalId))?.nombre || '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth fullScreen={maximizada}
      PaperProps={{ sx: maximizada ? { borderRadius: 0 } : { borderRadius: 3, overflow: 'hidden', maxHeight: '92vh', width: '95vw' } }}
    >
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)', color: 'white', px: 3, pt: 2.5, pb: 2, position: 'relative' }}>
        {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, '& .MuiLinearProgress-bar': { bgcolor: '#FF9800' }, bgcolor: 'rgba(255,255,255,0.15)' }} />}
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}>
          <CloseIcon />
        </IconButton>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, fontSize: '0.68rem' }}>Tarjeta de Existencia</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mt: 0.2, lineHeight: 1.3 }}>{descripcion}</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', mt: 0.3 }}>{codigo}</Typography>
      </Box>

      <DialogContent sx={{ p: 2 }}>
        {/* Filtros */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector de sucursal */}
          <TextField
            select size="small" label="Sucursal" value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {sucursalesOnline.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField type="date" size="small" label="Desde" value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 155, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

          <TextField type="date" size="small" label="Hasta" value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 155, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

          <Button variant="contained" size="small" onClick={cargarTarjeta} disabled={loading || !sucursalId}
            sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' }, height: 40 }}>
            <SearchIcon sx={{ fontSize: 18, mr: 0.5 }} /> Buscar
          </Button>

          <IconButton
            onClick={() => setMaximizada(v => !v)} size="small"
            sx={{ ml: 'auto', bgcolor: maximizada ? '#1a237e' : 'rgba(26,35,126,0.08)', color: maximizada ? 'white' : '#1a237e', borderRadius: 1.5, px: 1.5, py: 0.5, gap: 0.5, '&:hover': { bgcolor: maximizada ? '#283593' : 'rgba(26,35,126,0.15)' }, display: 'flex', alignItems: 'center' }}
            title={maximizada ? 'Minimizar' : 'Maximizar'}
          >
            {maximizada
              ? <><FullscreenExitIcon sx={{ fontSize: 19 }} /><Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem' }}>Minimizar</Typography></>
              : <><FullscreenIcon    sx={{ fontSize: 19 }} /><Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.72rem' }}>Maximizar</Typography></>
            }
          </IconButton>
        </Box>

        {/* Loading */}
        {loading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: '#FF9800' }} /></Box>}

        {/* Resultados */}
        {tarjeta && (
          <>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`${tarjeta.movimientos.length} movimientos`} color="primary" size="small" />
              <Chip label={`Stock actual: ${tarjeta.stock_actual ?? '-'}`} color="success" size="small" />
              <Chip label={`Total Ingreso: ${fmtDec(tarjeta.total_entradas ?? 0)}`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700 }} />
              <Chip label={`Total Egreso: ${fmtDec(tarjeta.total_salidas ?? 0)}`}   size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 700 }} />
              {sucursalNombre && <Typography variant="caption" color="text.secondary">— {sucursalNombre}</Typography>}
            </Box>

            <TableContainer sx={{ maxHeight: maximizada ? 'calc(100vh - 270px)' : 440 }}>
              <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    {[
                      { h: 'Fecha',     right: false },
                      { h: 'Nº OC',     right: true  },
                      { h: 'Folio',     right: false },
                      { h: 'Detalle',   right: false },
                      { h: 'Ingreso',   right: true  },
                      { h: 'Egreso',    right: true  },
                      { h: 'Stock',     right: true  },
                      { h: 'Proveedor', right: false },
                      { h: 'Cliente',   right: false },
                      { h: '$ Ingreso', right: true  },
                      { h: '$ Egreso',  right: true  },
                    ].map(({ h, right }) => (
                      <TableCell key={h} align={right ? 'right' : 'left'}
                        sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#fafafa', borderBottom: '2px solid #FF9800', whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tarjeta.movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 5, color: 'text.secondary' }}>Sin movimientos en el período</TableCell>
                    </TableRow>
                  ) : tarjeta.movimientos.map((m, i) => (
                    <TableRow key={i} hover sx={{ bgcolor: m.Ingreso > 0 ? 'rgba(76,175,80,0.04)' : m.Egreso > 0 ? 'rgba(244,67,54,0.04)' : 'transparent' }}>
                      <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{fmtFecha(m.Fecha)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.72rem', fontFamily: 'monospace', color: m.NumOC > 0 ? '#1565c0' : '#bbb' }}>
                        {m.NumOC > 0 ? m.NumOC : '-'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>{m.Folio || '-'}</TableCell>
                      <TableCell>
                        <Chip label={m.Detalle || '-'} size="small" sx={{ height: 18, fontSize: '0.65rem',
                          bgcolor: m.Detalle === 'BO' ? '#fff3e0' : m.Detalle === 'FA' ? '#f3e5f5' : m.Detalle === 'NC' ? '#fce4ec' : m.Detalle === 'GV' ? '#e8f5e9' : '#f5f5f5',
                          color:   m.Detalle === 'BO' ? '#e65100' : m.Detalle === 'FA' ? '#6a1b9a' : m.Detalle === 'NC' ? '#c62828' : m.Detalle === 'GV' ? '#2e7d32' : '#555',
                        }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, color: m.Ingreso > 0 ? '#2e7d32' : '#bbb' }}>
                        {m.Ingreso > 0 ? fmtDec(m.Ingreso) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, color: m.Egreso > 0 ? '#c62828' : '#bbb' }}>
                        {m.Egreso > 0 ? fmtDec(m.Egreso) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{m.Stock ?? '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Proveedor || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Cliente || '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.72rem', color: '#2e7d32' }}>{m.PrecioIngreso > 0 ? fmtDec(m.PrecioIngreso) : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.72rem', color: '#c62828' }}>{m.PrecioEgreso > 0 ? fmtDec(m.PrecioEgreso) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Estado inicial */}
        {!loading && !tarjeta && (
          <Box sx={{ py: 6, textAlign: 'center', opacity: 0.4 }}>
            <TarjetaIcon sx={{ fontSize: 52, color: HEADER_BG, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Selecciona la sucursal y el rango de fechas, luego presiona Buscar</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
});

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const ComparadorPage = () => {
  const [busqueda,       setBusqueda]       = useState('');
  const [campo,          setCampo]          = useState('descripcion');
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [debouncing,     setDebouncing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [selectedCodigo, setSelectedCodigo] = useState(null);
  const [selectedSucId,  setSelectedSucId]  = useState(null);   // sucursal del último click
  const [selectedDesc,   setSelectedDesc]   = useState('');     // descripción para el título del dialog
  const [tarjetaOpen,    setTarjetaOpen]    = useState(false);

  const debounceRef = useRef(null);

  // ── Búsqueda ─────────────────────────────────────────────────────────────────
  const ejecutarBusqueda = useCallback(async (term, campoActual) => {
    if (!term.trim()) return;
    setDebouncing(false);
    setLoading(true);
    setError(null);
    setSelectedCodigo(null);
    setSelectedSucId(null);
    setSelectedDesc('');
    try {
      const { data: res } = await api.get('/comparador/productos', {
        params: { busqueda: term.trim(), campo: campoActual },
        timeout: 30000,
      });
      if (!res.success) throw new Error(res.message || 'Error al consultar');
      setData(res);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Error de conexión');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (busqueda.trim().length >= MIN_CHARS) {
      setDebouncing(true);
      debounceRef.current = setTimeout(() => ejecutarBusqueda(busqueda, campo), DEBOUNCE_MS);
    } else {
      setDebouncing(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [busqueda, campo, ejecutarBusqueda]);

  const handleBuscar = useCallback(() => {
    clearTimeout(debounceRef.current);
    setDebouncing(false);
    ejecutarBusqueda(busqueda, campo);
  }, [busqueda, campo, ejecutarBusqueda]);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter') handleBuscar(); }, [handleBuscar]);

  // ── Selección de fila ─────────────────────────────────────────────────────────
  // onSelect recibe (codigo, sucursalId) — sucursalId viene desde TablaSucursal
  const handleSelect = useCallback((codigo, sucursalId) => {
    setSelectedCodigo(codigo);
    setSelectedSucId(sucursalId ?? null);
    // Buscar la descripción del producto seleccionado para el título del dialog
    if (codigo && data?.sucursales) {
      for (const suc of data.sucursales) {
        const p = suc.productos?.find(x => x.codigo === codigo);
        if (p) { setSelectedDesc(p.descripcion || ''); break; }
      }
    } else {
      setSelectedDesc('');
    }
  }, [data]);

  // ── Mapa código → nº sucursales ──────────────────────────────────────────────
  const codigoCountMap = useMemo(() => {
    if (!data?.sucursales) return new Map();
    const map = new Map();
    data.sucursales.forEach(suc => (suc.productos || []).forEach(p => map.set(p.codigo, (map.get(p.codigo) || 0) + 1)));
    return map;
  }, [data]);

  const totalOnline = useMemo(() => data?.online ?? 0, [data]);

  // Sucursales online para el selector de la tarjeta
  const sucursalesOnline = useMemo(() =>
    (data?.sucursales || []).filter(s => !s.error).map(s => ({ id: s.id, nombre: s.nombre })),
    [data]
  );

  // ── Exportar Excel ────────────────────────────────────────────────────────────
  const handleExportar = useCallback(() => {
    if (!data?.sucursales?.length) return;
    const wb = XLSX.utils.book_new();
    data.sucursales.forEach(suc => {
      if (!suc.productos?.length) return;
      const ws = XLSX.utils.json_to_sheet(suc.productos.map(p => ({ Código: p.codigo, Descripción: p.descripcion, Stock: p.stock, Precio: p.precio })));
      XLSX.utils.book_append_sheet(wb, ws, suc.nombre.slice(0, 31));
    });
    XLSX.writeFile(wb, `Comparador_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [data]);

  const placeholders  = Array.from({ length: 4 }, (_, i) => ({ id: i, nombre: '...', productos: [], total: 0, error: null }));
  const sucursales    = loading ? placeholders : (data?.sucursales ?? []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>

      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <CompareIcon sx={{ fontSize: 32, color: HEADER_BG }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: HEADER_BG, lineHeight: 1.2 }}>Comparador de Precios y Stock</Typography>
          <Typography variant="caption" color="text.secondary">Consulta stock y precios en todas las ferreterías ERP en paralelo</Typography>
        </Box>
      </Box>

      {/* Panel de búsqueda */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #e8eaf6' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm="auto">
            <ToggleButtonGroup value={campo} exclusive onChange={(_, v) => { if (v) setCampo(v); }} size="small" sx={{ height: 40 }}>
              <ToggleButton value="descripcion" sx={{ px: 1.5, fontSize: '0.78rem', gap: 0.5 }}><DescripcionIcon sx={{ fontSize: 16 }} /> Descripción</ToggleButton>
              <ToggleButton value="codigo"      sx={{ px: 1.5, fontSize: '0.78rem', gap: 0.5 }}><CodigoIcon      sx={{ fontSize: 16 }} /> Código</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} sm>
            <TextField
              fullWidth size="small"
              placeholder={campo === 'descripcion' ? `Buscar por descripción (auto desde ${MIN_CHARS} letras)…` : `Buscar por código (auto desde ${MIN_CHARS} caracteres)…`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment:   debouncing ? <InputAdornment position="end"><CircularProgress size={16} thickness={5} /></InputAdornment> : null,
              }}
            />
          </Grid>

          <Grid item xs={12} sm="auto">
            <Button variant="contained" onClick={handleBuscar} disabled={loading || !busqueda.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ bgcolor: HEADER_BG, '&:hover': { bgcolor: '#283593' }, px: 2.5, height: 40 }}>
              {loading ? 'Consultando…' : 'Buscar'}
            </Button>
          </Grid>

          {data?.sucursales?.length > 0 && (
            <Grid item xs={12} sm="auto">
              <Button variant="outlined" onClick={handleExportar} startIcon={<ExcelIcon />}
                sx={{ height: 40, fontSize: '0.8rem', borderColor: '#388e3c', color: '#388e3c', '&:hover': { borderColor: '#2e7d32', bgcolor: alpha('#388e3c', 0.06) } }}>
                Exportar Excel
              </Button>
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <InfoIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled">
              Escribe {MIN_CHARS}+ caracteres para buscar automáticamente · Enter o Buscar para buscar al instante · Haz clic en una fila para comparar y ver su tarjeta de existencia
            </Typography>
          </Box>
          <Leyenda />
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Barra de estado + botón Tarjeta Existencia */}
      {data && !loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Chip icon={<OnlineIcon sx={{ fontSize: '16px !important' }} />} label={`${data.online} en línea`} color="success" size="small" variant="outlined" />
          {data.offline > 0 && <Chip icon={<OfflineIcon sx={{ fontSize: '16px !important' }} />} label={`${data.offline} sin conexión`} color="error" size="small" variant="outlined" />}
          <Typography variant="caption" color="text.secondary">{data.total_sucursales} sucursales consultadas</Typography>

          {selectedCodigo && (
            <>
              <Divider orientation="vertical" flexItem />
              <Chip
                label={`Comparando: ${selectedCodigo}`}
                size="small"
                sx={{ bgcolor: COLOR.selected.bg, border: `1px solid ${COLOR.selected.border}`, fontFamily: 'monospace', fontWeight: 700 }}
                onDelete={() => handleSelect(null, null)}
              />

              {/* ── BOTÓN TARJETA DE EXISTENCIA ── */}
              <Button
                variant="contained"
                size="small"
                startIcon={<TarjetaIcon />}
                onClick={() => setTarjetaOpen(true)}
                sx={{
                  bgcolor: '#FF9800',
                  '&:hover': { bgcolor: '#F57C00' },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(255,152,0,0.4)',
                }}
              >
                Tarjeta de Existencia
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Grid de sucursales */}
      {(loading || sucursales.length > 0) && (
        <Grid container spacing={2}>
          {sucursales.map((suc, idx) => (
            <Grid key={suc.id ?? idx} item xs={12} lg={6}>
              <CardSucursal
                sucursal={suc}
                selectedCodigo={selectedCodigo}
                onSelect={handleSelect}
                loading={loading}
                codigoCountMap={codigoCountMap}
                totalOnline={totalOnline}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Estado inicial */}
      {!loading && !data && !error && (
        <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: 0.45 }}>
          <CompareIcon sx={{ fontSize: 72, color: HEADER_BG }} />
          <Typography variant="h6" color="text.secondary" align="center">Empieza a escribir para buscar</Typography>
          <Typography variant="body2" color="text.disabled" align="center" sx={{ maxWidth: 440 }}>
            Con {MIN_CHARS}+ caracteres la búsqueda es automática. Los productos compartidos se resaltarán en verde.
          </Typography>
        </Box>
      )}

      {/* Dialog Tarjeta de Existencia */}
      {tarjetaOpen && selectedCodigo && (
        <TarjetaExistenciaDialog
          open={tarjetaOpen}
          onClose={() => setTarjetaOpen(false)}
          codigo={selectedCodigo}
          descripcion={selectedDesc}
          sucursalesOnline={sucursalesOnline}
          defaultSucursalId={selectedSucId}
        />
      )}
    </Box>
  );
};

export default ComparadorPage;
