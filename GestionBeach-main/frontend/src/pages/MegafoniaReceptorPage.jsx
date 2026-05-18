// src/pages/MegafoniaReceptorPage.jsx
// Vista del receptor (sucursal) que escucha el audio en tiempo real.
//
// Arquitectura de reproducción:
//   Socket.io → cola de ArrayBuffers → SourceBuffer (MSE, mode=sequence)
//   → HTMLAudioElement
//
// Por qué MSE en lugar de Web Audio API decodeAudioData:
//   Los chunks de MediaRecorder con timeslice NO son archivos independientes:
//   solo el primer chunk contiene el EBML header (init segment). Los chunks
//   posteriores son media segments WebM. MSE los acepta nativamente en
//   secuencia, lo que da reproducción fluida sin gaps.
//
// Gestión de latencia:
//   Si el buffer acumulado supera MAX_BUFFER_SECONDS, se adelanta currentTime
//   para "saltar" al frente y mantener latencia baja.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Box, Button, Typography, Chip, Stack, Paper, Fade,
  useTheme, alpha, keyframes, CircularProgress, TextField, InputAdornment,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RadioIcon from '@mui/icons-material/Radio';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';
import api from '../api/api';

// ─── Configuración ────────────────────────────────────────────────────────────
const MIME_TYPE          = 'audio/webm;codecs=opus';
const MAX_BUFFER_SECONDS = 2.0; // saltar si el buffer supera esto

const getSocketURL = () => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:5000';
  if (h === '192.168.100.150')               return 'http://192.168.100.150:5000';
  return 'https://api.beach.cl';
};

// ─── Animaciones ──────────────────────────────────────────────────────────────
const pulseRing = keyframes`
  0%   { transform: scale(0.9); opacity: 0.8; }
  50%  { transform: scale(1.12); opacity: 0.35; }
  100% { transform: scale(0.9); opacity: 0.8; }
`;

const soundWave = keyframes`
  0%   { transform: scaleY(0.3); }
  50%  { transform: scaleY(1.0); }
  100% { transform: scaleY(0.3); }
`;

const PulseRing = styled(Box)(({ theme }) => ({
  position: 'absolute',
  borderRadius: '50%',
  border: `3px solid ${theme.palette.primary.main}`,
  animation: `${pulseRing} 1.4s ease-in-out infinite`,
}));

// ─── Barras animadas de audio ─────────────────────────────────────────────────
const AudioBars = () => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: 40 }}>
    {[0.3, 0.5, 1, 0.7, 0.4, 0.9, 0.6, 0.3, 0.8, 0.5].map((delay, i) => (
      <Box
        key={i}
        sx={{
          width: 4,
          height: '100%',
          bgcolor: 'primary.main',
          borderRadius: 1,
          animation: `${soundWave} ${0.7 + delay * 0.6}s ease-in-out infinite`,
          animationDelay: `${delay * 0.3}s`,
        }}
      />
    ))}
  </Stack>
);

// ─── Utilidad: normalizar dato binario de socket a ArrayBuffer ─────────────────
const toArrayBuffer = (data) => {
  if (data instanceof ArrayBuffer) return data;
  if (data?.buffer instanceof ArrayBuffer) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  return new Uint8Array(data).buffer;
};

// ─── Selector de sucursal (cuando no se conoce el ID) ─────────────────────────
const SucursalSelector = () => {
  const navigate = useNavigate();
  const [sucursales, setSucursales] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState('');

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

  const filtradas = sucursales.filter(s =>
    s.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#f1f5f9',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', pt: { xs: 4, sm: 8 }, px: 2,
    }}>
      <Fade in>
        <Box sx={{ width: '100%', maxWidth: 520 }}>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
              bgcolor: '#1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RadioIcon sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#1e293b">
              Megafonía IP
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Selecciona tu sucursal para activar el parlante
            </Typography>
          </Box>

          {/* Buscador */}
          <TextField
            fullWidth
            placeholder="Buscar sucursal…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            size="small"
            sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Lista */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filtradas.length === 0 && (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No se encontraron sucursales
                </Typography>
              )}
              {filtradas.map(suc => {
                const [calle = suc.nombre, ciudad = ''] = suc.nombre.split(',');
                return (
                  <Paper
                    key={suc.id}
                    elevation={0}
                    onClick={() => navigate(`/megafonia/receptor/${suc.id}`)}
                    sx={{
                      p: '14px 18px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 2,
                      transition: 'all 0.13s',
                      '&:hover': {
                        borderColor: '#3b82f6',
                        bgcolor: '#eff6ff',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      bgcolor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <StorefrontIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700} fontSize="0.9rem" noWrap color="#1e293b">
                        {calle.trim()}
                      </Typography>
                      {ciudad && (
                        <Typography fontSize="0.75rem" color="text.secondary" noWrap>
                          {ciudad.trim()}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ ml: 'auto', fontSize: '0.7rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                      #{suc.id}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

// ─── Receptor activo (con hooks — solo se monta cuando hay sucursalId) ────────
const ReceptorActivo = ({ sucursalId }) => {
  const theme = useTheme();

  const [activated,   setActivated]   = useState(false);
  const [connected,   setConnected]   = useState(false);
  const [receiving,   setReceiving]   = useState(false);
  const [error,       setError]       = useState('');

  // Refs para el pipeline MSE — ninguno causa re-render
  const audioRef        = useRef(null);
  const mediaSourceRef  = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef        = useRef([]);       // ArrayBuffer pendientes de appendBuffer
  const blobUrlRef      = useRef(null);
  const sourceOpenedRef = useRef(false);    // true cuando el SourceBuffer está listo
  const socketRef       = useRef(null);
  const alarmAudioRef   = useRef(null);     // Audio element para alarma.mp3

  // ─── Procesar cola → appendBuffer ───────────────────────────────────────────
  const processQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating || queueRef.current.length === 0) return;

    const chunk = queueRef.current.shift();
    try {
      sb.appendBuffer(chunk);
    } catch (err) {
      // Puede pasar si el MediaSource se cerró (nueva transmisión llegando)
      console.warn('[Receptor] appendBuffer ignorado:', err.message);
    }
  }, []);

  // ─── Crear MediaSource + SourceBuffer frescos ────────────────────────────────
  // Se llama al inicio de cada sesión PTT (transmission-start).
  const resetMediaSource = useCallback(() => {
    // Cerrar el MediaSource anterior de forma ordenada para evitar que
    // sus SourceBuffers sigan disparando eventos con referencias obsoletas.
    const oldMs = mediaSourceRef.current;
    if (oldMs && oldMs.readyState === 'open') {
      try { oldMs.endOfStream(); } catch {}
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    queueRef.current        = [];
    sourceBufferRef.current = null;
    sourceOpenedRef.current = false;

    const ms = new MediaSource();
    mediaSourceRef.current = ms;

    const url = URL.createObjectURL(ms);
    blobUrlRef.current = url;

    // Asignar la nueva fuente al elemento <audio>
    const audio = audioRef.current;
    audio.src   = url;

    ms.addEventListener('sourceopen', () => {
      if (!MediaSource.isTypeSupported(MIME_TYPE)) {
        setError('Tu navegador no soporta WebM/Opus. Usa Google Chrome.');
        return;
      }

      try {
        const sb = ms.addSourceBuffer(MIME_TYPE);
        // 'sequence' es fundamental: indica al navegador que los segmentos
        // llegan en orden y no necesitan timestamps explícitos.
        sb.mode = 'sequence';
        sourceBufferRef.current = sb;
        sourceOpenedRef.current = true;

        sb.addEventListener('updateend', () => {
          // Guard: si este SourceBuffer ya no es el activo (nueva transmisión
          // llamó a resetMediaSource mientras este sb aún tenía un appendBuffer
          // en vuelo), ignorar completamente para evitar el InvalidStateError.
          if (sourceBufferRef.current !== sb) return;

          processQueue();

          // Gestión de latencia: si el buffer acumulado supera el umbral,
          // saltamos al frente para mantener la conversación en tiempo real.
          const audio = audioRef.current;
          try {
            if (!audio || !sb.buffered.length) return;

            const bufferedEnd = sb.buffered.end(sb.buffered.length - 1);
            const lag         = bufferedEnd - audio.currentTime;

            if (lag > MAX_BUFFER_SECONDS) {
              audio.currentTime = bufferedEnd - 0.05;
            }

            // Arrancar playback si estaba pausado y ya hay datos suficientes
            if (audio.paused && audio.readyState >= 2) {
              audio.play().catch(() => {});
            }

            // Limpiar el buffer ya reproducido para liberar memoria
            if (!sb.updating && audio.currentTime > 1) {
              try { sb.remove(0, audio.currentTime - 0.5); } catch {}
            }
          } catch {
            // SourceBuffer removido del MediaSource — ignorar silenciosamente
          }
        });

        sb.addEventListener('error', (e) => {
          console.error('[Receptor] SourceBuffer error:', e);
        });

        // Vaciar la cola que pudo llegar antes de sourceopen
        processQueue();

      } catch (err) {
        console.error('[Receptor] No se pudo crear SourceBuffer:', err);
        setError(`Error de SourceBuffer: ${err.message}`);
      }
    }, { once: true });

    audio.load();
  }, [processQueue]);

  // ─── Encolar un chunk recibido ────────────────────────────────────────────
  const enqueue = useCallback((data) => {
    queueRef.current.push(toArrayBuffer(data));
    if (sourceOpenedRef.current) processQueue();
  }, [processQueue]);

  // ─── Socket.io ───────────────────────────────────────────────────────────
  const initSocket = useCallback(() => {
    const socket = io(`${getSocketURL()}/megafonia`, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      socket.emit('join-sucursal', { sucursalId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setReceiving(false);
    });

    // Nueva sesión PTT → reset del pipeline MSE
    socket.on('transmission-start', () => {
      setReceiving(true);
      setError('');
      resetMediaSource();
    });

    // Segmento de inicialización (EBML header) — llega justo tras transmission-start
    socket.on('audio-init', (data) => {
      enqueue(data);
    });

    // Fragmentos de audio normales
    socket.on('audio-chunk', (data) => {
      enqueue(data);
    });

    // La transmisión terminó — dejar que el audio drene naturalmente
    socket.on('transmission-end', () => {
      setReceiving(false);
    });

    // Alarma: reproducir alarma.mp3 en loop con velocidad aumentada
    socket.on('alarm-start', () => {
      _stopAlarm();
      const a = new Audio('/alarma.mp3');
      a.playbackRate = 2.2;
      a.loop = true;
      a.volume = 1.0;
      a.play().catch(() => {});
      alarmAudioRef.current = a;
      setReceiving(true);
    });

    // Alarma: detener reproducción
    socket.on('alarm-stop', () => {
      _stopAlarm();
      setReceiving(false);
    });

  }, [sucursalId, resetMediaSource, enqueue]);

  // ─── Detener alarma.mp3 si está sonando ──────────────────────────────────
  const _stopAlarm = useCallback(() => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.src = '';
      alarmAudioRef.current = null;
    }
  }, []);

  // ─── Activar parlante (primer click del usuario → desbloquea autoplay) ────
  const handleActivate = useCallback(() => {
    setActivated(true);

    // El click garantiza que el navegador permita autoplay en audioRef
    const audio = audioRef.current;
    audio.volume = 1.0;
    audio.muted  = false;

    initSocket();
  }, [initSocket]);

  // ─── Cleanup al desmontar ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      _stopAlarm();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display:   'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      {/* Elemento de audio oculto — toda la lógica va por MSE */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      <Fade in>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Icono con anillos pulsantes cuando recibe */}
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            {receiving && (
              <>
                <PulseRing sx={{ width: 96,  height: 96,  animationDelay: '0s'    }} />
                <PulseRing sx={{ width: 130, height: 130, animationDelay: '0.45s' }} />
                <PulseRing sx={{ width: 164, height: 164, animationDelay: '0.9s'  }} />
              </>
            )}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: receiving
                  ? alpha(theme.palette.primary.main, 0.15)
                  : alpha(theme.palette.text.disabled, 0.08),
                border: `2px solid ${receiving ? theme.palette.primary.main : theme.palette.divider}`,
                transition: 'all 0.4s ease',
              }}
            >
              {receiving
                ? <VolumeUpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                : <VolumeOffIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
              }
            </Box>
          </Box>

          {/* Título */}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Megafonía IP
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sucursal #{sucursalId}
          </Typography>

          {!activated ? (
            /* ── Pantalla inicial: cumplir política autoplay del navegador ── */
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Pulsa el botón para activar el parlante.
                Recibirás el audio automáticamente cuando alguien transmita.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<RadioIcon />}
                onClick={handleActivate}
                sx={{
                  py: 2,
                  px: 5,
                  borderRadius: 50,
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                Activar Parlante
              </Button>
            </>
          ) : (
            /* ── Pantalla de escucha activa ── */
            <>
              {/* Estado de conexión */}
              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
                <Chip
                  icon={connected ? <WifiIcon /> : <WifiOffIcon />}
                  label={connected ? 'Conectado' : 'Reconectando…'}
                  color={connected ? 'success' : 'warning'}
                  variant="outlined"
                  size="small"
                />
              </Stack>

              {/* Estado de audio */}
              <Box sx={{ minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                {receiving ? (
                  <AudioBars />
                ) : (
                  <Typography variant="h6" color="text.disabled" fontWeight={500}>
                    En espera…
                  </Typography>
                )}
              </Box>

              <Typography
                variant="body2"
                color={receiving ? 'primary.main' : 'text.disabled'}
                fontWeight={receiving ? 700 : 400}
                sx={{ transition: 'color 0.3s' }}
              >
                {receiving ? 'Recibiendo transmisión' : 'Sin transmisión activa'}
              </Typography>
            </>
          )}

          {/* Error */}
          {error && (
            <Box
              sx={{
                mt: 3, p: 2, borderRadius: 2,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${theme.palette.error.light}`,
              }}
            >
              <Typography variant="body2" color="error.main">
                {error}
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

// ─── Wrapper principal — decide qué mostrar según si hay sucursalId ───────────
const MegafoniaReceptorPage = () => {
  const { sucursalId } = useParams();
  return sucursalId ? <ReceptorActivo sucursalId={sucursalId} /> : <SucursalSelector />;
};

export default MegafoniaReceptorPage;
