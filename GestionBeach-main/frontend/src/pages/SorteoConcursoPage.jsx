import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Fade,
  Zoom,
  Grid,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  EmojiEvents,
  Refresh,
  PlayArrow,
  Close,
  Celebration,
  Person,
  Phone,
  Email,
  Receipt,
  Stars,
  LocalActivity,
  Image as ImageIcon
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';
import api from '../api/api';
import { useSnackbar } from 'notistack';

// Animación de scroll infinito
const scrollAnimation = keyframes`
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
`;

// Animación de pulso para el ganador
const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(255, 215, 0, 0);
  }
`;

// Animación de brillo
const shineAnimation = keyframes`
  0% {
    background-position: -200%;
  }
  100% {
    background-position: 200%;
  }
`;

// Animación de flotación
const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
`;

// Animación de rotación
const rotateAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Animación de confeti
const confettiAnimation = keyframes`
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

// Contenedor de la ruleta
const RouletteContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: 700,
  height: 450,
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)',
  borderRadius: 24,
  boxShadow: '0 25px 80px rgba(0,0,0,0.4), inset 0 0 100px rgba(255,255,255,0.1)',
  border: '5px solid',
  borderImage: 'linear-gradient(45deg, #FFD700, #FFA500, #FFD700) 1',
  [theme.breakpoints.down('md')]: {
    height: 350,
    borderWidth: 3
  },
  [theme.breakpoints.down('sm')]: {
    height: 300,
    borderRadius: 16,
    borderWidth: 2
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 120,
    background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent)',
    transform: 'translateY(-50%)',
    zIndex: 1,
    border: '3px solid #FFD700',
    borderLeft: 'none',
    borderRight: 'none',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      height: 90,
      borderWidth: 2
    }
  },
  '&::after': {
    content: '"▶"',
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 40,
    color: '#FFD700',
    zIndex: 2,
    textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
    animation: `${pulseAnimation} 1s ease-in-out infinite`,
    [theme.breakpoints.down('sm')]: {
      fontSize: 30,
      right: 10
    }
  }
}));

// Lista de participantes con scroll
const ParticipantsList = styled(Box)(({ isSpinning, speed }) => ({
  position: 'absolute',
  width: '100%',
  animation: isSpinning ? `${scrollAnimation} ${speed}s linear infinite` : 'none'
}));

// Card de participante
const ParticipantCard = styled(Card)(({ isWinner, theme }) => ({
  margin: '12px 24px',
  background: isWinner
    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  transform: isWinner ? 'scale(1.15)' : 'scale(1)',
  animation: isWinner ? `${pulseAnimation} 1.5s ease-in-out infinite` : 'none',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: isWinner
    ? '0 0 40px rgba(255, 215, 0, 0.9), 0 10px 30px rgba(0,0,0,0.3)'
    : '0 4px 12px rgba(0,0,0,0.1)',
  border: isWinner ? '4px solid #FFD700' : '2px solid #e5e7eb',
  borderRadius: 16,
  overflow: 'hidden',
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    margin: '8px 16px',
    borderWidth: isWinner ? 3 : 1,
    borderRadius: 12
  },
  '&::before': isWinner ? {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent)',
    animation: `${shineAnimation} 2s linear infinite`
  } : {},
  '&:hover': {
    transform: isWinner ? 'scale(1.15)' : 'scale(1.02)',
    boxShadow: isWinner
      ? '0 0 50px rgba(255, 215, 0, 1), 0 15px 40px rgba(0,0,0,0.4)'
      : '0 6px 20px rgba(0,0,0,0.15)'
  }
}));

// Botón brillante
const ShinyButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 25%, #6bcf7f 50%, #4ecdc4 75%, #c44569 100%)',
  backgroundSize: '300% auto',
  color: '#fff',
  fontSize: '1.5rem',
  padding: '18px 60px',
  fontWeight: 800,
  borderRadius: 60,
  boxShadow: '0 15px 40px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${shineAnimation} 4s linear infinite`,
  textTransform: 'uppercase',
  letterSpacing: 2,
  border: '3px solid rgba(255,255,255,0.3)',
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    fontSize: '1.2rem',
    padding: '14px 40px'
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
    padding: '12px 30px',
    borderRadius: 40,
    borderWidth: 2
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
    animation: `${rotateAnimation} 3s linear infinite`,
    opacity: 0.5
  },
  '&:hover': {
    transform: 'translateY(-5px) scale(1.05)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 10px 25px rgba(0,0,0,0.3)',
    backgroundPosition: '100% 0'
  },
  '&:active': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
  },
  '&:disabled': {
    background: 'linear-gradient(90deg, #9ca3af 0%, #6b7280 100%)',
    animation: 'none',
    transform: 'none',
    border: 'none',
    '&::before': {
      display: 'none'
    }
  }
}));

// Componente de confeti
const ConfettiPiece = styled(Box)(({ delay, color }) => ({
  position: 'absolute',
  width: 10,
  height: 10,
  background: color,
  top: 0,
  left: `${Math.random() * 100}%`,
  animation: `${confettiAnimation} ${3 + Math.random() * 2}s linear ${delay}s infinite`,
  opacity: 0.8,
  borderRadius: Math.random() > 0.5 ? '50%' : 0
}));

const SorteoConcursoPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(0.5);
  const [showConfetti, setShowConfetti] = useState(false);
  const [comunaSeleccionada, setComunaSeleccionada] = useState('TOME');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const audioRef = useRef(null);

  // Comunas disponibles para filtrar (sin "TODAS" y sin tildes)
  const comunas = ['TOME', 'COELEMU', 'QUIRIHUE', 'CHILLAN'];

  // Colores para confeti
  const confettiColors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

  // Cargar participantes
  useEffect(() => {
    loadParticipantes();
  }, [comunaSeleccionada]);

  const loadParticipantes = async () => {
    try {
      setLoading(true);
      const params = { comuna: comunaSeleccionada };
      const response = await api.get('/concurso-piscinas/sorteo/participantes', { params });

      if (response.data.success) {
        setParticipantes(response.data.participantes);
        console.log(`✅ ${response.data.total} participantes cargados (Comuna: ${comunaSeleccionada})`);
        enqueueSnackbar(`${response.data.total} participantes de ${comunaSeleccionada}`, { variant: 'success' });
      }
    } catch (error) {
      console.error('Error al cargar participantes:', error);
      enqueueSnackbar('Error al cargar participantes', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Lanzar confeti
  const launchConfetti = () => {
    setShowConfetti(true);
    console.log('🎉 ¡Confeti lanzado!');

    // Detener confeti después de 10 segundos
    setTimeout(() => {
      setShowConfetti(false);
    }, 10000);
  };

  // Iniciar sorteo
  const iniciarSorteo = () => {
    if (participantes.length === 0) {
      enqueueSnackbar('No hay participantes para sortear', { variant: 'warning' });
      return;
    }

    setIsSpinning(true);
    setWinner(null);
    setSpinSpeed(0.3); // Velocidad inicial rápida

    // Reducir velocidad gradualmente
    setTimeout(() => setSpinSpeed(0.5), 1000);
    setTimeout(() => setSpinSpeed(0.8), 2000);
    setTimeout(() => setSpinSpeed(1.2), 3000);
    setTimeout(() => setSpinSpeed(2), 4000);
    setTimeout(() => setSpinSpeed(3), 5000);

    // Detener y mostrar ganador después de 6 segundos
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * participantes.length);
      const ganadorSeleccionado = participantes[randomIndex];

      console.log('🏆 Ganador seleccionado:', ganadorSeleccionado);
      console.log('📸 Ruta imagen:', ganadorSeleccionado.ruta_imagen);

      setIsSpinning(false);
      setWinner(ganadorSeleccionado);
      setShowWinnerDialog(true);

      // Efectos
      launchConfetti();

      // Sonido de victoria (opcional)
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio error:', e));
      }
    }, 6000);
  };

  // Confirmar ganador y guardar en BD
  const confirmarGanador = async () => {
    if (!winner) return;

    try {
      const response = await api.post('/concurso-piscinas/sorteo/ganador', {
        participante_id: winner.id,
        premio: 'Premio Concurso Piscinas 2025'
      });

      if (response.data.success) {
        enqueueSnackbar('🎉 ¡Ganador registrado exitosamente!', { variant: 'success' });

        // Recargar participantes (excluir al ganador)
        await loadParticipantes();

        setShowWinnerDialog(false);
        setWinner(null);
      }
    } catch (error) {
      console.error('Error al confirmar ganador:', error);
      enqueueSnackbar('Error al registrar ganador', { variant: 'error' });
    }
  };

  // Lista de participantes SIN duplicación - cada participante aparece solo UNA vez
  const displayList = participantes;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)'
        }}
      >
        <CircularProgress size={80} sx={{ color: '#FFD700', mb: 3 }} thickness={4} />
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
          Cargando participantes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 30%, #2c5364 100%)',
        py: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden'
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
          background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.2), transparent 50%)',
          animation: `${floatAnimation} 10s ease-in-out infinite`,
          zIndex: 0
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={{ xs: 3, md: 4 }} alignItems="center">
          {/* Header */}
          <Card
            sx={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
              borderRadius: { xs: 3, md: 5 },
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Barra decorativa superior */}
            <Box
              sx={{
                height: 8,
                background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                animation: `${shineAnimation} 3s linear infinite`,
                backgroundSize: '200% auto'
              }}
            />

            <CardContent sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 4 } }}>
              <Stack spacing={{ xs: 2, md: 3 }} alignItems="center">
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    animation: `${floatAnimation} 3s ease-in-out infinite`
                  }}
                >
                  <EmojiEvents
                    sx={{
                      fontSize: { xs: 60, sm: 80, md: 100 },
                      color: '#FFD700',
                      filter: 'drop-shadow(0 4px 12px rgba(255, 215, 0, 0.5))'
                    }}
                  />
                  <Stars
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      fontSize: 30,
                      color: '#FFA500',
                      animation: `${rotateAnimation} 4s linear infinite`
                    }}
                  />
                </Box>

                <Typography
                  variant={isMobile ? 'h4' : isTablet ? 'h3' : 'h2'}
                  sx={{
                    fontWeight: 900,
                    background: 'linear-gradient(90deg, #FF6B6B 0%, #FFD700 25%, #4ECDC4 50%, #C44569 75%, #FF6B6B 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center',
                    animation: `${shineAnimation} 5s linear infinite`,
                    letterSpacing: { xs: 1, md: 3 },
                    textTransform: 'uppercase'
                  }}
                >
                  Sorteo del Concurso
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalActivity sx={{ color: '#7e22ce', fontSize: { xs: 24, md: 32 } }} />
                  <Typography
                    variant={isMobile ? 'h6' : 'h5'}
                    sx={{
                      color: '#475569',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  >
                    Concurso de Piscinas 2025
                  </Typography>
                  <LocalActivity sx={{ color: '#7e22ce', fontSize: { xs: 24, md: 32 } }} />
                </Stack>

                <Divider sx={{ width: '60%', borderColor: '#e5e7eb', borderWidth: 1 }} />

                {/* Selector de Comuna */}
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 600, textAlign: 'center', color: '#475569' }}>
                    🏆 Selecciona la Comuna para el Sorteo:
                  </Typography>
                  <ToggleButtonGroup
                    value={comunaSeleccionada}
                    exclusive
                    onChange={(e, newComuna) => {
                      if (newComuna !== null) {
                        setComunaSeleccionada(newComuna);
                        setWinner(null);
                      }
                    }}
                    fullWidth
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      justifyContent: 'center'
                    }}
                  >
                    {comunas.map((comuna) => (
                      <ToggleButton
                        key={comuna}
                        value={comuna}
                        sx={{
                          flex: { xs: '1 1 45%', sm: '0 1 auto' },
                          py: 1.5,
                          px: 3,
                          fontWeight: 600,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          borderRadius: '8px !important',
                          border: '2px solid',
                          borderColor: comunaSeleccionada === comuna ? '#7e22ce' : '#e2e8f0',
                          bgcolor: comunaSeleccionada === comuna ? '#7e22ce' : 'white',
                          color: comunaSeleccionada === comuna ? 'white' : '#475569',
                          '&:hover': {
                            bgcolor: comunaSeleccionada === comuna ? '#6b21a8' : '#f1f5f9',
                            borderColor: '#7e22ce'
                          },
                          '&.Mui-selected': {
                            bgcolor: '#7e22ce',
                            color: 'white',
                            '&:hover': {
                              bgcolor: '#6b21a8'
                            }
                          }
                        }}
                      >
                        {comuna}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ mt: 2, width: '100%', justifyContent: 'center' }}
                >
                  <Chip
                    icon={<Person />}
                    label={`${participantes.length} Participantes`}
                    color="primary"
                    sx={{
                      fontSize: { xs: '1rem', md: '1.2rem' },
                      py: { xs: 2.5, md: 3 },
                      px: { xs: 1, md: 2 },
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                  />
                  <Chip
                    icon={isSpinning ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Stars />}
                    label={isSpinning ? '🎲 Sorteando...' : '✨ Listo para sortear'}
                    color={isSpinning ? 'secondary' : 'success'}
                    sx={{
                      fontSize: { xs: '1rem', md: '1.2rem' },
                      py: { xs: 2.5, md: 3 },
                      px: { xs: 1, md: 2 },
                      fontWeight: 700,
                      boxShadow: isSpinning
                        ? '0 4px 12px rgba(156, 39, 176, 0.3)'
                        : '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Ruleta */}
          <RouletteContainer elevation={20}>
            <ParticipantsList isSpinning={isSpinning} speed={spinSpeed}>
              {displayList.map((participante, index) => (
                <ParticipantCard
                  key={`${participante.id}-${index}`}
                  isWinner={false}
                  elevation={4}
                >
                  <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 2, md: 3 }, position: 'relative' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs="auto">
                        <Avatar
                          sx={{
                            width: { xs: 45, md: 55 },
                            height: { xs: 45, md: 55 },
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: 'bold',
                            fontSize: { xs: '1rem', md: '1.2rem' }
                          }}
                        >
                          {participante.nombres.charAt(0)}{participante.apellidos.charAt(0)}
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography
                          variant={isMobile ? 'body1' : 'h6'}
                          sx={{
                            fontWeight: 700,
                            color: '#1f2937',
                            mb: 0.5
                          }}
                        >
                          {participante.nombres} {participante.apellidos}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            icon={<Receipt sx={{ fontSize: 14 }} />}
                            label={participante.numero_boleta}
                            size="small"
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              height: 24,
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#fff'
                            }}
                          />
                        </Stack>
                      </Grid>
                      <Grid item xs="auto">
                        <Chip
                          label={`#${participante.id}`}
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: '0.8rem', md: '0.9rem' },
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#fff'
                          }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </ParticipantCard>
              ))}
            </ParticipantsList>
          </RouletteContainer>

          {/* Botones de control */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, md: 3 }}
            sx={{ width: '100%', maxWidth: 600, px: { xs: 2, md: 0 } }}
          >
            <ShinyButton
              variant="contained"
              size="large"
              onClick={iniciarSorteo}
              disabled={isSpinning || participantes.length === 0}
              startIcon={<PlayArrow sx={{ fontSize: { xs: 30, md: 40 } }} />}
              fullWidth={isMobile}
            >
              {isSpinning ? 'SORTEANDO...' : 'INICIAR SORTEO'}
            </ShinyButton>

            <Button
              variant="outlined"
              size="large"
              onClick={loadParticipantes}
              disabled={isSpinning}
              startIcon={<Refresh />}
              fullWidth={isMobile}
              sx={{
                borderWidth: 3,
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.6)',
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.2rem' },
                padding: { xs: '12px 30px', md: '14px 40px' },
                borderRadius: 50,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderWidth: 3,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderColor: '#fff',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 20px rgba(255,255,255,0.2)'
                },
                '&:disabled': {
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.5)'
                }
              }}
            >
              Recargar
            </Button>
          </Stack>

          {/* Info */}
          {participantes.length === 0 && (
            <Alert
              severity="warning"
              sx={{
                width: '100%',
                maxWidth: 600,
                borderRadius: 3,
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              No hay participantes disponibles para el sorteo
            </Alert>
          )}
        </Stack>
      </Container>

      {/* Confeti */}
      {showConfetti && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden'
          }}
        >
          {Array.from({ length: 50 }).map((_, index) => (
            <ConfettiPiece
              key={index}
              delay={index * 0.1}
              color={confettiColors[index % confettiColors.length]}
            />
          ))}
        </Box>
      )}

      {/* Dialog del ganador */}
      <Dialog
        open={showWinnerDialog}
        onClose={() => setShowWinnerDialog(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, md: 5 },
            overflow: 'hidden',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            backgroundSize: '200% auto',
            animation: `${shineAnimation} 5s linear infinite`,
            position: 'relative'
          }}
        >
          {/* Efecto de rayos */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200%',
              height: '200%',
              background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255,255,255,0.1) 10deg 20deg)',
              animation: `${rotateAnimation} 20s linear infinite`,
              zIndex: 0
            }}
          />

          <Box sx={{ position: 'relative', p: { xs: 3, md: 5 }, zIndex: 1 }}>
            <IconButton
              onClick={() => {
                setShowWinnerDialog(false);
                setShowConfetti(false);
              }}
              sx={{
                position: 'absolute',
                top: { xs: 10, md: 15 },
                right: { xs: 10, md: 15 },
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  transform: 'rotate(90deg)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <Close />
            </IconButton>

            <Stack spacing={{ xs: 2, md: 3 }} alignItems="center">
              {/* Icono animado */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'inline-block',
                  animation: `${floatAnimation} 2s ease-in-out infinite`
                }}
              >
                <Celebration
                  sx={{
                    fontSize: { xs: 80, md: 120 },
                    color: '#fff',
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
                  }}
                />
                <Stars
                  sx={{
                    position: 'absolute',
                    top: -15,
                    right: -15,
                    fontSize: { xs: 35, md: 45 },
                    color: '#fff',
                    animation: `${rotateAnimation} 3s linear infinite`
                  }}
                />
              </Box>

              {/* Título */}
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                sx={{
                  fontWeight: 900,
                  color: '#fff',
                  textAlign: 'center',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.5)',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  animation: `${pulseAnimation} 2s ease-in-out infinite`
                }}
              >
                ¡Felicidades!
              </Typography>

              {winner && (
                <Card
                  sx={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: { xs: 3, md: 4 },
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    border: '4px solid rgba(255,255,255,0.8)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Barra decorativa */}
                  <Box
                    sx={{
                      height: 6,
                      background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #FFD700)',
                      backgroundSize: '200% auto',
                      animation: `${shineAnimation} 3s linear infinite`
                    }}
                  />

                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Stack spacing={{ xs: 2, md: 3 }}>
                      {/* Avatar y nombre */}
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                        <Avatar
                          sx={{
                            width: { xs: 70, md: 90 },
                            height: { xs: 70, md: 90 },
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontSize: { xs: '2rem', md: '2.5rem' },
                            fontWeight: 'bold',
                            border: '4px solid #FFD700',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                          }}
                        >
                          {winner.nombres.charAt(0)}{winner.apellidos.charAt(0)}
                        </Avatar>
                      </Stack>

                      <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        sx={{
                          fontWeight: 800,
                          textAlign: 'center',
                          background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          letterSpacing: 1
                        }}
                      >
                        {winner.nombres} {winner.apellidos}
                      </Typography>

                      <Divider sx={{ borderColor: '#e5e7eb', borderWidth: 1 }} />

                      {/* Información del ganador */}
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Paper
                            sx={{
                              p: 2,
                              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                              borderRadius: 2,
                              border: '2px solid #3b82f6'
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Person sx={{ color: '#3b82f6', fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                                  RUT
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                  {winner.rut}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Paper
                            sx={{
                              p: 2,
                              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                              borderRadius: 2,
                              border: '2px solid #f59e0b'
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Receipt sx={{ color: '#f59e0b', fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" sx={{ color: '#78350f', fontWeight: 600 }}>
                                  Boleta
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                  {winner.numero_boleta}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper
                            sx={{
                              p: 2,
                              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                              borderRadius: 2,
                              border: '2px solid #22c55e'
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Email sx={{ color: '#22c55e', fontSize: 28 }} />
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography variant="caption" sx={{ color: '#14532d', fontWeight: 600 }}>
                                  Email
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {winner.email}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper
                            sx={{
                              p: 2,
                              background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                              borderRadius: 2,
                              border: '2px solid #ec4899'
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Phone sx={{ color: '#ec4899', fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" sx={{ color: '#831843', fontWeight: 600 }}>
                                  Teléfono
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                  {winner.telefono}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Botones de acción */}
                      <Stack spacing={2} sx={{ width: '100%' }}>
                        {/* Botón Comprobar Boleta */}
                        <Button
                          variant="outlined"
                          size="large"
                          onClick={() => setShowImageDialog(true)}
                          startIcon={<ImageIcon />}
                          sx={{
                            fontSize: { xs: '1rem', md: '1.2rem' },
                            py: { xs: 1.5, md: 2 },
                            fontWeight: 700,
                            borderRadius: 50,
                            borderWidth: 3,
                            borderColor: '#7e22ce',
                            color: '#7e22ce',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            boxShadow: '0 8px 20px rgba(126, 34, 206, 0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderWidth: 3,
                              backgroundColor: 'rgba(126, 34, 206, 0.1)',
                              borderColor: '#6b21a8',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 12px 30px rgba(126, 34, 206, 0.4)'
                            }
                          }}
                        >
                          Comprobar Boleta
                        </Button>

                        {/* Botón de confirmación */}
                        <Button
                          variant="contained"
                          size="large"
                          onClick={confirmarGanador}
                          startIcon={<EmojiEvents />}
                          sx={{
                            background: 'linear-gradient(90deg, #FF6B6B 0%, #4ECDC4 100%)',
                            backgroundSize: '200% auto',
                            fontSize: { xs: '1rem', md: '1.3rem' },
                            py: { xs: 1.5, md: 2 },
                            fontWeight: 800,
                            borderRadius: 50,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              backgroundPosition: '100% 0',
                              transform: 'translateY(-3px)',
                              boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
                            }
                          }}
                        >
                          Confirmar y Registrar Ganador
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog de imagen de la boleta */}
      <Dialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, md: 4 },
            overflow: 'hidden',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            position: 'relative'
          }}
        >
          <Box sx={{ position: 'relative', p: { xs: 2, md: 3 } }}>
            <IconButton
              onClick={() => setShowImageDialog(false)}
              sx={{
                position: 'absolute',
                top: { xs: 10, md: 15 },
                right: { xs: 10, md: 15 },
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                zIndex: 10,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  transform: 'rotate(90deg)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <Close />
            </IconButton>

            <Stack spacing={2} alignItems="center">
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                sx={{
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                Boleta Ganadora
              </Typography>

              {winner && winner.ruta_imagen ? (
                <Card
                  sx={{
                    width: '100%',
                    background: '#fff',
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Debug info */}
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      Ruta: {winner.ruta_imagen}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                      URL completa: {`${api.defaults.baseURL.replace('/api', '')}${winner.ruta_imagen}`}
                    </Typography>
                    <Box
                      component="img"
                      src={`${api.defaults.baseURL.replace('/api', '')}${winner.ruta_imagen}`}
                      alt={`Boleta ${winner.numero_boleta}`}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: 1
                      }}
                      onError={(e) => {
                        console.error('Error cargando imagen:', winner.ruta_imagen);
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="%23666" font-size="20">Imagen no disponible</text></svg>';
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 2,
                        textAlign: 'center',
                        color: '#64748b',
                        fontWeight: 600
                      }}
                    >
                      Boleta N° {winner.numero_boleta}
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="warning" sx={{ width: '100%' }}>
                  No hay imagen disponible para esta boleta
                </Alert>
              )}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Audio (opcional) */}
      <audio ref={audioRef} src="/sounds/win.mp3" preload="auto" />
    </Box>
  );
};

export default SorteoConcursoPage;
