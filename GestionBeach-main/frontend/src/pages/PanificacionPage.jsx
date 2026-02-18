// frontend/src/pages/PanificacionPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Chip,
  Grid, Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Paper, Stack, alpha, Skeleton, CircularProgress, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, Collapse,
} from '@mui/material';
import {
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as OkIcon,
  Error as ExceedIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as ProveedorIcon,
  Link as EncadenadoIcon,
  LinkOff as NoEncadenadoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  LocationOn as SucursalIcon,
  InfoOutlined as InfoIcon,
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

const STATUS_MAP = {
  OK:       { color: '#2e7d32', bg: 'rgba(46,125,50,0.08)',  label: 'OK',       Icon: OkIcon      },
  ALERTA:   { color: '#e65100', bg: 'rgba(230,81,0,0.08)',   label: 'ALERTA',   Icon: WarningIcon  },
  EXCEDIDO: { color: '#b71c1c', bg: 'rgba(183,28,28,0.08)',  label: 'EXCEDIDO', Icon: ExceedIcon   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtM    = n => { if(n==null)return'$0'; const a=Math.abs(n); if(a>=1e6)return`$${(n/1e6).toFixed(1)}M`; if(a>=1e3)return`$${(n/1e3).toFixed(0)}K`; return`$${Math.round(n).toLocaleString('es-CL')}`; };
const fmtFull = n => `$${(Math.round(n||0)).toLocaleString('es-CL')}`;
const fmtDate = d => { if(!d)return'–'; return new Date(d).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}); };
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
  // Agrupar montos por día
  const byDay   = {};
  compras.forEach(c => {
    const k = c.fecha_compra ? isoStr(new Date(c.fecha_compra)) : null;
    if (!k) return;
    byDay[k] = (byDay[k] || 0) + (c.monto_con_iva || c.monto_neto || 0);
  });
  const maxMonto = Math.max(...Object.values(byDay), 1);

  return (
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, p:2, mb:2 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5 }}>
        <CalendarIcon sx={{ fontSize:16, color:'text.secondary' }}/>
        <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1} textTransform="uppercase">
          Días de la Semana {week}
        </Typography>
      </Box>
      <Grid container spacing={0.8}>
        {days.map((d, i) => {
          const key      = isoStr(d);
          const monto    = byDay[key] || 0;
          const isToday  = key === today;
          const isWeekend = i >= 5;
          const pct      = monto > 0 ? (monto / maxMonto) : 0;
          return (
            <Grid item xs key={key}>
              <Box sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: isToday ? ENC_MID : 'divider',
                bgcolor: isToday ? alpha(ENC_MID, 0.08) : isWeekend ? alpha('#000', 0.02) : 'background.paper',
                p: 1,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 80,
              }}>
                {/* Barra de monto al fondo */}
                {pct > 0 && (
                  <Box sx={{
                    position: 'absolute', bottom:0, left:0, right:0,
                    height: `${Math.max(pct * 100, 8)}%`,
                    bgcolor: alpha(ENC_MID, 0.12),
                    transition: 'height .5s ease',
                  }}/>
                )}
                <Typography variant="caption" color={isWeekend ? 'text.disabled' : 'text.secondary'}
                  fontWeight={isToday ? 700 : 400} fontSize="0.65rem">
                  {DIAS[i]}
                </Typography>
                <Typography variant="h6" fontWeight={isToday ? 900 : 600} lineHeight={1.1}
                  color={isToday ? ENC_MID : isWeekend ? 'text.disabled' : 'text.primary'}
                  sx={{ my: 0.3 }}>
                  {d.getDate()}
                </Typography>
                <Typography variant="caption" fontSize="0.6rem"
                  color={monto > 0 ? ENC_DARK : 'text.disabled'} fontWeight={monto > 0 ? 700 : 400}>
                  {monto > 0 ? fmtM(monto) : '–'}
                </Typography>
                {isToday && (
                  <Box sx={{ width:5, height:5, borderRadius:'50%', bgcolor:ENC_MID, mx:'auto', mt:0.3 }}/>
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

// ─── Tira de alertas de semanas ───────────────────────────────────────────────
function AlertasSemanas({ weeksData, currentWeek, onJump }) {
  // Mostrar ±8 semanas alrededor de la actual + semanas con problemas
  const semanas = weeksData.filter(w => Math.abs(w.semana - currentWeek) <= 8);
  if (semanas.length === 0) return null;

  return (
    <Box sx={{ mb:2 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}
        textTransform="uppercase" display="block" mb={0.8}>
        Estado de semanas cercanas
      </Typography>
      <Box sx={{ display:'flex', gap:0.8, overflowX:'auto', pb:0.5,
        '&::-webkit-scrollbar':{ height:4 },
        '&::-webkit-scrollbar-track':{ bgcolor:'transparent' },
        '&::-webkit-scrollbar-thumb':{ bgcolor:'#ccc', borderRadius:2 },
      }}>
        {semanas.map(w => {
          const isCurrent  = w.semana === currentWeek;
          const tieneDatos = (w.pagos_comprometidos || 0) > 0 || (w.encadenados || 0) > 0 || (w.no_encadenados || 0) > 0;
          const esPasada   = w.semana < currentWeek;
          const sc         = STATUS_MAP[w.estado] || STATUS_MAP.OK;

          let bgColor, label, dotColor;
          if (tieneDatos) {
            bgColor  = alpha(sc.color, 0.12);
            label    = `✓ Sem. ${w.semana}`;
            dotColor = sc.color;
          } else if (esPasada) {
            bgColor  = alpha('#b71c1c', 0.08);
            label    = `⚠ Sem. ${w.semana}`;
            dotColor = '#b71c1c';
          } else {
            bgColor  = alpha('#757575', 0.06);
            label    = `Sem. ${w.semana}`;
            dotColor = '#bdbdbd';
          }

          return (
            <Tooltip key={w.semana} title={
              tieneDatos
                ? `Semana ${w.semana} cargada · ${w.estado || 'OK'}`
                : esPasada
                  ? `⚠️ Falta subir semana ${w.semana}`
                  : `Semana ${w.semana} sin datos`
            }>
              <Box onClick={() => onJump(w.semana)}
                sx={{
                  flexShrink: 0,
                  px: 1.5, py: 0.6,
                  borderRadius: 2,
                  bgcolor: isCurrent ? ENC_MID : bgColor,
                  border: '1px solid',
                  borderColor: isCurrent ? ENC_MID : tieneDatos ? dotColor : 'divider',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  '&:hover': { transform:'translateY(-2px)', boxShadow:2 },
                }}>
                <Typography variant="caption" fontWeight={isCurrent ? 800 : 500}
                  color={isCurrent ? 'white' : tieneDatos ? dotColor : esPasada ? '#b71c1c' : 'text.disabled'}
                  fontSize="0.72rem" noWrap>
                  {label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Stats anuales ────────────────────────────────────────────────────────────
function StatsAnuales({ stats }) {
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
    <Paper elevation={0} sx={{ border:'1px solid', borderColor:'divider', borderRadius:3, p:2, mb:2 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={1}
        textTransform="uppercase" display="block" mb={1.5}>
        Resumen {stats.año}
      </Typography>
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
    </Paper>
  );
}

// ─── Desglose por sucursal ────────────────────────────────────────────────────
function DesgloseSucursal({ semana, year }) {
  const [data, setData]   = useState([]);
  const [open, setOpen]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(`/panificacion/desglose-sucursal?semana=${semana}&año=${year}`)
      .then(r => setData(r.data?.sucursales || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [open, semana, year]);

  const total = data.reduce((s, r) => s + r.total, 0);

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
        {loading
          ? <Box sx={{ p:3, textAlign:'center' }}><CircularProgress size={22}/></Box>
          : data.length === 0
            ? <Box sx={{ p:3, textAlign:'center' }}>
                <Typography variant="body2" color="text.disabled">Sin datos de sucursales para esta semana</Typography>
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
                                <Box sx={{ height:'100%', width:`${pct}%`, bgcolor:'#1a237e', borderRadius:1 }}/>
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

// ─── Fila de encadenado ───────────────────────────────────────────────────────
function EncRow({ item, onDelete }) {
  const [open, setOpen] = useState(false);
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
        <TableCell sx={{py:0.6}}>
          {item.numero_orden
            ? <Chip label={`#${item.numero_orden}`} size="small" sx={{fontSize:'0.62rem',height:18,bgcolor:ENC_BG,color:ENC_DARK}}/>
            : <Typography variant="caption" color="text.disabled">–</Typography>}
        </TableCell>
        <TableCell sx={{py:0.6}}>
          <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="right">
          <Typography variant="body2" fontWeight={700} color={ENC_DARK}>{fmtM(item.monto_con_iva||item.monto_neto||0)}</Typography>
          <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(item.monto_neto||0)}</Typography>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          <Chip label={item.plazo_dias!=null?`${item.plazo_dias}d`:'–'} size="small" sx={{fontSize:'0.62rem',height:18}}/>
        </TableCell>
        <TableCell sx={{py:0.6}} align="center">
          <Typography variant="caption" fontWeight={600} color={ENC_DARK}>{fmtDate(item.fecha_vencimiento)}</Typography>
          {item.semana_vencimiento && <Typography variant="caption" color="text.secondary" display="block">S{item.semana_vencimiento}</Typography>}
        </TableCell>
        <TableCell sx={{py:0.6}} align="right" onClick={e=>e.stopPropagation()}>
          {onDelete && <IconButton size="small" onClick={()=>onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}><DeleteIcon sx={{fontSize:14}}/></IconButton>}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{py:0,border:0}}>
          <Collapse in={open} timeout="auto">
            <Box sx={{p:1.5,bgcolor:ENC_BG,borderRadius:1,m:0.5}}>
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

// ─── Fila de no encadenado ───────────────────────────────────────────────────
function NencRow({ item, onDelete }) {
  return (
    <TableRow sx={{'&:hover':{bgcolor:alpha(NENC_MID,0.05)}}}>
      <TableCell sx={{py:0.6}}>
        <Typography variant="body2" fontWeight={600}>{item.proveedor||'–'}</Typography>
      </TableCell>
      <TableCell sx={{py:0.6}}>
        {item.numero_orden
          ? <Chip label={`#${item.numero_orden}`} size="small" sx={{fontSize:'0.62rem',height:18,bgcolor:NENC_BG,color:NENC_DARK}}/>
          : <Typography variant="caption" color="text.disabled">–</Typography>}
      </TableCell>
      <TableCell sx={{py:0.6}}>
        <Typography variant="caption" color="text.secondary">{item.sucursal||'–'}</Typography>
      </TableCell>
      <TableCell sx={{py:0.6}}>
        <Typography variant="caption" color="text.secondary">{fmtDate(item.fecha_compra)}</Typography>
      </TableCell>
      <TableCell sx={{py:0.6}} align="right">
        <Typography variant="body2" fontWeight={700} color={NENC_DARK}>{fmtM(item.monto_con_iva||item.monto_neto||0)}</Typography>
        <Typography variant="caption" color="text.disabled" display="block">neto {fmtM(item.monto_neto||0)}</Typography>
      </TableCell>
      <TableCell sx={{py:0.6}} align="right" onClick={e=>e.stopPropagation()}>
        {onDelete && <IconButton size="small" onClick={()=>onDelete(item.id)} sx={{opacity:.35,'&:hover':{opacity:1,color:'error.main'}}}><DeleteIcon sx={{fontSize:14}}/></IconButton>}
      </TableCell>
    </TableRow>
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
          {open?<ExpandLessIcon fontSize="small"/>:<ExpandMoreIcon fontSize="small"/>}
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
                  <TableCell sx={{py:0.6}}><Typography variant="caption" fontWeight={600}>{o.proveedor}</Typography></TableCell>
                  <TableCell sx={{py:0.6}}><Typography variant="caption" color="text.secondary">{o.sucursal||'–'}</Typography></TableCell>
                  <TableCell sx={{py:0.6}}><Typography variant="caption">{fmtDate(o.fecha_compra)}</Typography></TableCell>
                  <TableCell sx={{py:0.6}} align="right"><Typography variant="caption">{fmtM(o.monto_neto||0)}</Typography></TableCell>
                  <TableCell sx={{py:0.6}} align="right"><Typography variant="caption" fontWeight={600}>{fmtM(o.monto_con_iva||0)}</Typography></TableCell>
                  <TableCell sx={{py:0.6}} align="center"><Chip label={`${o.plazo_dias||30}d`} size="small" sx={{fontSize:'0.6rem',height:16}}/></TableCell>
                  <TableCell sx={{py:0.6}} align="center"><Typography variant="caption" fontWeight={600} color={alertColor}>{fmtDate(o.fecha_vencimiento)}</Typography></TableCell>
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
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const PanificacionPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  const [year, setYear]             = useState(new Date().getFullYear());
  const [week, setWeek]             = useState(getCurrentWeek());
  const [direction, setDirection]   = useState(1);
  const [weeksData, setWeeksData]   = useState([]);
  const [compras, setCompras]       = useState([]);
  const [proyeccion, setProyeccion] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loadingWeeks, setLoadingWeeks]     = useState(true);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [uploadLoading, setUploadLoading]   = useState(false);
  const [statsAnuales, setStatsAnuales]     = useState(null);
  const [searchEnc, setSearchEnc]           = useState('');
  const [searchNenc, setSearchNenc]         = useState('');

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

  // Listas filtradas por búsqueda
  const encFiltrados  = encadenados.filter(c  => !searchEnc  || (c.proveedor||'').toLowerCase().includes(searchEnc.toLowerCase()));
  const nencFiltrados = noEncadenados.filter(c => !searchNenc || (c.proveedor||'').toLowerCase().includes(searchNenc.toLowerCase()));

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
  const montoEnc  = weekData.encadenados  || encadenados.reduce((s,c)=>s+(c.monto_con_iva||c.monto_neto||0),0);
  const montoNenc = weekData.no_encadenados || noEncadenados.reduce((s,c)=>s+(c.monto_con_iva||c.monto_neto||0),0);
  const total     = montoEnc + montoNenc;
  const disponible = limite - total;
  const statusCfg = STATUS_MAP[weekData?.estado] || STATUS_MAP.OK;

  // ─── Cargas ──────────────────────────────────────────────────────────────
  const loadWeeks = useCallback(async () => {
    try {
      setLoadingWeeks(true);
      const r = await api.get(`/panificacion/control-semanal?año=${year}`);
      const d = r.data;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.semanas) ? d.semanas : []);
      setWeeksData(arr.map(w => ({ ...w, semana: parseInt(w.numero_semana ?? w.semana) })));
    } catch { enqueueSnackbar('Error cargando semanas', { variant:'error' }); }
    finally { setLoadingWeeks(false); }
  }, [year]);

  const loadCompras = useCallback(async () => {
    try {
      setLoadingCompras(true);
      const r = await api.get(`/panificacion/compras?año=${year}&semana=${week}`);
      const d = r.data;
      setCompras(Array.isArray(d) ? d : (Array.isArray(d?.compras) ? d.compras : []));
    } catch { setCompras([]); }
    finally { setLoadingCompras(false); }
  }, [year, week]);

  const loadProyeccion = useCallback(async () => {
    try {
      const r = await api.get(`/panificacion/proyeccion?año=${year}`);
      const d = r.data;
      // La proyección trae registros individuales de encadenados
      const raw = Array.isArray(d) ? d
        : Array.isArray(d?.proyeccion)
          ? d.proyeccion.flatMap(p => p.ordenes || [p])
          : [];
      setProyeccion(raw);
    } catch { setProyeccion([]); }
  }, [year]);

  useEffect(() => { api.get('/panificacion/sucursales').then(r=>setSucursales(r.data?.sucursales||r.data||[])).catch(()=>{}); }, []);
  useEffect(() => {
    loadWeeks();
    loadProyeccion();
    api.get(`/panificacion/resumen-anual?año=${year}`).then(r => setStatsAnuales(r.data)).catch(() => {});
  }, [loadWeeks, loadProyeccion, year]);
  useEffect(() => { loadCompras(); }, [loadCompras]);

  // ─── Navegación ──────────────────────────────────────────────────────────
  const goToPrev = () => { setDirection(-1); setWeek(w=>Math.max(1,w-1)); };
  const goToNext = () => { setDirection(1);  setWeek(w=>Math.min(52,w+1)); };

  // ─── Acciones ────────────────────────────────────────────────────────────
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setUploadLoading(true);
    const fd = new FormData(); fd.append('excel', file);
    try {
      const r = await api.post('/panificacion/upload-excel', fd);
      enqueueSnackbar(`Excel cargado: ${r.data.insertados||0} registros de ${r.data.hojas?.join(', ')||'–'}`, { variant:'success' });
      loadWeeks(); loadCompras(); loadProyeccion();
    } catch(err) { enqueueSnackbar(err.response?.data?.message||'Error al cargar', { variant:'error' }); }
    finally { setUploadLoading(false); e.target.value=''; }
  };
  const handleDelete = async (id) => {
    try { await api.delete(`/panificacion/compras/${id}`); enqueueSnackbar('Eliminado',{variant:'success'}); loadCompras(); loadWeeks(); }
    catch { enqueueSnackbar('Error al eliminar',{variant:'error'}); }
  };
  const handleSaveLimite = async () => {
    try {
      await api.put('/panificacion/limite', { semana: week, año: year, limite: parseFloat(nuevoLimite) });
      enqueueSnackbar('Límite actualizado',{variant:'success'}); setEditLimOpen(false); loadWeeks();
    } catch { enqueueSnackbar('Error al guardar',{variant:'error'}); }
  };
  const handleAddCompra = async () => {
    try {
      await api.post('/panificacion/compras', { ...newCompra, semana:week, año:year, tipo:addTipo });
      enqueueSnackbar('Registro agregado',{variant:'success'}); setAddOpen(false);
      setNewCompra({proveedor:'',fecha:'',neto:'',plazo:30,sucursal_id:''});
      loadCompras(); loadWeeks();
    } catch { enqueueSnackbar('Error al agregar',{variant:'error'}); }
  };

  if (loadingWeeks) return (
    <Box sx={{p:3,maxWidth:1200,mx:'auto'}}>
      <Skeleton variant="rounded" height={60} sx={{mb:2,borderRadius:3}}/>
      <Skeleton variant="rounded" height={140} sx={{mb:2,borderRadius:3}}/>
      <Skeleton variant="rounded" height={100} sx={{mb:2,borderRadius:3}}/>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} sx={{borderRadius:3}}/></Grid>
        <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} sx={{borderRadius:3}}/></Grid>
      </Grid>
    </Box>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box sx={{p:{xs:2,md:3},maxWidth:1200,mx:'auto'}}>

      {/* ── Header estático ── */}
      <Box sx={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',mb:2}}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Panificación · Pagos</Typography>
          <Typography variant="body2" color="text.secondary">Control semanal de compromisos</Typography>
        </Box>
        <Select value={year} onChange={e=>setYear(e.target.value)} size="small" sx={{minWidth:90,borderRadius:2}}>
          {[2023,2024,2025,2026].map(y=><MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
      </Box>

      {/* ── Navegador (estático, siempre visible) ── */}
      <Paper elevation={0} sx={{border:'1px solid',borderColor:'divider',borderRadius:3,p:2.5,mb:2,
        background:`linear-gradient(135deg,${alpha(statusCfg.color,.04)} 0%,transparent 70%)`}}>
        <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
          <IconButton onClick={goToPrev} disabled={week===1}
            sx={{bgcolor:alpha('#000',.05),'&:hover':{bgcolor:alpha('#000',.1)},'&.Mui-disabled':{opacity:.25}}}>
            <PrevIcon/>
          </IconButton>

          <Box sx={{textAlign:'center',minWidth:220}}>
            <Typography variant="overline" color="text.secondary" letterSpacing={3} fontSize="0.62rem">SEMANA</Typography>
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
          </Box>

          <IconButton onClick={goToNext} disabled={week===52}
            sx={{bgcolor:alpha('#000',.05),'&:hover':{bgcolor:alpha('#000',.1)},'&.Mui-disabled':{opacity:.25}}}>
            <NextIcon/>
          </IconButton>
        </Box>

        {/* Mini mapa del año */}
        <Box sx={{mt:2}}>
          <Box sx={{display:'flex',justifyContent:'space-between',mb:0.5}}>
            <Typography variant="caption" color="text.secondary">Semana {week} de 52</Typography>
            <Typography variant="caption" color="text.secondary">{Math.round(week/52*100)}% del año</Typography>
          </Box>
          <Box sx={{position:'relative',height:5,borderRadius:3,bgcolor:'#e0e0e0',overflow:'hidden'}}>
            <Box sx={{position:'absolute',top:0,left:0,height:'100%',width:`${week/52*100}%`,bgcolor:'#90a4ae',borderRadius:3,transition:'width .4s ease'}}/>
          </Box>
          {/* Dots de semanas */}
          <Box sx={{display:'flex',gap:'2px',mt:1,flexWrap:'wrap'}}>
            {weeksData.map(w=>{
              const sc=STATUS_MAP[w.estado]||STATUS_MAP.OK;
              return (
                <Tooltip key={w.semana} title={`Sem. ${w.semana} · ${w.estado||'OK'}`}>
                  <Box onClick={()=>{setDirection(w.semana>week?1:-1);setWeek(w.semana);}}
                    sx={{width:9,height:18,borderRadius:1,bgcolor:w.semana===week?'#1a237e':sc.color,
                      opacity:w.semana===week?1:0.4,cursor:'pointer',transition:'all .15s',
                      '&:hover':{opacity:1,transform:'scaleY(1.3)'}}}/>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Paper>

      {/* ── Resumen Anual ── */}
      <StatsAnuales stats={statsAnuales}/>

      {/* ── Alertas de semanas (estáticas, siempre visibles) ── */}
      <AlertasSemanas
        weeksData={weeksData}
        currentWeek={week}
        onJump={w => { setDirection(w > week ? 1 : -1); setWeek(w); }}
      />

      {/* ══════════════════════════════════════════════════════════════════
          TODO EL CONTENIDO DEBAJO SE ANIMA JUNTO AL CAMBIAR DE SEMANA
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`semana-${year}-${week}`}
          initial={{ opacity:0, x: direction*50 }}
          animate={{ opacity:1, x:0 }}
          exit={{    opacity:0, x: direction*-50 }}
          transition={{ duration:0.25, ease:'easeOut' }}
        >

          {/* ── Calendario mini de la semana ── */}
          <WeekCalendar week={week} year={year} compras={compras} />

          {/* ── Hoja 1: Presupuesto Semanal ── */}
          <Paper elevation={0} sx={{border:`2px solid ${alpha(statusCfg.color,.5)}`,borderRadius:3,p:3,mb:2,bgcolor:statusCfg.bg}}>
            <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:2.5}}>
              <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                <Avatar sx={{bgcolor:statusCfg.color,width:40,height:40}}>
                  <statusCfg.Icon sx={{fontSize:20}}/>
                </Avatar>
                <Box>
                  <Typography variant="overline" color="text.secondary" fontSize="0.62rem" letterSpacing={1.5}>
                    Control Pagos Semanales — Hoja 1
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
                { label:'Pagos Comprometidos',  value:montoNenc,  color:NENC_DARK, bg:NENC_BG,  desc:'No Encadenados' },
                { label:'Deuda Est. Facturada', value:montoEnc,   color:ENC_DARK,  bg:ENC_BG,   desc:'Encadenados vencen aquí' },
                { label:'Total Planificado',    value:total,      color:statusCfg.color, bg:statusCfg.bg, desc:'Comprometido + Deuda' },
                { label:'Capacidad Disponible', value:disponible, color:disponible>=0?'#1b5e20':'#b71c1c', bg:disponible>=0?'#f1f8e9':'#ffebee', desc:'Límite − Total' },
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
          </Paper>

          {/* ── Hojas 2 + 3: Encadenados / No Encadenados ── */}
          <Grid container spacing={2} sx={{mb:2}}>

            {/* ─ Encadenados (Hoja 2: Compras) ─ */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{border:`2px solid ${ENC_DARK}`,borderRadius:3,height:'100%'}}>
                <Box sx={{background:`linear-gradient(135deg,${ENC_DARK},${ENC_MID})`,px:2.5,py:2,
                  display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                    <Avatar sx={{bgcolor:alpha('#fff',.18),width:36,height:36}}>
                      <EncadenadoIcon sx={{color:'white',fontSize:18}}/>
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="white">Encadenados</Typography>
                      <Box sx={{display:'flex',gap:0.5}}>
                        <Chip label="ESTIMADO" size="small" sx={{bgcolor:alpha('#fff',.18),color:'white',fontSize:'0.58rem',height:16,fontWeight:700}}/>
                        <Chip label="Hoja 2 — Compras" size="small" sx={{bgcolor:alpha('#fff',.1),color:alpha('#fff',.8),fontSize:'0.58rem',height:16}}/>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{textAlign:'right'}}>
                    <Typography variant="h5" fontWeight={800} color="white">{fmtM(montoEnc)}</Typography>
                    <Typography variant="caption" color={alpha('#fff',.75)}>{encadenados.length} orden{encadenados.length!==1?'es':''}</Typography>
                  </Box>
                </Box>

                {/* Botones */}
                <Box sx={{px:2,py:1,display:'flex',gap:1,borderBottom:'1px solid',borderColor:'divider'}}>
                  <Button size="small" startIcon={uploadLoading?<CircularProgress size={12}/>:<UploadIcon/>}
                    variant="outlined" disabled={uploadLoading}
                    onClick={()=>fileInputRef.current?.click()}
                    sx={{borderRadius:2,fontSize:'0.72rem',color:ENC_DARK,borderColor:ENC_DARK,'&:hover':{bgcolor:ENC_BG}}}>
                    {uploadLoading?'Cargando...':'Subir Excel'}
                  </Button>
                  <Button size="small" startIcon={<AddIcon/>} variant="outlined"
                    onClick={()=>{setAddTipo('Encadenado');setAddOpen(true);}}
                    sx={{borderRadius:2,fontSize:'0.72rem',color:ENC_DARK,borderColor:ENC_DARK,'&:hover':{bgcolor:ENC_BG}}}>
                    Agregar
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleExcelUpload}/>
                </Box>

                {/* Búsqueda */}
                {encadenados.length > 0 && (
                  <Box sx={{px:2,py:1,borderBottom:'1px solid',borderColor:'divider'}}>
                    <TextField size="small" fullWidth placeholder="Buscar proveedor…"
                      value={searchEnc} onChange={e=>setSearchEnc(e.target.value)}
                      InputProps={{
                        startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:16,color:'text.disabled'}}/></InputAdornment>,
                        sx:{borderRadius:2,fontSize:'0.8rem'},
                      }}/>
                  </Box>
                )}

                {/* Tabla con columnas del Excel */}
                <CardContent sx={{p:0,maxHeight:380,overflowY:'auto'}}>
                  {loadingCompras
                    ? <Box sx={{p:3,textAlign:'center'}}><CircularProgress size={24} sx={{color:ENC_MID}}/></Box>
                    : encadenados.length===0
                      ? <Box sx={{py:5,textAlign:'center'}}>
                          <EncadenadoIcon sx={{fontSize:40,color:alpha(ENC_DARK,.15),mb:1}}/>
                          <Typography variant="body2" color="text.disabled">Sin encadenados en semana {week}</Typography>
                          <Typography variant="caption" color="text.disabled" display="block">Sube el Excel con la Hoja "Compras"</Typography>
                        </Box>
                      : encFiltrados.length===0
                        ? <Box sx={{py:4,textAlign:'center'}}>
                            <SearchIcon sx={{fontSize:32,color:'text.disabled',mb:0.5}}/>
                            <Typography variant="body2" color="text.disabled">Sin resultados para "{searchEnc}"</Typography>
                          </Box>
                        : <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow sx={{'& th':{bgcolor:ENC_BG,fontWeight:700,fontSize:'0.68rem',color:ENC_DARK,py:0.8}}}>
                                <TableCell>Proveedor</TableCell>
                                <TableCell>Orden</TableCell>
                                <TableCell>Sucursal</TableCell>
                                <TableCell align="right">c/IVA</TableCell>
                                <TableCell align="center">Plazo</TableCell>
                                <TableCell align="center">Vencimiento</TableCell>
                                <TableCell align="right" sx={{width:32}}/>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {encFiltrados.map(item=><EncRow key={item.id} item={item} onDelete={handleDelete}/>)}
                            </TableBody>
                          </Table>
                  }
                </CardContent>
              </Card>
            </Grid>

            {/* ─ No Encadenados (Hoja 3: Compras por Sucursales) ─ */}
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{border:`2px solid ${NENC_DARK}`,borderRadius:3,height:'100%'}}>
                <Box sx={{background:`linear-gradient(135deg,${NENC_DARK},${NENC_MID})`,px:2.5,py:2,
                  display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                    <Avatar sx={{bgcolor:alpha('#fff',.18),width:36,height:36}}>
                      <NoEncadenadoIcon sx={{color:'white',fontSize:18}}/>
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} color="white">No Encadenados</Typography>
                      <Box sx={{display:'flex',gap:0.5}}>
                        <Chip label="CONFIRMADO" size="small" sx={{bgcolor:alpha('#fff',.18),color:'white',fontSize:'0.58rem',height:16,fontWeight:700}}/>
                        <Chip label="Hoja 3 — Por Sucursales" size="small" sx={{bgcolor:alpha('#fff',.1),color:alpha('#fff',.8),fontSize:'0.58rem',height:16}}/>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{textAlign:'right'}}>
                    <Typography variant="h5" fontWeight={800} color="white">{fmtM(montoNenc)}</Typography>
                    <Typography variant="caption" color={alpha('#fff',.75)}>{noEncadenados.length} pago{noEncadenados.length!==1?'s':''}</Typography>
                  </Box>
                </Box>

                {/* Botones */}
                <Box sx={{px:2,py:1,display:'flex',gap:1,borderBottom:'1px solid',borderColor:'divider'}}>
                  <Button size="small" startIcon={<AddIcon/>} variant="outlined"
                    onClick={()=>{setAddTipo('No Encadenado');setAddOpen(true);}}
                    sx={{borderRadius:2,fontSize:'0.72rem',color:NENC_DARK,borderColor:NENC_DARK,'&:hover':{bgcolor:NENC_BG}}}>
                    Agregar Pago
                  </Button>
                </Box>

                {/* Búsqueda */}
                {noEncadenados.length > 0 && (
                  <Box sx={{px:2,py:1,borderBottom:'1px solid',borderColor:'divider'}}>
                    <TextField size="small" fullWidth placeholder="Buscar proveedor…"
                      value={searchNenc} onChange={e=>setSearchNenc(e.target.value)}
                      InputProps={{
                        startAdornment:<InputAdornment position="start"><SearchIcon sx={{fontSize:16,color:'text.disabled'}}/></InputAdornment>,
                        sx:{borderRadius:2,fontSize:'0.8rem'},
                      }}/>
                  </Box>
                )}

                {/* Tabla con columnas del Excel */}
                <CardContent sx={{p:0,maxHeight:380,overflowY:'auto'}}>
                  {loadingCompras
                    ? <Box sx={{p:3,textAlign:'center'}}><CircularProgress size={24} sx={{color:NENC_MID}}/></Box>
                    : noEncadenados.length===0
                      ? <Box sx={{py:5,textAlign:'center'}}>
                          <NoEncadenadoIcon sx={{fontSize:40,color:alpha(NENC_DARK,.15),mb:1}}/>
                          <Typography variant="body2" color="text.disabled">Sin pagos directos en semana {week}</Typography>
                          <Typography variant="caption" color="text.disabled" display="block">Se cargan desde Hoja "Compras por Sucursales"</Typography>
                        </Box>
                      : nencFiltrados.length===0
                        ? <Box sx={{py:4,textAlign:'center'}}>
                            <SearchIcon sx={{fontSize:32,color:'text.disabled',mb:0.5}}/>
                            <Typography variant="body2" color="text.disabled">Sin resultados para "{searchNenc}"</Typography>
                          </Box>
                        : <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow sx={{'& th':{bgcolor:NENC_BG,fontWeight:700,fontSize:'0.68rem',color:NENC_DARK,py:0.8}}}>
                                <TableCell>Proveedor</TableCell>
                                <TableCell>Orden</TableCell>
                                <TableCell>Sucursal</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell align="right">c/IVA</TableCell>
                                <TableCell align="right" sx={{width:32}}/>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {nencFiltrados.map(item=><NencRow key={item.id} item={item} onDelete={handleDelete}/>)}
                            </TableBody>
                          </Table>
                  }
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Proyección de Vencimientos (Encadenados que vencen ESTA semana) ── */}
          <Paper elevation={0} sx={{border:'1px solid',borderColor:'divider',borderRadius:3,p:3}}>
            <Box sx={{display:'flex',alignItems:'center',gap:1.5,mb:2.5}}>
              <Avatar sx={{bgcolor:alpha(PROY_COLOR,.1),width:38,height:38}}>
                <TrendingUpIcon sx={{color:PROY_COLOR,fontSize:20}}/>
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Proyección de Vencimientos</Typography>
                <Typography variant="caption" color="text.secondary">
                  Encadenados comprados en semanas anteriores cuya fecha de pago cae en Semana {week} · Hoja 2
                </Typography>
              </Box>
            </Box>

            {proySemana.length===0
              ? <Box sx={{textAlign:'center',py:4,border:'1px dashed',borderColor:'divider',borderRadius:2,bgcolor:'action.hover'}}>
                  <OkIcon sx={{fontSize:40,color:'#a5d6a7',mb:1}}/>
                  <Typography variant="body2" color="text.secondary">Sin vencimientos proyectados para semana {week}</Typography>
                  <Typography variant="caption" color="text.disabled" display="block">Los encadenados con plazo que vencen aquí aparecerán automáticamente</Typography>
                </Box>
              : <Box>
                  {proySemana.map((g,i)=>(
                    <ProyCard key={i} grupo={g} totalActual={total} limite={limite}/>
                  ))}
                </Box>
            }
          </Paper>

          {/* ── Desglose por Sucursal ── */}
          <Box sx={{mt:2}}>
            <DesgloseSucursal semana={week} year={year}/>
          </Box>

        </motion.div>
      </AnimatePresence>

      {/* ─── Diálogos ─── */}
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

      <Dialog open={addOpen} onClose={()=>setAddOpen(false)} maxWidth="sm" fullWidth PaperProps={{sx:{borderRadius:3}}}>
        <DialogTitle fontWeight={700}>Agregar {addTipo==='Encadenado'?'Encadenado':'Pago Directo'} — Semana {week}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{mt:1}}>
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

    </Box>
  );
};

export default PanificacionPage;
