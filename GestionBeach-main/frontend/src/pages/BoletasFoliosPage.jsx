import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Card, CardContent, Typography, Box, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, CircularProgress, Alert, InputAdornment, Chip,
  Button, Divider
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  CompareArrows as CompareIcon,
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../api/api';

const MESES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
];

const fmt = (val) => {
  if (!val && val !== 0) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
};

const fmtFolio = (val) => val ? String(val) : '-';

// Tabla de una sucursal
const SucursalCard = ({ sucursal, onRetry, isRetrying }) => {
  const { boletas, resumen, nombre, error } = sucursal;
  const totalSistema = resumen?.total_sistema || 0;
  const [selectedRow, setSelectedRow] = useState(null);

  return (
    <Card sx={{
      height: '100%',
      borderRadius: 3,
      boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 6px 28px rgba(0,0,0,0.13)' },
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.5,
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
          {nombre}
        </Typography>
        {resumen?.dias_con_venta > 0 && (
          <Chip
            label={`${resumen.dias_con_venta} días`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.75rem', height: 24 }}
          />
        )}
      </Box>

      <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: 0 } }}>
        {error ? (
          <Box sx={{ m: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 2 }}>
            <Alert severity="warning" sx={{ fontSize: '0.8rem', width: '100%' }}>{error}</Alert>
            <Button
              variant="contained"
              size="small"
              startIcon={isRetrying ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={() => onRetry(sucursal.sucursal_id)}
              disabled={isRetrying}
              sx={{
                borderRadius: 2, textTransform: 'none',
                bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' },
                fontWeight: 600
              }}
            >
              {isRetrying ? 'Reintentando...' : 'Reintentar'}
            </Button>
          </Box>
        ) : (
          <>
            {/* Tabla */}
            <TableContainer sx={{ flex: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Día', 'Desde', 'Hasta', 'Total'].map((h, i) => (
                      <TableCell
                        key={h}
                        align={i === 3 ? 'right' : 'left'}
                        sx={{
                          fontWeight: 700, py: 1, px: 1.5, fontSize: '0.82rem',
                          bgcolor: '#fafafa', borderBottom: '2px solid #FF9800',
                          color: '#444'
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {boletas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.85rem' }}>
                        Sin datos para este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    boletas.map((b, i) => {
                      const prevSameDay = i > 0 && boletas[i - 1].dia === b.dia;
                      const isSelected = selectedRow === i;
                      return (
                        <TableRow
                          key={i}
                          onClick={() => setSelectedRow(isSelected ? null : i)}
                          sx={{
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                            '&:nth-of-type(odd)': { bgcolor: 'rgba(255,152,0,0.03)' },
                            ...(prevSameDay && {
                              borderTop: '1px dashed #FF9800',
                              bgcolor: 'rgba(255,152,0,0.06) !important'
                            }),
                            ...(isSelected && {
                              bgcolor: 'rgba(33,150,243,0.12) !important',
                              '& td': { fontWeight: 700 }
                            }),
                            '&:hover': {
                              bgcolor: isSelected ? 'rgba(33,150,243,0.15) !important' : 'rgba(255,152,0,0.08) !important'
                            }
                          }}
                        >
                          <TableCell sx={{ py: 0.6, px: 1.5, fontSize: '0.85rem', fontWeight: prevSameDay ? 400 : 600, color: '#333' }}>
                            {prevSameDay ? '' : b.dia}
                          </TableCell>
                          <TableCell sx={{ py: 0.6, px: 1.5, fontSize: '0.83rem', fontFamily: 'monospace', color: '#888' }}>
                            {fmtFolio(b.folio_desde)}
                          </TableCell>
                          <TableCell sx={{ py: 0.6, px: 1.5, fontSize: '0.83rem', fontFamily: 'monospace', color: '#888' }}>
                            {fmtFolio(b.folio_hasta)}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.6, px: 1.5, fontSize: '0.83rem', color: '#111', fontWeight: 600 }}>
                            {fmt(b.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer total */}
            <Box sx={{
              px: 2.5, py: 1.5,
              borderTop: '2px solid #eee', bgcolor: '#fafafa',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <Typography variant="body1" fontWeight={700} fontSize="0.95rem" color="#333">TOTAL SISTEMA</Typography>
              <Typography variant="body1" fontWeight={800} fontSize="1rem">{fmt(totalSistema)}</Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const BoletasFoliosPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [siiGeneral, setSiiGeneral] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const contentRef = useRef(null);

  const years = [];
  for (let y = now.getFullYear(); y >= 2020; y--) years.push(y);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/boletas-folios?year=${year}&month=${month}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRetry = async (sucursalId) => {
    setRetryingId(sucursalId);
    try {
      const response = await api.get(`/boletas-folios/${sucursalId}?year=${year}&month=${month}`);
      const nuevaSucursal = response.data;
      setData(prev => ({
        ...prev,
        sucursales: prev.sucursales.map(s =>
          s.sucursal_id === sucursalId ? nuevaSucursal : s
        )
      }));
    } catch (err) {
      console.error('Error reintentando sucursal:', err);
    } finally {
      setRetryingId(null);
    }
  };

  const sucursalesActivas = data?.sucursales?.filter(s => !s.error && s.boletas.length > 0) || [];
  const totalSistema = sucursalesActivas.reduce((sum, s) => sum + (s.resumen?.total_sistema || 0), 0);
  const totalBoletas = sucursalesActivas.reduce((sum, s) => sum + (s.resumen?.cantidad_boletas || 0), 0);
  const siiNum = parseInt(siiGeneral) || 0;
  const hasSii = siiGeneral !== '';
  const diferencia = totalSistema - siiNum;
  const mesLabel = MESES.find(m => m.value === month)?.label || '';

  // ====== EXPORTAR DETALLE A EXCEL ======
  const pesoFmt = '"$"#,##0';

  // Aplica formato peso chileno a columnas específicas de una hoja
  const applyPesoFormat = (ws, cols) => {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (const c of cols) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws[addr] && typeof ws[addr].v === 'number') {
          ws[addr].z = pesoFmt;
        }
      }
    }
  };

  const exportToExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Hoja resumen general
    const resumenData = [
      ['BOLETAS Y FOLIOS - RESUMEN GENERAL'],
      [`Período: ${mesLabel} ${year}`],
      [''],
      ['Sucursal', 'Tipo', 'Boletas', 'Días Venta', 'Folio Inicio', 'Folio Final', 'Total Sistema'],
    ];
    sucursalesActivas.forEach(s => {
      resumenData.push([
        s.nombre,
        s.tipo_sucursal,
        s.resumen.cantidad_boletas,
        s.resumen.dias_con_venta,
        s.resumen.folio_min,
        s.resumen.folio_max,
        s.resumen.total_sistema
      ]);
    });
    resumenData.push(['']);
    resumenData.push(['TOTAL GENERAL', '', totalBoletas, '', '', '', totalSistema]);
    if (hasSii) {
      resumenData.push(['TOTAL SII', '', '', '', '', '', siiNum]);
      resumenData.push(['DIFERENCIA', '', '', '', '', '', diferencia]);
    }

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [
      { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }
    ];
    applyPesoFormat(wsResumen, [6]); // Columna G = Total Sistema
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja DETALLE con todas las sucursales juntas
    const detalleData = [
      ['DETALLE DE BOLETAS Y FOLIOS POR SUCURSAL'],
      [`Período: ${mesLabel} ${year}`],
      [''],
    ];

    sucursalesActivas.forEach((s, idx) => {
      if (idx > 0) detalleData.push(['']); // Separador entre sucursales
      detalleData.push([s.nombre, '', '', `(${s.tipo_sucursal})`]);
      detalleData.push(['Día', 'Folio Desde', 'Folio Hasta', 'Total']);
      s.boletas.forEach(b => {
        detalleData.push([b.dia, b.folio_desde, b.folio_hasta, b.total]);
      });
      detalleData.push(['', '', 'TOTAL SISTEMA', s.resumen.total_sistema]);
    });

    detalleData.push(['']);
    detalleData.push(['', '', 'TOTAL GENERAL', totalSistema]);
    if (hasSii) {
      detalleData.push(['', '', 'TOTAL SII', siiNum]);
      detalleData.push(['', '', 'DIFERENCIA', diferencia]);
    }

    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    wsDetalle['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
    applyPesoFormat(wsDetalle, [3]); // Columna D = Total (no toca folios en B y C)
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

    // Una hoja individual por sucursal
    sucursalesActivas.forEach(s => {
      const sheetData = [
        [s.nombre],
        [`${mesLabel} ${year}`],
        [''],
        ['Día', 'Folio Desde', 'Folio Hasta', 'Total'],
      ];
      s.boletas.forEach(b => {
        sheetData.push([b.dia, b.folio_desde, b.folio_hasta, b.total]);
      });
      sheetData.push(['']);
      sheetData.push(['TOTAL SISTEMA', '', '', s.resumen.total_sistema]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      applyPesoFormat(ws, [3]); // Columna D = Total (folios en B y C sin formato)
      const sheetName = s.nombre.substring(0, 31).replace(/[\\/*?[\]]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `Boletas_Detalle_${mesLabel}_${year}.xlsx`);
  };

  // ====== EXPORTAR A PDF ======
  const exportToPdf = async () => {
    if (!contentRef.current) return;
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 290;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgHeight > 400 ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`Boletas_Folios_${mesLabel}_${year}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    }
  };

  return (
    <Container maxWidth={false} sx={{ mt: 1, mb: 4, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#333' }}>
            Boletas y Folios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control de folios electrónicos por sucursal
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select size="small" label="Mes" value={month}
            onChange={(e) => setMonth(e.target.value)}
            sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {MESES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Año" value={year}
            onChange={(e) => setYear(e.target.value)}
            sx={{ minWidth: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button
            variant="outlined" size="small" startIcon={<ExcelIcon />}
            onClick={exportToExcel} disabled={!data || loading}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#4caf50', color: '#4caf50',
              '&:hover': { borderColor: '#388e3c', bgcolor: 'rgba(76,175,80,0.04)' } }}
          >
            Excel
          </Button>
          <Button
            variant="outlined" size="small" startIcon={<PdfIcon />}
            onClick={exportToPdf} disabled={!data || loading}
            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#f44336', color: '#f44336',
              '&:hover': { borderColor: '#d32f2f', bgcolor: 'rgba(244,67,54,0.04)' } }}
          >
            PDF
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flexDirection: 'column', gap: 2 }}>
          <CircularProgress sx={{ color: '#FF9800' }} />
          <Typography color="text.secondary">Consultando sucursales...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && data && (
        <div ref={contentRef}>
          {/* KPIs + SII general */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', height: '100%' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,152,0,0.1)', display: 'flex' }}>
                      <ReceiptIcon sx={{ color: '#FF9800', fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Sistema</Typography>
                      <Typography variant="h5" fontWeight={800}>{fmt(totalSistema)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', height: '100%' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(33,150,243,0.1)', display: 'flex' }}>
                      <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 26 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">SII (ingreso manual)</Typography>
                      <TextField
                        fullWidth size="small" type="number"
                        value={siiGeneral}
                        onChange={(e) => setSiiGeneral(e.target.value)}
                        placeholder="Ingrese monto SII"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          sx: { fontSize: '1rem', fontWeight: 700, height: 36, borderRadius: 1.5 }
                        }}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', height: '100%' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      p: 1, borderRadius: 1.5, display: 'flex',
                      bgcolor: hasSii
                        ? diferencia === 0 ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'
                        : 'rgba(0,0,0,0.04)'
                    }}>
                      <CompareIcon sx={{
                        fontSize: 26,
                        color: hasSii ? (diferencia === 0 ? '#4caf50' : '#f44336') : '#999'
                      }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Diferencia</Typography>
                      <Typography variant="h5" fontWeight={800}
                        color={hasSii ? (diferencia === 0 ? 'success.main' : 'error.main') : 'text.secondary'}
                      >
                        {hasSii ? fmt(diferencia) : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', height: '100%' }}>
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip label={`${sucursalesActivas.length} sucursales`} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }} />
                    <Chip label={`${totalBoletas.toLocaleString()} boletas`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600 }} />
                    <Chip label={`${mesLabel} ${year}`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Grid de sucursales - MÁS GRANDES */}
          <Grid container spacing={3}>
            {data.sucursales.map((sucursal) => (
              <Grid item xs={12} md={6} key={sucursal.sucursal_id}>
                <SucursalCard
                  sucursal={sucursal}
                  onRetry={handleRetry}
                  isRetrying={retryingId === sucursal.sucursal_id}
                />
              </Grid>
            ))}
          </Grid>
        </div>
      )}
    </Container>
  );
};

export default BoletasFoliosPage;
