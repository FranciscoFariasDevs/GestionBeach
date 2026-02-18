// frontend/src/pages/RentabilidadPage.jsx
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip, Card, CardContent, InputAdornment, LinearProgress,
  Skeleton, Dialog, DialogTitle, DialogContent, IconButton, Collapse, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  AccessTime as TimeIcon,
  FileDownload as FileDownloadIcon,
  Store as StoreIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  ShowChart as ChartIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  TableChart as TableIcon,
  AccountTree as TreeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api/api';

const MAX_FILAS = 500;
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatPeso = (v) => {
  if (v == null || isNaN(v)) return '$0';
  return '$' + Math.round(v).toLocaleString('es-CL');
};
const formatPct = (v) => {
  if (v == null || isNaN(v)) return '0%';
  return (v * 100).toFixed(1) + '%';
};
const formatFecha = (f) => {
  if (!f) return '-';
  try { return format(new Date(f), 'dd/MM/yyyy', { locale: es }); } catch { return f; }
};

// ─── ISO week helper ──────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ─── Sort factory ─────────────────────────────────────────────────────────────
function makeSortFn(field, dir) {
  return (a, b) => {
    let va = a[field], vb = b[field];
    if (field === 'descripcion' || field === 'codigo') {
      va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase();
      return dir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es');
    }
    if (field === 'fecha') {
      va = new Date(va || 0); vb = new Date(vb || 0);
      return dir === 'asc' ? va - vb : vb - va;
    }
    va = va || 0; vb = vb || 0;
    return dir === 'asc' ? va - vb : vb - va;
  };
}

// ─── Sort Control ─────────────────────────────────────────────────────────────
const SORT_FIELDS = [
  { value: 'fecha',        label: 'Fecha'   },
  { value: 'descripcion',  label: 'A–Z'     },
  { value: 'venta',        label: 'Venta'   },
  { value: 'costo',        label: 'Costo'   },
  { value: 'utilidad',     label: 'Utilidad'},
  { value: 'rentabilidad', label: 'Rent.'   },
];

function SortControl({ sortField, sortDir, onSort }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700} mr={0.3}>Ordenar:</Typography>
      {SORT_FIELDS.map(f => {
        const active = sortField === f.value;
        return (
          <Chip key={f.value} size="small" label={f.label}
            variant={active ? 'filled' : 'outlined'}
            onClick={() => onSort(f.value, active ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')}
            icon={active
              ? (sortDir === 'asc'
                  ? <ArrowUpIcon   sx={{ fontSize: '11px !important', color: 'white !important' }}/>
                  : <ArrowDownIcon sx={{ fontSize: '11px !important', color: 'white !important' }}/>)
              : undefined}
            sx={{
              cursor: 'pointer', fontSize: '0.7rem', height: 24,
              bgcolor:     active ? '#1a1a2e' : 'transparent',
              color:       active ? 'white'   : 'text.secondary',
              borderColor: active ? '#1a1a2e' : 'divider',
              '&:hover': { bgcolor: active ? '#0f3460' : alpha('#1a1a2e', 0.07) },
            }}
          />
        );
      })}
    </Box>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
const exportarCSV = (data, filename) => {
  if (!data.length) return;
  const cols = [
    { key: 'fecha', label: 'Fecha' }, { key: 'hora', label: 'Hora' },
    { key: 'codigo', label: 'Codigo' }, { key: 'descripcion', label: 'Descripcion' },
    { key: 'cantidad', label: 'Cantidad' }, { key: 'venta', label: 'Venta' },
    { key: 'costo', label: 'Costo' }, { key: 'utilidad', label: 'Utilidad' },
    { key: 'rentabilidad', label: 'Rentabilidad' },
  ];
  const header = cols.map(c => c.label).join(';');
  const rows = data.map(row => cols.map(c => {
    let v = row[c.key];
    if (v == null) return '';
    if (typeof v === 'string' && v.includes(';')) return `"${v}"`;
    return v;
  }).join(';'));
  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── Tabla plana con ordenamiento ─────────────────────────────────────────────
const COLS = [
  { key: 'fecha',        label: 'Fecha',       align: 'left',  sortable: true  },
  { key: 'hora',         label: 'Hora',        align: 'left',  sortable: false },
  { key: 'codigo',       label: 'Codigo',      align: 'left',  sortable: false },
  { key: 'descripcion',  label: 'Descripcion', align: 'left',  sortable: true  },
  { key: 'cantidad',     label: 'Cant.',       align: 'right', sortable: false },
  { key: 'venta',        label: 'Venta',       align: 'right', sortable: true  },
  { key: 'costo',        label: 'Costo',       align: 'right', sortable: true  },
  { key: 'utilidad',     label: 'Utilidad',    align: 'right', sortable: true  },
  { key: 'rentabilidad', label: 'Rent.',        align: 'right', sortable: true  },
];

const TablaRentabilidad = memo(({ registros, busqueda, loading, sortField, sortDir, onSort }) => {
  const filtrados = useMemo(() => {
    if (!busqueda) return registros;
    const b = busqueda.toLowerCase();
    return registros.filter(r =>
      (r.codigo || '').toLowerCase().includes(b) ||
      (r.descripcion || '').toLowerCase().includes(b)
    );
  }, [registros, busqueda]);

  const sorted   = useMemo(() => [...filtrados].sort(makeSortFn(sortField, sortDir)), [filtrados, sortField, sortDir]);
  const visibles = useMemo(() => sorted.slice(0, MAX_FILAS), [sorted]);

  const totales = useMemo(() => {
    const v = filtrados.reduce((s, r) => s + (r.venta || 0), 0);
    const c = filtrados.reduce((s, r) => s + (r.costo || 0), 0);
    const u = filtrados.reduce((s, r) => s + (r.utilidad || 0), 0);
    return { venta: v, costo: c, utilidad: u, rentabilidad: v > 0 ? u / v : 0 };
  }, [filtrados]);

  if (loading) return (
    <Box sx={{ p: 3 }}>{[...Array(10)].map((_, i) => <Skeleton key={i} height={42} sx={{ mb: 0.5 }}/>)}</Box>
  );

  if (!registros.length) return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <ChartIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }}/>
      <Typography variant="h6" color="text.secondary">Selecciona sucursal y rango de fechas</Typography>
      <Typography variant="body2" color="text.secondary">Presiona "Buscar" para calcular rentabilidad</Typography>
    </Box>
  );

  return (
    <>
      {/* Totales */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1, px:1, flexWrap:'wrap', gap:1 }}>
        <Typography variant="body2" color="text.secondary">
          {filtrados.length > MAX_FILAS
            ? `Mostrando ${MAX_FILAS} de ${filtrados.length} (usa el buscador)`
            : `${filtrados.length} registros`}
        </Typography>
        <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
          <Chip size="small" label={`Venta: ${formatPeso(totales.venta)}`} color="primary" variant="outlined"/>
          <Chip size="small" label={`Costo: ${formatPeso(totales.costo)}`} color="default" variant="outlined"/>
          <Chip size="small" label={`Utilidad: ${formatPeso(totales.utilidad)}`} color="success" variant="outlined"/>
          <Chip size="small" label={`Rent: ${formatPct(totales.rentabilidad)}`}
            sx={{ bgcolor: totales.rentabilidad > 0.3 ? '#2e7d32' : totales.rentabilidad > 0.15 ? '#ed6c02' : '#d32f2f', color:'#fff', fontWeight:700 }}/>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 520 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {COLS.map(col => (
                <TableCell key={col.key} align={col.align}
                  onClick={col.sortable ? () => onSort(col.key, sortField === col.key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') : undefined}
                  sx={{
                    fontWeight:700, bgcolor:'#1a1a2e', color:'#fff',
                    cursor: col.sortable ? 'pointer' : 'default', userSelect:'none', whiteSpace:'nowrap',
                    '&:hover': col.sortable ? { bgcolor:'#0f3460' } : {},
                  }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.4,
                    justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                    {col.label}
                    {col.sortable && (sortField === col.key
                      ? (sortDir === 'asc' ? <ArrowUpIcon sx={{ fontSize:13 }}/> : <ArrowDownIcon sx={{ fontSize:13 }}/>)
                      : <ArrowUpIcon sx={{ fontSize:13, opacity:0.25 }}/>)}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((r, i) => {
              const rc = r.rentabilidad > 0.3 ? '#2e7d32' : r.rentabilidad > 0.15 ? '#ed6c02' : r.rentabilidad > 0 ? '#e65100' : '#d32f2f';
              return (
                <TableRow key={i} hover sx={{ '&:nth-of-type(odd)': { bgcolor:'rgba(255,152,0,0.04)' } }}>
                  <TableCell sx={{ fontSize:'0.8rem' }}>{formatFecha(r.fecha)}</TableCell>
                  <TableCell sx={{ fontSize:'0.8rem' }}>{String(r.hora).padStart(2,'0')}:00</TableCell>
                  <TableCell sx={{ fontFamily:'monospace', fontSize:'0.8rem' }}>{r.codigo}</TableCell>
                  <TableCell sx={{ fontSize:'0.8rem', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.descripcion}</TableCell>
                  <TableCell align="right">{r.cantidad}</TableCell>
                  <TableCell align="right" sx={{ fontWeight:600 }}>{formatPeso(r.venta)}</TableCell>
                  <TableCell align="right">{formatPeso(r.costo)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight:600, color: r.utilidad >= 0 ? '#2e7d32' : '#d32f2f' }}>{formatPeso(r.utilidad)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight:700, color:rc }}>{formatPct(r.rentabilidad)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
});

// ─── Vista Árbol: Año → Mes → Semana ─────────────────────────────────────────
function VistaArbol({ registros, busqueda, sortField, sortDir }) {
  const sortFn = useMemo(() => makeSortFn(sortField, sortDir), [sortField, sortDir]);

  const filtrados = useMemo(() => {
    if (!busqueda) return registros;
    const b = busqueda.toLowerCase();
    return registros.filter(r =>
      (r.codigo || '').toLowerCase().includes(b) ||
      (r.descripcion || '').toLowerCase().includes(b)
    );
  }, [registros, busqueda]);

  // Agrupa: año → mes → semana
  const tree = useMemo(() => {
    const años = {};
    filtrados.forEach(r => {
      if (!r.fecha) return;
      const d   = new Date(r.fecha);
      const año = d.getFullYear();
      const mes = d.getMonth();
      const sem = getISOWeek(d);

      if (!años[año]) años[año] = { año, venta:0, costo:0, utilidad:0, items:0, meses:{} };
      años[año].venta     += r.venta    || 0;
      años[año].costo     += r.costo    || 0;
      años[año].utilidad  += r.utilidad || 0;
      años[año].items++;

      const mKey = `${año}-${mes}`;
      const aObj = años[año];
      if (!aObj.meses[mKey]) aObj.meses[mKey] = { mes, mesLabel: MESES_ES[mes], venta:0, costo:0, utilidad:0, items:0, semanas:{} };
      aObj.meses[mKey].venta    += r.venta    || 0;
      aObj.meses[mKey].costo    += r.costo    || 0;
      aObj.meses[mKey].utilidad += r.utilidad || 0;
      aObj.meses[mKey].items++;

      const sKey = `${mKey}-${sem}`;
      const mObj = aObj.meses[mKey];
      if (!mObj.semanas[sKey]) mObj.semanas[sKey] = { semana:sem, venta:0, costo:0, utilidad:0, registros:[] };
      mObj.semanas[sKey].venta    += r.venta    || 0;
      mObj.semanas[sKey].costo    += r.costo    || 0;
      mObj.semanas[sKey].utilidad += r.utilidad || 0;
      mObj.semanas[sKey].registros.push(r);
    });
    return años;
  }, [filtrados]);

  const [open, setOpen] = useState({});

  // Al cargar datos: abrir años, cerrar meses y semanas
  useEffect(() => {
    const init = {};
    Object.keys(tree).forEach(a => { init[`año-${a}`] = true; });
    setOpen(init);
  }, [registros.length]); // eslint-disable-line

  const toggle = k => setOpen(p => ({ ...p, [k]: !p[k] }));

  if (!filtrados.length) return (
    <Box sx={{ textAlign:'center', py:5 }}>
      <ChartIcon sx={{ fontSize:48, color:'#ccc', mb:1 }}/>
      <Typography variant="body2" color="text.disabled">
        {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin datos — presiona Buscar'}
      </Typography>
    </Box>
  );

  const H_LABELS = ['Fecha','Hora','Código','Descripción','Cant.','Venta','Costo','Utilidad','Rent.'];
  const H_ALIGN  = ['left','left','left','left','right','right','right','right','right'];

  return (
    <Box sx={{ p: 1.5 }}>
      {Object.values(tree).sort((a, b) => b.año - a.año).map(añoData => {
        const aKey  = `año-${añoData.año}`;
        const aOpen = !!open[aKey];
        const aRent = añoData.venta > 0 ? añoData.utilidad / añoData.venta : 0;

        return (
          <Box key={añoData.año} sx={{ mb: 2 }}>

            {/* ══ AÑO ══ */}
            <Box onClick={() => toggle(aKey)} sx={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              p: 1.5, borderRadius: 2, cursor:'pointer', userSelect:'none',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
              color: 'white', '&:hover': { opacity: 0.91 },
            }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                {aOpen ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                <CalendarIcon sx={{ fontSize:20 }}/>
                <Typography variant="subtitle1" fontWeight={800}>{añoData.año}</Typography>
                <Chip label={`${añoData.items} reg.`} size="small"
                  sx={{ bgcolor: alpha('#fff', 0.15), color:'white', fontSize:'0.65rem', height:20 }}/>
              </Box>
              <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
                <Box sx={{ textAlign:'right' }}>
                  <Typography variant="caption" sx={{ opacity:0.65, display:'block' }}>Venta</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatPeso(añoData.venta)}</Typography>
                </Box>
                <Box sx={{ textAlign:'right' }}>
                  <Typography variant="caption" sx={{ opacity:0.65, display:'block' }}>Utilidad</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color:'#a5d6a7' }}>{formatPeso(añoData.utilidad)}</Typography>
                </Box>
                <Chip label={formatPct(aRent)} size="small"
                  sx={{ bgcolor: aRent > 0.3 ? '#2e7d32' : aRent > 0.15 ? '#e65100' : '#b71c1c', color:'white', fontWeight:700 }}/>
              </Box>
            </Box>

            <Collapse in={aOpen}>
              <Box sx={{ pl:2, pt:0.6 }}>
                {Object.values(añoData.meses).sort((a, b) => a.mes - b.mes).map(mesData => {
                  const mKey  = `mes-${añoData.año}-${mesData.mes}`;
                  const mOpen = !!open[mKey];
                  const mRent = mesData.venta > 0 ? mesData.utilidad / mesData.venta : 0;

                  return (
                    <Box key={mKey} sx={{ mb:0.8 }}>

                      {/* ── MES ── */}
                      <Box onClick={() => toggle(mKey)} sx={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        p: 1.2, borderRadius:2, cursor:'pointer', userSelect:'none',
                        bgcolor: alpha('#1a1a2e', 0.05), border:'1px solid', borderColor: alpha('#1a1a2e', 0.12),
                        '&:hover': { bgcolor: alpha('#1a1a2e', 0.09) },
                      }}>
                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                          {mOpen ? <ExpandLessIcon sx={{ fontSize:18 }}/> : <ExpandMoreIcon sx={{ fontSize:18 }}/>}
                          <Typography variant="body2" fontWeight={700}>{mesData.mesLabel}</Typography>
                          <Chip label={mesData.items} size="small" sx={{ fontSize:'0.62rem', height:18 }}/>
                        </Box>
                        <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
                          <Typography variant="caption" color="text.secondary">{formatPeso(mesData.venta)}</Typography>
                          <Typography variant="caption" fontWeight={700} color="#2e7d32">{formatPeso(mesData.utilidad)}</Typography>
                          <Chip label={formatPct(mRent)} size="small" sx={{
                            bgcolor: mRent > 0.3 ? alpha('#2e7d32', 0.12) : alpha('#e65100', 0.12),
                            color:   mRent > 0.3 ? '#2e7d32'              : '#e65100',
                            fontWeight:700, fontSize:'0.65rem', height:20,
                          }}/>
                        </Box>
                      </Box>

                      <Collapse in={mOpen}>
                        <Box sx={{ pl:2, pt:0.5 }}>
                          {Object.values(mesData.semanas).sort((a, b) => a.semana - b.semana).map(semData => {
                            const sKey  = `sem-${añoData.año}-${mesData.mes}-${semData.semana}`;
                            const sOpen = !!open[sKey];
                            const sRent = semData.venta > 0 ? semData.utilidad / semData.venta : 0;
                            const sortedRows = [...semData.registros].sort(sortFn);

                            return (
                              <Box key={sKey} sx={{ mb:0.6 }}>

                                {/* ─ SEMANA ─ */}
                                <Box onClick={() => toggle(sKey)} sx={{
                                  display:'flex', alignItems:'center', justifyContent:'space-between',
                                  p: 1, borderRadius:2, cursor:'pointer', userSelect:'none',
                                  bgcolor:'background.paper', border:'1px solid', borderColor:'divider',
                                  '&:hover': { bgcolor:'action.hover' },
                                }}>
                                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                    {sOpen ? <ExpandLessIcon sx={{ fontSize:15 }}/> : <ExpandMoreIcon sx={{ fontSize:15 }}/>}
                                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                                      Semana {semData.semana}
                                    </Typography>
                                    <Chip label={semData.registros.length} size="small" sx={{ fontSize:'0.6rem', height:16 }}/>
                                  </Box>
                                  <Box sx={{ display:'flex', gap:1.5, alignItems:'center' }}>
                                    <Typography variant="caption" color="text.secondary">{formatPeso(semData.venta)}</Typography>
                                    <Typography variant="caption" fontWeight={700} color="#2e7d32">{formatPeso(semData.utilidad)}</Typography>
                                    <Chip label={formatPct(sRent)} size="small" sx={{
                                      fontSize:'0.6rem', height:18,
                                      bgcolor: sRent > 0.3 ? alpha('#2e7d32', 0.1) : alpha('#e65100', 0.1),
                                      color:   sRent > 0.3 ? '#2e7d32'             : '#e65100',
                                    }}/>
                                  </Box>
                                </Box>

                                <Collapse in={sOpen}>
                                  <Box sx={{ pl:1, pt:0.3, overflowX:'auto' }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          {H_LABELS.map((h, i) => (
                                            <TableCell key={h} align={H_ALIGN[i]}
                                              sx={{ fontWeight:700, bgcolor:'#f5f5f5', fontSize:'0.68rem', py:0.6, whiteSpace:'nowrap' }}>
                                              {h}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {sortedRows.map((r, i) => {
                                          const rc = r.rentabilidad > 0.3 ? '#2e7d32' : r.rentabilidad > 0.15 ? '#ed6c02' : '#d32f2f';
                                          return (
                                            <TableRow key={i} hover>
                                              <TableCell sx={{ fontSize:'0.73rem', py:0.4 }}>{formatFecha(r.fecha)}</TableCell>
                                              <TableCell sx={{ fontSize:'0.73rem', py:0.4 }}>{String(r.hora).padStart(2,'0')}:00</TableCell>
                                              <TableCell sx={{ fontFamily:'monospace', fontSize:'0.73rem', py:0.4 }}>{r.codigo}</TableCell>
                                              <TableCell sx={{ fontSize:'0.73rem', py:0.4, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.descripcion}</TableCell>
                                              <TableCell align="right" sx={{ py:0.4 }}>{r.cantidad}</TableCell>
                                              <TableCell align="right" sx={{ fontWeight:600, py:0.4 }}>{formatPeso(r.venta)}</TableCell>
                                              <TableCell align="right" sx={{ py:0.4 }}>{formatPeso(r.costo)}</TableCell>
                                              <TableCell align="right" sx={{ fontWeight:600, color: r.utilidad >= 0 ? '#2e7d32' : '#d32f2f', py:0.4 }}>{formatPeso(r.utilidad)}</TableCell>
                                              <TableCell align="right" sx={{ fontWeight:700, color:rc, py:0.4 }}>{formatPct(r.rentabilidad)}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>

                              </Box>
                            );
                          })}
                        </Box>
                      </Collapse>

                    </Box>
                  );
                })}
              </Box>
            </Collapse>

          </Box>
        );
      })}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function RentabilidadPage() {
  const [sucursales,   setSucursales]   = useState([]);
  const [sucursalId,   setSucursalId]   = useState('');
  const [fechaDesde,   setFechaDesde]   = useState(subDays(new Date(), 7));
  const [fechaHasta,   setFechaHasta]   = useState(new Date());
  const [busqueda,     setBusqueda]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [registros,    setRegistros]    = useState([]);
  const [totales,      setTotales]      = useState(null);
  const [resumenHoras, setResumenHoras] = useState([]);
  const [showResumen,  setShowResumen]  = useState(false);

  // Nuevo: ordenamiento + vista
  const [sortField, setSortField] = useState('fecha');
  const [sortDir,   setSortDir]   = useState('asc');
  const [viewMode,  setViewMode]  = useState('tabla'); // 'tabla' | 'arbol'

  const handleSort = useCallback((field, dir) => { setSortField(field); setSortDir(dir); }, []);

  useEffect(() => {
    api.get('/rentabilidad/sucursales')
      .then(r => setSucursales(r.data))
      .catch(e => console.error('Error cargando sucursales:', e));
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!sucursalId) return;
    setLoading(true); setError(''); setBusqueda('');
    try {
      const res = await api.get('/rentabilidad/datos', {
        params: { sucursalId, fechaDesde: format(fechaDesde, 'yyyy-MM-dd'), fechaHasta: format(fechaHasta, 'yyyy-MM-dd') },
        timeout: 120000,
      });
      setRegistros(res.data.registros);
      setTotales(res.data.totales);
      setResumenHoras(res.data.resumen_horas);
      if (res.data.resumen_horas.length > 0) setShowResumen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al consultar rentabilidad');
    } finally {
      setLoading(false);
    }
  }, [sucursalId, fechaDesde, fechaHasta]);

  const sucursalNombre = useMemo(() =>
    sucursales.find(s => s.id === parseInt(sucursalId))?.nombre || '',
    [sucursales, sucursalId]
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>

      {/* ── HEADER ── */}
      <Paper sx={{
        p: 2, mb: 2,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#fff', borderRadius: 2,
      }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
          <MoneyIcon sx={{ fontSize:36, color:'#4caf50' }}/>
          <Box>
            <Typography variant="h5" sx={{ fontWeight:700 }}>Rentabilidad</Typography>
            <Typography variant="body2" sx={{ opacity:0.7 }}>
              Venta, costo, utilidad y rentabilidad por producto, día y hora
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── FILTROS ── */}
      <Paper sx={{ p:2, mb:2, borderRadius:2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="Sucursal" value={sucursalId}
              onChange={e => setSucursalId(e.target.value)}
              InputProps={{ startAdornment:<InputAdornment position="start"><StoreIcon fontSize="small"/></InputAdornment> }}>
              {sucursales.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} format="dd/MM/yyyy"
              slotProps={{ textField: { size:'small', fullWidth:true } }}/>
          </Grid>
          <Grid item xs={6} sm={2.5}>
            <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} format="dd/MM/yyyy"
              slotProps={{ textField: { size:'small', fullWidth:true } }}/>
          </Grid>
          <Grid item xs={4} sm={1.5}>
            <Button fullWidth variant="contained" onClick={handleBuscar} disabled={!sucursalId || loading}
              sx={{ bgcolor:'#4caf50', '&:hover':{ bgcolor:'#388e3c' }, fontWeight:700, height:40 }}>
              {loading ? <CircularProgress size={22} color="inherit"/> : 'Buscar'}
            </Button>
          </Grid>
          <Grid item xs={4} sm={1.5}>
            <Button fullWidth variant="outlined" startIcon={<TimeIcon/>} onClick={() => setShowResumen(true)}
              disabled={!resumenHoras.length} sx={{ height:40, borderColor:'#FF9800', color:'#FF9800' }}>
              Horas
            </Button>
          </Grid>
          <Grid item xs={4} sm={1}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon/>}
              onClick={() => exportarCSV(registros, `rentabilidad_${sucursalNombre}_${format(new Date(),'yyyyMMdd')}.csv`)}
              disabled={!registros.length} sx={{ height:40, borderColor:'#666', color:'#666' }}>
              CSV
            </Button>
          </Grid>
        </Grid>
        {loading && <LinearProgress sx={{ mt:1, '& .MuiLinearProgress-bar':{ bgcolor:'#4caf50' } }}/>}
        {error && (
          <Box sx={{ mt:1, p:1, bgcolor:'rgba(255,0,0,0.08)', borderRadius:1 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
      </Paper>

      {/* ── CARDS RESUMEN ── */}
      {totales && (
        <Grid container spacing={2} sx={{ mb:2 }}>
          {[
            { label:'Venta Total',   value: formatPeso(totales.venta),                           color:'#1565c0', icon:<TrendingUpIcon/> },
            { label:'Costo Total',   value: formatPeso(totales.costo),                           color:'#e65100', icon:<MoneyIcon/>     },
            { label:'Utilidad',      value: formatPeso(totales.utilidad),                        color:'#2e7d32', icon:<MoneyIcon/>     },
            { label:'Rentabilidad',  value: formatPct(totales.rentabilidad),
              color: totales.rentabilidad > 0.3 ? '#2e7d32' : '#ed6c02', icon:<ChartIcon/>      },
          ].map((c, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ borderLeft:`4px solid ${c.color}` }}>
                <CardContent sx={{ py:1.5, '&:last-child':{ pb:1.5 } }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    {React.cloneElement(c.icon, { sx:{ color:c.color } })}
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight:700 }}>{c.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── TABLA / ÁRBOL ── */}
      <Paper sx={{ borderRadius:2, overflow:'hidden' }}>

        {/* Toolbar */}
        <Box sx={{ p:1.5, bgcolor:'#fafafa', borderBottom:'1px solid #eee', display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>

          {/* Búsqueda */}
          <TextField size="small" sx={{ flex:1, minWidth:200 }} placeholder="Buscar por código o descripción..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            InputProps={{ startAdornment:<InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> }}/>

          {/* Ordenamiento */}
          {registros.length > 0 && <SortControl sortField={sortField} sortDir={sortDir} onSort={handleSort}/>}

          {/* Toggle de vista */}
          {registros.length > 0 && (
            <Box sx={{ display:'flex', border:'1px solid', borderColor:'divider', borderRadius:2, overflow:'hidden' }}>
              <Tooltip title="Vista tabla plana">
                <Box onClick={() => setViewMode('tabla')} sx={{
                  px:1.5, py:0.7, cursor:'pointer', display:'flex', alignItems:'center', gap:0.5,
                  bgcolor: viewMode === 'tabla' ? '#1a1a2e' : 'transparent',
                  color:   viewMode === 'tabla' ? 'white'   : 'text.secondary',
                  transition:'all .15s',
                  '&:hover': { bgcolor: viewMode === 'tabla' ? '#1a1a2e' : alpha('#1a1a2e', 0.06) },
                }}>
                  <TableIcon sx={{ fontSize:16 }}/>
                  <Typography variant="caption" fontWeight={600}>Tabla</Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Vista árbol: Año › Mes › Semana">
                <Box onClick={() => setViewMode('arbol')} sx={{
                  px:1.5, py:0.7, cursor:'pointer', display:'flex', alignItems:'center', gap:0.5,
                  bgcolor: viewMode === 'arbol' ? '#1a1a2e' : 'transparent',
                  color:   viewMode === 'arbol' ? 'white'   : 'text.secondary',
                  borderLeft: '1px solid', borderColor: 'divider',
                  transition:'all .15s',
                  '&:hover': { bgcolor: viewMode === 'arbol' ? '#1a1a2e' : alpha('#1a1a2e', 0.06) },
                }}>
                  <TreeIcon sx={{ fontSize:16 }}/>
                  <Typography variant="caption" fontWeight={600}>Árbol</Typography>
                </Box>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Contenido */}
        {viewMode === 'tabla'
          ? <TablaRentabilidad
              registros={registros} busqueda={busqueda} loading={loading}
              sortField={sortField} sortDir={sortDir} onSort={handleSort}/>
          : <VistaArbol
              registros={registros} busqueda={busqueda}
              sortField={sortField} sortDir={sortDir}/>
        }
      </Paper>

      {sucursalNombre && (
        <Typography variant="caption" color="text.secondary" sx={{ display:'block', textAlign:'center', mt:1 }}>
          Sucursal: {sucursalNombre} | Periodo: {format(fechaDesde,'dd/MM/yyyy')} – {format(fechaHasta,'dd/MM/yyyy')}
        </Typography>
      )}

      {/* ── DIALOG MEJOR HORA POR DÍA ── */}
      <Dialog open={showResumen} onClose={() => setShowResumen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          background:'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <TimeIcon sx={{ color:'#FF9800' }}/>
            <Typography variant="h6" sx={{ fontWeight:700 }}>Mejor Hora de Venta por Día</Typography>
          </Box>
          <IconButton onClick={() => setShowResumen(false)} sx={{ color:'#fff' }}><CloseIcon/></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p:0 }}>
          <TableContainer sx={{ maxHeight:450 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight:700, bgcolor:'#f5f5f5' }}>Día</TableCell>
                  <TableCell sx={{ fontWeight:700, bgcolor:'#f5f5f5' }}>Mejor Hora</TableCell>
                  <TableCell sx={{ fontWeight:700, bgcolor:'#f5f5f5' }} align="right">Venta Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenHoras.map((r, i) => (
                  <TableRow key={i} hover sx={{ '&:nth-of-type(odd)':{ bgcolor:'rgba(76,175,80,0.04)' } }}>
                    <TableCell sx={{ fontWeight:600 }}>{formatFecha(r.dia)}</TableCell>
                    <TableCell>
                      <Chip label={r.rango_hora} size="small" icon={<TimeIcon/>}
                        sx={{ bgcolor:'#fff3e0', color:'#e65100', fontWeight:600 }}/>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight:700, color:'#2e7d32' }}>{formatPeso(r.venta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
