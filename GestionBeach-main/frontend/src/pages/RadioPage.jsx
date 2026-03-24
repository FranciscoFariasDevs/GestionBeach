// frontend/src/pages/RadioPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Slider, Tooltip, CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Refresh as RefreshIcon,
  Radio as RadioIcon,
} from '@mui/icons-material';
import videoSrc from '../video.mp4';

const STREAM_URL = 'https://streaming01.xhost.cl/8206/stream';

// Tiempo máximo esperando buffer antes de reconectar (3 seg)
const STALL_TIMEOUT_MS = 3000;
// Delay entre intentos de reconexión (evita martillar el servidor)
const RECONNECT_DELAY_MS = 800;

const RadioPage = () => {
  const navigate = useNavigate();
  const audioRef          = useRef(null);
  const stallTimerRef     = useRef(null);
  const isReconnectingRef = useRef(false);
  const userPausedRef     = useRef(false); // true SOLO cuando el usuario presionó pausa

  const [isPlaying,      setIsPlaying]      = useState(false);
  const [volume,         setVolume]         = useState(0.8);
  const [isMuted,        setIsMuted]        = useState(false);
  const [status,         setStatus]         = useState('conectando');
  // 'conectando' | 'reproduciendo' | 'reconectando' | 'pausado'
  const [reconnectCount, setReconnectCount] = useState(0);

  // ── Construir URL con cache-busting para forzar nueva conexión al servidor ─
  const buildUrl = () => `${STREAM_URL}?_cb=${Date.now()}`;

  // ── Limpiar temporizador de stall ────────────────────────────────────────
  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  // ── Conectar / reconectar el stream ──────────────────────────────────────
  // Esta función es la única que toca el <audio>. Se llama:
  //   · Al montar la página (isReconnect=false)
  //   · Ante cualquier corte detectado  (isReconnect=true)
  //   · Al presionar Play después de pausa (isReconnect=false)
  const connectStream = useCallback((isReconnect = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isReconnectingRef.current) return; // ya hay un intento en vuelo

    clearStallTimer();
    userPausedRef.current = false;
    isReconnectingRef.current = true;

    if (isReconnect) {
      setReconnectCount(prev => prev + 1);
      setStatus('reconectando');
    } else {
      setStatus('conectando');
    }

    // Soltar completamente la conexión actual
    audio.pause();
    audio.src = '';
    audio.load();

    setTimeout(() => {
      if (!audioRef.current) { isReconnectingRef.current = false; return; }
      const a = audioRef.current;
      a.src    = buildUrl();
      a.volume = volume;
      a.muted  = isMuted;
      a.load();
      a.play()
        .then(() => {
          isReconnectingRef.current = false;
          setIsPlaying(true);
          setStatus('reproduciendo');
        })
        .catch(() => {
          // play() rechazado (sin señal, política del navegador, etc.)
          // → programar otro intento en seguida
          isReconnectingRef.current = false;
          setIsPlaying(false);
          setStatus('reconectando');
          if (!userPausedRef.current) {
            setTimeout(() => connectStream(true), RECONNECT_DELAY_MS);
          }
        });
    }, RECONNECT_DELAY_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearStallTimer, volume, isMuted]);

  // ── Temporizador de stall: si en STALL_TIMEOUT_MS no hubo 'playing' → reconectar
  const startStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      if (!isReconnectingRef.current && !userPausedRef.current) {
        console.log('[Radio] Stall timeout → reconectando');
        connectStream(true);
      }
    }, STALL_TIMEOUT_MS);
  }, [clearStallTimer, connectStream]);

  // ── Montar: arrancar inmediatamente ──────────────────────────────────────
  useEffect(() => {
    connectStream(false);
    return () => {
      clearStallTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listeners del elemento <audio> ───────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Está sonando → limpiar timers y actualizar UI
    const onPlaying = () => {
      clearStallTimer();
      isReconnectingRef.current = false;
      setIsPlaying(true);
      setStatus('reproduciendo');
    };

    const onPause = () => {
      if (!isReconnectingRef.current) {
        setIsPlaying(false);
        if (userPausedRef.current) setStatus('pausado');
      }
    };

    // Buffer vacío: arrancar temporizador corto
    const onWaiting = () => {
      if (!isReconnectingRef.current && !userPausedRef.current) {
        setStatus('conectando');
        startStallTimer();
      }
    };

    // El navegador dejó de recibir datos → reconectar casi de inmediato
    const onStalled = () => {
      if (!isReconnectingRef.current && !userPausedRef.current) {
        setStatus('reconectando');
        // Dar 1 s de gracia por si es un hipo transitorio
        clearStallTimer();
        stallTimerRef.current = setTimeout(() => {
          if (!isReconnectingRef.current && !userPausedRef.current) {
            connectStream(true);
          }
        }, 1000);
      }
    };

    // Error de red → reconectar de inmediato
    const onError = () => {
      if (!isReconnectingRef.current && !userPausedRef.current) {
        setStatus('reconectando');
        connectStream(true);
      }
    };

    // Stream terminó inesperadamente → reconectar
    const onEnded = () => {
      if (!userPausedRef.current) connectStream(true);
    };

    audio.addEventListener('playing',  onPlaying);
    audio.addEventListener('pause',    onPause);
    audio.addEventListener('waiting',  onWaiting);
    audio.addEventListener('stalled',  onStalled);
    audio.addEventListener('error',    onError);
    audio.addEventListener('ended',    onEnded);

    return () => {
      audio.removeEventListener('playing',  onPlaying);
      audio.removeEventListener('pause',    onPause);
      audio.removeEventListener('waiting',  onWaiting);
      audio.removeEventListener('stalled',  onStalled);
      audio.removeEventListener('error',    onError);
      audio.removeEventListener('ended',    onEnded);
    };
  }, [clearStallTimer, startStallTimer, connectStream]);

  // ── Watchdog cada 4 s: si currentTime no avanza → reconectar ─────────────
  // Para streams Icecast/Shoutcast currentTime sí avanza en la mayoría de
  // navegadores. Un solo ciclo sin avance es suficiente para detectar el cuelgue.
  useEffect(() => {
    let lastTime = -1;

    const watchdog = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused || isReconnectingRef.current || userPausedRef.current) {
        lastTime = -1;
        return;
      }
      const ct = audio.currentTime;
      if (lastTime !== -1 && ct === lastTime) {
        console.log('[Radio] Watchdog: currentTime bloqueado → reconectando');
        lastTime = -1;
        connectStream(true);
      } else {
        lastTime = ct;
      }
    }, 4000);

    return () => clearInterval(watchdog);
  }, [connectStream]);

  // ── Latido cada 5 s: si debería sonar y no suena → reconectar ────────────
  // Cubre casos donde ningún evento del <audio> se disparó (bug de navegador).
  useEffect(() => {
    const heartbeat = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || isReconnectingRef.current || userPausedRef.current) return;
      if (audio.paused) {
        console.log('[Radio] Heartbeat: audio parado sin querer el usuario → reconectando');
        connectStream(true);
      }
    }, 5000);

    return () => clearInterval(heartbeat);
  }, [connectStream]);

  // ── Controles de UI ──────────────────────────────────────────────────────
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      userPausedRef.current = true;
      clearStallTimer();
      audio.pause();
      setIsPlaying(false);
      setStatus('pausado');
    } else {
      connectStream(false);
    }
  };

  const handleVolumeChange = (_, newValue) => {
    const v = newValue / 100;
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    if (v > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  const handleManualReconnect = () => connectStream(true);

  // ── Config visual por estado ─────────────────────────────────────────────
  const statusConfig = {
    conectando:    { label: 'Conectando...',   color: '#FFA726', dot: '#FF9800', spin: true  },
    reproduciendo: { label: 'En vivo',         color: '#66BB6A', dot: '#4CAF50', spin: false },
    reconectando:  { label: 'Reconectando...', color: '#FFA726', dot: '#FF9800', spin: true  },
    error:         { label: 'Sin señal',       color: '#EF5350', dot: '#F44336', spin: false },
    pausado:       { label: 'Pausado',         color: '#90A4AE', dot: '#78909C', spin: false },
  };
  const cfg = statusConfig[status] || statusConfig.conectando;

  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', bgcolor: '#000' }}>

      {/* ── Video de fondo — centrado, tamaño reducido ───────────────────── */}
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <video
          autoPlay muted loop playsInline
          style={{
            width: '70%', height: '70%',
            objectFit: 'cover',
            opacity: 0.75,
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      </Box>

      {/* Overlay suave solo alrededor del video */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%)',
      }} />

      {/* Audio oculto */}
      <audio ref={audioRef} preload="none" />

      {/* ── Botón volver ─────────────────────────────────────────────────── */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
        <Tooltip title="Volver al login">
          <IconButton
            onClick={() => navigate('/login')}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.15)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
            }}
          >
            <BackIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Contenido centrado ───────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', zIndex: 5,
        height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2.5, px: 2,
      }}>

        {/* Icono de radio con animación de ondas cuando suena */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {status === 'reproduciendo' && [1.6, 2.2, 2.8].map((scale, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                width: 80, height: 80,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)',
                animation: `wave ${1.4 + i * 0.6}s ease-out infinite`,
                '@keyframes wave': {
                  '0%':   { opacity: 0.7, transform: 'scale(1)' },
                  '100%': { opacity: 0,   transform: `scale(${scale})` },
                },
              }}
            />
          ))}
          <RadioIcon sx={{
            fontSize: 80, color: 'white',
            filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.35))',
            position: 'relative', zIndex: 1,
          }} />
        </Box>

        {/* Nombre de la emisora */}
        <Typography variant="h4" fontWeight={700} color="white" align="center"
          sx={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)', letterSpacing: 1 }}
        >
          Beach Radio
        </Typography>

        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.7rem' }}>
          107.8 FM — En vivo
        </Typography>

        {/* Indicador de estado */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Box sx={{
            width: 9, height: 9, borderRadius: '50%',
            bgcolor: cfg.dot,
            boxShadow: `0 0 10px ${cfg.dot}`,
            animation: status === 'reproduciendo'
              ? 'pulse 1.8s ease-in-out infinite'
              : 'none',
            '@keyframes pulse': {
              '0%,100%': { opacity: 1, transform: 'scale(1)' },
              '50%':     { opacity: 0.4, transform: 'scale(0.8)' },
            },
          }} />
          <Typography variant="body2" sx={{ color: cfg.color, fontWeight: 600 }}>
            {cfg.label}
          </Typography>
          {cfg.spin && <CircularProgress size={13} sx={{ color: cfg.color }} />}
        </Box>

        {/* Controles principales */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          {/* Mute */}
          <Tooltip title={isMuted ? 'Activar sonido' : 'Silenciar'}>
            <IconButton onClick={handleMute} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {isMuted ? <MuteIcon /> : <VolumeIcon />}
            </IconButton>
          </Tooltip>

          {/* Play / Pause */}
          <IconButton
            onClick={handlePlayPause}
            sx={{
              width: 72, height: 72,
              bgcolor: 'white', color: '#1a1a2e',
              boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)', transform: 'scale(1.07)' },
            }}
          >
            {isPlaying
              ? <PauseIcon sx={{ fontSize: 34 }} />
              : <PlayIcon  sx={{ fontSize: 34 }} />
            }
          </IconButton>

          {/* Reconectar manualmente */}
          <Tooltip title="Reconectar señal">
            <IconButton onClick={handleManualReconnect} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Control de volumen */}
        <Box sx={{ width: 230, display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
          <VolumeIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} />
          <Slider
            value={isMuted ? 0 : Math.round(volume * 100)}
            onChange={handleVolumeChange}
            size="small"
            sx={{
              color: 'white',
              '& .MuiSlider-thumb':  { boxShadow: '0 2px 8px rgba(0,0,0,0.4)', width: 14, height: 14 },
              '& .MuiSlider-track':  { bgcolor: 'white', border: 'none' },
              '& .MuiSlider-rail':   { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          />
        </Box>

        {/* Contador de reconexiones (informativo) */}
        {reconnectCount > 0 && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
            Reconexiones automáticas: {reconnectCount}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default RadioPage;
