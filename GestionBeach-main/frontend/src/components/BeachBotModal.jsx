import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer, Box, Typography, TextField, IconButton,
  Chip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, Alert, Tooltip,
} from '@mui/material';
import CloseIcon      from '@mui/icons-material/Close';
import SendIcon       from '@mui/icons-material/Send';
import CodeIcon       from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import chatbotImg     from '../images/chatbot.png';
import api            from '../api/api';

const SUGERENCIAS = [
  // Ventas generales (todos)
  '¿Cuánto se vendió ayer?',
  'Ventas día a día esta semana',
  '¿Cuántas boletas se emitieron hoy?',
  '¿Cuánto se vendió este mes?',
  // Productos (todos)
  'Top 10 productos más vendidos del mes',
  '¿Cuál fue el producto estrella del año?',
  // Vendedores / cajeros (todos)
  '¿Qué cajero vendió más esta semana?',
  'Ranking de vendedores del mes',
  // Hora pico (todos)
  '¿A qué hora se vende más?',
  'Hora pico de los últimos 7 días',
  // Notas de crédito (todos)
  '¿Cuántas notas de crédito hubo este mes?',
  'Devoluciones de esta semana',
  // Folios SII (supermercados)
  '¿Cuántos folios de boleta quedan?',
  '¿Algún CAF está vencido o por vencerse?',
  // Stock e inventario (ferreterías)
  '¿Cuánto vale el inventario en bodega?',
  'Valor del stock por familia de productos',
  // Clientes (ferreterías)
  '¿Cuáles son los mejores clientes del mes?',
  'Top clientes del año',
  // Proveedores (ferreterías)
  '¿A qué proveedor le compramos más?',
  'Ranking de proveedores del mes',
  // Órdenes de compra (ferreterías)
  '¿Qué órdenes de compra están pendientes?',
  'Órdenes sin recibir de esta semana',
  // Guías de despacho (ferreterías)
  '¿Qué guías se emitieron esta semana?',
  // Ajustes bodega (ferreterías)
  '¿Cuántos ajustes de bodega hubo este mes?',
  // Anulaciones (ferreterías)
  '¿Cuántas órdenes fueron anuladas hoy?',
  'Anulaciones de esta semana',
];

/* ── Burbuja con selector de sucursal ──────────────────────────────────── */
function BurbujaSucursales({ msg, onSeleccionar, disabled }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-end' }}>
      <Box component="img" src={chatbotImg} alt="BeachBot"
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: 1 }} />
      <Box sx={{ maxWidth: '88%' }}>
        <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.7, mb: 1 }}>
            {msg.texto}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
            {(msg.sucursales_disponibles || []).map(s => (
              <Chip key={s.id} label={s.nombre} size="small" variant="outlined"
                disabled={disabled}
                onClick={() => onSeleccionar(s.id, s.nombre, msg.pregunta_original)}
                sx={{ fontSize: 11, cursor: 'pointer', '&:hover': { bgcolor: '#e8eaf6', borderColor: '#3949ab' } }} />
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

/* ── Burbuja ¿Otra pregunta? ────────────────────────────────────────────── */
function BurbujaFollowup({ disabled, onSi, onNo }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-end' }}>
      <Box component="img" src={chatbotImg} alt="BeachBot"
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: 1 }} />
      <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <Typography variant="body2" sx={{ fontSize: 13, mb: 1 }}>¿Quieres preguntar otra cosa?</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="Sí" size="small" disabled={disabled} onClick={onSi} variant="outlined"
            sx={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', borderColor: '#43a047', color: '#2e7d32', '&:hover': { bgcolor: '#e8f5e9' } }} />
          <Chip label="No" size="small" disabled={disabled} onClick={onNo} variant="outlined"
            sx={{ fontSize: 12, fontWeight: 700, cursor: 'pointer', borderColor: '#e53935', color: '#c62828', '&:hover': { bgcolor: '#fce4ec' } }} />
        </Box>
      </Paper>
    </Box>
  );
}

/* ── Sugerencias inline (después de elegir Sí) ──────────────────────────── */
function BurujaSugerenciasInline({ onEnviar, disabled }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-start' }}>
      <Box component="img" src={chatbotImg} alt="BeachBot"
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: 1 }} />
      <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', maxWidth: '85%' }}>
        <Typography variant="body2" sx={{ fontSize: 13, mb: 1 }}>¡Dale po! ¿Qué más quieres saber? 🔍</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          {SUGERENCIAS.map(s => (
            <Chip key={s} label={s} size="small" variant="outlined" disabled={disabled}
              onClick={() => onEnviar(s)}
              sx={{ fontSize: 11, cursor: 'pointer', '&:hover': { bgcolor: '#e8eaf6', borderColor: '#3949ab' } }} />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

/* ── Burbuja BeachBot ───────────────────────────────────────────────────── */
function BurbujaIA({ msg }) {
  const [showSQL, setShowSQL]     = useState(false);
  const [showTabla, setShowTabla] = useState(false);
  const tieneTabla = msg.datos && msg.datos.length > 0;
  const columnas   = tieneTabla ? Object.keys(msg.datos[0]) : [];

  return (
    <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-end' }}>
      <Box
        component="img" src={chatbotImg} alt="BeachBot"
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: 1 }}
      />
      <Box sx={{ maxWidth: '82%' }}>
        <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13 }}>
            {msg.texto}
          </Typography>
          {msg.error_sql && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.3, fontSize: 11 }}>
              Tuve problemas con el SQL. Intenta reformular.
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {msg.sql && (
              <Chip icon={<CodeIcon sx={{ fontSize: '13px !important' }} />}
                label={showSQL ? 'Ocultar SQL' : 'Ver SQL'} size="small" variant="outlined"
                onClick={() => setShowSQL(v => !v)}
                sx={{ fontSize: 10, cursor: 'pointer', height: 20 }} />
            )}
            {tieneTabla && (
              <Chip
                icon={showTabla ? <ExpandLessIcon sx={{ fontSize: '13px !important' }} /> : <ExpandMoreIcon sx={{ fontSize: '13px !important' }} />}
                label={showTabla ? 'Ocultar' : `${msg.datos.length} filas`} size="small" variant="outlined"
                onClick={() => setShowTabla(v => !v)}
                sx={{ fontSize: 10, cursor: 'pointer', height: 20 }} />
            )}
          </Box>
          <Collapse in={showSQL}>
            <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: '#1e1e2e', color: '#cdd6f4', borderRadius: 1, fontSize: 10, overflow: 'auto', maxHeight: 150, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {msg.sql}
            </Box>
          </Collapse>
          <Collapse in={showTabla}>
            <TableContainer sx={{ mt: 1, maxHeight: 200, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columnas.map(c => (
                      <TableCell key={c} sx={{ bgcolor: '#3949ab', color: '#fff', fontWeight: 700, fontSize: 10, py: 0.5 }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(msg.datos || []).slice(0, 40).map((row, i) => (
                    <TableRow key={i} sx={{ '&:nth-of-type(even)': { bgcolor: '#f5f5f5' } }}>
                      {columnas.map(c => (
                        <TableCell key={c} sx={{ fontSize: 10, py: 0.4 }}>
                          {row[c] !== null && row[c] !== undefined ? String(row[c]) : '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Paper>
      </Box>
    </Box>
  );
}

/* ── Burbuja Usuario ────────────────────────────────────────────────────── */
function BurbujaUsuario({ texto }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
      <Paper elevation={0} sx={{ p: '9px 14px', bgcolor: '#3949ab', color: '#fff', borderRadius: '16px 4px 16px 16px', maxWidth: '78%', boxShadow: '0 1px 3px rgba(57,73,171,0.25)' }}>
        <Typography variant="body2" sx={{ fontSize: 13 }}>{texto}</Typography>
      </Paper>
    </Box>
  );
}

/* ── Indicador de escritura ─────────────────────────────────────────────── */
function BurbujaCargando() {
  return (
    <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-end' }}>
      <Box component="img" src={chatbotImg} alt="BeachBot"
        sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px' }}>
        <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: '#3949ab',
              animation: 'bbounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
              '@keyframes bbounce': {
                '0%,80%,100%': { transform: 'scale(0.55)', opacity: 0.35 },
                '40%':          { transform: 'scale(1)',    opacity: 1 },
              },
            }} />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */
export default function BeachBotModal({ open, onClose }) {
  const [sucursalId, setSucursalId]         = useState('pendiente');
  const [sucursalNombre, setSucursalNombre] = useState('');
  const [mensajes, setMensajes]             = useState([]);
  const [historial, setHistorial]           = useState([]);
  const [pregunta, setPregunta]             = useState('');
  const [cargando, setCargando]             = useState(false);
  const [followupContestado, setFollowupContestado] = useState(false);
  const bottomRef = useRef(null);

  // Al abrir, resetear todo para sesión fresca
  useEffect(() => {
    if (!open) return;
    setSucursalId('pendiente');
    setSucursalNombre('');
    setMensajes([]);
    setHistorial([]);
    setFollowupContestado(false);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  // Retorna el texto de respuesta si fue una respuesta real (para actualizar historial)
  const consultar = async (q, sid, hist) => {
    setCargando(true);
    try {
      const { data } = await api.post('/ai-consulta/consultar', {
        pregunta: q,
        sucursal_id: sid,
        historial: hist,
      });
      if (data.pedir_sucursal) {
        setMensajes(prev => [...prev, {
          tipo: 'pedir_sucursal',
          texto: data.respuesta,
          sucursales_disponibles: data.sucursales_disponibles,
          pregunta_original: q,
        }]);
        return null;
      } else {
        setFollowupContestado(false);
        setMensajes(prev => [...prev,
          {
            tipo: 'ia', texto: data.respuesta,
            sql: data.sql, datos: data.datos,
            sucursal: data.sucursal,
            sucursal_detectada: data.sucursal_detectada,
            error_sql: data.error_sql,
          },
          { tipo: 'followup' },
        ]);
        return data.respuesta;
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'No pude conectarme. Verifica la configuración.';
      setMensajes(prev => [...prev, { tipo: 'ia', texto: `Lo siento, tuve un problema: ${msg}` }]);
      return null;
    } finally {
      setCargando(false);
    }
  };

  const agregarHistorial = (q, respuesta) => {
    setHistorial(prev => [
      ...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: respuesta },
    ].slice(-6)); // máximo 3 intercambios (6 mensajes)
  };

  const enviar = async (texto = pregunta) => {
    if (!texto.trim() || cargando) return;
    const q = texto.trim();
    setPregunta('');
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: q }]);
    const respuesta = await consultar(q, sucursalId, historial);
    if (respuesta) agregarHistorial(q, respuesta);
  };

  const seleccionarSucursal = async (sid, nombreSuc, preguntaOriginal) => {
    const sidStr = String(sid);
    setSucursalId(sidStr);
    setSucursalNombre(nombreSuc);
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: `${preguntaOriginal} (${nombreSuc})` }]);
    const respuesta = await consultar(preguntaOriginal, sidStr, historial);
    if (respuesta) agregarHistorial(preguntaOriginal, respuesta);
  };

  const cambiarSucursal = () => {
    setSucursalId('pendiente');
    setSucursalNombre('');
  };

  const handleSi = () => {
    setFollowupContestado(true);
    setMensajes(prev => [...prev,
      { tipo: 'usuario', texto: 'Sí' },
      { tipo: 'sugerencias_inline' },
    ]);
  };

  const handleNo = () => {
    setFollowupContestado(true);
    setMensajes(prev => [...prev,
      { tipo: 'usuario', texto: 'No' },
      { tipo: 'ia', texto: '¡Hasta luego! Cuando necesites más info, aquí estaré 😊' },
    ]);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, display: 'flex', flexDirection: 'column', bgcolor: '#f0f2f8' } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #e8eaf6', flexShrink: 0 }}>
        <Box component="img" src={chatbotImg} alt="BeachBot"
          sx={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', boxShadow: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>BeachBot</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#43a047' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              En línea · Llama 3.3
            </Typography>
            {sucursalNombre && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>·</Typography>
                <Chip
                  label={sucursalNombre}
                  size="small"
                  onDelete={cambiarSucursal}
                  sx={{ fontSize: 9, height: 16, '& .MuiChip-deleteIcon': { fontSize: 12 }, bgcolor: '#e8eaf6', color: '#3949ab' }}
                />
              </>
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Mensajes */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
        {/* Saludo fijo */}
        <Box sx={{ display: 'flex', gap: 1.2, mb: 2, alignItems: 'flex-end' }}>
          <Box component="img" src={chatbotImg} alt="BeachBot"
            sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <Paper elevation={0} sx={{ p: '10px 14px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 16px 16px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', maxWidth: '85%' }}>
            <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.7 }}>
              👋 Hola, soy <strong>BeachBot</strong>. Consulto datos de cualquier sucursal usando las sugerencias disponibles: ventas, productos, cajeros, hora pico, folios SII, inventario, clientes, proveedores, órdenes y más. Elige una sugerencia para comenzar.
            </Typography>
          </Paper>
        </Box>

        {/* Sugerencias si no hay mensajes */}
        {mensajes.length === 0 && (
          <Box sx={{ ml: 5.5, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {SUGERENCIAS.map(s => (
              <Chip key={s} label={s} size="small" variant="outlined" onClick={() => enviar(s)} disabled={cargando}
                sx={{ fontSize: 11, cursor: 'pointer', '&:hover': { bgcolor: '#e8eaf6', borderColor: '#3949ab' } }} />
            ))}
          </Box>
        )}

        {(() => {
          const lastFollowupIdx = mensajes.reduce((last, m, idx) => m.tipo === 'followup' ? idx : last, -1);
          return mensajes.map((m, i) => {
            if (m.tipo === 'usuario')        return <BurbujaUsuario key={i} texto={m.texto} />;
            if (m.tipo === 'pedir_sucursal') return <BurbujaSucursales key={i} msg={m} onSeleccionar={seleccionarSucursal} disabled={cargando} />;
            if (m.tipo === 'followup')       return <BurbujaFollowup key={i} onSi={handleSi} onNo={handleNo} disabled={i !== lastFollowupIdx || followupContestado || cargando} />;
            if (m.tipo === 'sugerencias_inline') return <BurujaSugerenciasInline key={i} onEnviar={enviar} disabled={cargando} />;
            return <BurbujaIA key={i} msg={m} />;
          });
        })()}
        {cargando && <BurbujaCargando />}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff', borderTop: '1px solid #e8eaf6', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={3}
            placeholder="Escríbeme algo..."
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            size="small" disabled={cargando}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f5f5f5', fontSize: 13 } }}
          />
          <Tooltip title="Enviar (Enter)">
            <span>
              <IconButton onClick={() => enviar()} disabled={!pregunta.trim() || cargando}
                sx={{ bgcolor: '#3949ab', color: '#fff', width: 38, height: 38,
                  '&:hover': { bgcolor: '#283593' }, '&:disabled': { bgcolor: '#e0e0e0' } }}>
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
}
