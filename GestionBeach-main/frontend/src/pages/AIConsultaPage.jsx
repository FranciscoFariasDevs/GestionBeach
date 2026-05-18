import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, CircularProgress,
  Chip, Avatar, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Collapse, Tooltip, Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DnsIcon from '@mui/icons-material/Dns';
import chatbotImg from '../images/chatbot.png';
import api from '../api/api';

const SUGERENCIAS = [
  '¿Cuánto se vendió ayer?',
  'Top 10 productos más vendidos del mes',
  '¿Cuántas ventas se hicieron hoy?',
  'Ventas por día de la última semana',
  'Productos con bajo stock',
  '¿Cuántas notas de crédito hubo este mes?',
];

const TIPO_ICON = {
  SUPERMERCADO: <StorefrontIcon fontSize="small" />,
  FERRETERIA:   <HomeWorkIcon fontSize="small" />,
  MULTITIENDA:  <StorefrontIcon fontSize="small" />,
  INTRANET:     <DnsIcon fontSize="small" />,
};

function BurbujiaIA({ msg }) {
  const [showSQL, setShowSQL]     = useState(false);
  const [showTabla, setShowTabla] = useState(false);
  const tieneTabla = msg.datos && msg.datos.length > 0;
  const columnas   = tieneTabla ? Object.keys(msg.datos[0]) : [];

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'flex-end' }}>
      {/* Avatar BeachBot */}
      <Box
        component="img"
        src={chatbotImg}
        alt="BeachBot"
        sx={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, mb: 0.5, boxShadow: 2 }}
      />

      <Box sx={{ maxWidth: '78%' }}>
        {msg.sucursal && (
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1, mb: 0.3, display: 'block' }}>
            BeachBot · {msg.sucursal}
          </Typography>
        )}
        <Paper
          elevation={0}
          sx={{
            p: '12px 16px',
            bgcolor: '#fff',
            border: '1px solid #e0e7ff',
            borderRadius: '4px 18px 18px 18px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
            {msg.texto}
          </Typography>

          {msg.error_sql && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: 11 }}>
              Tuve problemas ejecutando el SQL. Intenta reformular la pregunta.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
            {msg.sql && (
              <Chip
                icon={<CodeIcon sx={{ fontSize: '14px !important' }} />}
                label={showSQL ? 'Ocultar SQL' : 'Ver SQL'}
                size="small"
                variant="outlined"
                onClick={() => setShowSQL(v => !v)}
                sx={{ fontSize: 11, cursor: 'pointer', height: 22 }}
              />
            )}
            {tieneTabla && (
              <Chip
                icon={showTabla ? <ExpandLessIcon sx={{ fontSize: '14px !important' }} /> : <ExpandMoreIcon sx={{ fontSize: '14px !important' }} />}
                label={showTabla ? 'Ocultar datos' : `${msg.datos.length} registros`}
                size="small"
                variant="outlined"
                onClick={() => setShowTabla(v => !v)}
                sx={{ fontSize: 11, cursor: 'pointer', height: 22 }}
              />
            )}
          </Box>

          <Collapse in={showSQL}>
            <Box
              component="pre"
              sx={{
                mt: 1.5, p: 1.5, bgcolor: '#1e1e2e', color: '#cdd6f4',
                borderRadius: 2, fontSize: 11, overflow: 'auto',
                maxHeight: 180, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              }}
            >
              {msg.sql}
            </Box>
          </Collapse>

          <Collapse in={showTabla}>
            <TableContainer sx={{ mt: 1.5, maxHeight: 260, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columnas.map(col => (
                      <TableCell key={col} sx={{ bgcolor: '#3949ab', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(msg.datos || []).slice(0, 50).map((row, i) => (
                    <TableRow key={i} sx={{ '&:nth-of-type(even)': { bgcolor: '#f5f5f5' } }}>
                      {columnas.map(col => (
                        <TableCell key={col} sx={{ fontSize: 11 }}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
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

function BurbujaUsuario({ texto }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          p: '10px 16px',
          bgcolor: '#3949ab',
          color: '#fff',
          borderRadius: '18px 4px 18px 18px',
          maxWidth: '75%',
          boxShadow: '0 1px 4px rgba(57,73,171,0.3)',
        }}
      >
        <Typography variant="body2">{texto}</Typography>
      </Paper>
    </Box>
  );
}

function BurbujaCargando() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'flex-end' }}>
      <Box
        component="img"
        src={chatbotImg}
        alt="BeachBot"
        sx={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      <Paper
        elevation={0}
        sx={{
          p: '12px 16px',
          bgcolor: '#fff',
          border: '1px solid #e0e7ff',
          borderRadius: '4px 18px 18px 18px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: '#3949ab',
                animation: 'bounce 1.2s infinite',
                animationDelay: `${i * 0.2}s`,
                '@keyframes bounce': {
                  '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                  '40%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

export default function AIConsultaPage() {
  const [sucursales, setSucursales]   = useState([]);
  const [sucursalSel, setSucursalSel] = useState('intranet');
  const [mensajes, setMensajes]       = useState([]);
  const [pregunta, setPregunta]       = useState('');
  const [cargando, setCargando]       = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/ai-consulta/sucursales')
      .then(r => setSucursales(r.data))
      .catch(() => setSucursales([{ id: 'intranet', nombre: 'Intranet GestionBeach', tipo_sucursal: 'INTRANET' }]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviar = async (texto = pregunta) => {
    if (!texto.trim() || cargando) return;
    const q = texto.trim();
    setPregunta('');
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: q }]);
    setCargando(true);

    try {
      const { data } = await api.post('/ai-consulta/consultar', {
        pregunta: q,
        sucursal_id: sucursalSel,
      });
      setMensajes(prev => [...prev, {
        tipo: 'ia',
        texto: data.respuesta,
        sql: data.sql,
        datos: data.datos,
        sucursal: data.sucursal,
        error_sql: data.error_sql,
      }]);
    } catch (e) {
      const msg = e.response?.data?.error || 'No pude conectarme. Verifica la configuración.';
      setMensajes(prev => [...prev, { tipo: 'ia', texto: `Lo siento, tuve un problema: ${msg}` }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f0f2f8',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Paper elevation={0} sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', bgcolor: '#fff', borderBottom: '1px solid #e8eaf6', zIndex: 1 }}>
        <Box
          component="img"
          src={chatbotImg}
          alt="BeachBot"
          sx={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', boxShadow: 2 }}
        />
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>BeachBot</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#43a047' }} />
            <Typography variant="caption" color="text.secondary">En línea · Llama 3.3 via Groq</Typography>
          </Box>
        </Box>

        <FormControl size="small" sx={{ ml: 'auto', minWidth: 230 }}>
          <InputLabel>Base de datos</InputLabel>
          <Select
            value={sucursalSel}
            label="Base de datos"
            onChange={e => setSucursalSel(e.target.value)}
          >
            {sucursales.map(s => (
              <MenuItem key={s.id} value={String(s.id)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {TIPO_ICON[s.tipo_sucursal] || <DnsIcon fontSize="small" />}
                  <span>{s.nombre}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Mensajes */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 4 }, py: 3 }}>
        {/* Saludo inicial siempre visible */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, alignItems: 'flex-end' }}>
          <Box
            component="img"
            src={chatbotImg}
            alt="BeachBot"
            sx={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <Paper elevation={0} sx={{ p: '12px 16px', bgcolor: '#fff', border: '1px solid #e0e7ff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '78%' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.75 }}>
              👋 Hola, soy <strong>BeachBot</strong>, pregúntame lo que quieras <em>(en serio, lo que quieras)</em>. Puedo consultar las bases de datos de supermercados, ferreterías y la intranet.
            </Typography>
          </Paper>
        </Box>

        {/* Sugerencias solo si no hay mensajes */}
        {mensajes.length === 0 && (
          <Box sx={{ ml: 7, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {SUGERENCIAS.map(s => (
              <Chip
                key={s}
                label={s}
                size="small"
                variant="outlined"
                onClick={() => enviar(s)}
                disabled={cargando}
                sx={{ cursor: 'pointer', fontSize: 12, '&:hover': { bgcolor: '#e8eaf6', borderColor: '#3949ab' } }}
              />
            ))}
          </Box>
        )}

        {mensajes.map((m, i) =>
          m.tipo === 'usuario'
            ? <BurbujaUsuario key={i} texto={m.texto} />
            : <BurbujiaIA key={i} msg={m} />
        )}

        {cargando && <BurbujaCargando />}

        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Paper elevation={0} sx={{ px: { xs: 2, md: 4 }, py: 1.5, bgcolor: '#fff', borderTop: '1px solid #e8eaf6' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Escríbeme algo..."
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            size="small"
            disabled={cargando}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f5f5f5' } }}
          />
          <Tooltip title="Enviar (Enter)">
            <span>
              <IconButton
                onClick={() => enviar()}
                disabled={!pregunta.trim() || cargando}
                sx={{
                  bgcolor: '#3949ab', color: '#fff', width: 42, height: 42,
                  '&:hover': { bgcolor: '#283593' },
                  '&:disabled': { bgcolor: '#e0e0e0' },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
}
