import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Card, CardContent, Typography, Box, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, CircularProgress, Alert, Chip,
  Button, Paper, InputAdornment, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as ExcelIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../api/api';

const fmt = (val) => {
  if (!val && val !== 0) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
};

const ConsultarProductoPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [filtro, setFiltro] = useState('vigente');
  const [busqueda, setBusqueda] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [error, setError] = useState(null);

  // Cargar sucursales al montar
  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const response = await api.get('/consultar-producto/sucursales');
        setSucursales(response.data);
        if (response.data.length > 0) {
          setSucursalId(response.data[0].id);
        }
      } catch (err) {
        setError('Error al cargar sucursales');
      } finally {
        setLoadingSucursales(false);
      }
    };
    fetchSucursales();
  }, []);

  // Consultar productos
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

  // Filtrar productos por busqueda
  const productosFiltrados = data?.productos?.filter(p => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (p.codigo || '').toLowerCase().includes(term) ||
           (p.descripcion || '').toLowerCase().includes(term) ||
           (p.familia || '').toLowerCase().includes(term);
  }) || [];

  const totalValorizadoFiltrado = productosFiltrados.reduce((sum, p) => sum + (p.valorizado || 0), 0);

  // Exportar a Excel
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
      sheetData.push([
        p.codigo,
        p.descripcion,
        p.stock,
        p.familia,
        p.precio_compra,
        p.margen,
        p.neto,
        p.precio_final,
        p.valorizado
      ]);
    });

    sheetData.push(['']);
    sheetData.push(['', '', '', '', '', '', '', 'TOTAL VALORIZADO', totalValorizadoFiltrado]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 18 }, { wch: 40 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }
    ];

    // Formato peso chileno en columnas monetarias (E, G, H, I = indices 4, 6, 7, 8)
    const pesoFmt = '"$"#,##0';
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (const c of [4, 6, 7, 8]) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && typeof ws[addr].v === 'number') {
          ws[addr].z = pesoFmt;
        }
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
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#333' }}>
            Consultar Producto
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Consulta de productos por sucursal (Sistema SAF)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="Sucursal" value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            disabled={loadingSucursales}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {sucursales.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined" size="small" startIcon={<ExcelIcon />}
            onClick={exportToExcel} disabled={!data || loading || productosFiltrados.length === 0}
            sx={{
              borderRadius: 2, textTransform: 'none', borderColor: '#4caf50', color: '#4caf50',
              '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76,175,80,0.04)' }
            }}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={filtro}
          exclusive
          onChange={(e, val) => { if (val) setFiltro(val); }}
          size="small"
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', borderRadius: 2, px: 2 } }}
        >
          <ToggleButton value="vigente" sx={{ '&.Mui-selected': { bgcolor: 'rgba(76,175,80,0.12)', color: '#2e7d32' } }}>
            Vigentes
          </ToggleButton>
          <ToggleButton value="no_vigente" sx={{ '&.Mui-selected': { bgcolor: 'rgba(244,67,54,0.12)', color: '#c62828' } }}>
            No Vigentes
          </ToggleButton>
          <ToggleButton value="limpiar" sx={{ '&.Mui-selected': { bgcolor: 'rgba(33,150,243,0.12)', color: '#1565c0' } }}>
            <FilterIcon sx={{ mr: 0.5, fontSize: 18 }} /> Limpio
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          size="small"
          placeholder="Buscar por codigo, descripcion o familia..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#999' }} /></InputAdornment>,
            sx: { borderRadius: 2 }
          }}
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
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,152,0,0.1)', display: 'flex' }}>
                      <InventoryIcon sx={{ color: '#FF9800', fontSize: 26 }} />
                    </Box>
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
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(76,175,80,0.1)', display: 'flex' }}>
                      <MoneyIcon sx={{ color: '#4caf50', fontSize: 26 }} />
                    </Box>
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
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(33,150,243,0.1)', display: 'flex' }}>
                      <CategoryIcon sx={{ color: '#2196f3', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Sucursal</Typography>
                      <Typography variant="h6" fontWeight={700} noWrap>{data.sucursal?.nombre}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla de productos */}
          <Paper sx={{ borderRadius: 3, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Codigo', 'Descripcion', 'Stock', 'Familia', 'P.Compra', 'Margen', 'Neto', 'Precio Final', 'Valorizado'].map((h, i) => (
                      <TableCell
                        key={h}
                        align={i >= 2 && i !== 3 ? 'right' : 'left'}
                        sx={{
                          fontWeight: 700, py: 1.2, px: 1.5, fontSize: '0.82rem',
                          bgcolor: '#fafafa', borderBottom: '2px solid #FF9800', color: '#444',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {busqueda ? 'Sin resultados para la busqueda' : 'Sin productos para este filtro'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    productosFiltrados.map((p, i) => (
                      <TableRow
                        key={p.codigo + '-' + i}
                        hover
                        sx={{
                          '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.02)' },
                          '&:hover': { bgcolor: 'rgba(255,152,0,0.06) !important' }
                        }}
                      >
                        <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontFamily: 'monospace', color: '#555', whiteSpace: 'nowrap' }}>
                          {p.codigo}
                        </TableCell>
                        <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#222', maxWidth: 300 }}>
                          <Typography variant="body2" noWrap title={p.descripcion}>{p.descripcion}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontWeight: 600 }}>
                          <Chip
                            label={p.stock}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              height: 22,
                              bgcolor: p.stock > 0 ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                              color: p.stock > 0 ? '#2e7d32' : '#c62828'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.7, px: 1.5, fontSize: '0.8rem', color: '#777' }}>
                          {p.familia}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#555' }}>
                          {fmt(p.precio_compra)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#888' }}>
                          {p.margen}%
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', color: '#555' }}>
                          {fmt(p.neto)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontWeight: 600, color: '#222' }}>
                          {fmt(p.precio_final)}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.7, px: 1.5, fontSize: '0.82rem', fontWeight: 700, color: p.valorizado > 0 ? '#1565c0' : '#999' }}>
                          {fmt(p.valorizado)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer con total */}
            {productosFiltrados.length > 0 && (
              <Box sx={{
                px: 2.5, py: 1.5,
                borderTop: '2px solid #eee', bgcolor: '#fafafa',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <Typography variant="body2" color="text.secondary">
                  {productosFiltrados.length.toLocaleString()} productos
                  {busqueda && ` (filtrado de ${data.total_productos.toLocaleString()})`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight={700} fontSize="0.95rem" color="#333">TOTAL VALORIZADO</Typography>
                  <Typography variant="body1" fontWeight={800} fontSize="1.1rem" color="#1565c0">{fmt(totalValorizadoFiltrado)}</Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default ConsultarProductoPage;
