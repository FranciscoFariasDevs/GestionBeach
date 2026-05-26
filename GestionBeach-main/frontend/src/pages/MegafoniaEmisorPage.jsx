// src/pages/MegafoniaEmisorPage.jsx
// Consola de operadora — toggle (click = encender / click = apagar)
// Cada sucursal tiene una tecla de teclado asignada + botón de alarma individual
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Box, Typography, Chip, Tooltip, Fade,
  CircularProgress, Alert, AlertTitle,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import MicIcon from '@mui/icons-material/Mic';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationAddIcon from '@mui/icons-material/NotificationAdd';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import api from '../api/api';

// ─── Configuración ────────────────────────────────────────────────────────────
const getSocketURL = () => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5000';
  if (h === '192.168.100.150')               return 'http://192.168.100.150:5000';
  return 'https://api.beach.cl';
};

const getMimeType = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';

const canUseMic = () =>
  window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

// Teclas asignadas por índice de sucursal
const KEY_MAP = [
  '1','2','3','4','5','6','7','8','9','0',
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G',
];

const parsear = (nombre) => {
  const [calle = nombre, ciudad = ''] = nombre.split(',');
  return {
    calle:  calle.trim().length  > 22 ? calle.trim().slice(0, 21)  + '…' : calle.trim(),
    ciudad: ciudad.trim().length > 16 ? ciudad.trim().slice(0, 15) + '…' : ciudad.trim(),
  };
};

// ─── Animaciones ───────────────────────────────────────────────────────────────
const glow = keyframes`
  0%,100% { box-shadow:0 0 8px 2px rgba(34,197,94,0.6); }
  50%      { box-shadow:0 0 20px 6px rgba(34,197,94,0.9); }
`;
const alarmFlash = keyframes`
  0%,100% { background:#ef4444; box-shadow:0 0 10px rgba(239,68,68,0.7); }
  50%      { background:#dc2626; box-shadow:0 0 20px rgba(239,68,68,1); }
`;

// ─── Keycap SVG-style ─────────────────────────────────────────────────────────
const KeyCap = styled(Box, {
  shouldForwardProp: p => !['active','siren'].includes(p),
})(({ active, siren }) => ({
  width:         46,
  height:        46,
  flexShrink:    0,
  borderRadius:  7,
  display:       'flex',
  alignItems:    'center',
  justifyContent:'center',
  cursor:        'pointer',
  userSelect:    'none',
  fontFamily:    'monospace',
  fontWeight:    900,
  fontSize:      '1.1rem',
  transition:    'all 0.08s ease',
  position:      'relative',

  // Face del keycap
  background: active
    ? 'linear-gradient(180deg,#4ade80 0%,#16a34a 100%)'
    : siren
    ? 'linear-gradient(180deg,#fb923c 0%,#ea580c 100%)'
    : 'linear-gradient(180deg,#ffffff 0%,#dde3ea 100%)',

  color: (active || siren) ? '#fff' : '#1e293b',

  border: active
    ? '1px solid #14532d'
    : siren
    ? '1px solid #9a3412'
    : '1px solid #94a3b8',

  // Efecto 3D (sombra inferior = "pie" de la tecla)
  boxShadow: active
    ? `0 2px 0 #14532d, 0 0 14px rgba(34,197,94,0.5)`
    : siren
    ? `0 2px 0 #7c2d12, 0 0 10px rgba(234,88,12,0.4)`
    : `0 5px 0 #64748b, 0 6px 5px rgba(0,0,0,0.18)`,

  transform: (active || siren) ? 'translateY(3px)' : 'none',

  animation: active ? `${glow} 1.2s ease-in-out infinite` : 'none',

  // Pequeño reflejo en la parte superior
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 3, left: 4, right: 4, height: 8,
    borderRadius: '4px 4px 0 0',
    background: 'rgba(255,255,255,0.35)',
    pointerEvents: 'none',
  },
  '&:hover': !(active || siren) ? {
    background: 'linear-gradient(180deg,#f0f4ff 0%,#c8d3e0 100%)',
    borderColor: '#60a5fa',
    boxShadow: `0 5px 0 #3b5bdb, 0 6px 5px rgba(59,91,219,0.2)`,
  } : {},
}));

// ─── Fila de sucursal ──────────────────────────────────────────────────────────
const SucursalRow = styled(Box, {
  shouldForwardProp: p => !['active','disabled'].includes(p),
})(({ active, disabled }) => ({
  display:        'flex',
  alignItems:     'center',
  gap:            12,
  padding:        '10px 14px',
  borderRadius:   10,
  background:     active ? '#f0fdf4' : '#ffffff',
  border:         active ? '1.5px solid #86efac' : '1px solid #e2e8f0',
  boxShadow:      active
    ? '0 2px 12px rgba(34,197,94,0.18)'
    : '0 1px 4px rgba(0,0,0,0.06)',
  opacity:        disabled ? 0.45 : 1,
  transition:     'all 0.15s ease',
  cursor:         disabled ? 'not-allowed' : 'default',
}));

// ─── Botón de alarma por sucursal ──────────────────────────────────────────────
const AlarmBtn = styled(Box, {
  shouldForwardProp: p => !['active','disabled'].includes(p),
})(({ active, disabled }) => ({
  width:          34,
  height:         34,
  borderRadius:   8,
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  cursor:         (disabled && !active) ? 'not-allowed' : 'pointer',
  flexShrink:     0,
  background:     active ? '#ef4444' : '#fff5f5',
  border:         active ? '1px solid #dc2626' : '1px solid #fca5a5',
  transition:     'all 0.15s',
  animation:      active ? `${alarmFlash} 0.5s ease-in-out infinite` : 'none',
  '&:hover':      (!disabled && !active) ? {
    background: '#fee2e2',
    borderColor: '#f87171',
    transform: 'scale(1.1)',
  } : {},
}));

// ─── VU meter ─────────────────────────────────────────────────────────────────
const VUBar = styled(Box, {
  shouldForwardProp: p => p !== 'level',
})(({ level }) => ({
  height:     10,
  width:      `${level}%`,
  borderRadius: 5,
  minWidth:   2,
  transition: 'width 0.05s linear',
  background: level > 80
    ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
    : level > 50
    ? 'linear-gradient(90deg,#22c55e,#f59e0b)'
    : 'linear-gradient(90deg,#3b82f6,#22c55e)',
}));

const useVU = (analyserRef, active) => {
  const [level, setLevel] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!active || !analyserRef.current) { setLevel(0); return; }
    const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      analyserRef.current.getByteFrequencyData(buf);
      setLevel(Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length / 128) * 260));
    };
    tick();
    return () => cancelAnimationFrame(raf.current);
  }, [active, analyserRef]);
  return level;
};

// ─── Componente principal ──────────────────────────────────────────────────────
export default function MegafoniaEmisorPage() {
  const [sucursales,  setSucursales]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [connected,   setConnected]   = useState(false);
  const [activeSuc,   setActiveSuc]   = useState(null);  // voz activa
  const [sirenSuc,    setSirenSuc]    = useState(null);  // alarma activa (por sucursal)
  const [error,       setError]       = useState('');

  const socketRef    = useRef(null);
  const recorderRef  = useRef(null);
  const streamRef    = useRef(null);
  const audioCtxRef  = useRef(null);
  const analyserRef  = useRef(null);
  const sirenTimerRef = useRef(null);

  const vuLevel = useVU(analyserRef, !!activeSuc);

  // Enriquecer sucursales con clave de teclado
  const sucursalesConKey = useMemo(() =>
    sucursales.map((s, i) => ({ ...s, key: KEY_MAP[i] || '?' })),
  [sucursales]);

  // ─── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(`${getSocketURL()}/megafonia`, { transports: ['websocket'] });
    socketRef.current = s;
    s.on('connect',    () => { setConnected(true);  setError(''); });
    s.on('disconnect', () => { setConnected(false); _detenerVoz(); });
    return () => { _detenerTodo(); s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cargar sucursales ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/sucursales');
        setSucursales(Array.isArray(r.data) ? r.data : (r.data?.data || []));
      } catch {
        try {
          const r = await api.get('/facturas-xml/lista/sucursales');
          setSucursales(r.data?.data || []);
        } catch {}
      } finally { setLoading(false); }
    })();
  }, []);

  // ─── Detener voz activa ────────────────────────────────────────────────────
  const _detenerVoz = useCallback(() => {
    const sucId = activeSuc;
    try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { audioCtxRef.current?.close(); } catch {}
    streamRef.current   = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    if (sucId) socketRef.current?.emit('stop-transmission', { sucursalId: sucId });
    setActiveSuc(null);
  }, [activeSuc]);

  // ─── Detener alarma activa ─────────────────────────────────────────────────
  const _detenerSirena = useCallback((sucId) => {
    clearTimeout(sirenTimerRef.current);
    if (sucId) socketRef.current?.emit('alarm-stop', { sucursalId: sucId });
    setSirenSuc(null);
  }, []);

  const _detenerTodo = useCallback(() => {
    _detenerVoz();
    _detenerSirena(sirenSuc);
  }, [_detenerVoz, _detenerSirena, sirenSuc]);

  // ─── TOGGLE VOZ ───────────────────────────────────────────────────────────
  const toggleVoz = useCallback(async (sucId) => {
    if (!connected) return;

    // Si ya está activa esta sucursal → apagar
    if (activeSuc === sucId) { _detenerVoz(); return; }

    // Si hay otra activa → apagarla primero
    if (activeSuc) _detenerVoz();

    // Verificar micrófono
    if (!canUseMic()) {
      setError(
        `El micrófono requiere HTTPS. En Chrome abre: ` +
        `chrome://flags/#unsafely-treat-insecure-origin-as-secure → ` +
        `agrega ${window.location.origin} → reinicia Chrome.`
      );
      return;
    }
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // autoGainControl desactivado: lo manejamos nosotros con el GainNode
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);

      // ── Amplificación: +9.5 dB (gain 3.0 × señal original) ──────────────────
      const gainNode = ctx.createGain();
      gainNode.gain.value = 3.0;

      // ── Compresor dinámico: evita recorte (clipping) al amplificar ───────────
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;  // actúa desde -24 dB
      compressor.knee.value      = 30;   // transición suave
      compressor.ratio.value     = 12;   // compresión fuerte en picos
      compressor.attack.value    = 0.003;
      compressor.release.value   = 0.25;

      // ── Analyser para VU meter (ve señal ya amplificada) ─────────────────────
      const anl = ctx.createAnalyser(); anl.fftSize = 256;

      // ── Destino de grabación: stream procesado (con gain aplicado) ───────────
      const dest = ctx.createMediaStreamDestination();

      // Cadena: mic → gain → compressor → analyser
      //                              └──────────────→ dest (grabación)
      src.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(anl);
      compressor.connect(dest);
      analyserRef.current = anl;

      const mime = getMimeType();
      // Graba desde dest.stream (señal amplificada) — bitrate subido a 64 kbps
      const rec  = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 64000 });
      recorderRef.current = rec;

      let first = true;
      socketRef.current.emit('start-transmission', { sucursalId: sucId });

      rec.ondataavailable = async (e) => {
        if (!e.data.size) return;
        const buf = await e.data.arrayBuffer();
        socketRef.current.emit(first ? 'audio-init' : 'audio-chunk', buf);
        first = false;
      };
      rec.start(200);
      setActiveSuc(sucId);
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado — permite el acceso en la barra del navegador.'
          : `Error micrófono: ${err.message}`
      );
    }
  }, [connected, activeSuc, _detenerVoz]);

  // ─── ALARMA por sucursal ──────────────────────────────────────────────────
  // Envía alarm-start/alarm-stop al servidor; el receptor reproduce alarma.mp3
  // en loop localmente (sin transmisión de audio, funciona sin HTTPS).
  const toggleAlarma = useCallback((sucId) => {
    if (!connected) return;

    // Si ya hay alarma en esta sucursal → apagar
    if (sirenSuc === sucId) { _detenerSirena(sucId); return; }

    // Solo una operación a la vez
    if (activeSuc || sirenSuc) return;

    setError('');
    socketRef.current.emit('alarm-start', { sucursalId: sucId });
    setSirenSuc(sucId);
  }, [connected, activeSuc, sirenSuc, _detenerSirena]);

  // ─── Atajos de teclado físico ──────────────────────────────────────────────
  useEffect(() => {
    if (!sucursalesConKey.length) return;
    const handler = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const suc = sucursalesConKey.find(s => s.key === e.key.toUpperCase());
      if (suc) { e.preventDefault(); toggleVoz(suc.id.toString()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sucursalesConKey, toggleVoz]);

  const anyBusy = !!activeSuc || !!sirenSuc;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', p: { xs: 1.5, sm: 3 } }}>
      <Fade in>
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>

          {/* ── Header ── */}
          <Box sx={{
            bgcolor: '#1e293b', borderRadius: '14px 14px 0 0',
            px: 3, py: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Box>
              <Typography sx={{ color: '#f8fafc', fontWeight: 800, fontSize: '1.15rem' }}>
                Megafonía IP — Beach Market
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.68rem', letterSpacing: 2, fontFamily: 'monospace' }}>
                CLICK O TECLA PARA ACTIVAR · CLICK DE NUEVO PARA APAGAR
              </Typography>
            </Box>
            <Chip
              icon={connected ? <WifiIcon sx={{ fontSize: 14 }} /> : <WifiOffIcon sx={{ fontSize: 14 }} />}
              label={connected ? 'Conectado' : 'Sin señal'}
              size="small"
              sx={{
                bgcolor: connected ? '#dcfce7' : '#fee2e2',
                color:   connected ? '#166534' : '#991b1b',
                fontWeight: 700, border: 'none',
              }}
            />
          </Box>

          {/* ── Panel ── */}
          <Box sx={{
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            p: { xs: 2, sm: 3 },
          }}>

            {/* Aviso HTTPS */}
            {!canUseMic() && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 700 }}>Micrófono bloqueado (HTTP)</AlertTitle>
                Las <strong>alarmas sí funcionan</strong> sin HTTPS (audio sintético).<br />
                Para el micrófono: en Chrome ve a{' '}
                <code style={{ fontSize: '0.75rem' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>,
                agrega <code>{window.location.origin}</code> y reinicia.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Leyenda columnas */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: '46px 1fr 80px',
                  gap: 1.5,
                  px: 1, mb: 1,
                }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.62rem', fontFamily: 'monospace', letterSpacing: 2 }}>TECLA</Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.62rem', fontFamily: 'monospace', letterSpacing: 2 }}>SUCURSAL</Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.62rem', fontFamily: 'monospace', letterSpacing: 2, textAlign: 'center' }}>ALARMA</Typography>
                </Box>

                {/* Lista de sucursales */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {sucursalesConKey.map((suc) => {
                    const sucId  = suc.id.toString();
                    const isVoz  = activeSuc === sucId;
                    const isAlrm = sirenSuc === sucId;
                    const { calle, ciudad } = parsear(suc.nombre);

                    // Bloquear si OTRA sucursal tiene algo activo
                    const vozBloq   = !isVoz  && anyBusy;
                    const alrmBloq  = !isAlrm && anyBusy;

                    return (
                      <SucursalRow key={suc.id} active={isVoz ? 1 : 0} disabled={vozBloq ? 1 : 0}>

                        {/* KeyCap — click o tecla física */}
                        <Tooltip title={`Tecla ${suc.key} — click para ${isVoz ? 'apagar' : 'activar'}`} arrow>
                          <KeyCap
                            active={isVoz ? 1 : 0}
                            siren={isAlrm ? 1 : 0}
                            onClick={() => !vozBloq && toggleVoz(sucId)}
                          >
                            {suc.key}
                          </KeyCap>
                        </Tooltip>

                        {/* Info sucursal */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* LED */}
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              bgcolor: isVoz ? '#22c55e' : isAlrm ? '#ef4444' : '#cbd5e1',
                              boxShadow: isVoz
                                ? '0 0 6px 2px rgba(34,197,94,0.7)'
                                : isAlrm
                                ? '0 0 6px 2px rgba(239,68,68,0.7)'
                                : 'none',
                            }} />
                            <Typography
                              noWrap
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: isVoz ? '#15803d' : '#1e293b',
                              }}
                            >
                              {calle}
                            </Typography>
                            {isVoz && (
                              <Chip
                                icon={<MicIcon sx={{ fontSize: 11 }} />}
                                label="EN AIRE"
                                size="small"
                                sx={{
                                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                                  bgcolor: '#dcfce7', color: '#15803d',
                                  '& .MuiChip-label': { px: 0.8 },
                                }}
                              />
                            )}
                            {isAlrm && (
                              <Chip
                                icon={<NotificationsActiveIcon sx={{ fontSize: 11 }} />}
                                label="ALARMA"
                                size="small"
                                sx={{
                                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                                  bgcolor: '#fee2e2', color: '#dc2626',
                                  '& .MuiChip-label': { px: 0.8 },
                                }}
                              />
                            )}
                          </Box>
                          {ciudad && (
                            <Typography sx={{ fontSize: '0.72rem', color: '#64748b', pl: 2 }}>
                              {ciudad}
                            </Typography>
                          )}
                        </Box>

                        {/* Botón alarma individual */}
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Tooltip
                            title={
                              isAlrm ? 'Apagar alarma'
                              : alrmBloq ? 'Canal ocupado'
                              : `Enviar alarma a ${calle}`
                            }
                            arrow
                          >
                            <AlarmBtn
                              active={isAlrm ? 1 : 0}
                              disabled={alrmBloq ? 1 : 0}
                              onClick={() => !alrmBloq && toggleAlarma(sucId)}
                            >
                              {isAlrm
                                ? <NotificationsActiveIcon sx={{ fontSize: 16, color: '#fff' }} />
                                : <NotificationAddIcon sx={{ fontSize: 16, color: alrmBloq ? '#cbd5e1' : '#ef4444' }} />
                              }
                            </AlarmBtn>
                          </Tooltip>
                        </Box>

                      </SucursalRow>
                    );
                  })}
                </Box>

                {/* ── Barra de estado inferior ── */}
                <Box sx={{
                  mt: 3, p: 2,
                  bgcolor: '#e2e8f0',
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
                }}>
                  {/* VU meter */}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontSize: '0.62rem', color: '#475569', fontFamily: 'monospace', letterSpacing: 2, mb: 0.5 }}>
                      NIVEL AUDIO
                    </Typography>
                    <Box sx={{ bgcolor: '#94a3b8', borderRadius: 5, height: 10, overflow: 'hidden' }}>
                      <VUBar level={vuLevel} />
                    </Box>
                  </Box>

                  {/* Estado general */}
                  <Box>
                    {activeSuc ? (
                      <Chip
                        icon={<MicIcon />}
                        label={`Transmitiendo → ${sucursalesConKey.find(s => s.id.toString() === activeSuc)?.nombre?.split(',')[0] || ''}`}
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700 }}
                      />
                    ) : sirenSuc ? (
                      <Chip
                        icon={<NotificationsActiveIcon />}
                        label={`Alarma → ${sucursalesConKey.find(s => s.id.toString() === sirenSuc)?.nombre?.split(',')[0] || ''}`}
                        size="small"
                        sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        EN ESPERA
                      </Typography>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </Box>

          {/* ── Footer ── */}
          <Box sx={{
            bgcolor: '#1e293b', borderRadius: '0 0 14px 14px',
            px: 3, py: 1.5,
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
          }}>
            <Typography sx={{ color: '#475569', fontSize: '0.62rem', fontFamily: 'monospace', letterSpacing: 1 }}>
              {sucursalesConKey.length} CANALES · TECLAS 1-9, 0, Q-P, A-G
            </Typography>
            <Typography sx={{ color: '#475569', fontSize: '0.62rem', fontFamily: 'monospace' }}>
              🔔 ALARMA = AUDIO SINTÉTICO (SIN HTTPS) · 🎙 VOZ = REQUIERE HTTPS
            </Typography>
          </Box>

        </Box>
      </Fade>
    </Box>
  );
}
