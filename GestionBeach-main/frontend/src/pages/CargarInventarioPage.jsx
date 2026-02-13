import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress, Tabs, Tab,
  Chip, InputAdornment, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import * as XLSX from 'xlsx';
import api from '../api/api';

const formatNum = (v) => v == null || isNaN(v) ? '0' : Math.round(Number(v)).toLocaleString('es-CL');

const CargarInventarioPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [stockBD, setStockBD] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [tab, setTab] = useState(0);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    api.get('/cargar-inventario/sucursales').then(r => setSucursales(r.data)).catch(() => {});
  }, []);

  // Cargar stock del sistema
  const cargarStock = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true);
    setResultado(null);
    try {
      const { data } = await api.get('/cargar-inventario/stock', { params: { sucursalId }, timeout: 120000 });
      setStockBD(data.productos);
    } catch (err) {
      console.error(err);
      setStockBD([]);
    }
    setLoading(false);
  }, [sucursalId]);

  // Cargar Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        setExcelData(jsonData);
        setResultado(null);
      } catch (err) {
        console.error('Error leyendo Excel:', err);
        setExcelData([]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Comparar
  const comparar = useCallback(async () => {
    if (!sucursalId || excelData.length === 0) return;
    setLoadingCompare(true);
    try {
      const { data } = await api.post('/cargar-inventario/comparar', {
        sucursalId: parseInt(sucursalId),
        excelData
      }, { timeout: 120000 });
      setResultado(data);
      setTab(0);
    } catch (err) {
      console.error(err);
    }
    setLoadingCompare(false);
  }, [sucursalId, excelData]);

  // Filtrado
  const filtrar = (arr) => {
    if (!filtro) return arr;
    const f = filtro.toLowerCase();
    return arr.filter(r =>
      String(r.Codigo || '').toLowerCase().includes(f) ||
      String(r.Descripcion || '').toLowerCase().includes(f)
    );
  };

  // Export Excel
  const exportarExcel = useCallback((datos, nombre) => {
    if (!datos || datos.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${nombre}.xlsx`);
  }, []);

  const thSx = { fontWeight: 'bold', bgcolor: '#1565c0', color: '#fff', py: 1 };
  const thGreen = { fontWeight: 'bold', bgcolor: '#2e7d32', color: '#fff', py: 1 };
  const thOrange = { fontWeight: 'bold', bgcolor: '#e65100', color: '#fff', py: 1 };
  const thRed = { fontWeight: 'bold', bgcolor: '#c62828', color: '#fff', py: 1 };

  return (
    <Box sx={{ p: 2 }}>
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select label="Sucursal" value={sucursalId} onChange={e => { setSucursalId(e.target.value); setResultado(null); setStockBD([]); }}
            size="small" sx={{ minWidth: 250 }}>
            {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </TextField>

          <Button variant="contained" onClick={cargarStock} disabled={loading || !sucursalId}
            startIcon={loading ? <CircularProgress size={18} /> : <InventoryIcon />}>
            Cargar Stock Sistema
          </Button>

          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            Cargar Excel
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          </Button>

          {excelFileName && <Chip label={excelFileName} onDelete={() => { setExcelData([]); setExcelFileName(''); setResultado(null); }} />}

          <Button variant="contained" color="success" onClick={comparar}
            disabled={loadingCompare || !sucursalId || excelData.length === 0}
            startIcon={loadingCompare ? <CircularProgress size={18} /> : <CompareArrowsIcon />}>
            Comparar
          </Button>
        </Box>

        {/* Info */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
          {stockBD.length > 0 && <Chip label={`Stock BD: ${stockBD.length} productos`} color="primary" size="small" />}
          {excelData.length > 0 && <Chip label={`Excel: ${excelData.length} filas`} color="secondary" size="small" />}
        </Box>
      </Paper>

      {/* Resultado de comparación */}
      {resultado && (
        <>
          {/* KPIs */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {[
              { label: 'Productos BD', value: resultado.resumen.totalBD, color: '#1565c0' },
              { label: 'Filas Excel', value: resultado.resumen.totalExcel, color: '#7b1fa2' },
              { label: 'Coincidencias', value: resultado.resumen.coincidencias, color: '#2e7d32' },
              { label: 'Con Diferencia', value: resultado.resumen.conDiferencia, color: '#e65100' },
              { label: 'No en Excel', value: resultado.resumen.noEnExcel, color: '#c62828' },
              { label: 'Solo en Excel', value: resultado.resumen.soloEnExcel, color: '#4a148c' },
            ].map(kpi => (
              <Paper key={kpi.label} sx={{ p: 1.5, minWidth: 140, textAlign: 'center', borderTop: `3px solid ${kpi.color}` }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: kpi.color }}>{formatNum(kpi.value)}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </Paper>
            ))}
          </Box>

          {/* Tabs */}
          <Paper sx={{ mb: 2, borderRadius: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
              <Tab label={`Comparados (${resultado.comparados.length})`} />
              <Tab label={`Con Diferencia (${resultado.resumen.conDiferencia})`} />
              <Tab label={`No en Excel (${resultado.noEncontrados.length})`} />
              <Tab label={`Solo en Excel (${resultado.soloEnExcel.length})`} />
            </Tabs>
          </Paper>

          {/* Filtro + Export */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField size="small" placeholder="Filtrar por codigo o descripcion..."
              value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ width: 400 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />}
              onClick={() => {
                const datos = tab === 0 ? resultado.comparados : tab === 1 ? resultado.comparados.filter(c => c.Diferencia !== 0) : tab === 2 ? resultado.noEncontrados : resultado.soloEnExcel;
                const nombres = ['comparados', 'con_diferencia', 'no_en_excel', 'solo_en_excel'];
                exportarExcel(datos, `inventario_${nombres[tab]}`);
              }}>
              Excel
            </Button>
          </Box>

          {/* Tab 0: Todos comparados */}
          {tab === 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thGreen}>Codigo</TableCell>
                    <TableCell sx={thGreen}>Descripcion</TableCell>
                    <TableCell sx={thGreen} align="right">Stock Sistema</TableCell>
                    <TableCell sx={thGreen} align="right">Stock Fisico</TableCell>
                    <TableCell sx={thGreen} align="right">Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrar(resultado.comparados).map((r, i) => (
                    <TableRow key={i} sx={{ bgcolor: r.Diferencia !== 0 ? (r.Diferencia > 0 ? '#e8f5e9' : '#ffebee') : 'inherit' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{r.Codigo}</TableCell>
                      <TableCell>{r.Descripcion}</TableCell>
                      <TableCell align="right">{formatNum(r.StockSistema)}</TableCell>
                      <TableCell align="right">{formatNum(r.StockFisico)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: r.Diferencia > 0 ? '#2e7d32' : r.Diferencia < 0 ? '#c62828' : 'inherit' }}>
                        {r.Diferencia > 0 ? '+' : ''}{formatNum(r.Diferencia)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtrar(resultado.comparados).length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 1: Solo con diferencia */}
          {tab === 1 && (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thOrange}>Codigo</TableCell>
                    <TableCell sx={thOrange}>Descripcion</TableCell>
                    <TableCell sx={thOrange} align="right">Stock Sistema</TableCell>
                    <TableCell sx={thOrange} align="right">Stock Fisico</TableCell>
                    <TableCell sx={thOrange} align="right">Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrar(resultado.comparados.filter(c => c.Diferencia !== 0)).map((r, i) => (
                    <TableRow key={i} sx={{ bgcolor: r.Diferencia > 0 ? '#e8f5e9' : '#ffebee' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{r.Codigo}</TableCell>
                      <TableCell>{r.Descripcion}</TableCell>
                      <TableCell align="right">{formatNum(r.StockSistema)}</TableCell>
                      <TableCell align="right">{formatNum(r.StockFisico)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: r.Diferencia > 0 ? '#2e7d32' : '#c62828' }}>
                        {r.Diferencia > 0 ? '+' : ''}{formatNum(r.Diferencia)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 2: No encontrados en Excel */}
          {tab === 2 && (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thRed}>Codigo</TableCell>
                    <TableCell sx={thRed}>Descripcion</TableCell>
                    <TableCell sx={thRed} align="right">Stock Sistema</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrar(resultado.noEncontrados).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{r.Codigo}</TableCell>
                      <TableCell>{r.Descripcion}</TableCell>
                      <TableCell align="right">{formatNum(r.StockSistema)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 3: Solo en Excel */}
          {tab === 3 && (
            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...thSx, bgcolor: '#4a148c' }}>Codigo</TableCell>
                    <TableCell sx={{ ...thSx, bgcolor: '#4a148c' }} align="right">Stock Fisico</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrar(resultado.soloEnExcel).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{r.Codigo}</TableCell>
                      <TableCell align="right">{formatNum(r.StockFisico)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Si no hay resultado, mostrar stock BD */}
      {!resultado && stockBD.length > 0 && (
        <Paper sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, fontWeight: 'bold' }}>
            Stock del Sistema ({stockBD.length} productos)
          </Typography>
          <TextField size="small" placeholder="Filtrar..." value={filtro} onChange={e => setFiltro(e.target.value)}
            sx={{ mx: 2, mb: 1, width: 300 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Codigo</TableCell>
                  <TableCell sx={thSx}>Descripcion</TableCell>
                  <TableCell sx={thSx} align="right">Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrar(stockBD).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{r.Codigo}</TableCell>
                    <TableCell>{r.Descripcion}</TableCell>
                    <TableCell align="right">{formatNum(r.Stock)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default CargarInventarioPage;
