import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, CardHeader, TextField, Button,
  Typography, Paper, Divider, Alert, useTheme, Fade,
  Avatar, IconButton, Tooltip as MuiTooltip, Chip, Dialog,
  DialogContent, DialogTitle, Menu, MenuItem, ButtonGroup,
  useMediaQuery, Tabs, Tab, LinearProgress, Skeleton, Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList,
  AreaChart, Area,
} from 'recharts';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon  from '@mui/icons-material/ShoppingCart';
import StorefrontIcon    from '@mui/icons-material/Storefront';
import HomeWorkIcon      from '@mui/icons-material/HomeWork';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RefreshIcon       from '@mui/icons-material/Refresh';
import FullscreenIcon    from '@mui/icons-material/Fullscreen';
import CloseIcon         from '@mui/icons-material/Close';
import DownloadIcon      from '@mui/icons-material/Download';
import PrintIcon         from '@mui/icons-material/Print';
import BarChartIcon      from '@mui/icons-material/BarChart';
import { SummarizeOutlined } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../api/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import AutoReport from '../components/AutoReport';

// ── Paleta de gradientes por tipo ─────────────────────────────────────────────
const GRADIENTS = {
  primary:   ['#1565c0', '#1976d2'],
  info:      ['#0277bd', '#0288d1'],
  success:   ['#2e7d32', '#388e3c'],
  secondary: ['#6a1b9a', '#7b1fa2'],
};

const fmtCLP = (v) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v || 0);

// Formato compacto para etiquetas en gráficos: $5.2M, $820K, etc.
const fmtCompact = (v) => {
  if (!v && v !== 0) return '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

// ── KPI Card con gradiente ─────────────────────────────────────────────────────
const KpiCard = ({ title, value, color, secondaryValue, secondaryLabel, loading }) => {
  const theme = useTheme();
  const icons = { Supermercados: ShoppingCartIcon, Ferreterías: HomeWorkIcon, Multitiendas: StorefrontIcon, Total: AccountBalanceIcon };
  const Icon = icons[title] || TrendingUpIcon;
  const [g0, g1] = GRADIENTS[color] || GRADIENTS.primary;

  if (loading) {
    return (
      <Paper elevation={0} sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3 }}>
        <Skeleton variant="rectangular" width={44} height={44} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton width="50%" height={16} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={36} sx={{ mb: 1.5 }} />
        <Skeleton width="60%" height={14} />
      </Paper>
    );
  }

  return (
    <Fade in timeout={500}>
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          transition: 'transform 0.25s, box-shadow 0.25s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 28px ${g0}30` },
        }}
      >
        {/* Franja lateral de color */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: 5, height: '100%', background: `linear-gradient(180deg, ${g0}, ${g1})` }} />

        <Box sx={{ p: 3, pl: 3.5 }}>
          {/* Icono + título */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar
              sx={{
                width: 44, height: 44, borderRadius: 2,
                background: `linear-gradient(135deg, ${g0}, ${g1})`,
              }}
            >
              <Icon sx={{ fontSize: 22, color: '#fff' }} />
            </Avatar>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', letterSpacing: 1 }}>
              {title}
            </Typography>
          </Box>

          {/* Valor principal */}
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1, mb: 0.5, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
            {value}
          </Typography>

          {/* Margen */}
          {secondaryValue && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <TrendingUpIcon sx={{ fontSize: 16, color: g0 }} />
              <Typography variant="caption" color="text.secondary">{secondaryLabel}:</Typography>
              <Chip label={secondaryValue} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: `${g0}18`, color: g0 }} />
            </Box>
          )}
        </Box>
      </Paper>
    </Fade>
  );
};

// ── Skeleton para gráfico ──────────────────────────────────────────────────────
const ChartSkeleton = ({ height = 380 }) => (
  <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Skeleton width="35%" height={24} />
    </Box>
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" width="100%" height={height} sx={{ borderRadius: 2 }} />
    </Box>
  </Paper>
);

// ── Tooltip personalizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, formatter }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={4} sx={{ p: 2, borderRadius: 2, minWidth: 170, border: `1px solid ${theme.palette.divider}` }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{label}</Typography>
      {payload.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 0.4 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, mr: 1, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>{entry.name}:</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {formatter ? formatter(entry.value) : entry.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

// ── Card de gráfico con fullscreen ─────────────────────────────────────────────
const ChartCard = ({ title, subtitle, height = 380, children, accentColor }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const exportPDF = () => {
    if (!ref.current) return;
    html2canvas(ref.current, { scale: 2, useCORS: true }).then((canvas) => {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.setFontSize(14); pdf.text(title, 10, 12);
      pdf.addImage(img, 'PNG', 10, 18, w - 20, h - 10);
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    });
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' },
        }}
      >
        {/* Línea superior de acento */}
        {accentColor && <Box sx={{ height: 3, background: accentColor }} />}

        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <MuiTooltip title="Exportar PDF">
              <IconButton size="small" onClick={exportPDF} sx={{ '&:hover': { color: 'primary.main' } }}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Pantalla completa">
              <IconButton size="small" onClick={() => setOpen(true)} sx={{ '&:hover': { color: 'primary.main' } }}>
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        <Box ref={ref} sx={{ px: 1, pt: 1, pb: 2, height }}>
          {children}
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '85vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', py: 2 }}>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          <IconButton onClick={() => setOpen(false)} size="small" sx={{ bgcolor: 'grey.100' }}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, height: 'calc(100% - 64px)' }}>
          <Box sx={{ height: '100%', width: '100%' }}>{children}</Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Sección con barra de color ─────────────────────────────────────────────────
const Section = ({ title, subtitle, color = 'primary.main', children, loading, skeletonCount = 1, skeletonHeight = 380 }) => (
  <Box sx={{ mb: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
      <Box sx={{ width: 4, height: 44, borderRadius: 1, bgcolor: color }} />
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
    {loading ? (
      <Grid container spacing={3}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Grid size={{ xs: 12, md: 12 / skeletonCount }} key={i}>
            <ChartSkeleton height={skeletonHeight} />
          </Grid>
        ))}
      </Grid>
    ) : children}
  </Box>
);

// ── Dashboard principal ────────────────────────────────────────────────────────
const DashboardPage = () => {
  const dashboardRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();

  const [startDate, setStartDate]       = useState(new Date(Date.now() - 7 * 86400000));
  const [endDate, setEndDate]           = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading]           = useState(false);
  const [data, setData]                 = useState(null);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState(0);
  const [loadTime, setLoadTime]         = useState(null);

  const COLORS = [theme.palette.primary.main, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main, '#8b5cf6', '#ec4899'];

  // ── Cargar datos ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sd = startDate, ed = endDate) => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const { data: res } = await api.post('/dashboard', {
        start_date: sd.toISOString().split('T')[0],
        end_date:   ed.toISOString().split('T')[0],
      });
      setData(res);
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      setLoadTime(secs);
      enqueueSnackbar(`Datos cargados en ${secs}s`, { variant: 'success' });
    } catch {
      setError('Error al cargar los datos. Por favor intenta de nuevo.');
      enqueueSnackbar('Error al cargar datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, enqueueSnackbar]);

  useEffect(() => { loadData(); }, []);

  const handlePeriodChange = (period) => {
    const now = new Date();
    const offsets = { week: 7, month: 30, quarter: 90, year: 365 };
    const sd = new Date(Date.now() - offsets[period] * 86400000);
    setSelectedPeriod(period);
    setStartDate(sd);
    setEndDate(now);
    loadData(sd, now);
  };

  // ── Datos para gráfico comparativo ───────────────────────────────────────────
  const comparativeData = data ? [
    { categoria: 'Supermercados', ventas: data.supermercados.ventas, costos: data.supermercados.costos, utilidad: data.supermercados.utilidad, margen: data.supermercados.margen },
    { categoria: 'Ferreterías',   ventas: data.ferreterias.ventas,   costos: data.ferreterias.costos,   utilidad: data.ferreterias.utilidad,   margen: data.ferreterias.margen   },
    { categoria: 'Multitiendas',  ventas: data.multitiendas.ventas,  costos: data.multitiendas.costos,  utilidad: data.multitiendas.utilidad,  margen: data.multitiendas.margen  },
    { categoria: 'Total',         ventas: data.total.ventas,         costos: data.total.costos,         utilidad: data.total.utilidad,         margen: data.total.margen         },
  ] : [];

  const exportToPDF = () => {
    if (!dashboardRef.current) return;
    enqueueSnackbar('Preparando PDF…', { variant: 'info' });
    html2canvas(dashboardRef.current, { scale: 1, useCORS: true }).then((canvas) => {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = 210, h = canvas.height * w / canvas.width;
      let left = h, pos = 0;
      pdf.addImage(img, 'PNG', 0, pos, w, h); left -= 295;
      while (left >= 0) { pos = left - h; pdf.addPage(); pdf.addImage(img, 'PNG', 0, pos, w, h); left -= 295; }
      pdf.save(`Dashboard_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`);
      enqueueSnackbar('PDF exportado', { variant: 'success' });
    });
  };

  return (
    <Box sx={{ pb: 6 }} ref={dashboardRef}>

      {/* ── Barra de progreso al cargar ───────────────────────────────────────── */}
      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 3 }} />}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <Fade in timeout={400}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>Dashboard Gerencial</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Ventas, costos y márgenes por tipo de sucursal
                  {loadTime && !loading && (
                    <Chip label={`Cargado en ${loadTime}s`} size="small" color="success" sx={{ ml: 1.5, height: 18, fontSize: 10 }} />
                  )}
                </Typography>
              </Box>
              <Chip label="TIEMPO REAL" size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportToPDF} sx={{ borderRadius: 2, textTransform: 'none' }}>PDF</Button>
              <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ borderRadius: 2, textTransform: 'none' }}>Imprimir</Button>
            </Box>
          </Box>

          {/* Última actualización */}
          <Chip
            icon={<RefreshIcon sx={{ fontSize: '14px !important' }} />}
            label={`Actualizado: ${new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`}
            size="small" variant="outlined"
            sx={{ mt: 1, height: 22, fontSize: 11, color: 'text.secondary' }}
          />
        </Box>
      </Fade>

      {/* ── Filtro de fechas ─────────────────────────────────────────────────── */}
      <Fade in timeout={500}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center">
            {/* Período rápido */}
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <ButtonGroup size="small" variant="outlined">
                {[['week','7d'],['month','30d'],['quarter','90d'],['year','1 año']].map(([k, label]) => (
                  <Button
                    key={k}
                    onClick={() => handlePeriodChange(k)}
                    variant={selectedPeriod === k ? 'contained' : 'outlined'}
                    sx={{ textTransform: 'none', fontWeight: selectedPeriod === k ? 700 : 400, minWidth: 52 }}
                  >
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
            </Grid>

            {/* Date pickers */}
            <Grid size={{ xs: 12, sm: 'grow' }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DatePicker label="Desde" value={startDate} onChange={setStartDate}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                  <DatePicker label="Hasta" value={endDate} onChange={setEndDate}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                </Stack>
              </LocalizationProvider>
            </Grid>

            {/* Botón consultar */}
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => loadData()}
                  disabled={loading}
                  startIcon={loading ? null : <RefreshIcon />}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, minWidth: 110 }}
                >
                  {loading ? 'Cargando…' : 'Consultar'}
                </Button>
                {data && (
                  <Button
                    variant="outlined" color="secondary"
                    onClick={() => setActiveTab(1)}
                    startIcon={<SummarizeOutlined />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Reporte
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      {(data || loading) && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 }, '& .MuiTabs-indicator': { height: 3, borderRadius: 3 } }}
          >
            <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><BarChartIcon fontSize="small" /> Gráficos</Box>} />
            <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><SummarizeOutlined fontSize="small" /> Reporte Gerencial</Box>} disabled={!data || loading} />
          </Tabs>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PANEL GRÁFICOS                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          {/* ── KPIs ─────────────────────────────────────────────────────────── */}
          <Section
            title="Resumen Ejecutivo"
            subtitle="Indicadores clave por tipo de sucursal"
            color="primary.main"
            loading={false}
          >
            <Grid container spacing={3}>
              {[
                { title: 'Supermercados', color: 'primary',   key: 'supermercados' },
                { title: 'Ferreterías',   color: 'info',      key: 'ferreterias'   },
                { title: 'Multitiendas',  color: 'success',   key: 'multitiendas'  },
                { title: 'Total',         color: 'secondary', key: 'total'         },
              ].map(({ title, color, key }) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
                  <KpiCard
                    title={title}
                    loading={loading}
                    value={data ? fmtCLP(data[key]?.ventas) : '—'}
                    color={color}
                    secondaryValue={data ? `${(data[key]?.margen || 0).toFixed(2)}%` : null}
                    secondaryLabel="Margen"
                  />
                </Grid>
              ))}
            </Grid>
          </Section>

          {/* ── Ventas por Sucursal ───────────────────────────────────────────── */}
          <Section
            title="Análisis por Sucursal"
            subtitle="Desempeño individual por punto de venta"
            color="secondary.main"
            loading={loading}
            skeletonCount={1}
            skeletonHeight={280}
          >
            {data && (
              <Grid container spacing={3}>
                {/* Supermercados */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard
                    title="Ventas por Supermercado"
                    subtitle={`${data.supermercados.sucursales.length} sucursales`}
                    height={Math.max(360, data.supermercados.sucursales.length * 62)}
                    accentColor={`linear-gradient(90deg, ${GRADIENTS.primary[0]}, ${GRADIENTS.primary[1]})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.supermercados.sucursales} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barSize={26}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="nombre" type="category" width={115} tick={{ fontSize: 12, fontWeight: 500, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip formatter={fmtCLP} />} />
                        <Bar dataKey="ventas" name="Ventas" fill={theme.palette.primary.main} radius={[0, 6, 6, 0]} background={{ fill: theme.palette.grey[100], radius: [0, 6, 6, 0] }}>
                          <LabelList dataKey="ventas" position="insideRight" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>

                {/* Ferreterías + Multitiendas */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard
                    title="Ventas por Ferretería y Multitienda"
                    subtitle={`${data.ferreterias.sucursales.length + data.multitiendas.sucursales.length} sucursales`}
                    height={Math.max(360, (data.ferreterias.sucursales.length + data.multitiendas.sucursales.length) * 62)}
                    accentColor={`linear-gradient(90deg, ${GRADIENTS.info[0]}, ${GRADIENTS.info[1]})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...data.ferreterias.sucursales, ...data.multitiendas.sucursales]} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barSize={26}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="nombre" type="category" width={115} tick={{ fontSize: 12, fontWeight: 500, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip formatter={fmtCLP} />} />
                        <Bar dataKey="ventas" name="Ventas" fill={theme.palette.info.main} radius={[0, 6, 6, 0]} background={{ fill: theme.palette.grey[100], radius: [0, 6, 6, 0] }}>
                          <LabelList dataKey="ventas" position="insideRight" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>
              </Grid>
            )}
          </Section>

          {/* ── Rentabilidad ─────────────────────────────────────────────────── */}
          <Section
            title="Análisis de Rentabilidad"
            subtitle="Desglose de utilidades y costos"
            color="success.main"
            loading={loading}
            skeletonCount={2}
            skeletonHeight={280}
          >
            {data && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard title="Utilidad vs Costos — Supermercados"
                    height={Math.max(360, data.supermercados.sucursales.length * 62)}
                    accentColor={`linear-gradient(90deg, ${GRADIENTS.success[0]}, ${GRADIENTS.success[1]})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.supermercados.sucursales} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="nombre" type="category" width={115} tick={{ fontSize: 12, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip formatter={fmtCLP} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                        <Bar dataKey="costos"   name="Costos"   fill={theme.palette.error.light}   stackId="a" radius={[0,0,0,0]} />
                        <Bar dataKey="utilidad" name="Utilidad" fill={theme.palette.success.light} stackId="a" radius={[0,6,6,0]}>
                          <LabelList dataKey="ventas" position="insideRight" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard title="Utilidad vs Costos — Ferreterías & Multitiendas"
                    height={Math.max(360, (data.ferreterias.sucursales.length + data.multitiendas.sucursales.length) * 62)}
                    accentColor={`linear-gradient(90deg, ${GRADIENTS.secondary[0]}, ${GRADIENTS.secondary[1]})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...data.ferreterias.sucursales, ...data.multitiendas.sucursales]} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barSize={22}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="nombre" type="category" width={115} tick={{ fontSize: 12, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip formatter={fmtCLP} />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                        <Bar dataKey="costos"   name="Costos"   fill={theme.palette.error.light}     stackId="a" radius={[0,0,0,0]} />
                        <Bar dataKey="utilidad" name="Utilidad" fill={theme.palette.secondary.light} stackId="a" radius={[0,6,6,0]}>
                          <LabelList dataKey="ventas" position="insideRight" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: '#fff' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>
              </Grid>
            )}
          </Section>

          {/* ── Comparativo ──────────────────────────────────────────────────── */}
          <Section
            title="Análisis Comparativo"
            subtitle="Consolidado entre tipos de sucursal"
            color="info.main"
            loading={loading}
            skeletonCount={1}
            skeletonHeight={360}
          >
            {data && (
              <Grid container spacing={3}>
                {/* Barras comparativas — ancho completo */}
                <Grid size={12}>
                  <ChartCard title="Ventas · Costos · Utilidad" subtitle="Por tipo de sucursal" height={420}
                    accentColor={`linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparativeData} margin={{ top: 32, right: 16, left: 4, bottom: 16 }} barGap={8} barCategoryGap="28%" barSize={44}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
                        <XAxis dataKey="categoria" tick={{ fontSize: 13, fontWeight: 600, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} width={54} />
                        <Tooltip content={<CustomTooltip formatter={fmtCLP} />} />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                        <Bar dataKey="ventas"   name="Ventas"   fill={theme.palette.primary.main} radius={[6,6,0,0]}>
                          <LabelList dataKey="ventas"   position="top" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: theme.palette.primary.dark }} offset={5} />
                        </Bar>
                        <Bar dataKey="costos"   name="Costos"   fill={theme.palette.error.main}   radius={[6,6,0,0]}>
                          <LabelList dataKey="costos"   position="top" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: theme.palette.error.dark }}   offset={5} />
                        </Bar>
                        <Bar dataKey="utilidad" name="Utilidad" fill={theme.palette.success.main} radius={[6,6,0,0]}>
                          <LabelList dataKey="utilidad" position="top" formatter={fmtCompact} style={{ fontSize: 11, fontWeight: 700, fill: theme.palette.success.dark }} offset={5} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>

                {/* Pie + Márgenes — lado a lado */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard title="Distribución de Ventas" height={360}
                    accentColor={`linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={comparativeData.slice(0, 3)} dataKey="ventas" nameKey="categoria" cx="50%" cy="45%" outerRadius={110}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {comparativeData.slice(0, 3).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip formatter={fmtCLP} />
                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ChartCard title="Margen por Tipo (%)" height={360}
                    accentColor={`linear-gradient(90deg, ${theme.palette.warning.dark}, ${theme.palette.warning.main})`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparativeData} margin={{ top: 24, right: 16, left: 0, bottom: 8 }} barCategoryGap="30%" barSize={56}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
                        <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: theme.palette.text.primary }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip formatter={(v) => [`${v.toFixed(2)}%`, 'Margen']} />
                        <Bar dataKey="margen" name="Margen" fill={theme.palette.warning.main} radius={[6,6,0,0]}>
                          <LabelList dataKey="margen" position="top" formatter={(v) => `${v.toFixed(1)}%`} style={{ fontSize: 12, fontWeight: 700 }} offset={5} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </Grid>
              </Grid>
            )}
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PANEL REPORTE                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 1 && data && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <AutoReport data={data} startDate={startDate} endDate={endDate} loading={loading} formatCurrency={fmtCLP} />
        </Paper>
      )}
    </Box>
  );
};

export default DashboardPage;
