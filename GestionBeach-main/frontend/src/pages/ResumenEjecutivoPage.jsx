import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Card, CardContent, Typography, Box, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, CircularProgress, Alert, LinearProgress, Divider, Button
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  Inventory as InventoryIcon,
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon
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

// KPI Card grande
const BigKpiCard = ({ icon, label, value, subtitle, color = '#FF9800', bgGradient }) => (
  <Card sx={{
    borderRadius: 3,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    height: '100%'
  }}>
    <Box sx={{
      height: 4,
      background: bgGradient || `linear-gradient(90deg, ${color}, ${color}88)`
    }} />
    <CardContent sx={{ py: 2.5, px: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem', letterSpacing: 1.5 }}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1, mt: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{
          p: 1.5, borderRadius: 2,
          bgcolor: `${color}15`,
          display: 'flex'
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 28, color } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ResumenEjecutivoPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dia, setDia] = useState(0); // 0 = todos
  const contentRef = useRef(null);

  const years = [];
  for (let y = now.getFullYear(); y >= 2020; y--) years.push(y);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/boletas-folios?year=${year}&month=${month}`);
      setData(response.data);
      setDia(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Obtener días disponibles del dataset
  const diasDisponibles = [];
  if (data?.sucursales) {
    const diasSet = new Set();
    data.sucursales.forEach(s => {
      if (s.boletas) s.boletas.forEach(b => diasSet.add(b.dia));
    });
    [...diasSet].sort((a, b) => a - b).forEach(d => diasDisponibles.push(d));
  }

  // Calcular resúmenes (con filtro de día)
  const sucursalesConDatos = data?.sucursales?.filter(s => !s.error && s.boletas.length > 0) || [];
  const sucursalesConError = data?.sucursales?.filter(s => s.error) || [];
  const sucursalesSinDatos = data?.sucursales?.filter(s => !s.error && s.boletas.length === 0) || [];

  // Si hay filtro de día, recalcular totales por sucursal
  const sucursalesActivas = sucursalesConDatos.map(s => {
    if (dia === 0) return s;
    const boletasDia = s.boletas.filter(b => b.dia === dia);
    const totalDia = boletasDia.reduce((sum, b) => sum + (b.total || 0), 0);
    const cantidadDia = boletasDia.reduce((sum, b) => sum + (b.cantidad || 0), 0);
    return {
      ...s,
      resumen: {
        ...s.resumen,
        total_sistema: totalDia,
        cantidad_boletas: cantidadDia,
        dias_con_venta: boletasDia.length > 0 ? 1 : 0,
        folio_min: boletasDia.length > 0 ? Math.min(...boletasDia.map(b => b.folio_desde)) : 0,
        folio_max: boletasDia.length > 0 ? Math.max(...boletasDia.map(b => b.folio_hasta)) : 0
      }
    };
  }).filter(s => dia === 0 || s.resumen.total_sistema > 0);

  const totalGeneral = sucursalesActivas.reduce((sum, s) => sum + (s.resumen?.total_sistema || 0), 0);
  const totalBoletas = sucursalesActivas.reduce((sum, s) => sum + (s.resumen?.cantidad_boletas || 0), 0);
  const totalDias = sucursalesActivas.reduce((sum, s) => sum + (s.resumen?.dias_con_venta || 0), 0);
  const promedioDiario = sucursalesActivas.length > 0 && totalDias > 0
    ? totalGeneral / totalDias * sucursalesActivas.length
    : 0;

  const sorted = [...sucursalesActivas].sort((a, b) => (b.resumen?.total_sistema || 0) - (a.resumen?.total_sistema || 0));
  const topSucursal = sorted[0];
  const maxTotal = topSucursal?.resumen?.total_sistema || 1;

  const mesLabel = MESES.find(m => m.value === month)?.label || '';

  const exportToExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      ['RESUMEN EJECUTIVO - BOLETAS Y FOLIOS'],
      [`Período: ${mesLabel} ${year}`],
      [''],
      ['Sucursal', 'Tipo', 'Boletas', 'Días Venta', 'Folio Inicio', 'Folio Final', 'Total', '% Participación'],
    ];
    sorted.forEach(s => {
      const pct = totalGeneral > 0 ? (s.resumen.total_sistema / totalGeneral * 100).toFixed(1) + '%' : '0%';
      rows.push([s.nombre, s.tipo_sucursal, s.resumen.cantidad_boletas, s.resumen.dias_con_venta, s.resumen.folio_min, s.resumen.folio_max, s.resumen.total_sistema, pct]);
    });
    rows.push(['']);
    rows.push(['TOTAL GENERAL', '', totalBoletas, '', '', '', totalGeneral, '100%']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Ejecutivo');
    XLSX.writeFile(wb, `Resumen_Ejecutivo_${mesLabel}_${year}.xlsx`);
  };

  const exportToPdf = async () => {
    if (!contentRef.current) return;
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 290;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`Resumen_Ejecutivo_${mesLabel}_${year}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 1, mb: 4 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 3, flexWrap: 'wrap', gap: 2
      }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#1a1a2e' }}>
            Resumen Ejecutivo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vista consolidada de boletas y folios
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
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
          <TextField
            select size="small" label="Día" value={dia}
            onChange={(e) => setDia(parseInt(e.target.value))}
            sx={{ minWidth: 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <MenuItem value={0}>Todos</MenuItem>
            {diasDisponibles.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, flexDirection: 'column', gap: 2 }}>
          <CircularProgress sx={{ color: '#FF9800' }} />
          <Typography color="text.secondary">Generando resumen ejecutivo...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && data && (
        <div ref={contentRef}>
          {/* KPIs principales */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <BigKpiCard
                icon={<TrendingUpIcon />}
                label="Total Ventas Boletas"
                value={fmt(totalGeneral)}
                subtitle={dia > 0 ? `Día ${dia} de ${mesLabel} ${year}` : `${mesLabel} ${year}`}
                color="#FF9800"
                bgGradient="linear-gradient(90deg, #FF9800, #FF5722)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <BigKpiCard
                icon={<ReceiptIcon />}
                label="Boletas Emitidas"
                value={totalBoletas.toLocaleString('es-CL')}
                subtitle={`${sucursalesActivas.length} sucursales activas`}
                color="#2196f3"
                bgGradient="linear-gradient(90deg, #2196f3, #1565c0)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <BigKpiCard
                icon={<StoreIcon />}
                label="Sucursales"
                value={`${sucursalesActivas.length} / ${data.sucursales.length}`}
                subtitle={sucursalesConError.length > 0 ? `${sucursalesConError.length} con error` : 'Todas conectadas'}
                color={sucursalesConError.length > 0 ? '#f44336' : '#4caf50'}
                bgGradient={sucursalesConError.length > 0
                  ? 'linear-gradient(90deg, #f44336, #d32f2f)'
                  : 'linear-gradient(90deg, #4caf50, #2e7d32)'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <BigKpiCard
                icon={<CalendarIcon />}
                label="Promedio Diario"
                value={fmt(promedioDiario)}
                subtitle="Por sucursal activa"
                color="#9c27b0"
                bgGradient="linear-gradient(90deg, #9c27b0, #7b1fa2)"
              />
            </Grid>
          </Grid>

          {/* Tabla resumen por sucursal */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', mb: 3 }}>
            <Box sx={{
              px: 3, py: 2,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssessmentIcon sx={{ color: '#FF9800' }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                  Resumen por Sucursal
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {dia > 0 ? `Día ${dia} de ${mesLabel} ${year}` : `${mesLabel} ${year}`} - Consolidado de ventas por boletas electrónicas
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Sucursal</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Tipo</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Boletas</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Días Venta</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Folio Inicio</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5 }}>Folio Final</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5, minWidth: 140 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#555', py: 1.5, minWidth: 160 }}>Participación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map((s, i) => {
                    const pct = totalGeneral > 0 ? (s.resumen.total_sistema / totalGeneral * 100) : 0;
                    const barPct = maxTotal > 0 ? (s.resumen.total_sistema / maxTotal * 100) : 0;
                    return (
                      <TableRow key={s.sucursal_id} sx={{
                        '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.015)' },
                        '&:hover': { bgcolor: 'rgba(255,152,0,0.04)' }
                      }}>
                        <TableCell sx={{ py: 1.2, fontSize: '0.82rem', fontWeight: i === 0 ? 700 : 500 }}>
                          {s.nombre}
                        </TableCell>
                        <TableCell sx={{ py: 1.2, fontSize: '0.75rem', color: 'text.secondary' }}>
                          {s.tipo_sucursal}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.2, fontSize: '0.82rem' }}>
                          {s.resumen.cantidad_boletas.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.2, fontSize: '0.82rem' }}>
                          {s.resumen.dias_con_venta}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.2, fontSize: '0.78rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                          {s.resumen.folio_min || '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.2, fontSize: '0.78rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                          {s.resumen.folio_max || '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.2, fontSize: '0.85rem', fontWeight: 700 }}>
                          {fmt(s.resumen.total_sistema)}
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={barPct}
                              sx={{
                                flex: 1, height: 8, borderRadius: 4,
                                bgcolor: '#f0f0f0',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 4,
                                  background: `linear-gradient(90deg, #FF9800, #F57C00)`
                                }
                              }}
                            />
                            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right', color: '#555' }}>
                              {pct.toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Fila de totales */}
                  <TableRow sx={{ bgcolor: '#f5f5f5', borderTop: '2px solid #FF9800' }}>
                    <TableCell sx={{ py: 1.5, fontWeight: 800, fontSize: '0.85rem' }}>TOTAL GENERAL</TableCell>
                    <TableCell />
                    <TableCell align="right" sx={{ py: 1.5, fontWeight: 800, fontSize: '0.85rem' }}>
                      {totalBoletas.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, fontWeight: 800, fontSize: '0.85rem' }}>
                      -
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell align="right" sx={{ py: 1.5, fontWeight: 800, fontSize: '0.9rem', color: '#FF9800' }}>
                      {fmt(totalGeneral)}
                    </TableCell>
                    <TableCell sx={{ py: 1.5, fontWeight: 800, fontSize: '0.85rem', textAlign: 'right', color: '#555' }}>
                      100%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Sucursales sin datos o con error */}
          {(sucursalesSinDatos.length > 0 || sucursalesConError.length > 0) && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 2, px: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Sucursales sin actividad en {mesLabel} {year}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {sucursalesSinDatos.map(s => (
                    <Box key={s.sucursal_id} sx={{
                      px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#f5f5f5',
                      fontSize: '0.78rem', color: '#888'
                    }}>
                      {s.nombre}
                    </Box>
                  ))}
                  {sucursalesConError.map(s => (
                    <Box key={s.sucursal_id} sx={{
                      px: 1.5, py: 0.5, borderRadius: 1, bgcolor: '#ffeaea',
                      fontSize: '0.78rem', color: '#c62828'
                    }}>
                      {s.nombre} (error)
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Container>
  );
};

export default ResumenEjecutivoPage;
