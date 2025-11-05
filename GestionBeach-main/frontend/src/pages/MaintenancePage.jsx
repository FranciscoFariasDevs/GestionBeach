import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from '@mui/material';
import { NotificationsActive, Build, AccessTime } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import api from '../api/api';
import { useSnackbar } from 'notistack';

// Animaciones
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const swing = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const MaintenancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [isRinging, setIsRinging] = useState(false);
  const [ringCount, setRingCount] = useState(0);
  const audioRef = useRef(null);

  // Función para tocar el timbre
  const handleRing = async () => {
    if (isRinging) return;

    setIsRinging(true);
    setRingCount(prev => prev + 1);

    // Reproducir sonido (puedes cambiar esto por un archivo de audio real)
    try {
      // Crear un sonido de timbre simple con Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Primer tono
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.value = 800;
      gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.5);

      // Segundo tono
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        oscillator2.frequency.value = 600;
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 100);

      enqueueSnackbar('¡Timbre tocado! Espera un momento...', { variant: 'info' });

      // Enviar notificación al servidor
      try {
        await api.post('/maintenance/ring', {
          timestamp: new Date().toISOString(),
          message: 'Alguien está tocando el timbre'
        });
      } catch (error) {
        console.error('Error al notificar el timbre:', error);
      }

    } catch (error) {
      console.error('Error al reproducir sonido:', error);
    }

    setTimeout(() => {
      setIsRinging(false);
    }, 2000);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: 4,
      }}
    >
      {/* Efecto de fondo animado */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1), transparent 50%)',
          animation: `${float} 10s ease-in-out infinite`,
          zIndex: 0,
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.98)',
            borderRadius: 4,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <Stack spacing={4} alignItems="center">
              {/* Icono de construcción animado */}
              <Box
                sx={{
                  animation: `${swing} 2s ease-in-out infinite`,
                }}
              >
                <Build
                  sx={{
                    fontSize: { xs: 80, md: 100 },
                    color: '#667eea',
                    filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
                  }}
                />
              </Box>

              {/* Título */}
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '2rem', md: '3rem' },
                }}
              >
                Página en Mantenimiento
              </Typography>

              {/* Mensaje */}
              <Typography
                variant="h6"
                sx={{
                  textAlign: 'center',
                  color: '#666',
                  fontWeight: 500,
                  fontSize: { xs: '1rem', md: '1.3rem' },
                  maxWidth: 600,
                }}
              >
                Estamos trabajando para mejorar tu experiencia.
                <br />
                Presiona el timbre y te abriremos el servicio en breve.
              </Typography>

              {/* Botón del timbre */}
              <Button
                variant="contained"
                size="large"
                onClick={handleRing}
                disabled={isRinging}
                startIcon={
                  isRinging ? (
                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                  ) : (
                    <NotificationsActive sx={{ fontSize: 40 }} />
                  )
                }
                sx={{
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FFD700 100%)',
                  color: '#fff',
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  padding: { xs: '15px 40px', md: '20px 60px' },
                  borderRadius: 50,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  boxShadow: '0 10px 30px rgba(255, 107, 107, 0.4)',
                  animation: isRinging ? `${pulse} 0.5s ease-in-out infinite` : `${pulse} 2s ease-in-out infinite`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05) translateY(-5px)',
                    boxShadow: '0 15px 40px rgba(255, 107, 107, 0.6)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                  },
                }}
              >
                {isRinging ? 'Timbrando...' : '🔔 Tocar Timbre'}
              </Button>

              {/* Contador de timbrazos */}
              {ringCount > 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: '#999',
                    fontSize: '0.9rem',
                  }}
                >
                  Timbrazos: {ringCount}
                </Typography>
              )}

              {/* Información adicional */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ mt: 4, width: '100%', justifyContent: 'center' }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: 'center',
                  }}
                >
                  <AccessTime sx={{ color: '#667eea', fontSize: 28 }} />
                  <Typography variant="body1" sx={{ color: '#666', fontWeight: 600 }}>
                    Tiempo estimado: 5-10 min
                  </Typography>
                </Box>
              </Stack>

              {/* Nota */}
              <Typography
                variant="caption"
                sx={{
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '0.85rem',
                  mt: 3,
                }}
              >
                Gracias por tu paciencia. Pronto volveremos a estar operativos.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default MaintenancePage;
