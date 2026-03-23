// frontend/src/pages/PlanificacionPage.jsx
import React, { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Button, IconButton, Tabs, Tab, Card, CardContent, Chip, Avatar,
  Collapse, alpha, Divider, TextField, Select, MenuItem, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Stack, Skeleton, TableContainer, Tooltip,
} from '@mui/material';
import {
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as OkIcon,
  Error as ExceedIcon,
  Info as InfoIcon,
  FindInPage as RevisarIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as EncadenadoIcon,
  LinkOff as NoEncadenadoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  LocationOn as SucursalIcon,
  NotesOutlined as NotesIcon,
  Assignment as OcIcon,
  Sync as SyncIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  CalendarMonth as CalendarMonthIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';
import api from '../api/api';

// ─── Paleta ─────────────────────────────────────────────────────────────────
const ENC_DARK  = '#1a237e';
const ENC_MID   = '#3949ab';
const ENC_BG    = '#e8eaf6';
const NENC_DARK = '#004d40';
const NENC_MID  = '#00897b';
const NENC_BG   = '#e0f2f1';
const PROY_COLOR = '#6a1b9a';
const OC_COLOR   = '#00695c';

const STATUS_MAP = {
  OK:        { color: '#2e7d32', bg: 'rgba(46,125,50,0.08)',   label: 'OK',        Icon: OkIcon      },
  ALERTA:    { color: '#e65100', bg: 'rgba(230,81,0,0.08)',    label: 'ALERTA',    Icon: WarningIcon  },
  EXCEDIDO:  { color: '#b71c1c', bg: 'rgba(183,28,28,0.08)',   label: 'EXCEDIDO',  Icon: ExceedIcon   },
  SIN_DATOS: { color: '#546e7a', bg: 'rgba(84,110,122,0.08)',  label: 'SIN DATOS', Icon: InfoIcon     },
  REVISAR:   { color: '#f57f17', bg: 'rgba(245,127,23,0.08)',  label: 'REVISAR',   Icon: RevisarIcon  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtM    = n => `$${(Math.round(n||0)).toLocaleString('es-CL')}`;
const fmtFull = n => `$${(Math.round(n||0)).toLocaleString('es-CL')}`;
const fmtDate = d => {
  if (!d) return '–';
  // Parsear YYYY-MM-DD sin desfase de timezone (new Date("YYYY-MM-DD") lo trata como UTC)
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-').map(Number);
  if (!y || !m || !day) return new Date(d).toLocaleDateString('es-CL', { day:'2-digit', month:'short' });
  return new Date(y, m - 1, day).toLocaleDateString('es-CL', { day:'2-digit', month:'short' });
};
const getCurrentWeek = () => {
  const now=new Date(), d=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  return Math.ceil(((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000+1)/7);
};

// ─── Helper: días de una semana ISO ──────────────────────────────────────────
const getWeekDays = (week, year) => {
  // Lunes de la semana ISO
  const simple  = new Date(year, 0, 1 + (week - 1) * 7);
  const dow     = simple.getDay();
  const monday  = new Date(simple);
  monday.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const isoStr = d => d.toISOString().split('T')[0]; // "YYYY-MM-DD"

// ─── Calendario mini semanal ──────────────────────────────────────────────────
function WeekCalendar({ week, year, compras }) {
  const days    = getWeekDays(week, year);
  const today   = isoStr(new Date());
  // Agrupar montos por día de VENCIMIENTO (no fecha_compra)
  const byDay   = {};
  compras.forEach(c => {
    const k = c.fecha_vencimiento ? isoStr(new Date(c.fecha_vencimiento)) : null;
    if (!k) return;
    byDay[k] = (byDay[k] || 0) + (c.monto_con_iva || c.monto_neto || 0);
  });
  const maxMonto = Math.max(...Object.values(byDay), 1);

  // Color por intensidad de pago
  const getPayColor = (pct) => {
    if (pct > 0.7) return '#bf360c'; // rojo intenso — mucho que pagar
    if (pct > 0.35) return '#e65100'; // naranja fuerte
    return '#f57c00'; // naranja suave
  };

  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, p:2, mb:2 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5 }}>
        <CalendarIcon sx={{ fontSize:16, color:'text.secondary' }}/>
        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} textTransform="uppercase">
          Vencimientos Semana {week}
        </Typography>
      </Box>
      <Grid container spacing={0.8}>
        {days.map((d, i) => {
          const key       = isoStr(d);
          const monto     = byDay[key] || 0;
          const isToday   = key === today;
          const isWeekend = i >= 5;
          const hasPay    = monto > 0;
          const pct       = hasPay ? (monto / maxMonto) : 0;
          const payColor  = getPayColor(pct);
          return (
            <Grid item xs key={key}>
              <Box sx={{
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: hasPay ? payColor : isToday ? ENC_MID : 'divider',
                bgcolor: hasPay
                  ? alpha(payColor, 0.08)
                  : isToday ? alpha(ENC_MID, 0.08) : isWeekend ? alpha('#000', 0.02) : 'background.paper',
                p: 1,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 80,
                boxShadow: hasPay ? `0 0 0 2px ${alpha(payColor, 0.15)}` : 'none',
              }}>
                {/* Barra de monto al fondo */}
                {hasPay && (
                  <Box sx={{
                    position: 'absolute', bottom:0, left:0, right:0,
                    height: `${Math.max(pct * 100, 12)}%`,
                    bgcolor: alpha(payColor, 0.18),
                    transition: 'height .5s ease',
                  }}/>
                )}
                <Typography variant="caption" color={isWeekend && !hasPay ? 'text.disabled' : hasPay ? payColor : 'text.secondary'}
                  fontWeight={hasPay || isToday ? 700 : 400} fontSize="0.65rem">
                  {DIAS[i]}
                </Typography>
                <Typography variant="h6" fontWeight={hasPay || isToday ? 900 : 600} lineHeight={1.1}
                  color={hasPay ? payColor : isToday ? ENC_MID : isWeekend ? 'text.disabled' : 'text.primary'}
                  sx={{ my: 0.3 }}>
                  {d.getDate()}
                </Typography>
                <Typography variant="caption" fontSize="0.6rem"
                  color={hasPay ? payColor : 'text.disabled'} fontWeight={hasPay ? 800 : 400}>
                  {hasPay ? fmtM(monto) : '–'}
                </Typography>
                {isToday && (
                  <Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor: hasPay ? payColor : ENC_MID, mx:'auto', mt:0.3 }}/>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
      {/* Rango de fechas */}
      <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
        {days[0].toLocaleDateString('es-CL',{day:'2-digit',month:'long'})} — {days[6].toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})}
      </Typography>
    </Paper>
  );
}

// ─── Panel de Alertas Críticas (próximas 6 semanas) ──────────────────────────
function AlertasCriticas({ weeksData, currentWeek, onJump }) {
  const ESTADOS_CRITICOS = ['ALERTA', 'EXCEDIDO', 'REVISAR'];
  const alertas = weeksData.filter(w => {
    const s = w.numero_semana || w.semana;
    return s >= currentWeek && s <= currentWeek + 6 &&
      ESTADOS_CRITICOS.includes(w.estado);
  });
  if (alertas.length === 0) return null;

  const tieneExcedido = alertas.some(a => a.estado === 'EXCEDIDO');
  const colorPanel = tieneExcedido ? '#b71c1c' : alertas.some(a => a.estado === 'ALERTA') ? '#e65100' : '#f57f17';

  return (
    <Paper elevation={0} sx={{
      border: '1.5px solid',
      borderColor: colorPanel,
      borderRadius: 3,
      p: 1.5,
      mb: 2,
      bgcolor: `${colorPanel}0a`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <WarningIcon sx={{ fontSize: 16, color: colorPanel }}/>
        <Typography variant="caption" fontWeight={800} letterSpacing={1} textTransform="uppercase" color={colorPanel}>
          {alertas.length} semana{alertas.length !== 1 ? 's' : ''} requieren atención en las próximas 6 semanas
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {alertas.map(w => {
          const sc = STATUS_MAP[w.estado] || STATUS_MAP.OK;
          const IconComp = sc.Icon;
          return (
            <Chip
              key={w.numero_semana || w.semana}
              label={`S${w.numero_semana || w.semana} · ${sc.label}`}
              size="small"
              icon={<IconComp sx={{ fontSize: '13px !important', color: 'white !important' }}/>}
              onClick={() => onJump(w.numero_semana || w.semana)}
              sx={{
                bgcolor: sc.color,
                color: 'white',
                fontWeight: 700,
                fontSize: '0.68rem',
                cursor: 'pointer',
                '&:hover': { opacity: 0.85 },
              }}
            />
          );
        })}
      </Box>
    </Paper>
  );
}

// ─── Mini bar chart de 52 semanas ─────────────────────────────────────────────
const BAR_H = 80; // altura máxima de la barra en px
function WeekMiniBar({ w, isCurrent, onClick }) {
  const sc = STATUS_MAP[w.estado] || STATUS_MAP.OK;
  const hasDatos = (w.encadenados || 0) > 0 || (w.deuda_facturada_nenc || 0) > 0;
  const pct = w.porcentaje_uso || 0;
  const height = hasDatos ? Math.max(5, Math.min(BAR_H, Math.round(pct / 100 * BAR_H))) : 5;
  const barColor = isCurrent ? '#1a237e' : hasDatos ? sc.color : '#bdbdbd';
  const enc  = w.encadenados || 0;
  const nenc = w.deuda_facturada_nenc || 0;
  const lim  = w.limite_semanal || 100000000;

  return (
    <Tooltip title={
      <Box>
        <Typography variant="caption" fontWeight={700} display="block">S{w.numero_semana || w.semana}</Typography>
        {hasDatos ? (
          <>
            <Typography variant="caption" display="block">Enc: {fmtM(enc)}</Typography>
            <Typography variant="caption" display="block">NoEnc: {fmtM(nenc)}</Typography>
            <Typography variant="caption" display="block">Límite: {fmtM(lim)}</Typography>
            <Typography variant="caption" display="block">Uso: {pct}%</Typography>
            <Typography variant="caption" display="block" fontWeight={700} color={sc.color}>{w.estado || 'OK'}</Typography>
          </>
        ) : (
          <Typography variant="caption" display="block" color="#bdbdbd">Sin datos</Typography>
        )}
      </Box>
    }>
      <Box onClick={onClick} sx={{
        width: 10,
        height: BAR_H + 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        position: 'relative',
        '&:hover .bar': { opacity: 1, transform: 'scaleY(1.05)', transformOrigin: 'bottom' },
      }}>
        {/* Etiqueta semana actual encima */}
        {isCurrent && (
          <Typography variant="caption" sx={{
            position: 'absolute', top: -16, fontSize: '0.65rem',
            fontWeight: 800, color: '#1a237e', whiteSpace: 'nowrap',
          }}>S{w.semana}</Typography>
        )}
        <Box className="bar" sx={{
          width: '100%',
          height: `${height}px`,
          borderRadius: '3px 3px 0 0',
          bgcolor: barColor,
          opacity: isCurrent ? 1 : hasDatos ? 0.7 : 0.25,
          transition: 'height .2s ease, opacity .15s',
          ...(isCurrent && { boxShadow: '0 0 0 2px #1a237e' }),
        }}/>
      </Box>
    </Tooltip>
  );
}

// ─── Gráfico Anual Pantalla Completa ─────────────────────────────────────────
const FULL_BAR_H = 340;
const FULL_BAR_W = 20;
const MESES_COMPLETOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CHART_BG    = '#0f172a';
const CHART_GRID  = 'rgba(255,255,255,0.06)';
const CHART_AXIS  = 'rgba(255,255,255,0.25)';

function GraficoAnualFullscreen({ open, onClose, weeksData, currentWeek, año, onJump }) {
  if (!weeksData || weeksData.length === 0) return null;

  const totEncOC    = weeksData.reduce((s,w) => s + (parseFloat(w.encadenados)          || 0), 0);
  const totFactEnc  = weeksData.reduce((s,w) => s + (parseFloat(w.deuda_facturada_enc)  || 0), 0);
  const totNoEnc    = weeksData.reduce((s,w) => s + (parseFloat(w.deuda_facturada_nenc) || 0), 0);
  const totGeneral  = totEncOC + totFactEnc + totNoEnc;

  const maxVal = Math.max(...weeksData.map(w =>
    (parseFloat(w.encadenados)||0) + (parseFloat(w.deuda_facturada_enc)||0) + (parseFloat(w.deuda_facturada_nenc)||0)
  ), 1);

  const avgLimite   = weeksData.reduce((s,w) => s + (parseFloat(w.limite_semanal)||100_000_000), 0) / weeksData.length;
  const limiteFrac  = Math.min(avgLimite / maxVal, 1);
  const limiteTopPx = FULL_BAR_H * (1 - limiteFrac);
  const alerta80Top = FULL_BAR_H * (1 - limiteFrac * 0.8);

  const semanasAlerta = weeksData.filter(w => w.estado && w.estado !== 'OK' && w.estado !== 'SIN_DATOS');

  // Etiquetas del eje Y (4 niveles)
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({ frac: f, val: maxVal * f, y: FULL_BAR_H * (1 - f) }));

  return (
    <Dialog open={open} onClose={onClose} fullScreen
      PaperProps={{ sx: { bgcolor: '#0d1117', backgroundImage:'none' } }}>
      <Box sx={{ display:'flex', flexDirection:'column', height:'100vh', color:'white' }}>

        {/* ── Header con gradiente ── */}
        <Box sx={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          px:3, py:1.8, flexShrink:0,
          background: `linear-gradient(135deg, ${ENC_DARK} 0%, #283593 60%, #1a237e 100%)`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
            <Box sx={{ p:0.8, bgcolor:'rgba(255,255,255,0.15)', borderRadius:2, display:'flex' }}>
              <TrendingUpIcon sx={{ color:'white', fontSize:22 }}/>
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="white" lineHeight={1.1}>
                Control de Pagos Semanales
              </Typography>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.65)', letterSpacing:1 }}>
                AÑO {año} · VISTA ANUAL COMPLETA
              </Typography>
            </Box>
            <Chip label={`S${currentWeek} en curso`} size="small"
              sx={{ bgcolor:'rgba(255,255,255,0.18)', color:'white', fontWeight:700,
                border:'1px solid rgba(255,255,255,0.3)', ml:1 }}/>
          </Box>
          <IconButton onClick={onClose} sx={{ color:'rgba(255,255,255,0.8)', '&:hover':{ bgcolor:'rgba(255,255,255,0.12)' } }}>
            <CloseIcon/>
          </IconButton>
        </Box>

        {/* ── Tarjetas resumen ── */}
        <Box sx={{ display:'flex', gap:1.5, px:3, py:1.5, flexShrink:0, flexWrap:'wrap',
          bgcolor:'#161b22', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          {[
            { label:'Enc. OC',            val: totEncOC,              color:'#60a5fa', icon:'📋' },
            { label:'Enc. Facturado PBI',  val: totFactEnc,            color:'#c084fc', icon:'🧾' },
            { label:'Total Encadenados',   val: totEncOC + totFactEnc, color:'#93c5fd', bold:true, icon:'🔗' },
            { label:'No Encadenados (ERP)',val: totNoEnc,              color:'#34d399', icon:'🏪' },
            { label:'Total General',       val: totGeneral,            color:'#f87171', bold:true, icon:'💰' },
          ].map(({ label, val, color, bold, icon }) => (
            <Box key={label} sx={{
              px:2, py:1, borderRadius:2, minWidth:150, flex:'1 1 140px',
              bgcolor:'rgba(255,255,255,0.04)',
              border:`1px solid ${alpha(color, 0.25)}`,
              backdropFilter:'blur(4px)',
            }}>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.45)', fontSize:'0.65rem', letterSpacing:0.5 }}>
                {icon} {label}
              </Typography>
              <Typography variant="subtitle1" fontWeight={bold ? 900 : 700}
                sx={{ color, lineHeight:1.2, mt:0.3 }}>{fmtM(val)}</Typography>
            </Box>
          ))}
        </Box>

        {/* ── Área del gráfico ── */}
        <Box sx={{ flex:1, overflowX:'auto', overflowY:'auto', px:3, py:3,
          '&::-webkit-scrollbar':{ height:6 },
          '&::-webkit-scrollbar-track':{ bgcolor:'rgba(255,255,255,0.04)' },
          '&::-webkit-scrollbar-thumb':{ bgcolor:'rgba(255,255,255,0.15)', borderRadius:3 },
        }}>
          {/* Contenedor principal del gráfico */}
          <Box sx={{ display:'flex', gap:0, minWidth: weeksData.length * (FULL_BAR_W + 4) + 60 }}>

            {/* Eje Y */}
            <Box sx={{ width:52, flexShrink:0, position:'relative', height: FULL_BAR_H, mr:1 }}>
              {yLabels.map(({ frac, val, y }) => (
                <Box key={frac} sx={{ position:'absolute', top: y, right:0, transform:'translateY(-50%)',
                  display:'flex', alignItems:'center', gap:0.5 }}>
                  <Typography variant="caption" sx={{ fontSize:'0.58rem', color:CHART_AXIS, whiteSpace:'nowrap', textAlign:'right' }}>
                    {frac === 0 ? '' : fmtM(val).replace('$','')}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Gráfico con fondo oscuro */}
            <Box sx={{ position:'relative', bgcolor: CHART_BG, borderRadius:2, p:2, flex:1,
              border:'1px solid rgba(255,255,255,0.06)',
              boxShadow:'inset 0 0 40px rgba(0,0,0,0.3)',
            }}>
              {/* Líneas de cuadrícula horizontales */}
              {yLabels.slice(1).map(({ frac, y }) => (
                <Box key={frac} sx={{
                  position:'absolute', top: y + 16, left:16, right:16,
                  borderTop: frac === limiteFrac ? '2px dashed rgba(239,68,68,0.6)' : `1px solid ${CHART_GRID}`,
                  zIndex:1, pointerEvents:'none',
                }}/>
              ))}

              {/* Línea límite */}
              <Box sx={{ position:'absolute', top: limiteTopPx + 16, left:16, right:16,
                borderTop:'2px dashed rgba(239,68,68,0.7)', zIndex:3, pointerEvents:'none' }}>
                <Box sx={{ position:'absolute', right:0, top:-22, bgcolor:'rgba(239,68,68,0.15)',
                  border:'1px solid rgba(239,68,68,0.4)', borderRadius:1, px:1, py:0.2 }}>
                  <Typography variant="caption" sx={{ color:'#f87171', fontSize:'0.62rem', fontWeight:700 }}>
                    Límite {fmtM(avgLimite)}
                  </Typography>
                </Box>
              </Box>

              {/* Línea 80% */}
              <Box sx={{ position:'absolute', top: alerta80Top + 16, left:16, right:16,
                borderTop:'1px dashed rgba(251,146,60,0.5)', zIndex:2, pointerEvents:'none' }}>
                <Box sx={{ position:'absolute', left:0, top:-18, bgcolor:'rgba(251,146,60,0.12)',
                  border:'1px solid rgba(251,146,60,0.35)', borderRadius:1, px:0.8, py:0.1 }}>
                  <Typography variant="caption" sx={{ color:'#fb923c', fontSize:'0.58rem', fontWeight:700 }}>80%</Typography>
                </Box>
              </Box>

              {/* Separadores de mes */}
              {MESES_COMPLETOS.map((_, i) => {
                if (i === 0) return null;
                const leftPx = 16 + Math.round(i * 52 / 12) * (FULL_BAR_W + 4);
                return (
                  <Box key={i} sx={{ position:'absolute', top:16, bottom:0, left: leftPx,
                    borderLeft:'1px solid rgba(255,255,255,0.04)', zIndex:0, pointerEvents:'none' }}/>
                );
              })}

              {/* Barras */}
              <Box sx={{ display:'flex', gap:'4px', alignItems:'flex-end', height: FULL_BAR_H, position:'relative', zIndex:2 }}>
                {weeksData.map(w => {
                  const enc      = parseFloat(w.encadenados)           || 0;
                  const factEnc  = parseFloat(w.deuda_facturada_enc)   || 0;
                  const noEnc    = parseFloat(w.deuda_facturada_nenc)  || 0;
                  const total    = enc + factEnc + noEnc;
                  const hEnc     = total > 0 ? Math.max(2, Math.round(enc     / maxVal * FULL_BAR_H)) : 0;
                  const hFactEnc = total > 0 ? Math.max(0, Math.round(factEnc / maxVal * FULL_BAR_H)) : 0;
                  const hNoEnc   = total > 0 ? Math.max(0, Math.round(noEnc   / maxVal * FULL_BAR_H)) : 0;
                  const isCurrent = w.semana === currentWeek;
                  const sc = STATUS_MAP[w.estado] || STATUS_MAP.OK;
                  const hasDatos = total > 0;
                  const isExcedido = w.estado === 'EXCEDIDO';
                  const isAlerta   = w.estado === 'ALERTA';

                  return (
                    <Tooltip key={w.semana} arrow placement="top"
                      componentsProps={{ tooltip:{ sx:{ bgcolor:'#1e293b', border:'1px solid rgba(255,255,255,0.12)', p:1.5, maxWidth:220 } } }}
                      title={
                        <Box>
                          <Typography fontWeight={800} display="block" sx={{ color:'white', fontSize:'0.78rem' }}>
                            Semana {w.semana} {w.fecha_inicio ? `· ${fmtDate(w.fecha_inicio)} – ${fmtDate(w.fecha_fin)}` : ''}
                          </Typography>
                          <Divider sx={{ my:0.8, borderColor:'rgba(255,255,255,0.12)' }}/>
                          {[
                            { l:'Enc. OC',        v: enc,      c:'#60a5fa' },
                            { l:'Enc. Fact.',      v: factEnc,  c:'#c084fc' },
                            { l:'No Enc.',         v: noEnc,    c:'#34d399' },
                            { l:'Total',           v: total,    c:'white', bold:true },
                            { l:'Límite',          v: parseFloat(w.limite_semanal)||100_000_000, c:'rgba(255,255,255,0.5)' },
                          ].map(({ l, v, c, bold }) => (
                            <Box key={l} sx={{ display:'flex', justifyContent:'space-between', gap:2, mb:0.3 }}>
                              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.5)' }}>{l}</Typography>
                              <Typography variant="caption" sx={{ color:c, fontWeight: bold ? 800 : 500 }}>{fmtM(v)}</Typography>
                            </Box>
                          ))}
                          <Box sx={{ mt:0.8, px:1, py:0.4, borderRadius:1, bgcolor: alpha(sc.color, 0.2), border:`1px solid ${alpha(sc.color,0.4)}`, textAlign:'center' }}>
                            <Typography variant="caption" sx={{ color: sc.color, fontWeight:800 }}>{sc.label}</Typography>
                          </Box>
                        </Box>
                      }>
                      <Box
                        onClick={() => { onJump(w.semana); onClose(); }}
                        sx={{
                          width: FULL_BAR_W, height:'100%',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
                          cursor:'pointer', position:'relative',
                          '&:hover .bar-stack': { filter:'brightness(1.25)', transform:'scaleY(1.03)', transformOrigin:'bottom' },
                        }}
                      >
                        {/* Etiqueta semana actual */}
                        {isCurrent && (
                          <Box sx={{ position:'absolute', top:-8, left:'50%', transform:'translateX(-50%)',
                            bgcolor: ENC_DARK, borderRadius:1, px:0.6, py:0.1, border:'1px solid rgba(255,255,255,0.3)' }}>
                            <Typography variant="caption" sx={{ fontSize:'0.58rem', fontWeight:900, color:'white', whiteSpace:'nowrap' }}>
                              S{w.semana}
                            </Typography>
                          </Box>
                        )}
                        {/* Barra apilada */}
                        <Box className="bar-stack" sx={{
                          width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end',
                          borderRadius:'3px 3px 0 0', overflow:'hidden',
                          opacity: isCurrent ? 1 : hasDatos ? 0.78 : 0.15,
                          transition:'filter .12s, transform .12s, opacity .12s',
                          ...(isCurrent && { boxShadow:`0 0 12px 2px ${alpha(ENC_MID, 0.6)}`, opacity:1 }),
                          ...(isExcedido && { boxShadow:'0 0 8px 2px rgba(239,68,68,0.45)' }),
                        }}>
                          {hNoEnc   > 0 && <Box sx={{ height: hNoEnc,   background:'linear-gradient(180deg,#34d399,#059669)' }}/>}
                          {hFactEnc > 0 && <Box sx={{ height: hFactEnc, background:'linear-gradient(180deg,#c084fc,#7c3aed)' }}/>}
                          {hEnc     > 0 && <Box sx={{ height: hEnc,
                            background: isExcedido
                              ? 'linear-gradient(180deg,#f87171,#dc2626)'
                              : isAlerta
                              ? 'linear-gradient(180deg,#fb923c,#ea580c)'
                              : isCurrent
                              ? 'linear-gradient(180deg,#93c5fd,#1d4ed8)'
                              : 'linear-gradient(180deg,#60a5fa,#1e40af)'
                          }}/>}
                          {!hasDatos && <Box sx={{ height:3, bgcolor:'rgba(255,255,255,0.1)', borderRadius:'3px 3px 0 0' }}/>}
                        </Box>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Eje X — números semana */}
              <Box sx={{ display:'flex', gap:'4px', mt:1 }}>
                {weeksData.map(w => {
                  const isCurrent = w.semana === currentWeek;
                  const show = isCurrent || w.semana % 4 === 1;
                  return (
                    <Box key={w.semana} sx={{ width: FULL_BAR_W, textAlign:'center', flexShrink:0 }}>
                      <Typography variant="caption" sx={{
                        fontSize:'0.58rem',
                        color: isCurrent ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                        fontWeight: isCurrent ? 900 : 400,
                      }}>{show ? `S${w.semana}` : ''}</Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Eje X — meses */}
              <Box sx={{ position:'relative', height:18, mt:0.5 }}>
                {MESES_COMPLETOS.map((mes, i) => {
                  const leftPx = Math.round(i * 52 / 12) * (FULL_BAR_W + 4);
                  return (
                    <Typography key={mes} variant="caption" sx={{
                      position:'absolute', left: leftPx,
                      fontSize:'0.68rem', color:'rgba(255,255,255,0.45)', fontWeight:600,
                      whiteSpace:'nowrap', letterSpacing:0.3,
                    }}>{mes}</Typography>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* ── Leyenda ── */}
          <Box sx={{ display:'flex', gap:2.5, mt:2.5, flexWrap:'wrap', alignItems:'center',
            px:2, py:1.2, bgcolor:'rgba(255,255,255,0.04)', borderRadius:2,
            border:'1px solid rgba(255,255,255,0.07)' }}>
            {[
              { gradient:'linear-gradient(180deg,#60a5fa,#1e40af)', label:'Encadenados OC' },
              { gradient:'linear-gradient(180deg,#c084fc,#7c3aed)', label:'Enc. Facturado (PBI)' },
              { gradient:'linear-gradient(180deg,#34d399,#059669)', label:'No Encadenados (ERP)' },
            ].map(({ gradient, label }) => (
              <Box key={label} sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <Box sx={{ width:12, height:14, borderRadius:'2px', background:gradient, flexShrink:0 }}/>
                <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.6)', fontSize:'0.72rem' }}>{label}</Typography>
              </Box>
            ))}
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Box sx={{ width:20, borderTop:'2px dashed rgba(239,68,68,0.7)' }}/>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.6)', fontSize:'0.72rem' }}>Límite semanal</Typography>
            </Box>
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Box sx={{ width:20, borderTop:'2px dashed rgba(251,146,60,0.6)' }}/>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.6)', fontSize:'0.72rem' }}>80% del límite</Typography>
            </Box>
          </Box>

          {/* ── Alertas ── */}
          {semanasAlerta.length > 0 && (
            <Box sx={{ mt:2.5, p:2, bgcolor:'rgba(255,255,255,0.03)', borderRadius:2, border:'1px solid rgba(255,255,255,0.07)' }}>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:1, fontSize:'0.65rem' }}>
                SEMANAS CON ALERTAS
              </Typography>
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mt:1 }}>
                {semanasAlerta.map(w => {
                  const sc = STATUS_MAP[w.estado] || STATUS_MAP.OK;
                  const total = (parseFloat(w.encadenados)||0) + (parseFloat(w.deuda_facturada_enc)||0);
                  return (
                    <Chip key={w.semana} size="small"
                      label={`S${w.semana} · ${sc.label} · ${fmtM(total)}`}
                      onClick={() => { onJump(w.semana); onClose(); }}
                      sx={{ bgcolor: alpha(sc.color, 0.15), color: sc.color, fontWeight:700,
                        border:`1px solid ${alpha(sc.color,0.3)}`, cursor:'pointer',
                        '&:hover':{ bgcolor: alpha(sc.color, 0.25) } }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ── Tabla compacta ── */}
          <Box sx={{ mt:2.5 }}>
            <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.45)', fontWeight:700, letterSpacing:1, fontSize:'0.65rem' }}>
              DETALLE POR SEMANA
            </Typography>
            <Box sx={{ overflowX:'auto', mt:1, borderRadius:2, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
              <Table size="small" sx={{ bgcolor:'rgba(255,255,255,0.03)' }}>
                <TableHead>
                  <TableRow sx={{ '& th':{ fontWeight:700, fontSize:'0.65rem', whiteSpace:'nowrap', py:1,
                    color:'rgba(255,255,255,0.5)', bgcolor:'rgba(255,255,255,0.05)',
                    borderBottom:'1px solid rgba(255,255,255,0.08)' } }}>
                    <TableCell>Sem.</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell align="right" sx={{ color:'#60a5fa !important' }}>Enc. OC</TableCell>
                    <TableCell align="right" sx={{ color:'#c084fc !important' }}>Enc. Fact.</TableCell>
                    <TableCell align="right" sx={{ color:'#93c5fd !important' }}>Total Enc.</TableCell>
                    <TableCell align="right" sx={{ color:'#34d399 !important' }}>No Enc.</TableCell>
                    <TableCell align="right">Total General</TableCell>
                    <TableCell align="right">Límite</TableCell>
                    <TableCell align="center">% Uso</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weeksData.map(w => {
                    const enc       = parseFloat(w.encadenados)           || 0;
                    const factEnc   = parseFloat(w.deuda_facturada_enc)   || 0;
                    const noEnc     = parseFloat(w.deuda_facturada_nenc)  || 0;
                    const totalEnc  = enc + factEnc;
                    const totalGen  = totalEnc + noEnc;
                    const limite    = parseFloat(w.limite_semanal)        || 100_000_000;
                    const pctUso    = limite > 0 ? Math.round(totalEnc / limite * 100) : 0;
                    const isCurrent = w.semana === currentWeek;
                    const sc        = STATUS_MAP[w.estado] || STATUS_MAP.OK;
                    const hasDatos  = enc > 0 || factEnc > 0 || noEnc > 0;
                    return (
                      <TableRow key={w.semana} onClick={() => { onJump(w.semana); onClose(); }}
                        sx={{
                          cursor:'pointer',
                          bgcolor: isCurrent ? 'rgba(96,165,250,0.08)' : 'transparent',
                          '&:hover':{ bgcolor:'rgba(255,255,255,0.04)' },
                          '& td':{ py:0.4, fontSize:'0.7rem', color:'rgba(255,255,255,0.75)',
                            borderBottom:'1px solid rgba(255,255,255,0.05)' },
                        }}>
                        <TableCell>
                          <Typography variant="caption" fontWeight={isCurrent ? 900 : 500}
                            sx={{ color: isCurrent ? '#93c5fd' : 'rgba(255,255,255,0.75)' }}>
                            {isCurrent ? '▶ ' : ''}S{w.semana}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color:'rgba(255,255,255,0.4) !important', whiteSpace:'nowrap' }}>
                          {w.fecha_inicio ? `${fmtDate(w.fecha_inicio)} – ${fmtDate(w.fecha_fin)}` : '–'}
                        </TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ color: enc>0?'#60a5fa':'rgba(255,255,255,0.2)', fontWeight:enc>0?700:400 }}>{enc>0?fmtM(enc):'–'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ color: factEnc>0?'#c084fc':'rgba(255,255,255,0.2)', fontWeight:factEnc>0?700:400 }}>{factEnc>0?fmtM(factEnc):'–'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ color: totalEnc>0?'#93c5fd':'rgba(255,255,255,0.2)', fontWeight:900 }}>{totalEnc>0?fmtM(totalEnc):'–'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ color: noEnc>0?'#34d399':'rgba(255,255,255,0.2)', fontWeight:noEnc>0?700:400 }}>{noEnc>0?fmtM(noEnc):'–'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="caption" sx={{ fontWeight:900, color: totalGen>0?(totalEnc>limite?'#f87171':'rgba(255,255,255,0.85)'):'rgba(255,255,255,0.2)' }}>{totalGen>0?fmtM(totalGen):'–'}</Typography></TableCell>
                        <TableCell align="right" sx={{ color:'rgba(255,255,255,0.35) !important' }}>{fmtM(limite)}</TableCell>
                        <TableCell align="center">
                          {hasDatos ? (
                            <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.5 }}>
                              <LinearProgress variant="determinate" value={Math.min(pctUso,100)}
                                sx={{ width:44, height:4, borderRadius:2,
                                  bgcolor:'rgba(255,255,255,0.08)',
                                  '& .MuiLinearProgress-bar':{ bgcolor: sc.color, borderRadius:2 } }}/>
                              <Typography variant="caption" sx={{ color: sc.color, fontWeight:700, fontSize:'0.62rem' }}>{pctUso}%</Typography>
                            </Box>
                          ) : <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.2)' }}>–</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={sc.label}
                            sx={{ bgcolor: alpha(sc.color, 0.18), color: sc.color,
                              border:`1px solid ${alpha(sc.color,0.35)}`,
                              fontWeight:700, fontSize:'0.58rem', height:17 }}/>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

// ─── Tira de alertas de semanas ───────────────────────────────────────────────
function AlertasSemanas({ weeksData, currentWeek, onJump }) {
  const [open, setOpen] = useState(true);
  // Mostrar ±8 semanas alrededor de la actual + semanas con problemas
  const semanas = weeksData.filter(w => Math.abs(w.semana - currentWeek) <= 8);
  if (semanas.length === 0) return null;

  return (
    <Box sx={{ mb:2 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:0.8, cursor:'pointer' }}
        onClick={() => setOpen(v => !v)}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} textTransform="uppercase">
          Estado de semanas cercanas
        </Typography>
        <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
          <Typography variant="caption" color="text.disabled" fontSize="0.68rem">{open ? 'Ocultar' : 'Mostrar'}</Typography>
          {open ? <ExpandLessIcon fontSize="small" sx={{ color:'text.disabled', fontSize:16 }}/> : <ExpandMoreIcon fontSize="small" sx={{ color:'text.disabled', fontSize:16 }}/>}
        </Box>
      </Box>
      <Collapse in={open}>
      <Box sx={{ display:'flex', gap:0.8, overflowX:'auto', pb:0.5,
        '&::-webkit-scrollbar':{ height:4 },
        '&::-webkit-scrollbar-track':{ bgcolor:'transparent' },
        '&::-webkit-scrollbar-thumb':{ bgcolor:'#ccc', borderRadius:2 },
      }}>
        {semanas.map(w => {
          const isCurrent  = w.semana === currentWeek;
          const tieneDatos = (w.encadenados || 0) > 0 || (w.deuda_facturada_nenc || 0) > 0;
          const esPasada   = w.semana < currentWeek;
          const sc         = STATUS_MAP[w.estado] || STATUS_MAP.OK;

          // Usar el estado del backend directamente para determinar colores
          const sinDatos = w.estado === 'SIN_DATOS';
          const revisar  = w.estado === 'REVISAR';
          const bgColor  = isCurrent ? ENC_MID
            : tieneDatos || sinDatos || revisar ? alpha(sc.color, 0.12)
            : alpha('#757575', 0.06);
          const dotColor = isCurrent ? 'white'
            : (tieneDatos || sinDatos || revisar) ? sc.color
            : esPasada ? '#cfd8dc' : '#bdbdbd';
          const prefix = sinDatos ? '— ' : revisar ? '⚡ '
            : (w.estado === 'ALERTA' || w.estado === 'EXCEDIDO') ? '⚠ '
            : tieneDatos ? '✓ ' : '';
          const label = `${prefix}Sem. ${w.semana}`;

          const tooltipText = sinDatos
            ? `Sin datos · Semana ${w.semana} ya pasó sin registros`
            : revisar
              ? `Revisar · Semana ${w.semana} tiene facturas sin OC registrada`
              : tieneDatos
                ? `Semana ${w.semana} · ${sc.label} · ${w.estado || 'OK'}`
                : esPasada
                  ? `Falta carga · Semana ${w.semana}`
                  : `Semana ${w.semana} · pendiente`;

          return (
            <Tooltip key={w.semana} title={tooltipText}>
              <Box onClick={() => onJump(w.semana)}
                sx={{
                  flexShrink: 0,
                  px: 1.5, py: 0.6,
                  borderRadius: 2,
                  bgcolor: bgColor,
                  border: '1px solid',
                  borderColor: isCurrent ? ENC_MID : (tieneDatos || sinDatos || revisar) ? sc.color : 'divider',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  '&:hover': { transform:'translateY(-2px)', boxShadow:2 },
                }}>
                <Typography variant="caption" fontWeight={isCurrent ? 800 : 500}
                  color={dotColor}
                  fontSize="0.72rem" noWrap>
                  {label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      </Collapse>
    </Box>
  );
}

// ─── Helper: mes abreviado desde fecha ISO ────────────────────────────────────
const MESES_ABREV = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const mesAbrev = (fechaStr) => {
  if (!fechaStr) return '–';
  const m = new Date(fechaStr).getMonth();
  return isNaN(m) ? '–' : MESES_ABREV[m];
};

// ─── Tabla anual (Hoja 1 del Excel — 52 semanas) — datos por semana de VENCIMIENTO
function TablaAnual({ weeksData, año, currentWeek, onJump }) {
  const [open, setOpen] = useState(false);
  if (!weeksData || weeksData.length === 0) return null;

  const totEncOC     = weeksData.reduce((s,w) => s + (parseFloat(w.encadenados)         || 0), 0);
  const totFactEnc   = weeksData.reduce((s,w) => s + (parseFloat(w.deuda_facturada_enc) || 0), 0);
  const totEncTotal  = totEncOC + totFactEnc;
  const totNoEnc     = weeksData.reduce((s,w) => s + (parseFloat(w.deuda_facturada_nenc)|| 0), 0);
  const totGeneral   = totEncTotal + totNoEnc;

  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, mb:2, overflow:'hidden' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:2, py:1.5,
        cursor:'pointer', '&:hover':{ bgcolor:'action.hover' } }} onClick={() => setOpen(v => !v)}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Avatar sx={{ width:34, height:34, bgcolor: alpha('#1a237e', 0.08), color:'#1a237e' }}>
            <TrendingUpIcon sx={{ fontSize:16 }}/>
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Control Pagos Semanales {año} — por Semana de Vencimiento
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enc. OC {fmtM(totEncOC)} · Enc. Fact. {fmtM(totFactEnc)} · Total Enc. {fmtM(totEncTotal)} · No Enc. {fmtM(totNoEnc)} · Total {fmtM(totGeneral)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.68rem">
            {open ? 'Ocultar' : 'Ver tabla'}
          </Typography>
          {open ? <ExpandLessIcon fontSize="small"/> : <ExpandMoreIcon fontSize="small"/>}
        </Box>
      </Box>
      <Collapse in={open}>
        <Divider/>
        <Box sx={{ overflowX:'auto', maxHeight:460, overflowY:'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th':{ fontWeight:700, fontSize:'0.63rem', py:0.8, bgcolor:'#f5f5f5', whiteSpace:'nowrap' }}}>
                <Tooltip title="Número de semana ISO del año" arrow placement="top"><TableCell sx={{cursor:'default'}}>Sem.</TableCell></Tooltip>
                <Tooltip title="Mes al que pertenece la semana" arrow placement="top"><TableCell sx={{cursor:'default'}}>Mes</TableCell></Tooltip>
                <Tooltip title="Período de vencimiento: lunes a domingo de la semana" arrow placement="top"><TableCell sx={{cursor:'default'}}>Período</TableCell></Tooltip>
                <Tooltip title="Límite presupuestario semanal asignado para pagos encadenados" arrow placement="top"><TableCell align="right" sx={{cursor:'default'}}>Límite</TableCell></Tooltip>
                <Tooltip title="Encadenados por Órdenes de Compra — pagos comprometidos registrados manualmente via Excel OC" arrow placement="top"><TableCell align="right" sx={{ color: ENC_DARK, cursor:'default' }}>Enc. OC</TableCell></Tooltip>
                <Tooltip title="Encadenados Facturados — deuda encadenada ya facturada, extraída de facturas PBI" arrow placement="top"><TableCell align="right" sx={{ color:'#6a1b9a', cursor:'default' }}>Enc. Fact.</TableCell></Tooltip>
                <Tooltip title="Total Encadenados = OC + Facturas PBI encadenadas. Suma de todos los compromisos encadenados de la semana" arrow placement="top"><TableCell align="right" sx={{ color: ENC_DARK, fontWeight:900, cursor:'default' }}>Total Enc.</TableCell></Tooltip>
                <Tooltip title="No Encadenados (ERP) — deuda facturada de proveedores no encadenados, obtenida directamente del ERP" arrow placement="top"><TableCell align="right" sx={{ color: NENC_DARK, cursor:'default' }}>No Enc. (ERP)</TableCell></Tooltip>
                <Tooltip title="Total General = Total Encadenados + No Encadenados. Visión completa de todos los compromisos de pago de la semana" arrow placement="top"><TableCell align="right" sx={{cursor:'default', fontWeight:900}}>Total General</TableCell></Tooltip>
                <Tooltip title="Capacidad Disponible = Límite − Total Encadenados. Margen restante antes de alcanzar el límite" arrow placement="top"><TableCell align="right" sx={{cursor:'default'}}>Cap. Disp.</TableCell></Tooltip>
                <Tooltip title="Porcentaje de uso del límite semanal (Total Encadenados / Límite × 100)" arrow placement="top"><TableCell align="center" sx={{cursor:'default'}}>% Uso</TableCell></Tooltip>
                <Tooltip title="Estado calculado: OK · ALERTA (≥80% límite) · EXCEDIDO (>100%) · REVISAR (facturas sin OC) · SIN DATOS (semana pasada sin registros)" arrow placement="top"><TableCell align="center" sx={{cursor:'default'}}>Estado</TableCell></Tooltip>
              </TableRow>
            </TableHead>
            <TableBody>
              {weeksData.map(w => {
                const enc        = parseFloat(w.encadenados)           || 0;
                const factEnc    = parseFloat(w.deuda_facturada_enc)   || 0;
                const factNenc   = parseFloat(w.deuda_facturada_nenc)  || 0;
                const totalEnc   = enc + factEnc;
                const totalGen   = totalEnc + factNenc;
                const limite     = parseFloat(w.limite_semanal)        || 100_000_000;
                const cap        = limite - totalEnc;
                const pctUso     = limite > 0 ? Math.round((totalEnc / limite) * 100) : 0;
                const esCurrent  = w.semana === currentWeek;
                const sc         = STATUS_MAP[w.estado] || STATUS_MAP.OK;
                const hayDatos   = enc > 0 || factEnc > 0 || factNenc > 0;
                return (
                  <TableRow key={w.semana} onClick={() => onJump(w.semana)}
                    sx={{ cursor:'pointer',
                      bgcolor: esCurrent ? alpha(ENC_MID, 0.08) : 'transparent',
                      '&:hover':{ bgcolor: alpha('#000', 0.03) },
                      '& td':{ py:0.5, fontSize:'0.72rem' },
                    }}>
                    <TableCell>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.8 }}>
                        {esCurrent && <Box sx={{ width:6, height:6, borderRadius:'50%', bgcolor:ENC_MID }}/>}
                        <Typography variant="caption" fontWeight={esCurrent ? 800 : 500} color={esCurrent ? ENC_MID : 'text.primary'}>
                          S{w.semana}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color:'text.secondary', fontSize:'0.68rem !important' }}>
                      {mesAbrev(w.fecha_inicio)}
                    </TableCell>
                    <TableCell sx={{ color:'text.secondary', fontSize:'0.68rem !important', whiteSpace:'nowrap' }}>
                      {w.fecha_inicio
                        ? `${fmtDate(w.fecha_inicio)} — ${fmtDate(w.fecha_fin)}`
                        : '–'}
                    </TableCell>
                    <TableCell align="right" sx={{ color:'text.secondary' }}>{fmtM(limite)}</TableCell>
                    {/* Enc. OC */}
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={enc > 0 ? 700 : 400} color={enc > 0 ? ENC_DARK : 'text.disabled'}>
                        {enc > 0 ? fmtM(enc) : '–'}
                      </Typography>
                    </TableCell>
                    {/* Enc. Fact. (PBI) */}
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={factEnc > 0 ? 700 : 400} color={factEnc > 0 ? '#6a1b9a' : 'text.disabled'}>
                        {factEnc > 0 ? fmtM(factEnc) : '–'}
                      </Typography>
                    </TableCell>
                    {/* Total Enc. = OC + Fact */}
                    <TableCell align="right" sx={{ bgcolor: hayDatos ? alpha(ENC_BG, 0.6) : 'transparent' }}>
                      <Typography variant="caption" fontWeight={totalEnc > 0 ? 800 : 400} color={totalEnc > 0 ? ENC_DARK : 'text.disabled'}>
                        {totalEnc > 0 ? fmtM(totalEnc) : '–'}
                      </Typography>
                    </TableCell>
                    {/* No Enc. */}
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={factNenc > 0 ? 700 : 400} color={factNenc > 0 ? NENC_DARK : 'text.disabled'}>
                        {factNenc > 0 ? fmtM(factNenc) : '–'}
                      </Typography>
                    </TableCell>
                    {/* Total General */}
                    <TableCell align="right" sx={{ bgcolor: hayDatos ? alpha('#e65100', 0.04) : 'transparent' }}>
                      <Typography variant="caption" fontWeight={totalGen > 0 ? 800 : 400}
                        color={totalGen > limite ? '#b71c1c' : totalGen > 0 ? '#e65100' : 'text.disabled'}>
                        {totalGen > 0 ? fmtM(totalGen) : '–'}
                      </Typography>
                    </TableCell>
                    {/* Cap. Disponible */}
                    <TableCell align="right">
                      <Typography variant="caption" fontWeight={600}
                        color={cap < 0 ? '#b71c1c' : cap < limite * 0.2 ? '#e65100' : '#2e7d32'}>
                        {fmtM(cap)}
                      </Typography>
                    </TableCell>
                    {/* % Uso */}
                    <TableCell align="center">
                      {hayDatos ? (
                        <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.5 }}>
                          <Box sx={{ width:32, height:5, bgcolor:'#e0e0e0', borderRadius:3, overflow:'hidden' }}>
                            <Box sx={{ width:`${Math.min(pctUso,100)}%`, height:'100%', borderRadius:3,
                              bgcolor: pctUso>=100?'#b71c1c': pctUso>=80?'#e65100':'#43a047', transition:'width .3s' }}/>
                          </Box>
                          <Typography variant="caption" fontSize="0.62rem" fontWeight={700}
                            color={pctUso>=100?'#b71c1c': pctUso>=80?'#e65100':'#43a047'}>
                            {pctUso}%
                          </Typography>
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">–</Typography>}
                    </TableCell>
                    {/* Estado */}
                    <TableCell align="center">
                      {(hayDatos || w.estado === 'SIN_DATOS') ? (() => {
                        const estadoTooltip = {
                          OK:        `Todo en orden — los pagos encadenados están dentro del límite semanal (${fmtM(totalEnc)} de ${fmtM(limite)})`,
                          ALERTA:    `Atención — se ha utilizado el ${pctUso}% del límite (${fmtM(totalEnc)} de ${fmtM(limite)}). Quedan ${fmtM(limite - totalEnc)} disponibles`,
                          EXCEDIDO:  `Límite superado — los pagos encadenados (${fmtM(totalEnc)}) exceden el límite semanal de ${fmtM(limite)}`,
                          SIN_DATOS: `Semana ${w.semana} ya transcurrió sin registros de OC ni facturas cargadas`,
                          REVISAR:   `Hay ${fmtM(factEnc)} en facturas PBI encadenadas pero no se encontraron Órdenes de Compra registradas para esta semana. Verificar si el Excel de OC fue cargado correctamente o si las OC están asignadas a otra semana`,
                        }[w.estado] || sc.label;
                        return (
                          <Tooltip title={estadoTooltip} arrow placement="left">
                            <Chip label={sc.label} size="small"
                              sx={{ bgcolor: sc.color, color:'white', fontWeight:700, fontSize:'0.6rem', height:18, cursor:'help' }}/>
                          </Tooltip>
                        );
                      })() : <Typography variant="caption" color="text.disabled">–</Typography>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Stats anuales (colapsable) ───────────────────────────────────────────────
function StatsAnuales({ stats }) {
  const [open, setOpen] = useState(false);
  if (!stats) return null;
  const items = [
    { label: 'Total año',          value: fmtM(stats.totalAnual),   color: '#1a237e', icon: TrendingUpIcon },
    { label: 'Encadenados',        value: fmtM(stats.totalEnc),     color: ENC_MID,   icon: EncadenadoIcon },
    { label: 'No Encadenados',     value: fmtM(stats.totalNenc),    color: NENC_MID,  icon: NoEncadenadoIcon },
    { label: 'Semanas con datos',  value: stats.semanasConDatos,    color: '#2e7d32', icon: OkIcon },
    { label: 'En alerta',          value: stats.semanasAlerta,      color: '#e65100', icon: WarningIcon },
    { label: 'Excedidas',          value: stats.semanasExcedido,    color: '#b71c1c', icon: ExceedIcon },
  ];
  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, mb:2, overflow:'hidden' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:2, py:1.2,
        cursor:'pointer', '&:hover':{ bgcolor:'action.hover' } }} onClick={() => setOpen(v=>!v)}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} textTransform="uppercase">
          Resumen anual {stats.año} · {fmtM(stats.totalAnual)}
        </Typography>
        <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
          <Typography variant="caption" color="text.disabled" fontSize="0.68rem">{open ? 'Ocultar' : 'Ver resumen'}</Typography>
          {open ? <ExpandLessIcon fontSize="small" sx={{ color:'text.disabled', fontSize:16 }}/> : <ExpandMoreIcon fontSize="small" sx={{ color:'text.disabled', fontSize:16 }}/>}
        </Box>
      </Box>
      <Collapse in={open}>
        <Divider/>
        <Box sx={{ p:2 }}>
          <Grid container spacing={1}>
            {items.map(({ label, value, color, icon: Icon }) => (
              <Grid item xs={6} sm={4} md={2} key={label}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1, p:1, borderRadius:2,
                  bgcolor: alpha(color, 0.06), border:'1px solid', borderColor: alpha(color, 0.15) }}>
                  <Avatar sx={{ width:28, height:28, bgcolor: alpha(color, 0.15), color }}>
                    <Icon sx={{ fontSize:14 }}/>
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={700} color={color} lineHeight={1}>{value}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Tabla compras por semana de EMISIÓN ─────────────────────────────────────
const EMIT_COLOR = '#00838f';
const EMIT_BG    = '#e0f7fa';

function TablaComprasPorEmision({ semanas, año, loading }) {
  const [open, setOpen] = useState(true);

  const totEncOC   = semanas.reduce((s,w) => s + (parseFloat(w.enc_oc)  || 0), 0);
  const totNoEnc   = semanas.reduce((s,w) => s + (parseFloat(w.no_enc)  || 0), 0);
  const totGeneral = semanas.reduce((s,w) => s + (parseFloat(w.total)   || 0), 0);
  const semanasConDatos = semanas.filter(w => (w.total || 0) > 0).length;

  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, mb:2, overflow:'hidden' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:2, py:1.5,
        cursor:'pointer', '&:hover':{ bgcolor:'action.hover' } }} onClick={() => setOpen(v=>!v)}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Avatar sx={{ width:34, height:34, bgcolor: alpha(EMIT_COLOR, 0.1), color: EMIT_COLOR }}>
            <CalendarMonthIcon sx={{ fontSize:16 }}/>
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Compras Generadas por Semana de Emisión — {año}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <Box component="span" sx={{ color: ENC_DARK, fontWeight:700 }}>Enc. OC {fmtM(totEncOC)}</Box>
              {' · '}
              <Box component="span" sx={{ color: NENC_DARK, fontWeight:700 }}>No Enc. {fmtM(totNoEnc)}</Box>
              {' · '}
              <Box component="span" sx={{ color: EMIT_COLOR, fontWeight:700 }}>Total {fmtM(totGeneral)}</Box>
              {` · ${semanasConDatos} semanas con datos`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.68rem">
            {open ? 'Ocultar' : 'Ver tabla'}
          </Typography>
          {open ? <ExpandLessIcon fontSize="small"/> : <ExpandMoreIcon fontSize="small"/>}
        </Box>
      </Box>
      <Collapse in={open}>
        <Divider/>
        {loading
          ? <Box sx={{ p:4, textAlign:'center' }}><CircularProgress size={24} sx={{ color:EMIT_COLOR }}/></Box>
          : (
          <Box sx={{ overflowX:'auto', maxHeight:520, overflowY:'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th':{ fontWeight:700, fontSize:'0.63rem', py:0.8, bgcolor:'#f5f5f5', whiteSpace:'nowrap' }}}>
                  <TableCell>Sem.</TableCell>
                  <TableCell>Mes</TableCell>
                  <TableCell>Período de Emisión</TableCell>
                  <TableCell align="right" sx={{ color: ENC_DARK }}>Encadenados OC</TableCell>
                  <TableCell align="right" sx={{ color: NENC_DARK }}>No Enc. (ERP)</TableCell>
                  <TableCell align="right" sx={{ color: EMIT_COLOR, fontWeight:900 }}>Total General</TableCell>
                  <TableCell align="center">Órdenes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {semanas.map(w => {
                  const hayDatos = (w.total || 0) > 0;
                  return (
                    <TableRow key={w.numero_semana} sx={{
                      bgcolor: hayDatos ? alpha(EMIT_COLOR, 0.03) : 'transparent',
                      '&:hover':{ bgcolor: alpha(EMIT_COLOR, 0.07) },
                      '& td':{ py:0.5, fontSize:'0.72rem' },
                    }}>
                      <TableCell>
                        <Typography variant="caption" fontWeight={hayDatos ? 800 : 400} color={hayDatos ? EMIT_COLOR : 'text.disabled'}>
                          S{w.numero_semana}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color:'text.secondary', fontSize:'0.68rem !important' }}>
                        {mesAbrev(w.fecha_inicio)}
                      </TableCell>
                      <TableCell sx={{ color:'text.secondary', fontSize:'0.68rem !important', whiteSpace:'nowrap' }}>
                        {w.fecha_inicio ? `${fmtDate(w.fecha_inicio)} — ${fmtDate(w.fecha_fin)}` : '–'}
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: w.enc_oc > 0 ? alpha(ENC_BG, 0.6) : 'transparent' }}>
                        <Typography variant="caption" fontWeight={w.enc_oc > 0 ? 800 : 400} color={w.enc_oc > 0 ? ENC_DARK : 'text.disabled'}>
                          {w.enc_oc > 0 ? fmtM(w.enc_oc) : '–'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: w.no_enc > 0 ? alpha(NENC_BG, 0.6) : 'transparent' }}>
                        <Typography variant="caption" fontWeight={w.no_enc > 0 ? 800 : 400} color={w.no_enc > 0 ? NENC_DARK : 'text.disabled'}>
                          {w.no_enc > 0 ? fmtM(w.no_enc) : '–'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: hayDatos ? alpha(EMIT_COLOR, 0.06) : 'transparent' }}>
                        <Typography variant="caption" fontWeight={w.total > 0 ? 900 : 400} color={w.total > 0 ? EMIT_COLOR : 'text.disabled'}>
                          {w.total > 0 ? fmtM(w.total) : '–'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {w.num_ordenes > 0
                          ? <Chip label={w.num_ordenes} size="small" sx={{ height:16, fontSize:'0.6rem', bgcolor: alpha(EMIT_COLOR, 0.1), color: EMIT_COLOR, fontWeight:700 }}/>
                          : <Typography variant="caption" color="text.disabled">–</Typography>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}

// ─── ISO week helper ──────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ─── Dialog Productos OC ──────────────────────────────────────────────────────
function ProductosOCDialog({ open, onClose, numeroOrden, sucursal }) {
  const [productos, setProductos] = React.useState([]);
  const [loadingProd, setLoadingProd] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState('');

  React.useEffect(() => {
    if (!open || !numeroOrden) return;
    setLoadingProd(true);
    setProductos([]);
    setErrMsg('');
    api.get('/planificacion/productos-oc', { params: { numero_orden: numeroOrden, sucursal } })
      .then(r => {
        if (r.data.success) {
          setProductos(r.data.productos || []);
          if (!r.data.productos?.length) setErrMsg(r.data.mensaje || 'Sin detalle de productos');
        } else {
          setErrMsg(r.data.message || 'Error al consultar');
        }
      })
      .catch(e => setErrMsg(e?.response?.data?.message || e.message))
      .finally(() => setLoadingProd(false));
  }, [open, numeroOrden, sucursal]);

  const totalGeneral = productos.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${OC_COLOR} 0%, #004d40 100%)`, px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <OcIcon sx={{ color: 'white', fontSize: 22 }} />
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={800} color="white" variant="subtitle1">
            Detalle Productos — OC {numeroOrden}
          </Typography>
          {sucursal && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{sucursal}</Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {loadingProd && (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ color: OC_COLOR }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Consultando ERP…</Typography>
          </Box>
        )}
        {!loadingProd && errMsg && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <OcIcon sx={{ fontSize: 40, color: alpha(OC_COLOR, 0.2), mb: 1 }} />
            <Typography variant="body2" color="text.secondary">{errMsg}</Typography>
          </Box>
        )}
        {!loadingProd && productos.length > 0 && (
          <>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: alpha(OC_COLOR, 0.08), fontWeight: 700, fontSize: '0.7rem', color: OC_COLOR, py: 1 } }}>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Precio Unit.</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productos.map((p, i) => (
                    <TableRow key={i} sx={{ '& td': { fontSize: '0.75rem', py: 0.6 }, '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Chip label={p.codigo_producto || '–'} size="small"
                          sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(OC_COLOR, 0.07), color: OC_COLOR, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>{p.descripcion || '–'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{p.cantidad}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{fmtM(p.precio_unitario)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: OC_COLOR }}>{fmtM(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Footer totales */}
            <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(OC_COLOR, 0.03) }}>
              <Typography variant="caption" color="text.secondary">
                {productos.length} producto{productos.length !== 1 ? 's' : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Total:</Typography>
                <Typography variant="subtitle2" fontWeight={800} color={OC_COLOR}>{fmtM(totalGeneral)}</Typography>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Vista árbol: Año → Semana → Día (Compras por Emisión) ────────────────────
function VistaArbolEmision({ registros, loading, sospechosasIds = new Set(), onMadre }) {
  const [prodDialog, setProdDialog] = React.useState({ open: false, numeroOrden: '', sucursal: '' });
  const tree = React.useMemo(() => {
    const años = {};
    registros.forEach(r => {
      if (!r.fecha_compra) return;
      const raw = typeof r.fecha_compra === 'string'
        ? r.fecha_compra.split('T')[0]
        : new Date(r.fecha_compra).toISOString().split('T')[0];
      const d   = new Date(raw + 'T12:00:00');
      const año = d.getFullYear();
      const sem = getISOWeek(d);
      const diaLabel = d.toLocaleDateString('es-CL', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
      const isNoEnc  = (r.tipo_proveedor || '').toLowerCase().includes('no');

      if (!años[año]) años[año] = { año, total:0, enc:0, noEnc:0, ordenes:0, semanas:{} };
      años[año].total += r.monto_con_iva || 0;
      if (isNoEnc) años[año].noEnc += r.monto_con_iva || 0;
      else años[año].enc += r.monto_con_iva || 0;
      años[año].ordenes++;

      const sKey = `${año}-${sem}`;
      if (!años[año].semanas[sKey])
        años[año].semanas[sKey] = { semana:sem, total:0, enc:0, noEnc:0, ordenes:0, dias:{} };
      const sObj = años[año].semanas[sKey];
      sObj.total += r.monto_con_iva || 0;
      if (isNoEnc) sObj.noEnc += r.monto_con_iva || 0;
      else sObj.enc += r.monto_con_iva || 0;
      sObj.ordenes++;

      if (!sObj.dias[raw]) sObj.dias[raw] = { diaKey:raw, diaLabel, total:0, enc:0, noEnc:0, registros:[] };
      const dObj = sObj.dias[raw];
      dObj.total += r.monto_con_iva || 0;
      if (isNoEnc) dObj.noEnc += r.monto_con_iva || 0;
      else dObj.enc += r.monto_con_iva || 0;
      dObj.registros.push(r);
    });
    // Agrupar visualmente: misma OC con distintos plazos → 1 fila con total sumado
    Object.values(años).forEach(añoData =>
      Object.values(añoData.semanas).forEach(semData =>
        Object.values(semData.dias).forEach(diaData => {
          const map = {};
          diaData.registros.forEach(r => {
            const k = r.numero_orden
              ? `${r.proveedor||''}|${r.numero_orden}|${r.sucursal||''}`
              : `id_${r.id}`;
            if (map[k]) {
              map[k].monto_con_iva = (map[k].monto_con_iva || 0) + (r.monto_con_iva || 0);
              map[k].monto_neto    = (map[k].monto_neto    || 0) + (r.monto_neto    || 0);
            } else {
              map[k] = { ...r };
            }
          });
          diaData.registros = Object.values(map);
        })
      )
    );
    return años;
  }, [registros]);

  const [open, setOpen] = React.useState({});
  React.useEffect(() => {
    const init = {};
    Object.keys(tree).forEach(a => { init[`a-${a}`] = true; });
    setOpen(init);
  }, [registros.length]); // eslint-disable-line

  const toggle = React.useCallback(k => setOpen(p => ({ ...p, [k]: !p[k] })), []);

  if (loading) return (
    <Box sx={{ p:4, textAlign:'center' }}><CircularProgress size={24} sx={{ color: EMIT_COLOR }}/></Box>
  );
  if (!registros.length) return (
    <Box sx={{ textAlign:'center', py:5 }}>
      <CalendarMonthIcon sx={{ fontSize:48, color:'#ccc', mb:1 }}/>
      <Typography variant="body2" color="text.disabled">Sin datos de emisión para este año</Typography>
    </Box>
  );

  return (
    <>
    <Box sx={{ p:1.5 }}>
      {Object.values(tree).sort((a, b) => b.año - a.año).map(añoData => {
        const aKey  = `a-${añoData.año}`;
        const aOpen = !!open[aKey];
        return (
          <Box key={añoData.año} sx={{ mb:2 }}>
            {/* ══ AÑO ══ */}
            <Box onClick={() => toggle(aKey)} sx={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              p:1.5, borderRadius:2, cursor:'pointer', userSelect:'none',
              background:`linear-gradient(135deg, ${EMIT_COLOR} 0%, #006064 100%)`,
              color:'white', '&:hover':{ opacity:0.91 },
            }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                {aOpen ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                <CalendarMonthIcon sx={{ fontSize:20 }}/>
                <Typography variant="subtitle1" fontWeight={800}>{añoData.año}</Typography>
                <Chip label={`${añoData.ordenes} OC`} size="small"
                  sx={{ bgcolor:alpha('#fff',0.15), color:'white', fontSize:'0.65rem', height:20 }}/>
              </Box>
              <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
                <Box sx={{ textAlign:'right' }}>
                  <Typography variant="caption" sx={{ opacity:0.65, display:'block' }}>Enc. OC</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmtM(añoData.enc)}</Typography>
                </Box>
                <Box sx={{ textAlign:'right' }}>
                  <Typography variant="caption" sx={{ opacity:0.65, display:'block' }}>Total</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmtM(añoData.total)}</Typography>
                </Box>
              </Box>
            </Box>

            <Collapse in={aOpen} unmountOnExit>
              <Box sx={{ pl:2, pt:0.6 }}>
                {Object.values(añoData.semanas).sort((a, b) => a.semana - b.semana).map(semData => {
                  const sKey  = `s-${añoData.año}-${semData.semana}`;
                  const sOpen = !!open[sKey];
                  return (
                    <Box key={sKey} sx={{ mb:0.8 }}>
                      {/* ── SEMANA ── */}
                      <Box onClick={() => toggle(sKey)} sx={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        p:1.2, borderRadius:2, cursor:'pointer', userSelect:'none',
                        bgcolor:alpha(EMIT_COLOR,0.05), border:'1px solid', borderColor:alpha(EMIT_COLOR,0.15),
                        '&:hover':{ bgcolor:alpha(EMIT_COLOR,0.10) },
                      }}>
                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                          {sOpen ? <ExpandLessIcon sx={{ fontSize:18 }}/> : <ExpandMoreIcon sx={{ fontSize:18 }}/>}
                          <Typography variant="body2" fontWeight={700}>Semana {semData.semana}</Typography>
                          <Chip label={`${semData.ordenes} OC`} size="small"
                            sx={{ fontSize:'0.62rem', height:18 }}/>
                        </Box>
                        <Box sx={{ display:'flex', gap:2, alignItems:'center' }}>
                          <Typography variant="caption" color={ENC_DARK} fontWeight={700}>{fmtM(semData.enc)}</Typography>
                          <Typography variant="caption" color={EMIT_COLOR} fontWeight={700}>{fmtM(semData.total)}</Typography>
                        </Box>
                      </Box>

                      <Collapse in={sOpen} unmountOnExit>
                        <Box sx={{ pl:2, pt:0.5 }}>
                          {Object.values(semData.dias).sort((a, b) => a.diaKey.localeCompare(b.diaKey)).map(diaData => {
                            const dKey  = `d-${diaData.diaKey}`;
                            const dOpen = !!open[dKey];
                            return (
                              <Box key={dKey} sx={{ mb:0.6 }}>
                                {/* ─ DÍA ─ */}
                                <Box onClick={() => toggle(dKey)} sx={{
                                  display:'flex', alignItems:'center', justifyContent:'space-between',
                                  p:1, borderRadius:2, cursor:'pointer', userSelect:'none',
                                  bgcolor:'background.paper', border:'1px solid', borderColor:'divider',
                                  '&:hover':{ bgcolor:'action.hover' },
                                }}>
                                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                    {dOpen ? <ExpandLessIcon sx={{ fontSize:15 }}/> : <ExpandMoreIcon sx={{ fontSize:15 }}/>}
                                    <Typography variant="body2" fontWeight={600} color="text.secondary"
                                      sx={{ textTransform:'capitalize' }}>
                                      {diaData.diaLabel}
                                    </Typography>
                                    <Chip label={diaData.registros.length} size="small"
                                      sx={{ fontSize:'0.6rem', height:16 }}/>
                                  </Box>
                                  <Box sx={{ display:'flex', gap:1.5, alignItems:'center' }}>
                                    <Typography variant="caption" color={ENC_DARK} fontWeight={700}>{fmtM(diaData.enc)}</Typography>
                                    <Typography variant="caption" color={EMIT_COLOR} fontWeight={700}>{fmtM(diaData.total)}</Typography>
                                  </Box>
                                </Box>

                                <Collapse in={dOpen} unmountOnExit>
                                  <Box sx={{ overflowX:'auto', pl:1 }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ '& th':{ fontWeight:700, fontSize:'0.63rem', py:0.6, bgcolor:'#f5f5f5', whiteSpace:'nowrap' }}}>
                                          <TableCell>Proveedor</TableCell>
                                          <TableCell>N° Orden</TableCell>
                                          <TableCell>Sucursal</TableCell>
                                          <TableCell>Tipo</TableCell>
                                          <TableCell align="right">Monto Neto</TableCell>
                                          <TableCell align="right">Monto c/IVA</TableCell>
                                          <TableCell>Estado</TableCell>
                                          <TableCell/>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {diaData.registros.map(r => {
                                          const isEnc      = !(r.tipo_proveedor || '').toLowerCase().includes('no');
                                          const esSosp     = sospechosasIds.has(r.id);
                                          return (
                                            <TableRow key={r.id} sx={{
                                              '& td':{ fontSize:'0.72rem', py:0.4 },
                                              bgcolor: esSosp ? alpha('#f57c00', 0.07) : 'inherit',
                                              outline: esSosp ? `1px solid ${alpha('#f57c00', 0.25)}` : 'none',
                                            }}>
                                              <TableCell sx={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                <Box sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
                                                  {esSosp && (
                                                    <Tooltip title="Posible compra madre (monto inusualmente alto)">
                                                      <span style={{ fontSize:13, lineHeight:1 }}>⚠️</span>
                                                    </Tooltip>
                                                  )}
                                                  {r.proveedor || '–'}
                                                </Box>
                                              </TableCell>
                                              <TableCell>
                                                {r.numero_orden
                                                  ? <Chip label={r.numero_orden} size="small" clickable
                                                      onClick={() => setProdDialog({ open:true, numeroOrden: String(r.numero_orden), sucursal: r.sucursal||'' })}
                                                      sx={{ height:16, fontSize:'0.6rem', bgcolor:alpha(ENC_MID,0.1), color:ENC_DARK, cursor:'pointer',
                                                            '&:hover':{ bgcolor:alpha(ENC_MID,0.25) } }}/>
                                                  : <Typography variant="caption" color="text.disabled">–</Typography>}
                                              </TableCell>
                                              <TableCell sx={{ color:'text.secondary' }}>{r.sucursal || '–'}</TableCell>
                                              <TableCell>
                                                <Chip label={r.tipo_proveedor || 'N/A'} size="small" sx={{
                                                  height:16, fontSize:'0.6rem',
                                                  bgcolor: isEnc ? alpha(ENC_BG,0.8) : alpha(NENC_BG,0.8),
                                                  color:   isEnc ? ENC_DARK : NENC_DARK,
                                                }}/>
                                              </TableCell>
                                              <TableCell align="right" sx={{ color:'text.secondary' }}>{fmtM(r.monto_neto)}</TableCell>
                                              <TableCell align="right" sx={{ color: esSosp ? '#f57c00' : EMIT_COLOR, fontWeight:700 }}>{fmtM(r.monto_con_iva)}</TableCell>
                                              <TableCell>
                                                <Chip label={r.estado_pago || 'Pendiente'} size="small" sx={{
                                                  height:16, fontSize:'0.6rem',
                                                  bgcolor: r.estado_pago === 'Completo' ? alpha('#2e7d32',0.1) : alpha('#e65100',0.08),
                                                  color:   r.estado_pago === 'Completo' ? '#2e7d32' : '#e65100',
                                                }}/>
                                              </TableCell>
                                              <TableCell align="right" onClick={e => e.stopPropagation()}>
                                                {onMadre && (
                                                  <Tooltip title="Marcar como compra madre (se excluye de planificación)">
                                                    <IconButton size="small" onClick={() => onMadre(r)}
                                                      sx={{ opacity: esSosp ? 0.85 : 0.3, color: esSosp ? '#f57c00' : 'inherit',
                                                            '&:hover':{ opacity:1, color:'#f57c00' } }}>
                                                      <span style={{ fontSize:13 }}>🏠</span>
                                                    </IconButton>
                                                  </Tooltip>
                                                )}
                                              </TableCell>
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
    <ProductosOCDialog
      open={prodDialog.open}
      onClose={() => setProdDialog(p => ({ ...p, open:false }))}
      numeroOrden={prodDialog.numeroOrden}
      sucursal={prodDialog.sucursal}
    />
    </>
  );
}

// ─── Desglose por sucursal ────────────────────────────────────────────────────
// Convierte número de semana ISO y año a fecha (lunes de esa semana) → string YYYY-MM-DD
function semanaAFecha(semana, anio) {
  const d = new Date(anio, 0, 1 + (semana - 1) * 7);
  const dow = d.getDay() || 7;
  if (dow !== 1) d.setDate(d.getDate() - dow + 1);
  return d.toISOString().slice(0, 10);
}
function semanaAFechaFin(semana, anio) {
  const inicio = new Date(semanaAFecha(semana, anio));
  inicio.setDate(inicio.getDate() + 6);
  return inicio.toISOString().slice(0, 10);
}

function DesgloseSucursal({ semana, year, autoOpen = false }) {
  const [data, setData]       = useState([]);
  const [open, setOpen]       = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [fDesde, setFDesde]   = useState(() => semanaAFecha(semana, year));
  const [fHasta, setFHasta]   = useState(() => semanaAFechaFin(semana, year));

  const cargar = (desde, hasta) => {
    setLoading(true);
    api.get(`/planificacion/desglose-sucursal?fecha_desde=${desde}&fecha_hasta=${hasta}&año=${year}`)
      .then(r => setData(r.data?.sucursales || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    const d = semanaAFecha(semana, year);
    const h = semanaAFechaFin(semana, year);
    setFDesde(d); setFHasta(h);
    cargar(d, h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, semana, year]);

  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
  }, [semana, autoOpen]);

  const total = data.reduce((s, r) => s + r.total, 0);

  const renderContenido = () => (<>
    {/* Selector de rango de fechas */}
    <Box sx={{ display:'flex', alignItems:'center', gap:1.5, px:2, py:1.2, bgcolor:alpha('#1a237e',0.03), borderBottom:'1px solid', borderColor:'divider', flexWrap:'wrap' }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">Rango:</Typography>
      <TextField size="small" type="date" label="Desde" value={fDesde}
        onChange={e => setFDesde(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width:155, '& .MuiOutlinedInput-root':{ borderRadius:2 } }}/>
      <TextField size="small" type="date" label="Hasta" value={fHasta}
        onChange={e => setFHasta(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ width:155, '& .MuiOutlinedInput-root':{ borderRadius:2 } }}/>
      <Button size="small" variant="contained" onClick={() => cargar(fDesde, fHasta)}
        sx={{ borderRadius:2, bgcolor:'#1a237e', fontSize:'0.72rem' }}>
        Aplicar
      </Button>
      <Typography variant="caption" color="text.secondary">
        {data.length} sucursales
      </Typography>
    </Box>
    {loading
      ? <Box sx={{ p:3, textAlign:'center' }}><CircularProgress size={22}/></Box>
      : data.length === 0
        ? <Box sx={{ p:3, textAlign:'center' }}>
            <Typography variant="body2" color="text.disabled">Sin datos de sucursales para el rango seleccionado</Typography>
          </Box>
        : <Box sx={{ overflowX:'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th':{ bgcolor: alpha('#1a237e', 0.05), fontWeight:700, fontSize:'0.7rem', py:0.8 } }}>
                  <TableCell>Sucursal</TableCell>
                  <TableCell align="right" sx={{ color: ENC_MID }}>Encadenados</TableCell>
                  <TableCell align="right" sx={{ color: NENC_MID }}>No Encadenados</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Órdenes</TableCell>
                  <TableCell sx={{ width:120 }}>Proporción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map(s => {
                  const pct = total > 0 ? (s.total / total) * 100 : 0;
                  return (
                    <TableRow key={s.sucursal} sx={{ '&:hover':{ bgcolor:'action.hover' } }}>
                      <TableCell sx={{ py:0.8 }}>
                        <Box sx={{ display:'flex', alignItems:'center', gap:0.8 }}>
                          <StoreIcon sx={{ fontSize:14, color:'text.disabled' }}/>
                          <Typography variant="body2" fontWeight={600}>{s.sucursal}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ py:0.8 }}>
                        <Typography variant="body2" color={ENC_MID} fontWeight={600}>{fmtM(s.encadenado)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py:0.8 }}>
                        <Typography variant="body2" color={NENC_MID} fontWeight={600}>{fmtM(s.no_encadenado)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py:0.8 }}>
                        <Typography variant="body2" fontWeight={700}>{fmtM(s.total)}</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py:0.8 }}>
                        <Chip label={s.ordenes} size="small" sx={{ fontSize:'0.65rem', height:18 }}/>
                      </TableCell>
                      <TableCell sx={{ py:0.8 }}>
                        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                          <Box sx={{ flex:1, height:6, borderRadius:1, bgcolor:'#e0e0e0', overflow:'hidden' }}>
                            <Box sx={{ height:'100%', width:`${pct}%`, bgcolor:'#1b5e20', borderRadius:1 }}/>
                          </Box>
                          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                            {pct.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
    }
  </>);

  // Modo embebido (dentro del tab Por Sucursal)
  if (autoOpen) return <Box sx={{ minHeight: 120 }}>{renderContenido()}</Box>;

  // Modo accordion (uso standalone)
  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, mb:2, overflow:'hidden' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:2, cursor:'pointer',
        '&:hover':{ bgcolor:'action.hover' }, bgcolor: open ? alpha('#1a237e', 0.03) : 'transparent' }}
        onClick={() => setOpen(v => !v)}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
          <Avatar sx={{ width:36, height:36, bgcolor: alpha('#1a237e', 0.1), color:'#1a237e' }}>
            <SucursalIcon sx={{ fontSize:18 }}/>
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Desglose por Sucursal — Semana {semana}</Typography>
            <Typography variant="caption" color="text.secondary">
              {data.length > 0 ? `${data.length} sucursales · ${fmtM(total)} total` : 'Ver desglose'}
            </Typography>
          </Box>
        </Box>
        {open ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
      </Box>
      <Collapse in={open}>
        <Divider/>
        {renderContenido()}
      </Collapse>
    </Paper>
  );
}

// ─── Barra segmentada ────────────────────────────────────────────────────────
function BudgetBar({ enc, nenc, limite }) {
  const total  = enc + nenc;
  const pEnc   = limite>0 ? Math.min(enc/limite*100,100)  : 0;
  const pNenc  = limite>0 ? Math.min(nenc/limite*100,100) : 0;
  const pLibre = Math.max(100-pEnc-pNenc, 0);
  return (
    <Box>
      <Box sx={{display:'flex',height:20,borderRadius:2,overflow:'hidden',gap:'2px',bgcolor:'#e0e0e0'}}>
        {pEnc>0   && <Tooltip title={`Encadenados: ${fmtFull(enc)}`}><Box sx={{width:`${pEnc}%`,background:`linear-gradient(90deg,${ENC_DARK},${ENC_MID})`,transition:'width .7s ease',cursor:'default'}}/></Tooltip>}
        {pNenc>0  && <Tooltip title={`No Encadenados: ${fmtFull(nenc)}`}><Box sx={{width:`${pNenc}%`,background:`linear-gradient(90deg,${NENC_DARK},${NENC_MID})`,transition:'width .7s ease',cursor:'default'}}/></Tooltip>}
        {pLibre>0 && <Box sx={{flex:1,bgcolor:'#e0e0e0'}}/>}
      </Box>
      <Box sx={{display:'flex',justifyContent:'space-between',mt:0.5}}>
        <Box sx={{display:'flex',gap:2}}>
          {[{c:ENC_MID,l:'Encadenados'},{c:NENC_MID,l:'No Encadenados'},{c:'#bdbdbd',l:'Disponible'}]
            .map(({c,l})=>(
              <Box key={l} sx={{display:'flex',alignItems:'center',gap:0.5}}>
                <Box sx={{width:8,height:8,borderRadius:'50%',bgcolor:c}}/>
                <Typography variant="caption" color="text.secondary" fontSize="0.68rem">{l}</Typography>
              </Box>
            ))}
        </Box>
        <Typography variant="caption" fontWeight={600} fontSize="0.68rem" color="text.secondary">
          {limite>0 ? `${(total/limite*100).toFixed(1)}% utilizado` : '–'}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Mapa de colores para estado_pago ─────────────────────────────────────────
const ESTADO_PAGO_CFG = {
  'Pendiente':  { bg:'#fff3e0', color:'#e65100', border:'#ffcc80' },
  'Completo':   { bg:'#e8f5e9', color:'#2e7d32', border:'#a5d6a7' },
  'Parcial':    { bg:'#e3f2fd', color:'#1565c0', border:'#90caf9' },
  'Modificado': { bg:'#fce4ec', color:'#c62828', border:'#f48fb1' },
};

// ─── Fila de Orden de Compra ──────────────────────────────────────────────────
function OcRow({ item, onEstadoChange, showSemanaVenc = false }) {
  const [saving, setSaving] = useState(false);
  const estadoPago = item.estado_pago || 'Pendiente';
  const vigente    = item.vigente !== false && item.vigente !== 0;
  const cfg        = ESTADO_PAGO_CFG[estadoPago] || ESTADO_PAGO_CFG['Pendiente'];

  const handleChange = async (campo, valor) => {
    setSaving(true);
    try { await onEstadoChange(item.numero_orden, campo, valor); }
    finally { setSaving(false); }
  };

  return (
    <TableRow sx={{ '&:hover':{ bgcolor:'action.hover' }, opacity: vigente ? 1 : 0.55 }}>
      <TableCell sx={{py:0.7}}>
        <Typography variant="caption" fontWeight={600}>{item.proveedor || '–'}</Typography>
      </TableCell>
      <TableCell sx={{py:0.7}}>
        <Typography variant="caption" fontWeight={700} color={OC_COLOR}>{item.numero_orden || '–'}</Typography>
      </TableCell>
      {showSemanaVenc && (
        <TableCell sx={{py:0.7}}>
          <Typography variant="caption" color="text.secondary">{item.sucursal || '–'}</Typography>
        </TableCell>
      )}
      {showSemanaVenc && (
        <TableCell align="right" sx={{py:0.7}}>
          <Typography variant="caption">{fmtM(item.monto_neto || 0)}</Typography>
        </TableCell>
      )}
      <TableCell align="right" sx={{py:0.7}}>
        <Typography variant="body2" fontWeight={700}>{fmtM(item.monto_total_iva || item.monto_con_iva || 0)}</Typography>
      </TableCell>
      {showSemanaVenc && (
        <TableCell align="center" sx={{py:0.7}}>
          <Typography variant="caption" color="text.secondary">{item.plazo_dias ?? '–'}d</Typography>
        </TableCell>
      )}
      {showSemanaVenc && (
        <TableCell align="center" sx={{py:0.7}}>
          <Chip label={`S${item.semana_vencimiento || '?'}`} size="small"
            sx={{ fontSize:'0.65rem', height:18, bgcolor:alpha(ENC_DARK,0.08), color:ENC_DARK, fontWeight:700 }}/>
        </TableCell>
      )}
      <TableCell align="center" sx={{py:0.7, minWidth:130}}>
        <Select size="small" value={estadoPago} disabled={saving}
          onChange={e => handleChange('estado_pago', e.target.value)}
          sx={{ fontSize:'0.7rem', height:24, bgcolor:cfg.bg, color:cfg.color, fontWeight:700,
            '& .MuiOutlinedInput-notchedOutline':{ borderColor:cfg.border },
            '& .MuiSvgIcon-root':{ color:cfg.color } }}>
          <MenuItem value="Pendiente">Pendiente</MenuItem>
          <MenuItem value="Completo">Completo</MenuItem>
          <MenuItem value="Parcial">Parcial</MenuItem>
          <MenuItem value="Modificado">Modificado</MenuItem>
        </Select>
      </TableCell>
      <TableCell align="center" sx={{py:0.7}}>
        <Chip label={vigente ? 'Vigente' : 'No Vigente'} size="small"
          onClick={() => handleChange('vigente', !vigente)} disabled={saving}
          sx={{ fontSize:'0.65rem', height:20, cursor:'pointer', fontWeight:700,
            bgcolor: vigente ? '#e8f5e9' : '#f5f5f5',
            color:   vigente ? '#2e7d32' : '#9e9e9e',
            border: `1px solid ${vigente ? '#a5d6a7' : '#e0e0e0'}` }}/>
      </TableCell>
      {saving && <TableCell sx={{py:0.7,width:20}}><CircularProgress size={11}/></TableCell>}
    </TableRow>
  );
}

// ─── Agrupar OCs por proveedor (para vista de 3 niveles) ─────────────────────
const agruparPorProveedor = (items) => {
  const grupos = new Map();
  items.forEach(item => {
    const prov = item.proveedor || '–';
    if (!grupos.has(prov)) {
      grupos.set(prov, { proveedor: prov, ordenes: [], total_iva: 0, total_neto: 0 });
    }
    const g = grupos.get(prov);
    g.ordenes.push(item);
    g.total_iva  += item.monto_total_iva  ?? (parseFloat(item.monto_con_iva) || 0);
    g.total_neto += item.monto_total_neto ?? (parseFloat(item.monto_neto)    || 0);
  });
  return Array.from(grupos.values());
};

// ─── Agrupar encadenados por orden (evita duplicados por múltiples plazos) ────
const agruparEncadenados = (items) => {
  const grupos = new Map();
  items.forEach(item => {
    const key = item.numero_orden
      ? String(item.numero_orden).trim()
      : `${item.proveedor}__${item.fecha_compra}__${item.sucursal || ''}`;
    if (!grupos.has(key)) {
      grupos.set(key, { ...item, plazos: [], monto_total_iva: 0, monto_total_neto: 0 });
    }
    const g = grupos.get(key);
    g.plazos.push({
      id:                item.id,
      plazo_dias:        item.plazo_dias,
      fecha_vencimiento: item.fecha_vencimiento,
      semana_vencimiento: item.semana_vencimiento,
      monto_con_iva:     parseFloat(item.monto_con_iva) || 0,
      monto_neto:        parseFloat(item.monto_neto)    || 0,
    });
    g.monto_total_iva  += parseFloat(item.monto_con_iva) || 0;
    g.monto_total_neto += parseFloat(item.monto_neto)    || 0;
  });
  return Array.from(grupos.values());
};

// ─── Fila de encadenado ───────────────────────────────────────────────────────
function EncRow({ item, onDelete, onVerProductos, onMadre }) {
  const [open, setOpen] = useState(false);

  // Soporte para item agrupado (plazos múltiples) o individual
  const plazos = item.plazos?.length > 0 ? item.plazos : [{
    id: item.id,
    plazo_dias: item.plazo_dias,
    fecha_vencimiento: item.fecha_vencimiento,
    semana_vencimiento: item.semana_vencimiento,
    monto_con_iva: parseFloat(item.monto_con_iva) || 0,
    monto_neto:    parseFloat(item.monto_neto)    || 0,
  }];
  const montoTotalIva  = item.monto_total_iva  ?? (parseFloat(item.monto_con_iva) || parseFloat(item.monto_neto) || 0);
  const montoTotalNeto = item.monto_total_neto ?? (parseFloat(item.monto_neto)    || 0);
  const tieneMultiple  = plazos.length > 1;

  return (
    <>
      <TableRow
        onClick={() => setOpen(v=>!v)}
        sx={{ cursor:'pointer', '&:hover':{ bgcolor: alpha(ENC_MID,0.05) } }}
      >
        <TableCell sx={{py:0.6}}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
            {open ? <ExpandLessIcon sx={{fontSize:14,color:'text.disabled'}}/> : <ExpandMoreIcon sx={{fontSize:14,color:'text.disabled'}}/>}
            <Typography variant="body2" fontWeight={600}>{item.proveedor||'–'}</Typography>
          </Box>
        </TableCell>
        <TableCell sx={{py:0.6}} onClick={e => e.stopPropagation()}>
          {item.numero_orden
            ? <Chip label={`#${item.numero_orden}`} size="small" clickable
                onClick={() => onVerProductos?.(item.numero_orden, item.sucursal)}
                sx={{ fontSize:'0.62rem', height:18, bgcolor:ENC_BG, color:ENC_DARK,
                      '&:hover':{ bgcolor: alpha(ENC_MID,0.25) } }}/>
            : <Typography variant="caption" color="text.disabled">–</Typography>}
        </TableCell>
        <TableCell sx={{py:0.6}}>
          <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="right">
          <Typography variant="body2" fontWeight={700} color={ENC_DARK}>{fmtM(montoTotalIva)}</Typography>
          <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(montoTotalNeto)}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          {/* Chips de plazo — encadenados siempre tienen plazo positivo; 0 o null = dato inválido → '–' */}
          <Box sx={{display:'flex',gap:0.3,flexWrap:'wrap',justifyContent:'center'}}>
            {plazos.map((p,i) => (
              <Chip key={i} label={p.plazo_dias > 0 ? `${p.plazo_dias}d` : '–'} size="small"
                sx={{
                  fontSize:'0.62rem', height:18,
                  bgcolor: tieneMultiple ? alpha(ENC_MID,0.12) : undefined,
                  color:   tieneMultiple ? ENC_DARK             : undefined,
                }}/>
            ))}
          </Box>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          {tieneMultiple ? (
            // Múltiples fechas apiladas verticalmente
            <Box>
              {plazos.map((p,i) => (
                <Box key={i} sx={{display:'flex',alignItems:'center',gap:0.4,justifyContent:'center'}}>
                  <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                  {p.semana_vencimiento && <Typography variant="caption" color="text.secondary" fontSize="0.6rem">S{p.semana_vencimiento}</Typography>}
                </Box>
              ))}
            </Box>
          ) : (
            <>
              <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(plazos[0].fecha_vencimiento)}</Typography>
              {plazos[0].semana_vencimiento && <Typography variant="caption" color="text.secondary" display="block">S{plazos[0].semana_vencimiento}</Typography>}
            </>
          )}
        </TableCell>
        <TableCell sx={{py:0.6}} align="right" onClick={e=>e.stopPropagation()}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.3}}>
            {/* Botón compra madre — siempre visible */}
            {onMadre && (
              <Tooltip title="Marcar como compra madre (se excluye de la planificación)">
                <IconButton size="small" onClick={()=>onMadre(item)} sx={{opacity:.35,'&:hover':{opacity:1,color:'#f57c00'}}}>
                  <span style={{fontSize:12}}>🏠</span>
                </IconButton>
              </Tooltip>
            )}
            {/* Solo mostrar botón eliminar si hay un único plazo */}
            {onDelete && !tieneMultiple && (
              <IconButton size="small" onClick={()=>onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
                <DeleteIcon sx={{fontSize:14}}/>
              </IconButton>
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{py:0,border:0}}>
          <Collapse in={open} timeout="auto">
            <Box sx={{p:1.5,bgcolor:ENC_BG,borderRadius:1,m:0.5}}>
              {/* Detalle de cuotas cuando hay múltiples plazos */}
              {tieneMultiple && (
                <Box sx={{mb:1.5}}>
                  <Typography variant="caption" fontWeight={700} color={ENC_DARK} display="block" mb={0.8}>
                    {plazos.length} cuotas de pago:
                  </Typography>
                  {plazos.map((p,i) => (
                    <Box key={i} sx={{
                      display:'flex', alignItems:'center', gap:1.5, p:0.8, mb:0.5,
                      bgcolor:'white', borderRadius:1, border:`1px solid ${alpha(ENC_MID,.18)}`,
                    }}>
                      <Chip label={p.plazo_dias > 0 ? `${p.plazo_dias}d` : '–'} size="small" sx={{fontSize:'0.62rem',height:18,bgcolor:ENC_BG,color:ENC_DARK}}/>
                      <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                      {p.semana_vencimiento && <Typography variant="caption" color="text.secondary">S{p.semana_vencimiento}</Typography>}
                      <Typography variant="caption" fontWeight={700} color={ENC_DARK} sx={{ml:'auto'}}>{fmtM(p.monto_con_iva)}</Typography>
                      {onDelete && (
                        <IconButton size="small" onClick={()=>onDelete(p.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
                          <DeleteIcon sx={{fontSize:12}}/>
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              {/* Metadata común */}
              <Grid container spacing={1}>
                {[
                  ['Fecha compra', fmtDate(item.fecha_compra)],
                  ['Semana compra', item.semana_compra?`S${item.semana_compra}`:'–'],
                  ['Mes', item.mes||'–'],
                  ['Fuente', item.fuente||'–'],
                ].map(([k,v])=>(
                  <Grid item xs={6} sm={3} key={k}>
                    <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
                    <Typography variant="caption" fontWeight={600}>{v}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Fila de no encadenado (con soporte de múltiples plazos) ─────────────────
function NencRow({ item, onDelete, onVerProductos }) {
  const [open, setOpen] = useState(false);

  // Soporte para item agrupado (plazos múltiples) o individual
  const plazos = item.plazos?.length > 0 ? item.plazos : [{
    id: item.id,
    plazo_dias: item.plazo_dias,
    fecha_vencimiento: item.fecha_vencimiento,
    semana_vencimiento: item.semana_vencimiento,
    monto_con_iva: parseFloat(item.monto_con_iva) || 0,
    monto_neto:    parseFloat(item.monto_neto)    || 0,
  }];
  const montoTotalIva  = item.monto_total_iva  ?? (parseFloat(item.monto_con_iva) || parseFloat(item.monto_neto) || 0);
  const montoTotalNeto = item.monto_total_neto ?? (parseFloat(item.monto_neto)    || 0);
  const tieneMultiple  = plazos.length > 1;

  return (
    <>
      <TableRow
        onClick={() => setOpen(v=>!v)}
        sx={{ cursor:'pointer', '&:hover':{ bgcolor: alpha(NENC_MID,0.05) } }}
      >
        <TableCell sx={{py:0.6}}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.5}}>
            {open ? <ExpandLessIcon sx={{fontSize:14,color:'text.disabled'}}/> : <ExpandMoreIcon sx={{fontSize:14,color:'text.disabled'}}/>}
            <Typography variant="body2" fontWeight={600}>{item.proveedor||'–'}</Typography>
          </Box>
        </TableCell>
        <TableCell sx={{py:0.6}} onClick={e => e.stopPropagation()}>
          {item.numero_orden
            ? <Chip label={`#${item.numero_orden}`} size="small" clickable
                onClick={() => onVerProductos?.(item.numero_orden, item.sucursal)}
                sx={{ fontSize:'0.62rem', height:18, bgcolor:NENC_BG, color:NENC_DARK,
                      '&:hover':{ bgcolor: alpha(NENC_MID,0.25) } }}/>
            : <Typography variant="caption" color="text.disabled">–</Typography>}
        </TableCell>
        <TableCell sx={{py:0.6}}>
          <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="right">
          <Typography variant="body2" fontWeight={700} color={NENC_DARK}>{fmtM(montoTotalIva)}</Typography>
          <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(montoTotalNeto)}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          <Box sx={{display:'flex',gap:0.3,flexWrap:'wrap',justifyContent:'center'}}>
            {plazos.map((p,i) => (
              <Chip key={i} label={p.plazo_dias!=null?`${p.plazo_dias}d`:'–'} size="small"
                sx={{
                  fontSize:'0.62rem', height:18,
                  bgcolor: tieneMultiple ? alpha(NENC_MID,0.12) : undefined,
                  color:   tieneMultiple ? NENC_DARK             : undefined,
                }}/>
            ))}
          </Box>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          {tieneMultiple ? (
            <Box>
              {plazos.map((p,i) => (
                <Box key={i} sx={{display:'flex',alignItems:'center',gap:0.4,justifyContent:'center'}}>
                  <Typography variant="caption" fontWeight={600} color={NENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                  {p.semana_vencimiento && <Typography variant="caption" color="text.secondary" fontSize="0.6rem">S{p.semana_vencimiento}</Typography>}
                </Box>
              ))}
            </Box>
          ) : (
            <>
              <Typography variant="caption" fontWeight={600} color={NENC_DARK}>{fmtDate(plazos[0].fecha_vencimiento)}</Typography>
              {plazos[0].semana_vencimiento && <Typography variant="caption" color="text.secondary" display="block">S{plazos[0].semana_vencimiento}</Typography>}
            </>
          )}
        </TableCell>
        <TableCell sx={{py:0.6}} align="right" onClick={e=>e.stopPropagation()}>
          {onDelete && !tieneMultiple && (
            <IconButton size="small" onClick={()=>onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
              <DeleteIcon sx={{fontSize:14}}/>
            </IconButton>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{py:0,border:0}}>
          <Collapse in={open} timeout="auto">
            <Box sx={{p:1.5,bgcolor:NENC_BG,borderRadius:1,m:0.5}}>
              {tieneMultiple && (
                <Box sx={{mb:1.5}}>
                  <Typography variant="caption" fontWeight={700} color={NENC_DARK} display="block" mb={0.8}>
                    {plazos.length} recepciones de bodega (ERP):
                  </Typography>
                  {plazos.map((p,i) => (
                    <Box key={i} sx={{
                      display:'flex', alignItems:'center', gap:1.5, p:0.8, mb:0.5,
                      bgcolor:'white', borderRadius:1, border:`1px solid ${alpha(NENC_MID,.18)}`,
                    }}>
                      <Chip label={p.plazo_dias != null ? `${p.plazo_dias}d` : '–'} size="small" sx={{fontSize:'0.62rem',height:18,bgcolor:NENC_BG,color:NENC_DARK}}/>
                      <Typography variant="caption" fontWeight={600} color={NENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                      {p.semana_vencimiento && <Typography variant="caption" color="text.secondary">S{p.semana_vencimiento}</Typography>}
                      <Typography variant="caption" fontWeight={700} color={NENC_DARK} sx={{ml:'auto'}}>{fmtM(p.monto_con_iva)}</Typography>
                      {onDelete && (
                        <IconButton size="small" onClick={()=>onDelete(p.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
                          <DeleteIcon sx={{fontSize:12}}/>
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              <Grid container spacing={1}>
                {[
                  ['Fecha compra', fmtDate(item.fecha_compra)],
                  ['Semana compra', item.semana_compra?`S${item.semana_compra}`:'–'],
                  ['Mes', item.mes||'–'],
                  ['Fuente', item.fuente||'–'],
                ].map(([k,v])=>(
                  <Grid item xs={6} sm={3} key={k}>
                    <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
                    <Typography variant="caption" fontWeight={600}>{v}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Fila de una OC individual dentro del grupo proveedor (encadenado) ────────
function FuenteBadge({ fuente }) {
  const f = (fuente || '').toUpperCase();
  if (f === 'FACTURA')
    return <Chip label="PBI ✓" size="small" sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
      bgcolor:'#e8f5e9', color:'#2e7d32', border:'1px solid #a5d6a7' }}/>;
  if (f === 'EXCEL')
    return <Chip label="Excel" size="small" sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
      bgcolor:'#fff3e0', color:'#e65100', border:'1px solid #ffcc80' }}/>;
  if (f === 'ERP')
    return <Chip label="ERP" size="small" sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
      bgcolor:'#e3f2fd', color:'#1565c0', border:'1px solid #90caf9' }}/>;
  return <Chip label={fuente||'–'} size="small" sx={{ fontSize:'0.6rem', height:18,
    bgcolor:'#f5f5f5', color:'#757575' }}/>;
}

function EncOcSubRow({ item, onDelete, onVerProductos, onMadre }) {
  const plazos = item.plazos?.length > 0 ? item.plazos : [{
    plazo_dias: item.plazo_dias,
    fecha_vencimiento: item.fecha_vencimiento,
    semana_vencimiento: item.semana_vencimiento,
    monto_con_iva: parseFloat(item.monto_con_iva) || 0,
  }];
  const montoIva  = item.monto_total_iva  ?? (parseFloat(item.monto_con_iva)  || 0);
  const montoNeto = item.monto_total_neto ?? (parseFloat(item.monto_neto)     || 0);
  const tieneMultiple = plazos.length > 1;

  return (
    <TableRow sx={{ bgcolor: alpha(ENC_MID, 0.04), '&:hover':{ bgcolor: alpha(ENC_MID, 0.1) } }}>
      {/* OC chip */}
      <TableCell sx={{ py:0.5, pl:4 }}>
        {item.numero_orden
          ? <Chip label={`#${item.numero_orden}`} size="small" clickable
              onClick={() => onVerProductos?.(item.numero_orden, item.sucursal)}
              icon={<OcIcon sx={{fontSize:'0.75rem !important'}}/>}
              sx={{ fontSize:'0.62rem', height:20, bgcolor:ENC_BG, color:ENC_DARK,
                    '&:hover':{ bgcolor: alpha(ENC_MID,0.3) } }}/>
          : <Typography variant="caption" color="text.disabled">Sin N° Orden</Typography>}
      </TableCell>
      {/* Sucursal */}
      <TableCell sx={{ py:0.5 }}>
        <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
      </TableCell>
      {/* Monto */}
      <TableCell sx={{ py:0.5 }} align="right">
        <Typography variant="body2" fontWeight={700} color={ENC_DARK}>{fmtM(montoIva)}</Typography>
        <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(montoNeto)}</Typography>
      </TableCell>
      {/* Plazo(s) */}
      <TableCell sx={{ py:0.5 }} align="center">
        <Box sx={{display:'flex',gap:0.3,flexWrap:'wrap',justifyContent:'center'}}>
          {plazos.map((p,i) => (
            <Chip key={i} label={p.plazo_dias > 0 ? `${p.plazo_dias}d` : '–'} size="small"
              sx={{ fontSize:'0.62rem', height:16,
                    bgcolor: tieneMultiple ? alpha(ENC_MID,0.12) : undefined,
                    color:   tieneMultiple ? ENC_DARK : undefined }}/>
          ))}
        </Box>
      </TableCell>
      {/* Vencimiento */}
      <TableCell sx={{ py:0.5 }} align="center">
        {tieneMultiple
          ? <Box>{plazos.map((p,i)=>(
              <Box key={i} sx={{display:'flex',alignItems:'center',gap:0.4,justifyContent:'center'}}>
                <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                {p.semana_vencimiento && <Typography variant="caption" color="text.secondary" fontSize="0.6rem">S{p.semana_vencimiento}</Typography>}
              </Box>
            ))}</Box>
          : <>
              <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(plazos[0].fecha_vencimiento)}</Typography>
              {plazos[0].semana_vencimiento && <Typography variant="caption" color="text.secondary" display="block">S{plazos[0].semana_vencimiento}</Typography>}
            </>}
      </TableCell>
      {/* Fuente / Facturado */}
      <TableCell sx={{ py:0.5 }} align="center">
        <FuenteBadge fuente={item.fuente}/>
      </TableCell>
      {/* Acciones: madre + eliminar */}
      <TableCell sx={{ py:0.5 }} align="right">
        <Box sx={{display:'flex',alignItems:'center',gap:0.3}}>
          {onMadre && (
            <Tooltip title="Marcar como compra madre (se excluye de planificación)">
              <IconButton size="small" onClick={() => onMadre(item)} sx={{opacity:.35,'&:hover':{opacity:1,color:'#f57c00'}}}>
                <span style={{fontSize:12}}>🏠</span>
              </IconButton>
            </Tooltip>
          )}
          {onDelete && !tieneMultiple && (
            <IconButton size="small" onClick={() => onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
              <DeleteIcon sx={{fontSize:14}}/>
            </IconButton>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── Grupo de proveedor encadenado (nivel 1 → lista OCs → productos) ──────────
function EncProveedorGrupo({ grupo, onDelete, onVerProductos, onMadre }) {
  const [open, setOpen] = useState(false);
  const numOC = grupo.ordenes.length;
  const numPBI   = grupo.ordenes.filter(o => (o.fuente||'').toUpperCase() === 'FACTURA').length;
  const numExcel = grupo.ordenes.filter(o => (o.fuente||'').toUpperCase() === 'EXCEL').length;
  const totalPBI   = grupo.ordenes.filter(o => (o.fuente||'').toUpperCase() === 'FACTURA')
    .reduce((s,o) => s + (o.monto_total_iva ?? (parseFloat(o.monto_con_iva)||0)), 0);
  const totalExcel = grupo.ordenes.filter(o => (o.fuente||'').toUpperCase() === 'EXCEL')
    .reduce((s,o) => s + (o.monto_total_iva ?? (parseFloat(o.monto_con_iva)||0)), 0);
  const diff = totalPBI - totalExcel;

  return (
    <>
      {/* Fila resumen del proveedor */}
      <TableRow
        onClick={() => setOpen(v => !v)}
        sx={{ cursor:'pointer', bgcolor: open ? alpha(ENC_DARK,.05) : 'inherit',
              '&:hover':{ bgcolor: alpha(ENC_MID, 0.08) } }}
      >
        <TableCell sx={{ py:0.8 }} colSpan={2}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.8,flexWrap:'wrap'}}>
            {open ? <ExpandLessIcon sx={{fontSize:16,color:ENC_DARK}}/> : <ExpandMoreIcon sx={{fontSize:16,color:ENC_DARK}}/>}
            <Typography variant="body2" fontWeight={800} color={ENC_DARK}>{grupo.proveedor}</Typography>
            <Chip label={`${numOC} OC${numOC!==1?'s':''}`} size="small"
              sx={{ fontSize:'0.6rem', height:18, bgcolor:ENC_BG, color:ENC_DARK, fontWeight:700 }}/>
            {numPBI > 0 && (
              <Chip label={`${numPBI} PBI ✓`} size="small"
                sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
                      bgcolor:'#e8f5e9', color:'#2e7d32', border:'1px solid #a5d6a7' }}/>
            )}
            {numExcel > 0 && (
              <Chip label={`${numExcel} Excel`} size="small"
                sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
                      bgcolor:'#fff3e0', color:'#e65100', border:'1px solid #ffcc80' }}/>
            )}
            {numPBI > 0 && numExcel > 0 && (
              <Tooltip title={`PBI ${fmtM(totalPBI)} vs Excel ${fmtM(totalExcel)}`}>
                <Chip
                  label={diff === 0 ? '= coincide' : diff > 0 ? `PBI +${fmtM(diff)}` : `Excel +${fmtM(Math.abs(diff))}`}
                  size="small"
                  sx={{ fontSize:'0.6rem', height:18, fontWeight:700,
                        bgcolor: diff === 0 ? '#e8f5e9' : '#fff8e1',
                        color:   diff === 0 ? '#2e7d32' : '#f57f17',
                        border:  `1px solid ${diff === 0 ? '#a5d6a7' : '#ffe082'}` }}/>
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ py:0.8 }}/>
        <TableCell sx={{ py:0.8 }} align="right">
          <Typography variant="body2" fontWeight={900} color={ENC_DARK}>{fmtM(grupo.total_iva)}</Typography>
          <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(grupo.total_neto)}</Typography>
        </TableCell>
        <TableCell sx={{ py:0.8 }} colSpan={4}/>
      </TableRow>
      {/* Sub-filas de OCs */}
      <TableRow>
        <TableCell colSpan={8} sx={{ p:0, border:0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {grupo.ordenes.map((item, i) => (
                  <EncOcSubRow
                    key={item.numero_orden || `enc_sub_${i}`}
                    item={item}
                    onDelete={onDelete}
                    onVerProductos={onVerProductos}
                    onMadre={onMadre}
                  />
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Fila de una OC individual dentro del grupo proveedor (no encadenado) ─────
function NencOcSubRow({ item, onDelete, onVerProductos }) {
  const plazos = item.plazos?.length > 0 ? item.plazos : [{
    plazo_dias: item.plazo_dias,
    fecha_vencimiento: item.fecha_vencimiento,
    semana_vencimiento: item.semana_vencimiento,
    monto_con_iva: parseFloat(item.monto_con_iva) || 0,
  }];
  const montoIva  = item.monto_total_iva  ?? (parseFloat(item.monto_con_iva)  || 0);
  const montoNeto = item.monto_total_neto ?? (parseFloat(item.monto_neto)     || 0);
  const tieneMultiple = plazos.length > 1;

  return (
    <TableRow sx={{ bgcolor: alpha(NENC_MID, 0.04), '&:hover':{ bgcolor: alpha(NENC_MID, 0.1) } }}>
      <TableCell sx={{ py:0.5, pl:4 }}>
        {item.numero_orden
          ? <Chip label={`#${item.numero_orden}`} size="small" clickable
              onClick={() => onVerProductos?.(item.numero_orden, item.sucursal)}
              icon={<OcIcon sx={{fontSize:'0.75rem !important'}}/>}
              sx={{ fontSize:'0.62rem', height:20, bgcolor:NENC_BG, color:NENC_DARK,
                    '&:hover':{ bgcolor: alpha(NENC_MID,0.3) } }}/>
          : <Typography variant="caption" color="text.disabled">Sin N° Orden</Typography>}
      </TableCell>
      <TableCell sx={{ py:0.5 }}>
        <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
      </TableCell>
      <TableCell sx={{ py:0.5 }} align="right">
        <Typography variant="body2" fontWeight={700} color={NENC_DARK}>{fmtM(montoIva)}</Typography>
        <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(montoNeto)}</Typography>
      </TableCell>
      <TableCell sx={{ py:0.5 }} align="center">
        <Box sx={{display:'flex',gap:0.3,flexWrap:'wrap',justifyContent:'center'}}>
          {plazos.map((p,i) => (
            <Chip key={i} label={p.plazo_dias != null ? `${p.plazo_dias}d` : '–'} size="small"
              sx={{ fontSize:'0.62rem', height:16,
                    bgcolor: tieneMultiple ? alpha(NENC_MID,0.12) : undefined,
                    color:   tieneMultiple ? NENC_DARK : undefined }}/>
          ))}
        </Box>
      </TableCell>
      <TableCell sx={{ py:0.5 }} align="center">
        {tieneMultiple
          ? <Box>{plazos.map((p,i)=>(
              <Box key={i} sx={{display:'flex',alignItems:'center',gap:0.4,justifyContent:'center'}}>
                <Typography variant="caption" fontWeight={600} color={NENC_DARK}>{fmtDate(p.fecha_vencimiento)}</Typography>
                {p.semana_vencimiento && <Typography variant="caption" color="text.secondary" fontSize="0.6rem">S{p.semana_vencimiento}</Typography>}
              </Box>
            ))}</Box>
          : <>
              <Typography variant="caption" fontWeight={600} color={NENC_DARK}>{fmtDate(plazos[0].fecha_vencimiento)}</Typography>
              {plazos[0].semana_vencimiento && <Typography variant="caption" color="text.secondary" display="block">S{plazos[0].semana_vencimiento}</Typography>}
            </>}
      </TableCell>
      <TableCell sx={{ py:0.5 }} align="right">
        {onDelete && !tieneMultiple && (
          <IconButton size="small" onClick={() => onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}>
            <DeleteIcon sx={{fontSize:14}}/>
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Grupo de proveedor no encadenado (nivel 1 → lista OCs → productos) ───────
function NencProveedorGrupo({ grupo, onDelete, onVerProductos }) {
  const [open, setOpen] = useState(false);
  const numOC = grupo.ordenes.length;

  return (
    <>
      <TableRow
        onClick={() => setOpen(v => !v)}
        sx={{ cursor:'pointer', bgcolor: open ? alpha(NENC_DARK,.05) : 'inherit',
              '&:hover':{ bgcolor: alpha(NENC_MID, 0.08) } }}
      >
        <TableCell sx={{ py:0.8 }} colSpan={2}>
          <Box sx={{display:'flex',alignItems:'center',gap:0.8}}>
            {open ? <ExpandLessIcon sx={{fontSize:16,color:NENC_DARK}}/> : <ExpandMoreIcon sx={{fontSize:16,color:NENC_DARK}}/>}
            <Typography variant="body2" fontWeight={800} color={NENC_DARK}>{grupo.proveedor}</Typography>
            <Chip
              label={`${numOC} OC${numOC!==1?'s':''}`} size="small"
              sx={{ fontSize:'0.6rem', height:18, bgcolor:NENC_BG, color:NENC_DARK, fontWeight:700 }}
            />
          </Box>
        </TableCell>
        <TableCell sx={{ py:0.8 }}/>
        <TableCell sx={{ py:0.8 }} align="right">
          <Typography variant="body2" fontWeight={900} color={NENC_DARK}>{fmtM(grupo.total_iva)}</Typography>
          <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(grupo.total_neto)}</Typography>
        </TableCell>
        <TableCell sx={{ py:0.8 }} colSpan={3}/>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ p:0, border:0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {grupo.ordenes.map((item, i) => (
                  <NencOcSubRow
                    key={item.numero_orden || `nenc_sub_${i}`}
                    item={item}
                    onDelete={onDelete}
                    onVerProductos={onVerProductos}
                  />
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Card de proyección por semana de vencimiento ────────────────────────────
function ProyCard({ grupo, totalActual, limite }) {
  const [open, setOpen] = useState(false);
  const totalGrupo = grupo.total_comprometido || grupo.ordenes?.reduce((s,o)=>s+(o.monto_con_iva||0),0) || 0;
  const riesgo = (totalActual + totalGrupo) > limite;
  const alertColor = riesgo ? '#b71c1c' : '#2e7d32';
  return (
    <Paper elevation={0} sx={{border:`1px solid ${alpha(alertColor,.35)}`,borderLeft:`4px solid ${alertColor}`,borderRadius:2,mb:1.5,overflow:'hidden'}}>
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',p:1.5,cursor:'pointer',bgcolor:alpha(alertColor,.03),'&:hover':{bgcolor:alpha(alertColor,.06)}}}
        onClick={()=>setOpen(v=>!v)}>
        <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
          <Avatar sx={{width:32,height:32,bgcolor:alpha(alertColor,.12),color:alertColor,fontSize:'0.75rem',fontWeight:700}}>
            S{grupo.numero_semana}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>Semana de origen {grupo.numero_semana}</Typography>
            <Typography variant="caption" color="text.secondary">
              {grupo.ordenes?.length||0} orden{(grupo.ordenes?.length||0)!==1?'es':''} · vence esta semana
            </Typography>
          </Box>
        </Box>
        <Box sx={{display:'flex',alignItems:'center',gap:1}}>
          <Chip
            icon={riesgo?<WarningIcon sx={{fontSize:'13px !important',color:'white !important'}}/>:<OkIcon sx={{fontSize:'13px !important',color:'white !important'}}/>}
            label={riesgo?'RIESGO':'OK'}
            size="small"
            sx={{bgcolor:alertColor,color:'white',fontWeight:700,fontSize:'0.68rem'}}
          />
          <Typography variant="h6" fontWeight={800} color={alertColor}>{fmtM(totalGrupo)}</Typography>
          {open ? <ExpandLessIcon fontSize="small"/> : <ExpandMoreIcon fontSize="small"/>}
        </Box>
      </Box>
      <Collapse in={open}>
        <Divider/>
        <Box sx={{overflow:'auto'}}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{'& th':{bgcolor:alpha(alertColor,.06),fontWeight:700,fontSize:'0.72rem',py:0.8}}}>
                <TableCell>Proveedor</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Fecha compra</TableCell>
                <TableCell align="right">NETO</TableCell>
                <TableCell align="right">c/IVA</TableCell>
                <TableCell align="center">Plazo</TableCell>
                <TableCell align="center">Vencimiento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(grupo.ordenes||[]).map((o,i)=>(
                <TableRow key={i} sx={{'&:hover':{bgcolor:alpha(alertColor,.03)}}}>
                  <TableCell>{o.numero}</TableCell>
                  <TableCell>{o.proveedor}</TableCell>
                  <TableCell align="right">{fmtM(o.monto_neto||0)}</TableCell>
                  <TableCell align="right">{fmtM(o.monto_con_iva||0)}</TableCell>
                  <TableCell align="center"><Chip label={`${o.plazo_dias||30}d`} size="small" sx={{fontSize:'0.6rem',height:16}}/></TableCell>
                  <TableCell align="center"><Typography variant="caption" fontWeight={600} color={alertColor}>{fmtDate(o.fecha_vencimiento)}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDUCER: Estado PBI (mini-Redux pattern)
// Agrupa los 5 estados del flujo de sincronización PBI en un solo objeto
// ─── Reducer: sync ERP No Encadenados ────────────────────────────────────────
const erpSyncInitial = { open: false, loading: false, logs: [], result: null };
function erpSyncReducer(state, action) {
  switch (action.type) {
    case 'OPEN':   return { ...erpSyncInitial, open: true, loading: true };
    case 'CLOSE':  return { ...state, open: false };
    case 'LOG':    return { ...state, logs: [...state.logs, action.payload] };
    case 'DONE':   return { ...state, loading: false, result: action.payload };
    default:       return state;
  }
}

// Actions: OPEN, CLOSE, START, ADD_LOG, NEXT_STEP, SET_RESULT
// ═══════════════════════════════════════════════════════════════════════════════
const pbiInitialState = {
  open:    false,
  loading: false,
  logs:    [],
  step:    0,     // 0-4: etapas del progreso visual
  result:  null,  // null | { success, message, nextSync?, stats? }
};

function pbiReducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...pbiInitialState, open: true, loading: true };
    case 'CLOSE':
      return { ...state, open: false };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'NEXT_STEP':
      return { ...state, step: Math.max(state.step, action.payload) };
    case 'SET_RESULT':
      return { ...state, loading: false, step: 4, result: action.payload };
    case 'RETRY':
      return { ...state, logs: [], step: 0, result: null, loading: true };
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const PlanificacionPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef       = useRef(null);
  const facturaInputRef    = useRef(null);
  const ocSucursalInputRef = useRef(null);
  const [facturaLoading,    setFacturaLoading]    = useState(false);
  const [ocSucursalOpen,    setOcSucursalOpen]    = useState(false);
  const [ocSucursalNombre,  setOcSucursalNombre]  = useState('');
  const [ocSucursalLoading, setOcSucursalLoading] = useState(false);

  const [year, setYear]             = useState(new Date().getFullYear());
  const [week, setWeek]             = useState(getCurrentWeek());
  const [direction, setDirection]   = useState(1);
  const [appliedWeek, setAppliedWeek] = useState(getCurrentWeek());
  const [appliedYear, setAppliedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setAppliedWeek(week);
    setAppliedYear(year);
  }, [week, year]);
  const [weeksData, setWeeksData]   = useState([]);
  const [openChartFull, setOpenChartFull] = useState(false);
  const [compras, setCompras]       = useState([]);
  const [proyeccion, setProyeccion] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loadingWeeks, setLoadingWeeks]     = useState(true);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [comprasOC, setComprasOC]           = useState([]);
  const [loadingOC, setLoadingOC]           = useState(false);
  const [uploadLoading, setUploadLoading]   = useState(false);
  const [statsAnuales, setStatsAnuales]     = useState(null);
  const [comprasPorEmision,    setComprasPorEmision]    = useState([]);
  const [loadingEmision,       setLoadingEmision]       = useState(false);
  const [detalleEmision,       setDetalleEmision]       = useState([]);
  const [loadingDetalleEmision,setLoadingDetalleEmision]= useState(false);
  const [ultimasCargas,        setUltimasCargas]        = useState({});
  // Compras madre (dialog para selección manual desde tab Encadenados)
  const [dialogMadreOpen,        setDialogMadreOpen]        = useState(false);
  const [comprasMadrePendientes, setComprasMadrePendientes] = useState([]);
  const [madreSeleccionadas,     setMadreSeleccionadas]     = useState({});

  const [erpLoading, setErpLoading] = useState(false);
  const [erpFallidas, setErpFallidas] = useState([]);   // sucursales que no cargaron
  const [recargarLoading, setRecargarLoading] = useState(false);
  const [erpRecargando, setErpRecargando] = useState({}); // { [sucursalId]: true }
  const [searchEnc,       setSearchEnc]       = useState('');
  const [searchNenc,      setSearchNenc]      = useState('');
  const [filterEncDesde,  setFilterEncDesde]  = useState('');
  const [filterEncHasta,  setFilterEncHasta]  = useState('');
  const [filterNencDesde, setFilterNencDesde] = useState('');
  const [filterNencHasta, setFilterNencHasta] = useState('');
  // Filtro por N° Orden en Enc / No Enc
  const [searchEncOC,      setSearchEncOC]      = useState('');
  const [searchNencOC,     setSearchNencOC]     = useState('');
  // Filtros para tab Órdenes de Compra
  const [searchOC,         setSearchOC]         = useState('');
  const [filterOCDesde,    setFilterOCDesde]    = useState('');
  const [filterOCHasta,    setFilterOCHasta]    = useState('');
  const [filterOCSucursal, setFilterOCSucursal] = useState('');
  const [filterOCEstado,   setFilterOCEstado]   = useState('');
  const [detalleProdDialog, setDetalleProdDialog] = useState({ open: false, numeroOrden: '', sucursal: '' });
  const handleVerProductos = useCallback((numeroOrden, sucursal) => {
    setDetalleProdDialog({ open: true, numeroOrden: String(numeroOrden), sucursal: sucursal || '' });
  }, []);
  const [tabDetalle, setTabDetalle]         = useState(0); // 0=Enc, 1=NoEnc, 2=Proyección, 3=Sucursales
  const [calOpen,    setCalOpen]    = useState(false);
  const [tabVista,   setTabVista]   = useState(0); // 0=Resumen, 1=Detalle, 2=Cargar Datos
  const [minWaitDone] = useState(true);
  const [erpSync, erpSyncDispatch] = useReducer(erpSyncReducer, erpSyncInitial);
  const [pbiState, pbiDispatch] = useReducer(pbiReducer, pbiInitialState);
  const { open: pbiAutoOpen, loading: pbiAutoLoading, logs: pbiAutoLogs, step: pbiStep, result: pbiResult } = pbiState;
  const [syncStatus,     setSyncStatus]     = useState(null); // null | { estado, ultimaSync }

  // Nota semanal
  const [notaLocal, setNotaLocal] = useState('');

  // Sync nota cuando cambia semana/año (weekData se deriva después, así que usamos weeksData)
  useEffect(() => {
    const wd = weeksData.find(w => w.semana === week) || {};
    setNotaLocal(wd.nota || '');
  }, [week, year, weeksData]);

  const handleSaveNota = async () => {
    try {
      await api.put('/planificacion/nota', { semana: week, año: year, nota: notaLocal });
      // Actualizar en weeksData local para reflejar sin reload
      setWeeksData(prev => prev.map(w =>
        w.semana === week ? { ...w, nota: notaLocal } : w
      ));
    } catch { /* silencioso — no es crítico */ }
  };

  // Diálogos
  const [editLimOpen, setEditLimOpen] = useState(false);
  const [nuevoLimite, setNuevoLimite] = useState('');
  const [addOpen, setAddOpen]         = useState(false);
  const [addTipo, setAddTipo]         = useState('Encadenado');
  const [newCompra, setNewCompra]     = useState({ proveedor:'', fecha:'', neto:'', plazo:30, sucursal_id:'' });

  // Datos derivados
  const weekData      = weeksData.find(w => w.semana === week) || {};
  const encadenados   = compras.filter(c => {
    const t = (c.tipo_proveedor||c.tipo||'').toLowerCase();
    return t.includes('encadenado') && !t.includes('no');
  });
  const noEncadenados = compras.filter(c => {
    const t = (c.tipo_proveedor||c.tipo||'').toLowerCase();
    return t.includes('no encadenado') || t === 'no enc' || t === 'no';
  });

  // Agrupar encadenados Y no encadenados (evita duplicados por múltiples plazos en el mismo proveedor/orden)
  // Orden estable: por numero_orden asc (numérico), luego proveedor, luego id — evita fluctuación entre recargas
  const _sortAgrupados = (arr) => arr.sort((a, b) => {
    const oa = a.numero_orden, ob = b.numero_orden;
    if (oa && ob) {
      const na = parseFloat(oa), nb = parseFloat(ob);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(oa).localeCompare(String(ob));
    }
    if (oa) return -1;
    if (ob) return 1;
    const cp = (a.proveedor||'').localeCompare(b.proveedor||'');
    if (cp !== 0) return cp;
    return (a.id||0) - (b.id||0);
  });
  const encAgrupados  = _sortAgrupados(agruparEncadenados(encadenados));
  const nencAgrupados = _sortAgrupados(agruparEncadenados(noEncadenados));

  // Listas filtradas por búsqueda y rango de fechas
  const encFiltrados = encAgrupados.filter(c => {
    if (searchEnc && !(c.proveedor||'').toLowerCase().includes(searchEnc.toLowerCase())) return false;
    if (searchEncOC && !(c.numero_orden||'').toLowerCase().includes(searchEncOC.toLowerCase())) return false;
    if (filterEncDesde || filterEncHasta) {
      const fv = c.fecha_vencimiento
        ? (typeof c.fecha_vencimiento === 'string' ? c.fecha_vencimiento.split('T')[0] : isoStr(new Date(c.fecha_vencimiento)))
        : null;
      if (fv) {
        if (filterEncDesde && fv < filterEncDesde) return false;
        if (filterEncHasta && fv > filterEncHasta) return false;
      }
    }
    return true;
  });
  const nencFiltrados = nencAgrupados.filter(c => {
    if (searchNenc && !(c.proveedor||'').toLowerCase().includes(searchNenc.toLowerCase())) return false;
    if (searchNencOC && !(c.numero_orden||'').toLowerCase().includes(searchNencOC.toLowerCase())) return false;
    if (filterNencDesde || filterNencHasta) {
      const fv = c.fecha_vencimiento
        ? (typeof c.fecha_vencimiento === 'string' ? c.fecha_vencimiento.split('T')[0] : isoStr(new Date(c.fecha_vencimiento)))
        : null;
      if (fv) {
        if (filterNencDesde && fv < filterNencDesde) return false;
        if (filterNencHasta && fv > filterNencHasta) return false;
      }
    }
    return true;
  });

  // Filtros para tab Órdenes de Compra
  const ocFiltrados = agruparEncadenados(comprasOC).filter(c => {
    const q = searchOC.toLowerCase();
    if (q && !(
      (c.numero_orden||'').toLowerCase().includes(q) ||
      (c.proveedor||'').toLowerCase().includes(q)
    )) return false;
    if (filterOCSucursal && !(c.sucursal||'').toLowerCase().includes(filterOCSucursal.toLowerCase())) return false;
    if (filterOCEstado && c.estado_pago !== filterOCEstado) return false;
    if (filterOCDesde || filterOCHasta) {
      const fd = c.fecha_compra
        ? (typeof c.fecha_compra === 'string' ? c.fecha_compra.split('T')[0] : isoStr(new Date(c.fecha_compra)))
        : null;
      if (fd) {
        if (filterOCDesde && fd < filterOCDesde) return false;
        if (filterOCHasta && fd > filterOCHasta) return false;
      }
    }
    return true;
  });
  const hasOCFilters = searchOC || filterOCSucursal || filterOCEstado || filterOCDesde || filterOCHasta;
  const clearOCFilters = () => { setSearchOC(''); setFilterOCSucursal(''); setFilterOCEstado(''); setFilterOCDesde(''); setFilterOCHasta(''); };

  // Proyección: encadenados que vencen esta semana (agrupados por semana de origen)
  const proySemana = (() => {
    const grupos = {};
    proyeccion.forEach(p => {
      const sv = p.semana_vencimiento || p.numero_semana;
      if (sv !== week) return;
      const key = p.semana_compra || p.semana_origen || 0;
      if (!grupos[key]) grupos[key] = { numero_semana: key, total_comprometido: 0, ordenes: [] };
      grupos[key].total_comprometido += parseFloat(p.monto_con_iva||0);
      grupos[key].ordenes.push(p);
    });
    return Object.values(grupos).sort((a,b)=>a.numero_semana-b.numero_semana);
  })();

  const limite    = weekData.limite_semanal || weekData.limite || 100_000_000;
  // Usar siempre los montos calculados desde compras (consistente con los tabs)
  const montoEnc  = encadenados.reduce((s,c)=>s+(parseFloat(c.monto_con_iva)||parseFloat(c.monto_neto)||0),0);
  const montoNenc = noEncadenados.reduce((s,c)=>s+(parseFloat(c.monto_con_iva)||parseFloat(c.monto_neto)||0),0);
  const total     = montoEnc + montoNenc;
  // Capacidad disponible = Límite − Encadenados (igual al Excel: no incluye Deuda Estimada)
  const disponible = limite - montoEnc;
  const statusCfg = STATUS_MAP[weekData?.estado] || STATUS_MAP.OK;

  // ─── Cargas ──────────────────────────────────────────────────────────────
  const loadWeeks = useCallback(async () => {
    try {
      setLoadingWeeks(true);
      const r = await api.get(`/planificacion/control-semanal?año=${year}`);
      const d = r.data;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.semanas) ? d.semanas : []);
      setWeeksData(arr.map(w => ({ ...w, semana: parseInt(w.numero_semana ?? w.semana) })));
    } catch { enqueueSnackbar('Error cargando semanas', { variant:'error' }); }
    finally { setLoadingWeeks(false); }
  }, [year]);

  const loadCompras = useCallback(async () => {
    try {
      setLoadingCompras(true);
      const r = await api.get(`/planificacion/compras?año=${appliedYear}&semana=${appliedWeek}`);
      const d = r.data;
      setCompras(Array.isArray(d) ? d : (Array.isArray(d?.compras) ? d.compras : []));
    } catch { setCompras([]); }
    finally { setLoadingCompras(false); }
  }, [appliedYear, appliedWeek]);

  const loadProyeccion = useCallback(async () => {
    try {
      const r = await api.get(`/planificacion/proyeccion?año=${year}`);
      const d = r.data;
      // La proyección trae registros individuales de encadenados
      const raw = Array.isArray(d) ? d
        : Array.isArray(d?.proyeccion)
          ? d.proyeccion.flatMap(p => p.ordenes || [p])
          : [];
      setProyeccion(raw);
    } catch { setProyeccion([]); }
  }, [year]);

  const loadComprasOC = useCallback(async () => {
    setLoadingOC(true);
    try {
      const r = await api.get(`/planificacion/compras?año=${appliedYear}&semana=${appliedWeek}&campo=compra&tipo=Encadenado`);
      const d = r.data;
      setComprasOC(Array.isArray(d) ? d : (Array.isArray(d?.compras) ? d.compras : []));
    } catch { setComprasOC([]); }
    finally { setLoadingOC(false); }
  }, [appliedYear, appliedWeek]);

  const loadNoEncadenadosERP = useCallback(() => {
    erpSyncDispatch({ type: 'OPEN' });
    setErpLoading(true);
    setErpFallidas([]);

    const token   = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL;

    fetch(`${baseURL}/planificacion/cargar-no-encadenados-erp`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ semana: appliedWeek, año: appliedYear }),
    }).then(async resp => {
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const d = JSON.parse(line.slice(5).trim());
            if (d.tipo === 'log') {
              erpSyncDispatch({ type: 'LOG', payload: { tipo: 'info', msg: d.msg } });
            } else if (d.tipo === 'sucursal_inicio') {
              erpSyncDispatch({ type: 'LOG', payload: { tipo: 'inicio', msg: `▶ ${d.sucursal}…` } });
            } else if (d.tipo === 'sucursal_ok') {
              erpSyncDispatch({ type: 'LOG', payload: { tipo: 'ok', msg: `✓ ${d.sucursal}: ${d.total} registros ERP → ${d.insertados} procesados${d.errores ? ` (${d.errores} err)` : ''}` } });
            } else if (d.tipo === 'sucursal_error') {
              erpSyncDispatch({ type: 'LOG', payload: { tipo: 'error', msg: `✗ ${d.sucursal}: ${d.error}` } });
              setErpFallidas(prev => [...prev, { id: d.sucursal, sucursal: d.sucursal, error: d.error }]);
            } else if (d.tipo === 'fin') {
              erpSyncDispatch({ type: 'DONE', payload: { success: d.success, message: d.message, insertados: d.insertados } });
            } else if (d.tipo === 'error') {
              erpSyncDispatch({ type: 'DONE', payload: { success: false, message: d.msg } });
            }
          } catch {}
        }
      }
    }).catch(err => {
      erpSyncDispatch({ type: 'DONE', payload: { success: false, message: err.message } });
    }).finally(async () => {
      setErpLoading(false);
      await loadCompras();
      try {
        const [rE, rD] = await Promise.all([
          api.get('/planificacion/compras-por-emision', { params: { año: appliedYear } }),
          api.get('/planificacion/detalle-emision',     { params: { año: appliedYear } }),
        ]);
        setComprasPorEmision(rE.data?.semanas   || []);
        setUltimasCargas(rE.data?.ultimasCargas || {});
        setDetalleEmision(rD.data?.registros    || []);
      } catch {}
    });
  }, [appliedWeek, appliedYear, loadCompras]);

  const recargarSucursal = useCallback(async (suc) => {
    setErpRecargando(prev => ({ ...prev, [suc.id]: true }));
    try {
      const r = await api.post('/planificacion/recargar-sucursal-erp', {
        sucursalId: suc.id, semana: appliedWeek, año: appliedYear,
      });
      if (r.data?.success) {
        setErpFallidas(prev => prev.filter(f => f.id !== suc.id));
        await loadCompras();
      } else {
        enqueueSnackbar(`Error recargando ${suc.sucursal}: ${r.data?.message}`, { variant: 'error' });
      }
    } catch (e) {
      enqueueSnackbar(`Error recargando ${suc.sucursal}`, { variant: 'error' });
    } finally {
      setErpRecargando(prev => { const n = { ...prev }; delete n[suc.id]; return n; });
    }
  }, [appliedWeek, appliedYear, loadCompras]);

  useEffect(() => { api.get('/planificacion/sucursales').then(r=>setSucursales(r.data?.sucursales||r.data||[])).catch(()=>{}); }, []);
  // Estado de última sincronización PBI
  const loadSyncStatus = useCallback(() => {
    api.get('/planificacion/estado-sync-pbi')
      .then(r => { if (r.data?.success) setSyncStatus(r.data); })
      .catch(() => {});
  }, []);
  useEffect(() => { loadSyncStatus(); }, [loadSyncStatus]);
  const loadComprasPorEmision = useCallback(async () => {
    setLoadingEmision(true);
    try {
      const r = await api.get(`/planificacion/compras-por-emision`, { params: { año: year } });
      setComprasPorEmision(r.data?.semanas       || []);
      setUltimasCargas(r.data?.ultimasCargas     || {});
    } catch { setComprasPorEmision([]); }
    finally { setLoadingEmision(false); }
  }, [year]);

  const loadDetalleEmision = useCallback(async () => {
    setLoadingDetalleEmision(true);
    try {
      const r = await api.get(`/planificacion/detalle-emision`, { params: { año: year } });
      setDetalleEmision(r.data?.registros || []);
    } catch(err) {
      console.error('[DetalleEmision] Error:', err?.response?.data || err?.message || err);
      setDetalleEmision([]);
    }
    finally { setLoadingDetalleEmision(false); }
  }, [year]);

  useEffect(() => { loadWeeks(); loadProyeccion(); api.get(`/planificacion/resumen-anual?año=${year}`).then(r => setStatsAnuales(r.data)).catch(() => {}); }, [loadWeeks, loadProyeccion, year]);
  // loadCompras se llama DENTRO de loadNoEncadenadosERP (finally) para evitar race condition
  // (el ERP borra e inserta datos — loadCompras separado leería BD vacía entre medio)
  useEffect(() => { loadComprasOC(); }, [loadComprasOC]);
  useEffect(() => { loadCompras(); }, [loadCompras]);
  useEffect(() => { loadComprasPorEmision(); }, [loadComprasPorEmision]);
  useEffect(() => { loadDetalleEmision(); }, [loadDetalleEmision]);

  const handleConfirmarMadres = async () => {
    const ids = Object.entries(madreSeleccionadas).filter(([,v]) => v).map(([k]) => k);
    await Promise.all(ids.map(id => api.put(`/planificacion/compras/${id}/madre`, { es_madre: true }).catch(() => {})));
    setDialogMadreOpen(false);
    setComprasMadrePendientes([]);
    loadCompras();
  };

  // Marcar como madre directo desde la vista de Emisión (sin dialog intermedio)
  const handleMadreDesdeEmision = useCallback(async (r) => {
    await api.put(`/planificacion/compras/${r.id}/madre`, { es_madre: true }).catch(() => {});
    loadCompras();
  }, [loadCompras]);

  // IDs sospechosas (5× mediana) para destacar en la vista de Emisión
  const sospechosasIdsEmision = useMemo(() => {
    const importes = detalleEmision.map(r => parseFloat(r.monto_con_iva) || 0).filter(v => v > 0).sort((a,b) => a-b);
    if (importes.length < 3) return new Set();
    const mediana = importes[Math.floor(importes.length / 2)];
    const umbral  = mediana * 5;
    return new Set(detalleEmision.filter(r => (parseFloat(r.monto_con_iva) || 0) > umbral).map(r => r.id));
  }, [detalleEmision]);

  // ─── Navegación ──────────────────────────────────────────────────────────
  const goToPrev = () => { setDirection(-1); setWeek(w=>Math.max(1,w-1)); };
  const goToNext = () => { setDirection(1);  setWeek(w=>Math.min(52,w+1)); };

  // ─── Acciones ────────────────────────────────────────────────────────────
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setUploadLoading(true);
    const fd = new FormData(); fd.append('excel', file);
    try {
      const r = await api.post('/planificacion/upload-excel', fd, {
        headers: { 'Content-Type': undefined },
      });
      const d = r.data;
      enqueueSnackbar(
        d.message || `Excel cargado: ${d.insertados||0} nuevos` +
        (d.actualizados > 0 ? `, ${d.actualizados} actualizados` : '') +
        (d.ignorados    > 0 ? `, ${d.ignorados} ignorados`       : ''),
        { variant: 'success' }
      );
      loadWeeks(); loadCompras(); loadProyeccion();
    } catch(err) { enqueueSnackbar(err.response?.data?.message||'Error al cargar', { variant:'error' }); }
    finally { setUploadLoading(false); e.target.value=''; }
  };
  const handleFacturasUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setFacturaLoading(true);
    const fd = new FormData(); fd.append('facturas', file);
    try {
      const r = await api.post('/planificacion/upload-facturas', fd, {
        headers: { 'Content-Type': undefined },
      });
      const d = r.data;
      enqueueSnackbar(d.message || 'Facturas procesadas', { variant: 'success' });
      loadWeeks(); loadCompras();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al cargar facturas', { variant: 'error' });
    } finally { setFacturaLoading(false); e.target.value = ''; }
  };

  // Calcula el próximo lunes (si hoy es lunes, devuelve el siguiente)
  const proximoLunes = () => {
    const now  = new Date();
    const day  = now.getDay(); // 0=Dom, 1=Lun ...
    const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    const next = new Date(now);
    next.setDate(now.getDate() + diff);
    return next.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleRecargar = async () => {
    setRecargarLoading(true);
    try {
      await api.post('/planificacion/deduplicar');
      await loadCompras();
    } catch (e) {
      console.error('Error al recargar:', e);
    } finally {
      setRecargarLoading(false);
    }
  };

  const handleDescargarPBIAuto = () => {
    pbiDispatch({ type: 'OPEN' }); // resetea todo y abre el diálogo en modo cargando

    const token   = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL;

    fetch(`${baseURL}/planificacion/descargar-pbi-auto`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).then(async resp => {
      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let buf = '';
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const d = JSON.parse(line.slice(5).trim());
            if (d.tipo === 'log') {
              pbiDispatch({ type: 'ADD_LOG', payload: { tipo: 'info', msg: d.msg } });
              // Avanzar pasos según contenido del log
              const msg = d.msg.toLowerCase();
              if (msg.includes('navegador') || msg.includes('login') || msg.includes('usuario') || msg.includes('contraseña'))
                pbiDispatch({ type: 'NEXT_STEP', payload: 1 });
              if (msg.includes('reporte cargado') || msg.includes('buscando visual') || msg.includes('export data'))
                pbiDispatch({ type: 'NEXT_STEP', payload: 2 });
              if (msg.includes('excel capturado') || msg.includes('procesando archivo'))
                pbiDispatch({ type: 'NEXT_STEP', payload: 3 });
            }
            if (d.tipo === 'error') pbiDispatch({ type: 'ADD_LOG', payload: { tipo: 'error', msg: d.msg } });
            if (d.tipo === 'fin') {
              finished = true;
              if (d.success) {
                pbiDispatch({ type: 'SET_RESULT', payload: { success: true, message: d.message, nextSync: proximoLunes() } });
                loadWeeks(); loadCompras(); loadSyncStatus();
              } else {
                pbiDispatch({ type: 'SET_RESULT', payload: { success: false, message: d.message || 'Error en la sincronización' } });
              }
            }
          } catch {}
        }
      }
      if (!finished) {
        pbiDispatch({ type: 'SET_RESULT', payload: { success: false, message: 'Stream finalizado sin respuesta del servidor' } });
      }
    }).catch(err => {
      pbiDispatch({ type: 'ADD_LOG', payload: { tipo: 'error', msg: err.message } });
      pbiDispatch({ type: 'SET_RESULT', payload: { success: false, message: err.message } });
    });
  };

  const handleOcSucursalUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    // Guardar el archivo y abrir el diálogo de selección de sucursal
    // Usamos un closure via ref para mantener el archivo hasta confirmar
    ocSucursalInputRef._pendingFile = file;
    setOcSucursalNombre('');
    setOcSucursalOpen(true);
  };

  const confirmarOcSucursal = async () => {
    const file = ocSucursalInputRef._pendingFile;
    if (!file || !ocSucursalNombre.trim()) return;
    setOcSucursalLoading(true);
    const fd = new FormData();
    fd.append('excel', file);
    fd.append('sucursal', ocSucursalNombre.trim());
    try {
      const r = await api.post('/planificacion/upload-excel-sucursal', fd, {
        headers: { 'Content-Type': undefined },
      });
      const d = r.data;
      enqueueSnackbar(d.message || `OC Sucursal cargado: ${d.insertados||0} nuevos`, { variant: 'success' });
      setOcSucursalOpen(false);
      ocSucursalInputRef._pendingFile = null;
      loadWeeks(); loadCompras(); loadProyeccion();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Error al cargar', { variant: 'error' });
    } finally { setOcSucursalLoading(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/planificacion/compras/${id}`); enqueueSnackbar('Eliminado',{variant:'success'}); loadCompras(); loadWeeks(); }
    catch { enqueueSnackbar('Error al eliminar',{variant:'error'}); }
  };

  const handleEstadoOrden = async (orden, campo, valor) => {
    if (!orden) return;
    try {
      const body = campo === 'vigente' ? { vigente: valor } : { estado_pago: valor };
      await api.put(`/planificacion/ordenes/${encodeURIComponent(orden)}/estado`, body);
      setCompras(prev => prev.map(c =>
        c.numero_orden === orden ? { ...c, ...body } : c
      ));
    } catch { enqueueSnackbar('Error actualizando estado', { variant:'error' }); }
  };
  const handleSaveLimite = async () => {
    try {
      await api.put('/planificacion/limite', { semana: week, año: year, limite: parseFloat(nuevoLimite) });
      enqueueSnackbar('Límite actualizado',{variant:'success'}); setEditLimOpen(false); loadWeeks();
    } catch { enqueueSnackbar('Error al guardar',{variant:'error'}); }
  };
  const handleAddCompra = async () => {
    try {
      await api.post('/planificacion/compras', { ...newCompra, semana:week, año:year, tipo:addTipo });
      enqueueSnackbar('Registro agregado',{variant:'success'}); setAddOpen(false);
      setNewCompra({proveedor:'',fecha:'',neto:'',plazo:30,sucursal_id:''});
      loadCompras(); loadWeeks();
    } catch { enqueueSnackbar('Error al agregar',{variant:'error'}); }
  };

  if (loadingWeeks) return (
    <Box sx={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2 }}>
      <CircularProgress size={36} sx={{ color: ENC_DARK }}/>
      <Typography variant="body2" color="text.secondary">Cargando semanas…</Typography>
    </Box>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{p:{xs:2,md:3},maxWidth:1600,mx:'auto'}}>

      {/* ── Header estático ── */}
      <Box sx={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',mb:2}}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Planificación · Pagos</Typography>
          <Typography variant="body2" color="text.secondary">Control semanal de compromisos</Typography>
        </Box>
        <Select value={year} onChange={e=>setYear(e.target.value)} size="small" sx={{minWidth:90,borderRadius:2}}>
          {[2023,2024,2025,2026].map(y=><MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
      </Box>


      {/* ── Panel de Alertas Críticas ── */}
      <AlertasCriticas
        weeksData={weeksData}
        currentWeek={week}
        onJump={w => { setDirection(w > week ? 1 : -1); setWeek(w); }}
      />

      {/* ── Navegador (estático, siempre visible) ── */}
      <Paper elevation={0} sx={{border:'1px solid',borderColor:'divider',borderRadius:3,p:2.5,mb:2,
        background:`linear-gradient(135deg,${alpha(statusCfg.color,.04)} 0%,transparent 70%)`}}>
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
          <IconButton onClick={goToPrev} disabled={week===1}
            sx={{bgcolor:alpha('#000',.05),'&:hover':{bgcolor:alpha('#000',.1)},'&.Mui-disabled':{opacity:.25}}}>
            <PrevIcon/>
          </IconButton>

          <Box sx={{textAlign:'center',minWidth:220}}>
            <Typography variant="overline" color="text.secondary" fontSize="0.62rem" letterSpacing={1.5}>
              SEMANA
            </Typography>
            <Typography variant="h1" fontWeight={900} lineHeight={0.85} sx={{fontSize:{xs:'4rem',md:'5.5rem'},my:0.5}}>
              {String(week).padStart(2,'0')}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {weekData.fecha_inicio ? `${fmtDate(weekData.fecha_inicio)} — ${fmtDate(weekData.fecha_fin)} · ${year}` : `Año ${year}`}
            </Typography>
            <Box sx={{display:'flex',justifyContent:'center',gap:1,mt:1}}>
              <Chip icon={<statusCfg.Icon sx={{fontSize:'13px !important'}}/>} label={weekData.estado||'OK'} size="small"
                sx={{bgcolor:statusCfg.color,color:'white',fontWeight:700}}/>
              <Chip label={fmtFull(limite)} size="small" variant="outlined" fontWeight={600}
                onClick={()=>{setNuevoLimite(String(limite));setEditLimOpen(true);}}
                icon={<EditIcon sx={{fontSize:'13px !important'}}/>} sx={{cursor:'pointer'}}/>
            </Box>
            {/* Indicador de tendencia vs semana anterior */}
            {(() => {
              const prevW = weeksData.find(w => w.semana === week - 1);
              if (!prevW) return null;
              const curr = (weekData.encadenados || 0) + (weekData.deuda_facturada_nenc || 0);
              const prev = (prevW.encadenados || 0) + (prevW.deuda_facturada_nenc || 0);
              if (prev === 0 || curr === 0) return null;
              const diff = ((curr - prev) / prev) * 100;
              const isUp = diff > 0;
              return (
                <Box sx={{ display:'flex', justifyContent:'center', mt:0.8 }}>
                  <Chip
                    size="small"
                    icon={isUp
                      ? <TrendingUpIcon sx={{ fontSize:'13px !important', color: isUp ? '#b71c1c !important' : '#2e7d32 !important' }}/>
                      : <TrendingDownIcon sx={{ fontSize:'13px !important', color: '#2e7d32 !important' }}/>}
                    label={`${isUp ? '+' : ''}${diff.toFixed(1)}% vs sem. anterior`}
                    sx={{
                      bgcolor: isUp ? 'rgba(183,28,28,0.08)' : 'rgba(46,125,50,0.08)',
                      color: isUp ? '#b71c1c' : '#2e7d32',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                </Box>
              );
            })()}
          </Box>

          <IconButton onClick={goToNext} disabled={week===52}
            sx={{bgcolor:alpha('#000',.05),'&:hover':{bgcolor:alpha('#000',.1)},'&.Mui-disabled':{opacity:.25}}}>
            <NextIcon/>
          </IconButton>
        </Box>


        {/* Mini mapa del año */}
        <Box sx={{mt:2}}>
          <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:0.5}}>
            <Typography variant="caption" color="text.secondary">
              Semana {week} de 52
              </Typography>
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Typography variant="caption" color="text.secondary">{Math.round(week/52*100)}% del año</Typography>
              <Tooltip title="Ver gráfico anual en pantalla completa" arrow>
                <Button size="small" variant="contained" onClick={() => setOpenChartFull(true)}
                  startIcon={<FullscreenIcon sx={{ fontSize:15 }}/>}
                  sx={{ py:0.4, px:1.2, fontSize:'0.7rem', fontWeight:700, borderRadius:2,
                    bgcolor: ENC_DARK, '&:hover':{ bgcolor: ENC_MID }, textTransform:'none', lineHeight:1.4 }}>
                  Ver anual
                </Button>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{position:'relative',height:5,borderRadius:3,bgcolor:'#e0e0e0',overflow:'hidden'}}>
            <Box sx={{position:'absolute',top:0,left:0,height:'100%',width:`${week/52*100}%`,bgcolor:'#90a4ae',borderRadius:3,transition:'width .4s ease'}}/>
          </Box>
          {/* Mini bar chart de 52 semanas */}
          <Box sx={{ mt: 2.5, position: 'relative' }}>
            {/* Línea de límite al 100% */}
            <Box sx={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '1px', bgcolor: alpha('#b71c1c', 0.25),
              borderTop: '1px dashed', borderColor: alpha('#b71c1c', 0.35),
              zIndex: 1,
            }}/>
            {/* Línea al 80% */}
            <Box sx={{
              position: 'absolute', top: `${BAR_H * 0.2}px`, left: 0, right: 0,
              height: '1px', borderTop: '1px dashed', borderColor: alpha('#f57c00', 0.3),
              zIndex: 1,
            }}/>
            {/* Barras */}
            <Box sx={{ display: 'flex', gap: '1px', alignItems: 'flex-end', height: BAR_H + 4 }}>
              {weeksData.map(w => (
                <WeekMiniBar
                  key={w.semana}
                  w={w}
                  isCurrent={w.semana === week}
                  onClick={() => { setDirection(w.semana > week ? 1 : -1); setWeek(w.semana); }}
                />
              ))}
            </Box>
            {/* Etiquetas de mes */}
            <Box sx={{ display: 'flex', mt: 0.5, position: 'relative', height: 14 }}>
              {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((mes, i) => {
                // Semana aproximada de inicio de cada mes (52/12 ≈ 4.33 semanas/mes)
                const leftPct = (i * 52 / 12) / 52 * 100;
                return (
                  <Typography key={mes} variant="caption" sx={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    fontSize: '0.68rem',
                    color: 'text.secondary',
                    userSelect: 'none',
                  }}>{mes}</Typography>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ── Modal gráfico fullscreen ── */}
      <GraficoAnualFullscreen
        open={openChartFull}
        onClose={() => setOpenChartFull(false)}
        weeksData={weeksData}
        currentWeek={week}
        año={year}
        onJump={(s) => { setDirection(s > week ? 1 : -1); setWeek(s); }}
      />

      {/* ── Banner estado sincronización PBI ── */}
      {syncStatus && (() => {
        const ok       = syncStatus.estado === 'ok';
        const nunca    = syncStatus.estado === 'nunca';
        const ultima   = syncStatus.ultimaSync
          ? new Date(syncStatus.ultimaSync).toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })
          : null;

        const cfgBanner = ok
          ? { bg:'#e8f5e9', border:'#a5d6a7', color:'#1b5e20', icon:'✅', texto:'Facturas PBI sincronizadas esta semana', sub: ultima ? `Última sync: ${ultima}` : '' }
          : nunca
          ? { bg:'#fff3e0', border:'#ffcc80', color:'#e65100', icon:'⚠️', texto:'Nunca has sincronizado las facturas PBI', sub:'Ve a Cargar Datos → Sincronizar Facturas para actualizar los montos reales.' }
          : { bg:'#fff3e0', border:'#ffcc80', color:'#e65100', icon:'⚠️', texto:'Debes sincronizar las facturas PBI esta semana', sub: ultima ? `Última sync: ${ultima}` : 'Sin sync registrada esta semana.' };

        return (
          <Box sx={{
            mb:2, px:2, py:1.2, borderRadius:2,
            bgcolor: cfgBanner.bg, border:`1.5px solid ${cfgBanner.border}`,
            display:'flex', alignItems:'center', gap:1.5, flexWrap:'wrap',
          }}>
            <span style={{fontSize:18}}>{cfgBanner.icon}</span>
            <Box sx={{flex:1, minWidth:0}}>
              <Typography variant="body2" fontWeight={700} color={cfgBanner.color}>
                {cfgBanner.texto}
              </Typography>
              {cfgBanner.sub && (
                <Typography variant="caption" color="text.secondary">{cfgBanner.sub}</Typography>
              )}
            </Box>
            {!ok && (
              <Button size="small" variant="contained"
                onClick={()=>{ setTabVista(2); setTimeout(()=>{ handleDescargarPBIAuto(); }, 150); }}
                startIcon={<SyncIcon sx={{fontSize:15}}/>}
                sx={{borderRadius:2,bgcolor:'#e65100','&:hover':{bgcolor:'#bf360c'},fontWeight:700,fontSize:'0.75rem',whiteSpace:'nowrap'}}>
                Sincronizar ahora
              </Button>
            )}
          </Box>
        );
      })()}

      {/* ── Tabs de vista principal ── */}
      <Box sx={{mb:2,borderBottom:'1px solid',borderColor:'divider'}}>
        <Tabs value={tabVista} onChange={(_,v)=>setTabVista(v)} sx={{
          '& .MuiTab-root':{textTransform:'none',fontWeight:700,minHeight:44,fontSize:'0.85rem',gap:0.5},
          '& .MuiTabs-indicator':{height:3,borderRadius:'3px 3px 0 0',
            bgcolor:[ENC_MID,NENC_MID,'#6a1b9a','#00838f',OC_COLOR][tabVista]||ENC_MID},
        }}>
          <Tab icon={<TrendingUpIcon sx={{fontSize:17}}/>} iconPosition="start" label="Resumen"
            sx={{'&.Mui-selected':{color:ENC_MID}}}/>
          <Tab icon={<OcIcon sx={{fontSize:17}}/>} iconPosition="start" label="Detalle"
            sx={{'&.Mui-selected':{color:NENC_MID}}}/>
          <Tab icon={<UploadIcon sx={{fontSize:17}}/>} iconPosition="start" label="Cargar Datos"
            sx={{'&.Mui-selected':{color:'#6a1b9a'}}}/>
          <Tab icon={<CalendarMonthIcon sx={{fontSize:17}}/>} iconPosition="start" label="Compras por Emisión"
            sx={{'&.Mui-selected':{color:'#00838f'}}}/>
        </Tabs>
      </Box>

      {/* ══ VISTA 0: RESUMEN ══ */}
      {tabVista === 0 && (
        <>
          <StatsAnuales stats={statsAnuales}/>
          <TablaAnual
            weeksData={weeksData}
            año={year}
            currentWeek={week}
            onJump={w => { setDirection(w > week ? 1 : -1); setWeek(w); }}
          />
          <AlertasSemanas
            weeksData={weeksData}
            currentWeek={week}
            onJump={w => { setDirection(w > week ? 1 : -1); setWeek(w); }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={`res-${year}-${week}`}
              initial={{ opacity:0, x: direction*40 }}
              animate={{ opacity:1, x:0 }}
              exit={{    opacity:0, x: direction*-40 }}
              transition={{ duration:0.2, ease:'easeOut' }}
            >
              {/* Calendario colapsable */}
              {(() => {
                const comprasCal = proyeccion.filter(p => p.semana_vencimiento === week || p.numero_semana === week);
                return (
                  <Box sx={{ mb:2 }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      mb: calOpen ? 1 : 0, cursor:'pointer', px:0.5 }} onClick={() => setCalOpen(v=>!v)}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.8 }}>
                        <CalendarIcon sx={{ fontSize:15, color:'text.secondary' }}/>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} textTransform="uppercase">
                          Calendario de vencimientos — Sem. {week}
                        </Typography>
                      </Box>
                      <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                        <Typography variant="caption" color="text.disabled" fontSize="0.68rem">{calOpen ? 'Ocultar' : 'Ver calendario'}</Typography>
                        {calOpen ? <ExpandLessIcon sx={{ fontSize:16, color:'text.disabled' }}/> : <ExpandMoreIcon sx={{ fontSize:16, color:'text.disabled' }}/>}
                      </Box>
                    </Box>
                    <Collapse in={calOpen}>
                      <WeekCalendar week={week} year={year} compras={comprasCal} />
                    </Collapse>
                  </Box>
                );
              })()}

              {/* Presupuesto Semanal */}
              <Paper elevation={0} sx={{border:`2px solid ${alpha(statusCfg.color,.5)}`,borderRadius:3,p:3,mb:2,bgcolor:statusCfg.bg}}>
                <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:2.5}}>
                  <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                    <Avatar sx={{bgcolor:statusCfg.color,width:40,height:40}}>
                      <statusCfg.Icon sx={{fontSize:20}}/>
                    </Avatar>
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontSize="0.62rem" letterSpacing={1.5}>
                        Control Pagos — por semana de vencimiento
                      </Typography>
                      <Typography variant="h6" fontWeight={800} lineHeight={1}>{fmtFull(limite)}</Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Editar límite">
                    <IconButton size="small" onClick={()=>{setNuevoLimite(String(limite));setEditLimOpen(true);}}>
                      <EditIcon fontSize="small"/>
                    </IconButton>
                  </Tooltip>
                </Box>
                <BudgetBar enc={montoEnc} nenc={montoNenc} limite={limite}/>
                <Grid container spacing={1.5} sx={{mt:1.5}}>
                  {[
                    { label:'Encadenados (venc.)',   value:montoEnc,   color:ENC_DARK,  bg:ENC_BG,   desc:'OC+Facturas · por vencimiento' },
                    { label:'No Encadenados (venc.)',value:montoNenc,  color:NENC_DARK, bg:NENC_BG,  desc:'ERP · por fecha vencimiento' },
                    { label:'Total',                value:total,      color:statusCfg.color, bg:statusCfg.bg, desc:'Enc. + No Enc. esta semana' },
                    { label:'Capacidad Disponible', value:disponible, color:disponible>=0?'#1b5e20':'#b71c1c', bg:disponible>=0?'#f1f8e9':'#ffebee', desc:'Límite − Encadenados' },
                  ].map(({label,value,color,bg,desc})=>(
                    <Grid item xs={6} sm={3} key={label}>
                      <Box sx={{p:1.5,borderRadius:2.5,bgcolor:bg,textAlign:'center'}}>
                        <Typography variant="caption" color="text.secondary" fontSize="0.65rem" display="block">{label}</Typography>
                        <Typography variant="h6" fontWeight={800} color={color} lineHeight={1.2}>{fmtM(value)}</Typography>
                        <Typography variant="caption" color="text.disabled" fontSize="0.62rem">{desc}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {/* Nota semanal */}
                <Box sx={{ mt:2, display:'flex', alignItems:'flex-start', gap:1 }}>
                  <NotesIcon sx={{ fontSize:18, color:'text.disabled', mt:1 }}/>
                  <TextField size="small" fullWidth multiline minRows={1} maxRows={4}
                    placeholder="Agregar nota para esta semana…"
                    value={notaLocal} onChange={e => setNotaLocal(e.target.value)} onBlur={handleSaveNota}
                    InputProps={{ sx:{ borderRadius:2, fontSize:'0.82rem', bgcolor:'background.paper' } }}
                    sx={{ '& .MuiOutlinedInput-root':{ borderRadius:2 } }}/>
                </Box>
              </Paper>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* ══ VISTA 1: DETALLE ══ */}
      {tabVista === 1 && (
        <>
          <Box sx={{display:'flex',justifyContent:'flex-end',mb:1}}>
            <Button size="small" startIcon={<AddIcon/>} variant="contained"
              onClick={()=>setAddOpen(true)}
              sx={{borderRadius:2,fontSize:'0.78rem',bgcolor:ENC_MID,'&:hover':{bgcolor:ENC_DARK},fontWeight:700}}>
              Agregar Pago
            </Button>
          </Box>
          <AnimatePresence mode="wait">
            <motion.div
              key={`det-${year}-${week}`}
              initial={{ opacity:0, x: direction*40 }}
              animate={{ opacity:1, x:0 }}
              exit={{    opacity:0, x: direction*-40 }}
              transition={{ duration:0.2, ease:'easeOut' }}
            >
          {/* Vista unificada: Enc / No Enc / Proyección / Por Sucursal / OC */}
          <Paper elevation={0} sx={{border:'1px solid',borderColor:'divider',borderRadius:3,overflow:'hidden'}}>
            <Box sx={{borderBottom:'1px solid',borderColor:'divider',px:1,pt:1,pb:1.5}}>
              <Tabs value={tabDetalle} onChange={(_,v)=>setTabDetalle(v)}
                sx={{minHeight:40,
                  '& .MuiTab-root':{minHeight:40,textTransform:'none',fontWeight:600,fontSize:'0.78rem',minWidth:0,px:1.5},
                  '& .MuiTabs-indicator':{bgcolor:[ENC_MID,NENC_MID,PROY_COLOR,'#1a237e',OC_COLOR][tabDetalle]||ENC_MID},
                }}>
                <Tab label={
                  <Box sx={{display:'flex',alignItems:'center',gap:0.7}}>
                    <EncadenadoIcon sx={{fontSize:14,color:tabDetalle===0?ENC_DARK:'text.disabled'}}/>
                    <span>Encadenados</span>
                    <Chip label={encAgrupados.length} size="small" sx={{height:16,fontSize:'0.6rem',bgcolor:ENC_BG,color:ENC_DARK}}/>
                  </Box>} sx={{'&.Mui-selected':{color:ENC_DARK}}}/>
                <Tab label={
                  <Box sx={{display:'flex',alignItems:'center',gap:0.7}}>
                    <NoEncadenadoIcon sx={{fontSize:14,color:tabDetalle===1?NENC_DARK:'text.disabled'}}/>
                    <span>No Encadenados</span>
                    <Chip label={erpLoading || loadingCompras ? '…' : nencAgrupados.length} size="small" sx={{height:16,fontSize:'0.6rem',bgcolor:NENC_BG,color:NENC_DARK}}/>
                  </Box>} sx={{'&.Mui-selected':{color:NENC_DARK}}}/>
                <Tab label={
                  <Box sx={{display:'flex',alignItems:'center',gap:0.7}}>
                    <TrendingUpIcon sx={{fontSize:14,color:tabDetalle===2?PROY_COLOR:'text.disabled'}}/>
                    <span>Proyección</span>
                    <Chip label={proySemana.length} size="small" sx={{height:16,fontSize:'0.6rem',bgcolor:alpha(PROY_COLOR,.1),color:PROY_COLOR}}/>
                  </Box>} sx={{'&.Mui-selected':{color:PROY_COLOR}}}/>
                <Tab label={
                  <Box sx={{display:'flex',alignItems:'center',gap:0.7}}>
                    <SucursalIcon sx={{fontSize:14,color:tabDetalle===3?'#1a237e':'text.disabled'}}/>
                    <span>Por Sucursal</span>
                  </Box>} sx={{'&.Mui-selected':{color:'#1a237e'}}}/>
                <Tab label={
                  <Box sx={{display:'flex',alignItems:'center',gap:0.7}}>
                    <OcIcon sx={{fontSize:14,color:tabDetalle===4?OC_COLOR:'text.disabled'}}/>
                    <span>Órdenes de Compra</span>
                    <Chip label={encAgrupados.length} size="small"
                      sx={{height:16,fontSize:'0.6rem',bgcolor:alpha(OC_COLOR,.1),color:OC_COLOR}}/>
                  </Box>} sx={{'&.Mui-selected':{color:OC_COLOR}}}/>
              </Tabs>
            </Box>

            {/* ─ TAB 0: Encadenados ─ */}
            {tabDetalle===0 && (
              <Box>
                {(() => {
                  const encProvCount = agruparPorProveedor(encAgrupados).length;
                  return (
                <Box sx={{px:2,py:1,display:'flex',gap:1,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid',borderColor:'divider',bgcolor:alpha(ENC_DARK,.02)}}>
                  <Typography variant="subtitle2" fontWeight={700} color={ENC_DARK} sx={{mr:'auto'}}>
                    {fmtM(montoEnc)} · {encProvCount} proveedor{encProvCount !== 1 ? 'es' : ''} · {encAgrupados.length} OC{encAgrupados.length !== 1 ? 's' : ''}
                    {encAgrupados.length < encadenados.length && (
                      <Typography component="span" variant="caption" color="text.disabled" sx={{ml:0.8}}>
                        ({encadenados.length} cuotas)
                      </Typography>
                    )}
                  </Typography>
                </Box>
                  );
                })()}
                {/* Hidden file inputs (siempre presentes para que los refs funcionen) */}
                <input ref={fileInputRef}       type="file" accept=".xlsx,.xls" hidden onChange={handleExcelUpload}/>
                <input ref={facturaInputRef}    type="file" accept=".xlsx,.xls" hidden onChange={handleFacturasUpload}/>
                <input ref={ocSucursalInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleOcSucursalUpload}/>
                {encadenados.length>0 && (
                  <Box sx={{px:2,py:1,borderBottom:'1px solid',borderColor:'divider'}}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" fullWidth placeholder="Buscar proveedor…"
                          value={searchEnc} onChange={e=>setSearchEnc(e.target.value)}
                          InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:16,color:'text.disabled'}}/></InputAdornment>,sx:{borderRadius:2,fontSize:'0.8rem'}}}/>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" fullWidth placeholder="N° Orden de compra…"
                          value={searchEncOC} onChange={e=>setSearchEncOC(e.target.value)}
                          InputProps={{startAdornment:<InputAdornment position="start"><OcIcon sx={{fontSize:16,color:ENC_MID}}/></InputAdornment>,sx:{borderRadius:2,fontSize:'0.8rem'}}}/>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField size="small" fullWidth type="date" label="Desde"
                          value={filterEncDesde} onChange={e=>setFilterEncDesde(e.target.value)}
                          InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                          sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField size="small" fullWidth type="date" label="Hasta"
                          value={filterEncHasta} onChange={e=>setFilterEncHasta(e.target.value)}
                          InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                          sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                      </Grid>
                      {(searchEnc || searchEncOC || filterEncDesde || filterEncHasta) && (
                        <Grid item xs={12} sx={{ display:'flex', justifyContent:'flex-end', gap:1 }}>
                          <Button size="small" variant="text"
                            onClick={() => { setSearchEnc(''); setSearchEncOC(''); setFilterEncDesde(''); setFilterEncHasta(''); }}
                            sx={{ textTransform:'none', color:'text.secondary', fontSize:'0.75rem' }}>
                            Limpiar
                          </Button>
                          <Button size="small" variant="contained" startIcon={<SearchIcon sx={{fontSize:15}}/>}
                            sx={{ textTransform:'none', fontWeight:700, borderRadius:2, bgcolor:ENC_DARK, '&:hover':{ bgcolor:ENC_MID } }}>
                            Buscar
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
                <Box sx={{maxHeight:420,overflowY:'auto'}}>
                  {loadingCompras
                    ?<Box sx={{p:4,textAlign:'center'}}><CircularProgress size={24} sx={{color:ENC_MID}}/></Box>
                    :encadenados.length===0
                      ?<Box sx={{py:6,textAlign:'center'}}>
                        <EncadenadoIcon sx={{fontSize:40,color:alpha(ENC_DARK,.15),mb:1}}/>
                        <Typography variant="body2" color="text.disabled">Sin encadenados en semana {week}</Typography>
                        <Typography variant="caption" color="text.disabled" display="block">Sube el Excel con la Hoja "Compras"</Typography>
                      </Box>
                      :encFiltrados.length===0
                        ?<Box sx={{py:5,textAlign:'center'}}><Typography variant="body2" color="text.disabled">Sin resultados</Typography></Box>
                        :<Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{'& th':{bgcolor:ENC_BG,fontWeight:700,fontSize:'0.68rem',color:ENC_DARK,py:0.8}}}>
                              <TableCell colSpan={2}>Proveedor / Orden</TableCell>
                              <TableCell>Sucursal</TableCell><TableCell align="right">c/IVA</TableCell>
                              <TableCell align="center">Plazo</TableCell><TableCell align="center">Vencimiento</TableCell>
                              <TableCell align="center">Fuente</TableCell>
                              <TableCell align="right" sx={{width:32}}/>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {agruparPorProveedor(encFiltrados).map((grupo, i) => (
                              <EncProveedorGrupo
                                key={grupo.proveedor || `enc_grp_${i}`}
                                grupo={grupo}
                                onDelete={handleDelete}
                                onVerProductos={handleVerProductos}
                                onMadre={item => {
                                  setComprasMadrePendientes([item]);
                                  setMadreSeleccionadas({ [item.id]: true });
                                  setDialogMadreOpen(true);
                                }}
                              />
                            ))}
                          </TableBody>
                        </Table>
                  }
                </Box>
              </Box>
            )}

            {/* ─ TAB 1: No Encadenados (ERP) ─ */}
            {tabDetalle===1 && (
              <Box>
                {(() => {
                  const cargando = loadingCompras;
                  const nencProvs = agruparPorProveedor(nencAgrupados);
                  return (
                    <>
                      <Box sx={{px:2,py:1,display:'flex',gap:1,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid',borderColor:'divider',bgcolor:alpha(NENC_DARK,.02)}}>
                        <Typography variant="subtitle2" fontWeight={700} color={NENC_DARK} sx={{mr:'auto'}}>
                          {loadingCompras ? '…' : (
                            <>
                              {fmtM(montoNenc)} · {nencProvs.length} proveedor{nencProvs.length !== 1 ? 'es' : ''} · {nencAgrupados.length} OC{nencAgrupados.length !== 1 ? 's' : ''}
                              {nencAgrupados.length < noEncadenados.length && (
                                <Typography component="span" variant="caption" color="text.disabled" sx={{ml:0.8}}>
                                  ({noEncadenados.length} cuotas)
                                </Typography>
                              )}
                            </>
                          )}
                        </Typography>
                      </Box>
                      {!cargando && nencAgrupados.length > 0 && (
                        <Box sx={{px:2,py:1,borderBottom:'1px solid',borderColor:'divider'}}>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item xs={12} sm={4}>
                              <TextField size="small" fullWidth placeholder="Buscar proveedor…"
                                value={searchNenc} onChange={e=>setSearchNenc(e.target.value)}
                                InputProps={{startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:16,color:'text.disabled'}}/></InputAdornment>,sx:{borderRadius:2,fontSize:'0.8rem'}}}/>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <TextField size="small" fullWidth placeholder="N° Orden de compra…"
                                value={searchNencOC} onChange={e=>setSearchNencOC(e.target.value)}
                                InputProps={{startAdornment:<InputAdornment position="start"><OcIcon sx={{fontSize:16,color:NENC_MID}}/></InputAdornment>,sx:{borderRadius:2,fontSize:'0.8rem'}}}/>
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField size="small" fullWidth type="date" label="Desde"
                                value={filterNencDesde} onChange={e=>setFilterNencDesde(e.target.value)}
                                InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                                sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                            </Grid>
                            <Grid item xs={6} sm={2}>
                              <TextField size="small" fullWidth type="date" label="Hasta"
                                value={filterNencHasta} onChange={e=>setFilterNencHasta(e.target.value)}
                                InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                                sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                            </Grid>
                            {(searchNenc || searchNencOC || filterNencDesde || filterNencHasta) && (
                              <Grid item xs={12} sx={{ display:'flex', justifyContent:'flex-end', gap:1 }}>
                                <Button size="small" variant="text"
                                  onClick={() => { setSearchNenc(''); setSearchNencOC(''); setFilterNencDesde(''); setFilterNencHasta(''); }}
                                  sx={{ textTransform:'none', color:'text.secondary', fontSize:'0.75rem' }}>
                                  Limpiar
                                </Button>
                                <Button size="small" variant="contained" startIcon={<SearchIcon sx={{fontSize:15}}/>}
                                  sx={{ textTransform:'none', fontWeight:700, borderRadius:2, bgcolor:NENC_DARK, '&:hover':{ bgcolor:NENC_MID } }}>
                                  Buscar
                                </Button>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}
                      <Box sx={{maxHeight:420,overflowY:'auto'}}>
                        {cargando
                          ? <Box sx={{p:4,textAlign:'center'}}>
                              <CircularProgress size={28} sx={{color:NENC_MID}}/>
                              <Typography variant="caption" color="text.disabled" display="block" sx={{mt:1}}>Consultando ERP…</Typography>
                            </Box>
                          : nencAgrupados.length === 0
                            ? <Box sx={{py:6,textAlign:'center'}}>
                                <NoEncadenadoIcon sx={{fontSize:40,color:alpha(NENC_DARK,.15),mb:1}}/>
                                <Typography variant="body2" color="text.disabled">Sin pagos directos en semana {week}</Typography>
                                <Typography variant="caption" color="text.disabled" display="block">Sin registros en ERP para esta semana</Typography>
                              </Box>
                            : nencFiltrados.length === 0
                              ? <Box sx={{py:5,textAlign:'center'}}><Typography variant="body2" color="text.disabled">Sin resultados para "{searchNenc}"</Typography></Box>
                              : <Table size="small" stickyHeader>
                                  <TableHead>
                                    <TableRow sx={{'& th':{bgcolor:NENC_BG,fontWeight:700,fontSize:'0.68rem',color:NENC_DARK,py:0.8}}}>
                                      <TableCell colSpan={2}>Proveedor / Orden</TableCell>
                                      <TableCell>Sucursal</TableCell><TableCell align="right">c/IVA</TableCell>
                                      <TableCell align="center">Plazo</TableCell><TableCell align="center">Vencimiento</TableCell>
                                      <TableCell align="right" sx={{width:32}}/>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {nencProvs.map((grupo, i) => (
                                      <NencProveedorGrupo
                                        key={grupo.proveedor || `nenc_grp_${i}`}
                                        grupo={grupo}
                                        onDelete={handleDelete}
                                        onVerProductos={handleVerProductos}
                                      />
                                    ))}
                                  </TableBody>
                                </Table>
                        }
                      </Box>
                    </>
                  );
                })()}
              </Box>
            )}

            {/* ─ TAB 2: Proyección ─ */}
            {tabDetalle===2 && (
              <Box sx={{p:2}}>
                <Box sx={{display:'flex',alignItems:'center',gap:1.5,mb:2}}>
                  <Avatar sx={{bgcolor:alpha(PROY_COLOR,.1),width:36,height:36}}>
                    <TrendingUpIcon sx={{color:PROY_COLOR,fontSize:18}}/>
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Proyección de Vencimientos · Semana {week}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Encadenados comprados en semanas anteriores cuya fecha de pago cae en esta semana
                    </Typography>
                  </Box>
                </Box>
                {proySemana.length===0
                  ?<Box sx={{textAlign:'center',py:5,border:'1px dashed',borderColor:'divider',borderRadius:2,bgcolor:'action.hover'}}>
                    <OkIcon sx={{fontSize:40,color:'#a5d6a7',mb:1}}/>
                    <Typography variant="body2" color="text.secondary">Sin vencimientos proyectados para semana {week}</Typography>
                    <Typography variant="caption" color="text.disabled" display="block">Los encadenados con plazo que vencen aquí aparecerán automáticamente</Typography>
                  </Box>
                  :proySemana.map((g,i)=><ProyCard key={i} grupo={g} totalActual={total} limite={limite}/>)
                }
              </Box>
            )}

            {/* ─ TAB 3: Por Sucursal ─ */}
            {tabDetalle===3 && (
              <DesgloseSucursal semana={week} year={year} autoOpen/>
            )}

            {/* ─ TAB 4: Órdenes de Compra (generadas esta semana) ─ */}
            {tabDetalle===4 && (() => {
              const totalNetoOC = comprasOC.reduce((s,c)=>s+(parseFloat(c.monto_neto)||0),0);
              const totalIvaOC  = comprasOC.reduce((s,c)=>s+(parseFloat(c.monto_con_iva)||0),0);
              return (
                <Box>
                  {/* Cabecera con totales */}
                  <Box sx={{px:2,py:1,display:'flex',gap:2,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid',borderColor:'divider',bgcolor:alpha(OC_COLOR,.03)}}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">OC generadas S{week}</Typography>
                      <Typography variant="subtitle2" fontWeight={800} color={OC_COLOR}>
                        {ocFiltrados.length} orden{ocFiltrados.length!==1?'es':''}
                        {hasOCFilters && agruparEncadenados(comprasOC).length !== ocFiltrados.length && (
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ml:0.8}}>
                            de {agruparEncadenados(comprasOC).length}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{borderLeft:'1px solid',borderColor:'divider',pl:2}}>
                      <Typography variant="caption" color="text.secondary" display="block">Total Neto</Typography>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">{fmtM(totalNetoOC)}</Typography>
                    </Box>
                    <Box sx={{borderLeft:'1px solid',borderColor:'divider',pl:2}}>
                      <Typography variant="caption" color="text.secondary" display="block">Total c/IVA</Typography>
                      <Typography variant="subtitle2" fontWeight={800} color={ENC_DARK}>{fmtM(totalIvaOC)}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ml:'auto',fontStyle:'italic'}}>
                      Órdenes emitidas esta semana · el vencimiento va a Pagos Comprometidos
                    </Typography>
                  </Box>

                  {/* ── Barra de filtros OC ── */}
                  <Box sx={{px:2,py:1.2,borderBottom:'1px solid',borderColor:'divider',bgcolor:alpha(OC_COLOR,.02)}}>
                    <Grid container spacing={1} alignItems="center">
                      {/* Búsqueda N° Orden / Proveedor */}
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small" fullWidth
                          placeholder="N° Orden o Proveedor…"
                          value={searchOC}
                          onChange={e=>setSearchOC(e.target.value)}
                          InputProps={{
                            startAdornment:<InputAdornment position="start"><OcIcon sx={{fontSize:16,color:OC_COLOR}}/></InputAdornment>,
                            sx:{borderRadius:2,fontSize:'0.8rem'},
                          }}
                        />
                      </Grid>
                      {/* Sucursal */}
                      <Grid item xs={12} sm={3}>
                        <TextField
                          size="small" fullWidth
                          placeholder="Sucursal…"
                          value={filterOCSucursal}
                          onChange={e=>setFilterOCSucursal(e.target.value)}
                          InputProps={{
                            startAdornment:<InputAdornment position="start"><SucursalIcon sx={{fontSize:15,color:'text.disabled'}}/></InputAdornment>,
                            sx:{borderRadius:2,fontSize:'0.8rem'},
                          }}
                        />
                      </Grid>
                      {/* Estado Pago */}
                      <Grid item xs={6} sm={2}>
                        <FormControl size="small" fullWidth>
                          <InputLabel sx={{fontSize:'0.78rem'}}>Estado</InputLabel>
                          <Select
                            value={filterOCEstado}
                            label="Estado"
                            onChange={e=>setFilterOCEstado(e.target.value)}
                            sx={{borderRadius:2,fontSize:'0.78rem'}}
                          >
                            <MenuItem value="">Todos</MenuItem>
                            {['Pendiente','Completo','Parcial','Modificado'].map(e=>(
                              <MenuItem key={e} value={e} sx={{fontSize:'0.8rem'}}>{e}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Fecha desde */}
                      <Grid item xs={6} sm={2}>
                        <TextField size="small" fullWidth type="date" label="Desde"
                          value={filterOCDesde} onChange={e=>setFilterOCDesde(e.target.value)}
                          InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                          sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                      </Grid>
                      {/* Fecha hasta + limpiar */}
                      <Grid item xs={12} sm={1}>
                        <TextField size="small" fullWidth type="date" label="Hasta"
                          value={filterOCHasta} onChange={e=>setFilterOCHasta(e.target.value)}
                          InputLabelProps={{shrink:true}} inputProps={{style:{fontSize:'0.78rem'}}}
                          sx={{'& .MuiInputBase-root':{borderRadius:2}}}/>
                      </Grid>
                      {hasOCFilters && (
                        <Grid item xs={12} sm="auto">
                          <Tooltip title="Limpiar filtros">
                            <Chip
                              label="Limpiar"
                              size="small"
                              onDelete={clearOCFilters}
                              onClick={clearOCFilters}
                              sx={{bgcolor:alpha(OC_COLOR,.1),color:OC_COLOR,fontWeight:700,fontSize:'0.72rem',cursor:'pointer'}}
                            />
                          </Tooltip>
                        </Grid>
                      )}
                    </Grid>
                  </Box>

                  <Box sx={{maxHeight:400,overflowY:'auto'}}>
                    {loadingOC
                      ? <Box sx={{p:4,textAlign:'center'}}><CircularProgress size={24} sx={{color:OC_COLOR}}/></Box>
                      : agruparEncadenados(comprasOC).length === 0
                        ? <Box sx={{py:6,textAlign:'center'}}>
                            <OcIcon sx={{fontSize:40,color:alpha(OC_COLOR,.2),mb:1}}/>
                            <Typography variant="body2" color="text.disabled">Sin órdenes de compra generadas en semana {week}</Typography>
                          </Box>
                        : ocFiltrados.length === 0
                          ? <Box sx={{py:5,textAlign:'center'}}>
                              <SearchIcon sx={{fontSize:32,color:'text.disabled',mb:1}}/>
                              <Typography variant="body2" color="text.disabled">Sin resultados para los filtros aplicados</Typography>
                              <Typography variant="caption" color="text.disabled" display="block" sx={{mt:0.5}}>
                                <span style={{cursor:'pointer',textDecoration:'underline',color:OC_COLOR}} onClick={clearOCFilters}>Limpiar filtros</span>
                              </Typography>
                            </Box>
                          : <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow sx={{'& th':{bgcolor:alpha(OC_COLOR,.07),fontWeight:700,fontSize:'0.68rem',color:OC_COLOR,py:0.8}}}>
                                  <TableCell>Proveedor</TableCell>
                                  <TableCell>N° Orden</TableCell>
                                  <TableCell>Sucursal</TableCell>
                                  <TableCell align="right">Neto</TableCell>
                                  <TableCell align="right">c/IVA</TableCell>
                                  <TableCell align="center">Plazo</TableCell>
                                  <TableCell align="center">Vence S</TableCell>
                                  <TableCell align="center">Estado Pago</TableCell>
                                  <TableCell align="center">Vigencia</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {ocFiltrados.map((item, i) => (
                                  <OcRow
                                    key={item.numero_orden || `oc_${i}`}
                                    item={item}
                                    onEstadoChange={handleEstadoOrden}
                                    showSemanaVenc
                                  />
                                ))}
                              </TableBody>
                            </Table>
                    }
                  </Box>
                </Box>
              );
            })()}
          </Paper>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* ══ VISTA 2: CARGAR DATOS ══ */}
      {tabVista === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{mb:0.5}}>Carga de Datos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{mb:3}}>
            Sube los archivos Excel para actualizar órdenes de compra y facturas.
          </Typography>
          <Grid container spacing={3}>
            {/* ─ OC / Excel general ─ */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{border:`1.5px solid ${ENC_DARK}`,borderRadius:3,p:3,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',bgcolor:ENC_BG}}>
                <Avatar sx={{bgcolor:ENC_MID,width:52,height:52,mb:2}}>
                  <OcIcon sx={{fontSize:26}}/>
                </Avatar>
                <Typography variant="subtitle1" fontWeight={800} color={ENC_DARK} gutterBottom>
                  OC / Excel General
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mb:3,flex:1}}>
                  Informe de Órdenes de Compra generado desde el sistema. Carga encadenados con plazo de pago.
                  <br/><br/>
                  <strong>Formato:</strong> InformeOrdenesCompra.xlsx (N° Orden, Proveedor, Total, Plazo, Estado)
                </Typography>
                {ultimasCargas['EXCEL'] && (
                  <Typography variant="caption" color="text.disabled" sx={{ mb:1, display:'block' }}>
                    Última carga: <strong>{new Date(ultimasCargas['EXCEL']).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</strong>
                  </Typography>
                )}
                <Button fullWidth variant="contained" size="large"
                  startIcon={uploadLoading ? <CircularProgress size={16} sx={{color:'white'}}/> : <UploadIcon/>}
                  disabled={uploadLoading} onClick={()=>fileInputRef.current?.click()}
                  sx={{borderRadius:2,bgcolor:ENC_MID,'&:hover':{bgcolor:ENC_DARK},fontWeight:700}}>
                  {uploadLoading ? 'Cargando…' : 'Seleccionar Excel'}
                </Button>
              </Paper>
            </Grid>

            {/* ─ OC por Sucursal ─ */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{border:'1.5px solid #1565c0',borderRadius:3,p:3,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',bgcolor:'#e3f2fd'}}>
                <Avatar sx={{bgcolor:'#1565c0',width:52,height:52,mb:2}}>
                  <SucursalIcon sx={{fontSize:26}}/>
                </Avatar>
                <Typography variant="subtitle1" fontWeight={800} color="#1565c0" gutterBottom>
                  OC por Sucursal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mb:3,flex:1}}>
                  Excel de OC correspondiente a una sucursal específica. Etiqueta automáticamente todos los registros con la sucursal seleccionada.
                  <br/><br/>
                  <strong>Formato:</strong> Mismo formato InformeOrdenesCompra, con sucursal asignada manualmente.
                </Typography>
                <Button fullWidth variant="contained" size="large"
                  startIcon={ocSucursalLoading ? <CircularProgress size={16} sx={{color:'white'}}/> : <SucursalIcon/>}
                  disabled={ocSucursalLoading} onClick={()=>ocSucursalInputRef.current?.click()}
                  sx={{borderRadius:2,bgcolor:'#1565c0','&:hover':{bgcolor:'#0d47a1'},fontWeight:700}}>
                  {ocSucursalLoading ? 'Cargando…' : 'Seleccionar Excel'}
                </Button>
              </Paper>
            </Grid>

            {/* ─ Facturas PBI ─ */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{border:'1.5px solid #6a1b9a',borderRadius:3,p:3,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',bgcolor:'#f3e5f5'}}>
                <Avatar sx={{bgcolor:'#6a1b9a',width:52,height:52,mb:2}}>
                  <UploadIcon sx={{fontSize:26}}/>
                </Avatar>
                <Typography variant="subtitle1" fontWeight={800} color="#6a1b9a" gutterBottom>
                  Facturas PBI
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mb:2,flex:1}}>
                  Datos reales de facturas exportados desde Power BI. Actualiza los montos y fechas de vencimiento reales de encadenados ya registrados.
                  <br/><br/>
                  <strong>Formato:</strong> data PBI — columnas MPR_RAZON_SOCIAL, FECHA_VENC, A_PAGAR, N° OC.
                </Typography>
                {ultimasCargas['FACTURA'] && (
                  <Typography variant="caption" color="text.disabled" sx={{ mb:1, display:'block' }}>
                    Última sync: <strong>{new Date(ultimasCargas['FACTURA']).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</strong>
                  </Typography>
                )}
                {/* Botón sincronizar — descarga automática desde Power BI */}
                <Button fullWidth variant="contained" size="large"
                  startIcon={pbiAutoLoading
                    ? <CircularProgress size={16} sx={{color:'white'}}/>
                    : <SyncIcon sx={{animation: pbiAutoLoading ? 'spin 1s linear infinite' : 'none'}}/>}
                  disabled={pbiAutoLoading} onClick={handleDescargarPBIAuto}
                  sx={{borderRadius:2,bgcolor:'#4a148c','&:hover':{bgcolor:'#38006b'},fontWeight:700,mb:1}}>
                  {pbiAutoLoading ? 'Sincronizando…' : 'Sincronizar Facturas'}
                </Button>
                <Button fullWidth variant="outlined" size="medium"
                  startIcon={facturaLoading ? <CircularProgress size={14}/> : <UploadIcon sx={{fontSize:16}}/>}
                  disabled={facturaLoading} onClick={()=>facturaInputRef.current?.click()}
                  sx={{borderRadius:2,borderColor:'#6a1b9a',color:'#6a1b9a','&:hover':{bgcolor:'rgba(106,27,154,0.06)'},fontWeight:600,fontSize:'0.75rem'}}>
                  {facturaLoading ? 'Procesando…' : 'O subir Excel manualmente'}
                </Button>
              </Paper>
            </Grid>
            {/* ─ Sincronizar No Encadenados ERP ─ */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{border:`1.5px solid ${NENC_DARK}`,borderRadius:3,p:3,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',bgcolor:NENC_BG}}>
                <Avatar sx={{bgcolor:NENC_MID,width:52,height:52,mb:2}}>
                  <SyncIcon sx={{fontSize:26}}/>
                </Avatar>
                <Typography variant="subtitle1" fontWeight={800} color={NENC_DARK} gutterBottom>
                  No Encadenados ERP
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mb:3,flex:1}}>
                  Consulta el ERP de todas las sucursales y actualiza los pagos directos (No Encadenados) de la semana seleccionada en la tabla interna.
                  <br/><br/>
                  <strong>Semana activa:</strong> S{String(appliedWeek).padStart(2,'0')} · {appliedYear}
                </Typography>
                {ultimasCargas['ERP'] && (
                  <Typography variant="caption" color="text.disabled" sx={{ mb:1, display:'block' }}>
                    Última sync: <strong>{new Date(ultimasCargas['ERP']).toLocaleString('es-CL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</strong>
                  </Typography>
                )}
                {erpFallidas.length > 0 && (
                  <Chip
                    icon={<WarningIcon sx={{fontSize:'13px !important'}}/>}
                    label={`${erpFallidas.length} sucursal${erpFallidas.length > 1 ? 'es' : ''} con error`}
                    size="small"
                    sx={{ bgcolor:'#fff3e0', color:'#e65100', fontWeight:700, border:'1px solid #ff9800', mb:1.5 }}
                  />
                )}
                <Button fullWidth variant="contained" size="large"
                  startIcon={erpLoading ? <CircularProgress size={16} sx={{color:'white'}}/> : <SyncIcon/>}
                  disabled={erpLoading}
                  onClick={loadNoEncadenadosERP}
                  sx={{borderRadius:2,bgcolor:NENC_DARK,'&:hover':{bgcolor:NENC_MID},fontWeight:700}}>
                  {erpLoading ? 'Sincronizando…' : 'Sincronizar'}
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Recargar datos */}
          <Box sx={{ display:'flex', justifyContent:'flex-end', mt:2 }}>
            <Button
              variant="text"
              size="small"
              startIcon={recargarLoading
                ? <CircularProgress size={14}/>
                : <RefreshIcon sx={{ fontSize:16 }}/>}
              disabled={recargarLoading}
              onClick={handleRecargar}
              sx={{ color:'text.secondary', fontWeight:500, textTransform:'none', fontSize:'0.8rem' }}
            >
              {recargarLoading ? 'Recargando…' : 'Recargar datos'}
            </Button>
          </Box>

          {/* Hidden inputs — siempre presentes */}
          <input ref={fileInputRef}       type="file" accept=".xlsx,.xls" hidden onChange={handleExcelUpload}/>
          <input ref={facturaInputRef}    type="file" accept=".xlsx,.xls" hidden onChange={handleFacturasUpload}/>
          <input ref={ocSucursalInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleOcSucursalUpload}/>
        </Box>
      )}

      {/* ══ VISTA 3: COMPRAS POR EMISIÓN ══ */}
      {tabVista === 3 && (
        <Box>
          {/* Fechas de última actualización */}
          {Object.keys(ultimasCargas).length > 0 && (
            <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap', mb:1.5, px:0.5 }}>
              {[
                { key:'EXCEL',   label:'OC cargada',      color:'#1565c0' },
                { key:'ERP',     label:'ERP cargado',     color:'#2e7d32' },
                { key:'FACTURA', label:'PBI sincronizado', color:'#6a1b9a' },
              ].filter(s => ultimasCargas[s.key]).map(s => (
                <Box key={s.key} sx={{
                  display:'flex', alignItems:'center', gap:0.6, px:1.2, py:0.4,
                  bgcolor: alpha(s.color, 0.07), border:`1px solid ${alpha(s.color,0.2)}`,
                  borderRadius:2,
                }}>
                  <Box sx={{ width:7, height:7, borderRadius:'50%', bgcolor: s.color }} />
                  <Typography variant="caption" color="text.secondary" fontSize="0.68rem">
                    {s.label}:&nbsp;
                    <Box component="span" fontWeight={700} sx={{ color: s.color }}>
                      {new Date(ultimasCargas[s.key]).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Totales rápidos */}
          {!loadingEmision && comprasPorEmision.length > 0 && (() => {
            const semanasConDatos = comprasPorEmision.filter(w => (w.total || 0) > 0);
            const totEncOC   = semanasConDatos.reduce((s,w) => s + (w.enc_oc  || 0), 0);
            const totNoEnc   = semanasConDatos.reduce((s,w) => s + (w.no_enc  || 0), 0);
            const totTotal   = semanasConDatos.reduce((s,w) => s + (w.total   || 0), 0);
            const totOrdenes = semanasConDatos.reduce((s,w) => s + (w.num_ordenes || 0), 0);
            return (
              <Grid container spacing={1.5} sx={{ mb:2 }}>
                {[
                  { label: 'Encadenados OC',       value: totEncOC,   color: ENC_DARK,   bg: ENC_BG },
                  { label: 'No Encadenados (ERP)',  value: totNoEnc,   color: NENC_DARK,  bg: NENC_BG },
                  { label: 'Total General',         value: totTotal,   color: EMIT_COLOR, bg: EMIT_BG },
                  { label: 'Total Órdenes',         value: totOrdenes, color: '#37474f',  bg: '#eceff1', isCount: true },
                ].map(({ label, value, color, bg, isCount }) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <Box sx={{ p:1.5, borderRadius:2.5, bgcolor: bg, textAlign:'center', border:`1px solid ${alpha(color,0.15)}` }}>
                      <Typography variant="caption" color="text.secondary" fontSize="0.65rem" display="block">{label}</Typography>
                      <Typography variant="h6" fontWeight={800} color={color} lineHeight={1.2}>
                        {isCount ? value : fmtM(value)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            );
          })()}

          {/* Árbol: Año → Semana → Día → OC */}
          <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, overflow:'hidden' }}>
            <VistaArbolEmision
              registros={detalleEmision}
              loading={loadingDetalleEmision}
              sospechosasIds={sospechosasIdsEmision}
              onMadre={handleMadreDesdeEmision}
            />
          </Paper>
        </Box>
      )}

      {/* ══ Diálogos ─── */}
      <Dialog open={editLimOpen} onClose={()=>setEditLimOpen(false)} maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:3}}}>
        <DialogTitle fontWeight={700}>Editar Límite — Semana {week}</DialogTitle>
        <DialogContent>
          <TextField label="Límite semanal ($)" type="number" fullWidth autoFocus sx={{mt:1,'& .MuiOutlinedInput-root':{borderRadius:2}}}
            value={nuevoLimite} onChange={e=>setNuevoLimite(e.target.value)} InputProps={{inputProps:{min:0,step:1000000}}}/>
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setEditLimOpen(false)} sx={{borderRadius:2}}>Cancelar</Button>
          <Button onClick={handleSaveLimite} variant="contained" sx={{borderRadius:2}}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ─ Diálogo: Sync ERP No Encadenados ─ */}
      <Dialog open={erpSync.open} onClose={() => { if (!erpSync.loading) erpSyncDispatch({ type: 'CLOSE' }); }}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <DialogTitle sx={{ bgcolor: NENC_DARK, color: 'white', py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SyncIcon sx={{ fontSize: 20, animation: erpSync.loading ? 'spin 1.2s linear infinite' : 'none',
            '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }}/>
          <Box flex={1}>
            <Typography fontWeight={800} fontSize="0.95rem">Sincronizando No Encadenados ERP</Typography>
            <Typography fontSize="0.72rem" sx={{ opacity: 0.8 }}>
              S{String(appliedWeek).padStart(2,'0')} · {appliedYear}
            </Typography>
          </Box>
          {!erpSync.loading && <IconButton size="small" onClick={() => erpSyncDispatch({ type: 'CLOSE' })} sx={{ color: 'white' }}><CloseIcon fontSize="small"/></IconButton>}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Log en tiempo real */}
          <Box sx={{ maxHeight: 320, overflowY: 'auto', px: 2, py: 1.5, bgcolor: '#0d1117', fontFamily: 'monospace' }}>
            {erpSync.logs.length === 0
              ? <Typography variant="caption" color="#888">Esperando respuesta del servidor…</Typography>
              : erpSync.logs.map((l, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.3 }}>
                  <Typography variant="caption" sx={{ color: l.tipo === 'error' ? '#f87171' : l.tipo === 'ok' ? '#4ade80' : l.tipo === 'inicio' ? '#facc15' : '#94a3b8', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {l.msg}
                  </Typography>
                </Box>
              ))
            }
            {erpSync.loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <CircularProgress size={10} sx={{ color: NENC_MID }}/>
                <Typography variant="caption" color="#888">Procesando…</Typography>
              </Box>
            )}
          </Box>
          {/* Resultado final */}
          {erpSync.result && (
            <Box sx={{ px: 2, py: 1.5, bgcolor: erpSync.result.success ? alpha(NENC_DARK, 0.06) : '#fff3e0',
              borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight={700} color={erpSync.result.success ? NENC_DARK : '#e65100'}>
                {erpSync.result.success ? '✓' : '⚠'} {erpSync.result.message}
              </Typography>
            </Box>
          )}
        </DialogContent>
        {!erpSync.loading && (
          <DialogActions sx={{ px: 2, py: 1.2 }}>
            <Button onClick={() => erpSyncDispatch({ type: 'CLOSE' })} size="small" variant="contained"
              sx={{ bgcolor: NENC_DARK, '&:hover': { bgcolor: NENC_MID }, borderRadius: 2, fontWeight: 700 }}>
              Cerrar
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ─ Diálogo: Sincronizar Facturas PBI ─ */}
      <Dialog open={pbiAutoOpen} onClose={()=>{ if(!pbiAutoLoading) pbiDispatch({ type: 'CLOSE' }); }}
        maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:3,overflow:'hidden'}}}>

        {/* Header con barra de progreso */}
        <Box sx={{bgcolor:'#4a148c',px:3,py:2,display:'flex',alignItems:'center',gap:1.5}}>
          <SyncIcon sx={{color:'white',fontSize:22, animation: pbiAutoLoading ? 'pbiSpin 1s linear infinite' : 'none',
            '@keyframes pbiSpin':{'from':{transform:'rotate(0deg)'},'to':{transform:'rotate(360deg)'}}}}/>
          <Typography fontWeight={700} color="white" variant="subtitle1">Sincronizar Facturas PBI</Typography>
          {pbiAutoLoading && <CircularProgress size={14} sx={{color:'rgba(255,255,255,0.7)',ml:'auto'}}/>}
        </Box>
        {pbiAutoLoading && (
          <LinearProgress sx={{height:3,'& .MuiLinearProgress-bar':{bgcolor:'#ce93d8'}}} />
        )}

        <DialogContent sx={{p:0}}>
          {/* ── Vista: cargando ── */}
          {!pbiResult && (
            <>
              {/* Pasos del proceso */}
              <Box sx={{px:3,pt:2.5,pb:1.5}}>
                {[
                  { label: 'Iniciando sesión en Power BI',  step: 1 },
                  { label: 'Cargando reporte de facturas',  step: 2 },
                  { label: 'Exportando datos a Excel',      step: 3 },
                  { label: 'Guardando en base de datos',    step: 4 },
                ].map(({ label, step }) => {
                  const done    = pbiStep >= step;
                  const active  = pbiStep === step - 1 && pbiAutoLoading;
                  return (
                    <Box key={step} sx={{display:'flex',alignItems:'center',gap:1.5,mb:1.2}}>
                      <Box sx={{
                        width:24,height:24,borderRadius:'50%',flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        bgcolor: done ? '#4a148c' : active ? '#f3e5f5' : '#f5f5f5',
                        border: active ? '2px solid #9c27b0' : 'none',
                        transition:'all 0.4s',
                      }}>
                        {done
                          ? <CheckCircleIcon sx={{fontSize:16,color:'white'}}/>
                          : active
                            ? <CircularProgress size={12} sx={{color:'#9c27b0'}}/>
                            : <Box sx={{width:8,height:8,borderRadius:'50%',bgcolor:'#ccc'}}/>}
                      </Box>
                      <Typography variant="body2"
                        sx={{color: done ? '#4a148c' : active ? 'text.primary' : 'text.disabled',
                          fontWeight: done || active ? 600 : 400, transition:'all 0.3s'}}>
                        {label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              <Divider/>
              {/* Log terminal */}
              <Box sx={{bgcolor:'#0d1117',minHeight:160,maxHeight:220,overflowY:'auto',p:2,fontFamily:'monospace',fontSize:'0.7rem'}}>
                {pbiAutoLogs.length === 0
                  ? <Typography sx={{color:'#8b949e',fontFamily:'monospace',fontSize:'0.7rem'}}>Iniciando conexión…</Typography>
                  : pbiAutoLogs.map((l,i) => (
                    <Box key={i} sx={{color: l.tipo==='error'?'#ff7b72':l.tipo==='ok'?'#3fb950':'#8b949e', lineHeight:1.7}}>
                      {l.msg}
                    </Box>
                  ))}
              </Box>
            </>
          )}

          {/* ── Vista: resultado ── */}
          {pbiResult && (
            <Box sx={{p:3,textAlign:'center'}}>
              {pbiResult.success ? (
                <>
                  <CheckCircleIcon sx={{fontSize:64,color:'#2e7d32',mb:1}}/>
                  <Typography variant="h6" fontWeight={700} color="#2e7d32" gutterBottom>
                    ¡Facturas sincronizadas!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb:2.5}}>
                    {pbiResult.message || 'Los datos de facturas PBI han sido actualizados correctamente.'}
                  </Typography>

                  {/* Card: próxima sincronización */}
                  <Paper elevation={0} sx={{bgcolor:'#f3e5f5',border:'1.5px solid #ce93d8',borderRadius:2,p:2,display:'flex',gap:1.5,alignItems:'flex-start',textAlign:'left'}}>
                    <CalendarMonthIcon sx={{color:'#7b1fa2',fontSize:24,mt:0.2,flexShrink:0}}/>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="#4a148c">
                        Próxima sincronización recomendada
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vuelve a sincronizar el <strong>{pbiResult.nextSync}</strong> para mantener los datos actualizados con las facturas de la semana.
                      </Typography>
                    </Box>
                  </Paper>
                </>
              ) : (
                <>
                  <ErrorOutlineIcon sx={{fontSize:64,color:'#c62828',mb:1}}/>
                  <Typography variant="h6" fontWeight={700} color="#c62828" gutterBottom>
                    Error en la sincronización
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
                    {pbiResult.message}
                  </Typography>
                  {/* Mostrar logs del error */}
                  <Box sx={{bgcolor:'#0d1117',borderRadius:2,p:1.5,maxHeight:140,overflowY:'auto',textAlign:'left'}}>
                    {pbiAutoLogs.map((l,i) => (
                      <Box key={i} sx={{color:l.tipo==='error'?'#ff7b72':'#8b949e',fontFamily:'monospace',fontSize:'0.68rem',lineHeight:1.7}}>
                        {l.msg}
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{px:3,pb:2.5,pt:1,gap:1}}>
          {pbiResult && !pbiResult.success && (
            <Button onClick={handleDescargarPBIAuto}
              variant="contained" sx={{borderRadius:2,bgcolor:'#4a148c','&:hover':{bgcolor:'#38006b'}}}>
              Reintentar
            </Button>
          )}
          <Button onClick={()=>pbiDispatch({ type: 'CLOSE' })} disabled={pbiAutoLoading}
            variant={pbiResult?.success ? 'contained' : 'outlined'}
            sx={{borderRadius:2, ml:'auto',
              ...(pbiResult?.success && {bgcolor:'#4a148c','&:hover':{bgcolor:'#38006b'}})}}>
            {pbiAutoLoading ? 'Espera…' : 'Cerrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─ Diálogo: Compras Madre ─ */}
      <Dialog open={dialogMadreOpen} onClose={() => setDialogMadreOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff8e1' }}>
          <span style={{ fontSize: 22 }}>🏠</span>
          Posibles Compras Madre Detectadas
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Las siguientes compras son inusualmente grandes (más de 5× la mediana).
            Marca las que sean <strong>compras madre</strong> para excluirlas de la planificación semanal.
          </Typography>
          {comprasMadrePendientes.map(c => (
            <Box key={c.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
              p: 1.2, borderRadius: 2, bgcolor: madreSeleccionadas[c.id] ? '#fff3e0' : '#f5f5f5',
              border: `1.5px solid ${madreSeleccionadas[c.id] ? '#f57c00' : '#e0e0e0'}`,
            }}>
              <Box component="input" type="checkbox"
                checked={!!madreSeleccionadas[c.id]}
                onChange={e => setMadreSeleccionadas(prev => ({ ...prev, [c.id]: e.target.checked }))}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{c.proveedor}</Typography>
                <Typography variant="caption" color="text.secondary">
                  OC: {c.numero_orden || '–'} · Semana {c.semana_compra} · {c.sucursal || 'Sin sucursal'}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={800} color="#e65100">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(parseFloat(c.monto_con_iva) || 0)}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDialogMadreOpen(false)} color="inherit" sx={{ borderRadius: 2 }}>
            Ninguna es madre
          </Button>
          <Button onClick={handleConfirmarMadres} variant="contained"
            disabled={!Object.values(madreSeleccionadas).some(Boolean)}
            sx={{ borderRadius: 2, bgcolor: '#f57c00', '&:hover': { bgcolor: '#e65100' } }}>
            Marcar seleccionadas como madre
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─ Diálogo: OC por Sucursal ─ */}
      <Dialog open={ocSucursalOpen} onClose={()=>{if(!ocSucursalLoading)setOcSucursalOpen(false);}}
        maxWidth="xs" fullWidth PaperProps={{sx:{borderRadius:3}}}>
        <DialogTitle fontWeight={700} sx={{display:'flex',alignItems:'center',gap:1}}>
          <SucursalIcon sx={{color:'#1565c0',fontSize:22}}/>
          OC por Sucursal
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{mb:2}}>
            Selecciona la sucursal que corresponde a este Excel de Órdenes de Compra.
            Los registros quedarán etiquetados con esa sucursal.
          </Typography>
          {sucursales.length > 0 ? (
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select value={ocSucursalNombre} label="Sucursal" sx={{borderRadius:2}}
                onChange={e=>setOcSucursalNombre(e.target.value)}>
                <MenuItem value=""><em>Seleccionar…</em></MenuItem>
                {sucursales.map(s=>(
                  <MenuItem key={s.id||s.nombre||s} value={s.nombre||s}>{s.nombre||s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField label="Nombre de la sucursal" fullWidth autoFocus sx={{'& .MuiOutlinedInput-root':{borderRadius:2}}}
              value={ocSucursalNombre} onChange={e=>setOcSucursalNombre(e.target.value)}
              placeholder="Ej: Chillán, Quirihue…"/>
          )}
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setOcSucursalOpen(false)} disabled={ocSucursalLoading} sx={{borderRadius:2}}>
            Cancelar
          </Button>
          <Button onClick={confirmarOcSucursal} variant="contained" disabled={!ocSucursalNombre.trim()||ocSucursalLoading}
            startIcon={ocSucursalLoading?<CircularProgress size={14}/>:<UploadIcon/>}
            sx={{borderRadius:2,bgcolor:'#1565c0','&:hover':{bgcolor:'#0d47a1'}}}>
            {ocSucursalLoading ? 'Cargando…' : 'Cargar Excel'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={()=>setAddOpen(false)} maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:3}}}>
        <DialogTitle fontWeight={700}>Agregar Pago — Semana {week}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{mt:1}}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={addTipo} label="Tipo" sx={{borderRadius:2}}
                onChange={e=>setAddTipo(e.target.value)}>
                <MenuItem value="Encadenado">Encadenado</MenuItem>
                <MenuItem value="No Encadenado">No Encadenado</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Proveedor" fullWidth autoFocus value={newCompra.proveedor}
              onChange={e=>setNewCompra(p=>({...p,proveedor:e.target.value}))} sx={{'& .MuiOutlinedInput-root':{borderRadius:2}}}/>
            <TextField label="Fecha" type="date" fullWidth value={newCompra.fecha}
              onChange={e=>setNewCompra(p=>({...p,fecha:e.target.value}))} InputLabelProps={{shrink:true}}
              sx={{'& .MuiOutlinedInput-root':{borderRadius:2}}}/>
            <TextField label="Monto Neto ($)" type="number" fullWidth value={newCompra.neto}
              onChange={e=>setNewCompra(p=>({...p,neto:e.target.value}))} InputProps={{inputProps:{min:0}}}
              sx={{'& .MuiOutlinedInput-root':{borderRadius:2}}}/>
            {addTipo==='Encadenado' && (
              <TextField label="Plazo de pago (días)" type="number" fullWidth value={newCompra.plazo}
                onChange={e=>setNewCompra(p=>({...p,plazo:e.target.value}))}
                sx={{'& .MuiOutlinedInput-root':{borderRadius:2}}}/>
            )}
            {sucursales.length>0 && (
              <FormControl fullWidth>
                <InputLabel>Sucursal</InputLabel>
                <Select value={newCompra.sucursal_id} label="Sucursal" sx={{borderRadius:2}}
                  onChange={e=>setNewCompra(p=>({...p,sucursal_id:e.target.value}))}>
                  <MenuItem value=""><em>Sin sucursal</em></MenuItem>
                  {sucursales.map(s=><MenuItem key={s.id||s} value={s.id||s}>{s.nombre||s}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{px:3,pb:2}}>
          <Button onClick={()=>setAddOpen(false)} sx={{borderRadius:2}}>Cancelar</Button>
          <Button onClick={handleAddCompra} variant="contained" disabled={!newCompra.proveedor||!newCompra.neto} sx={{borderRadius:2}}>
            Agregar
          </Button>
        </DialogActions>
      </Dialog>


      {/* Dialog productos OC desde Encadenados / No Encadenados */}
      <ProductosOCDialog
        open={detalleProdDialog.open}
        onClose={() => setDetalleProdDialog(p => ({ ...p, open: false }))}
        numeroOrden={detalleProdDialog.numeroOrden}
        sucursal={detalleProdDialog.sucursal}
      />
    </Box>
  );
};

export default PlanificacionPage;
