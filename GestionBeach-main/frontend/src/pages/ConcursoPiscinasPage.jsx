import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Fade,
  Zoom,
  IconButton,
  LinearProgress,
  Grid,
  Container,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Grow,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  Pool as PoolIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Star as StarIcon,
  Whatshot as FireIcon,
  LocalOffer as OfferIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { keyframes } from '@mui/system';
import api from '../api/api';
import fondoImage from '../images/aqua.png';
import logoIntro from '../images/logo.jpg';
import estrellaIcon from '../images/estrella.png';
import beachPiscinaImg from '../images/beach piscina.png';
import ImageCropperUpload from '../components/ImageCropperUpload';

// Animaciones profesionales
const float = keyframes`
  0%, 100% { transform: translateY(-50%) translateX(0px) rotate(0deg); }
  50% { transform: translateY(-50%) translateX(-10px) rotate(-2deg); }
`;

const float2 = keyframes`
  0%, 100% { transform: translateY(-50%) translateX(0px) rotate(0deg); }
  50% { transform: translateY(-50%) translateX(10px) rotate(2deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const slideInUp = keyframes`
  from { 
    transform: translateY(50px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from { 
    transform: translateX(-80px);
    opacity: 0;
  }
  to { 
    transform: translateX(0);
    opacity: 1;
  }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
`;

const scaleIn = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const zoomIntro = keyframes`
  0% {
    transform: scale(1.5);
    opacity: 0;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const shimmerIntro = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const fallFromSky = keyframes`
  0% {
    transform: translateY(-500px) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: translateY(20px) rotate(2deg);
    opacity: 1;
  }
  80% {
    transform: translateY(-10px) rotate(-1deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
`;

const logoFall = keyframes`
  0% {
    transform: translateY(-800px) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translateY(30px) scale(1.05);
    opacity: 1;
  }
  70% {
    transform: translateY(-20px) scale(0.95);
  }
  85% {
    transform: translateY(10px) scale(1.02);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
`;

const fadeInOut = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  10% {
    opacity: 1;
    transform: scale(1);
  }
  90% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
`;

const splash = keyframes`
  0% {
    transform: scale(0) translateY(0);
    opacity: 1;
  }
  50% {
    transform: scale(1.5) translateY(-30px);
    opacity: 0.7;
  }
  100% {
    transform: scale(2) translateY(-60px);
    opacity: 0;
  }
`;

const waterDrop = keyframes`
  0% {
    transform: translateY(-100px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(0) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(360deg);
    opacity: 0;
  }
`;

const waterSplash = keyframes`
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  30% {
    transform: scale(1.2) rotate(15deg);
    opacity: 0.8;
  }
  60% {
    transform: scale(1.8) rotate(-10deg);
    opacity: 0.4;
  }
  100% {
    transform: scale(2.5) rotate(20deg);
    opacity: 0;
  }
`;

const ConcursoPiscinasPage = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Estados del formulario
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  // Formatear RUT chileno
  const formatearRUT = (value) => {
    // Eliminar todo excepto números y K
    const cleaned = value.replace(/[^0-9kK]/g, '');

    if (cleaned.length === 0) return '';

    // Separar cuerpo y dígito verificador
    const cuerpo = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

    if (cuerpo.length === 0) return dv;

    // Formatear cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${cuerpoFormateado}-${dv}`;
  };

  // Validar dígito verificador de RUT chileno
  const validarRUT = (rutCompleto) => {
    if (!rutCompleto) return false;

    // Limpiar RUT
    const rutLimpio = rutCompleto.replace(/\./g, '').replace(/-/g, '');
    if (rutLimpio.length < 2) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    // Validar que el cuerpo sean solo números
    if (!/^\d+$/.test(cuerpo)) return false;

    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    let dvCalculado;

    if (dvEsperado === 11) dvCalculado = '0';
    else if (dvEsperado === 10) dvCalculado = 'K';
    else dvCalculado = dvEsperado.toString();

    return dv === dvCalculado;
  };

  // Manejar cambio de RUT con formateo
  const handleRutChange = (e) => {
    const value = e.target.value;
    const formateado = formatearRUT(value);
    setRut(formateado);
    actualizarStep();
  };

  // Estados de la imagen
  const [selectedFile, setSelectedFile] = useState(null);

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [participacionExitosa, setParticipacionExitosa] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

  // Efecto para cambiar el título de la pestaña
  React.useEffect(() => {
    document.title = 'CONCURSO';

    // Restaurar título original al desmontar
    return () => {
      document.title = 'Intranet';
    };
  }, []);

  // Efecto para ocultar la intro después de la animación
  React.useEffect(() => {
    const introTimer = setTimeout(() => {
      setShowIntro(false);
    }, 2000); // 2 segundos para la animación del logo

    return () => {
      clearTimeout(introTimer);
    };
  }, []);



  // Actualizar step automáticamente
  const actualizarStep = () => {
    if (nombres && apellidos && rut && email && telefono && direccion) {
      if (numeroBoleta && selectedFile) {
        setActiveStep(2);
      } else {
        setActiveStep(1);
      }
    } else {
      setActiveStep(0);
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    // Validar nombre (solo letras y espacios)
    if (!nombres.trim()) {
      enqueueSnackbar('Por favor ingresa tu nombre', { variant: 'warning' });
      return false;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombres)) {
      enqueueSnackbar('El nombre solo puede contener letras', { variant: 'warning' });
      return false;
    }

    // Validar apellidos (solo letras y espacios)
    if (!apellidos.trim()) {
      enqueueSnackbar('Por favor ingresa tus apellidos', { variant: 'warning' });
      return false;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellidos)) {
      enqueueSnackbar('Los apellidos solo pueden contener letras', { variant: 'warning' });
      return false;
    }

    // Validar RUT con dígito verificador
    if (!rut.trim()) {
      enqueueSnackbar('Por favor ingresa tu RUT', { variant: 'warning' });
      return false;
    }
    if (!validarRUT(rut)) {
      enqueueSnackbar('RUT inválido. Verifica el dígito verificador', { variant: 'error' });
      return false;
    }

    // Email es OPCIONAL, pero si se ingresa debe ser válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email)) {
      enqueueSnackbar('Por favor ingresa un email válido', { variant: 'warning' });
      return false;
    }

    if (!telefono.trim() || telefono.length < 8) {
      enqueueSnackbar('Por favor ingresa un teléfono válido', { variant: 'warning' });
      return false;
    }

    if (!direccion.trim()) {
      enqueueSnackbar('Por favor ingresa tu dirección', { variant: 'warning' });
      return false;
    }

    if (!numeroBoleta || !numeroBoleta.trim()) {
      enqueueSnackbar('Por favor detecta el número de boleta usando la imagen', { variant: 'warning' });
      return false;
    }

    if (!selectedFile) {
      enqueueSnackbar('Por favor carga y procesa la imagen de la boleta', { variant: 'warning' });
      return false;
    }

    return true;
  };

  // Manejar submit del formulario
  const handleSubmit = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('numero_boleta', numeroBoleta.trim());
      formData.append('nombres', nombres.trim());
      formData.append('apellidos', apellidos.trim());
      formData.append('rut', rut.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('telefono', telefono.trim());
      formData.append('direccion', direccion.trim());
      formData.append('imagen_boleta', selectedFile);

      setUploadProgress(30);

      const response = await api.post('/concurso-piscinas/participar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(30 + (percentCompleted * 0.6));
        },
      });

      setUploadProgress(100);

      if (response.data.success) {
        setDatosExtraidos(response.data.datos_extraidos);
        setParticipacionExitosa(true);
        enqueueSnackbar('¡Participación registrada exitosamente! 🎉', { 
          variant: 'success',
          autoHideDuration: 5000,
        });
        
        setTimeout(() => {
          resetForm();
        }, 5000);
      }

    } catch (error) {
      console.error('Error al registrar participación:', error);
      const errorMsg = error.response?.data?.message || 'Error al procesar la participación';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNumeroBoleta('');
    setNombres('');
    setApellidos('');
    setRut('');
    setEmail('');
    setTelefono('');
    setDireccion('');
    setSelectedFile(null);
    setUploadProgress(0);
    setActiveStep(0);
    setParticipacionExitosa(false);
    setDatosExtraidos(null);
  };

  return (
    <>
      {/* Pantalla de intro con logo cayendo */}
      {showIntro && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #E3F9FF 0%, #B3E5FC 25%, #81D4FA 50%, #4FC3F7 75%, #29B6F6 100%)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              background: 'white',
              borderRadius: 6,
              padding: 4,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              animation: `${logoFall} 1.8s ease-out forwards`,
            }}
          >
            <Box
              component="img"
              src={logoIntro}
              alt="Logo"
              sx={{
                maxWidth: { xs: '60vw', md: '40vw', lg: '30vw' },
                maxHeight: '50vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>
        </Box>
      )}

      {/* Contenido principal */}
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #E3F9FF 0%, #B3E5FC 25%, #81D4FA 50%, #4FC3F7 75%, #29B6F6 100%)',
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 4, md: 6 },
          opacity: showIntro ? 0 : 1,
          transition: 'opacity 0.5s ease-in',
        }}
      >
      {/* Formas decorativas de fondo */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      
      {/* Círculos decorativos flotantes */}
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: { xs: 30, md: 50 },
            height: { xs: 30, md: 50 },
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            animation: `${bounce} ${3 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            zIndex: 0,
          }}
        />
      ))}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        {/* Header profesional */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: 3, position: 'relative' }}>
            {/* Splash de agua - efectos decorativos */}
            {[...Array(8)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: { xs: 40, md: 60 },
                  height: { xs: 40, md: 60 },
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%)',
                  top: `${10 + i * 10}%`,
                  left: `${10 + (i % 2) * 70}%`,
                  animation: `${splash} ${1.5 + i * 0.2}s ease-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Estrella principal girando */}
            <Box
              sx={{
                display: 'inline-block',
                mb: 1.5,
                animation: `${fallFromSky} 1.2s ease-out, ${rotate} 3s linear infinite 1.2s`,
              }}
            >
              <Box
                component="img"
                src={estrellaIcon}
                alt="Estrella"
                sx={{
                  width: 100,
                  height: 100,
                  filter: 'drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6))',
                }}
              />
            </Box>

            {/* Título principal */}
            <Typography
              variant="h1"
              sx={{
                fontWeight: 990,
                color: 'white',
                mb: 0.5,
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                letterSpacing: '-1px',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.3)',
                lineHeight: 1.1,
                animation: `${fallFromSky} 1s ease-out`,
                animationDelay: '0.2s',
                animationFillMode: 'backwards',
              }}
            >
              CONCURSO
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1.5,
                fontSize: { xs: '1.5rem', md: '2rem' },
                letterSpacing: '-0.5px',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                animation: `${fallFromSky} 1s ease-out`,
                animationDelay: '0.4s',
                animationFillMode: 'backwards',
              }}
            >
              PISCINAS DE VERANO
            </Typography>

            {/* Subtítulo atractivo */}
            <Box
              sx={{
                display: 'inline-block',
                bgcolor: 'white',
                px: 3,
                py: 1,
                borderRadius: 50,
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)',
                animation: `${fallFromSky} 1s ease-out`,
                animationDelay: '0.6s',
                animationFillMode: 'backwards',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: '#FF6B35',
                  fontWeight: 800,
                  fontSize: { xs: '0.85rem', md: '1rem' },
                }}
              >
                🏆 ¡Gana premios increíbles! 🏆
              </Typography>
            </Box>
          </Box>
        </Fade>

        <Grid container spacing={2} justifyContent="flex-start" alignItems="flex-start" sx={{ maxWidth: '100%' }}>
          {/* Formulario principal */}
          <Grid item xs={12} sm={12} md={8} lg={8} xl={8} sx={{ order: { xs: 2, sm: 2, md: 1 } }}>
            <Zoom in timeout={1000}>
              <Card
                sx={{
                  background: 'white',
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  overflow: 'visible',
                  animation: `${slideInLeft} 0.6s ease-out`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #00D4FF 0%, #FF6B35 100%)',
                    borderRadius: '2px 2px 0 0',
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, pt: 2 }}>
                  {!participacionExitosa ? (
                    <>
                      {/* PASO 1: Datos Personales */}
                      <Grow in timeout={500}>
                        <Box sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1.5,
                              pb: 0.5,
                              borderBottom: '2px solid #F5F5F5',
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                                width: 28,
                                height: 28,
                                boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)',
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#333',
                                fontSize: { xs: '0.9rem', md: '1rem' },
                              }}
                            >
                              Datos Personales
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <TextField
                              fullWidth
                              label="Nombres"
                              value={nombres}
                              onChange={(e) => {
                                setNombres(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="Ej: Juan Carlos"
                              variant="outlined"
                              disabled={loading}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PersonIcon sx={{ color: '#4CAF50' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Apellidos"
                              value={apellidos}
                              onChange={(e) => {
                                setApellidos(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="Ej: Pérez González"
                              variant="outlined"
                              disabled={loading}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PersonIcon sx={{ color: '#4CAF50' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="RUT"
                              value={rut}
                              onChange={handleRutChange}
                              placeholder="Ej: 12.345.678-9"
                              variant="outlined"
                              disabled={loading}
                              inputProps={{
                                maxLength: 12
                              }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PersonIcon sx={{ color: '#4CAF50' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Email (Opcional)"
                              type="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="ejemplo@email.com"
                              variant="outlined"
                              disabled={loading}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <EmailIcon sx={{ color: '#00D4FF' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Teléfono"
                              value={telefono}
                              onChange={(e) => {
                                setTelefono(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="+56912345678"
                              variant="outlined"
                              disabled={loading}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <PhoneIcon sx={{ color: '#00D4FF' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Dirección"
                              value={direccion}
                              onChange={(e) => {
                                setDireccion(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="Ej: Av. Principal 123, Concepción"
                              variant="outlined"
                              disabled={loading}
                              multiline
                              rows={2}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <HomeIcon sx={{ color: '#FF6B35' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  borderRadius: 2,
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                  },
                                },
                              }}
                            />
                          </Box>
                        </Box>
                      </Grow>

                      {/* PASO 2: Upload Image */}
                      <Grow in timeout={700}>
                        <Box sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1.5,
                              pb: 0.5,
                              borderBottom: '2px solid #F5F5F5',
                            }}
                          >
                            <Avatar
                              sx={{
                                bgcolor: 'linear-gradient(135deg, #00D4FF 0%, #00BFFF 100%)',
                                width: 28,
                                height: 28,
                                boxShadow: '0 2px 6px rgba(0, 212, 255, 0.3)',
                              }}
                            >
                              <PhotoCameraIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#333',
                                fontSize: { xs: '0.9rem', md: '1rem' },
                              }}
                            >
                              Imagen de la Boleta
                            </Typography>
                          </Box>

                          <ImageCropperUpload
                            onNumeroDetectado={(numero) => {
                              setNumeroBoleta(numero);
                              actualizarStep();
                            }}
                            onImagenSeleccionada={(file) => {
                              setSelectedFile(file);
                              actualizarStep();
                            }}
                          />
                        </Box>
                      </Grow>

                      {/* Progress Bar */}
                      {loading && (
                        <Grow in>
                          <Box sx={{ mb: 4 }}>
                            <LinearProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{
                                height: 18,
                                borderRadius: 8,
                                bgcolor: '#E0F7FF',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                                '& .MuiLinearProgress-bar': {
                                  background: 'linear-gradient(90deg, #00D4FF 0%, #FF6B35 100%)',
                                  borderRadius: 8,
                                  boxShadow: '0 2px 8px rgba(0, 212, 255, 0.5)',
                                },
                              }}
                            />
                            <Box
                              sx={{
                                mt: 3,
                                p: 3,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE8DD 100%)',
                                borderRadius: 3,
                                border: '3px solid #FF6B35',
                                boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
                              }}
                            >
                              <Typography
                                variant="h4"
                                sx={{
                                  fontWeight: 900,
                                  color: '#FF6B35',
                                  mb: 1.5,
                                  fontSize: { xs: '1.8rem', md: '2.2rem' },
                                  textShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                                }}
                              >
                                ⏳ Paciencia
                              </Typography>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 700,
                                  color: '#333',
                                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                                }}
                              >
                                Estamos validando sus datos...
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{
                                  mt: 1.5,
                                  fontWeight: 600,
                                  color: '#666',
                                  fontSize: '1rem',
                                }}
                              >
                                Procesando: {uploadProgress}%
                              </Typography>
                            </Box>
                          </Box>
                        </Grow>
                      )}

                      {/* Botón Submit */}
                      <Button
                        fullWidth
                        variant="contained"
                        size="medium"
                        onClick={handleSubmit}
                        disabled={loading || !nombres || !apellidos || !rut || !telefono || !direccion || !numeroBoleta || !selectedFile}
                        startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SendIcon />}
                        sx={{
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: 800,
                          background: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !selectedFile
                            ? '#CCCCCC'
                            : 'linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%)',
                          color: 'white',
                          borderRadius: 50,
                          boxShadow: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !selectedFile
                            ? 'none'
                            : '0 8px 24px rgba(255, 107, 53, 0.5)',
                          textTransform: 'none',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                            animation: `${shimmer} 2s infinite`,
                          },
                          '&:hover': {
                            transform: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !selectedFile ? 'none' : 'translateY(-4px)',
                            boxShadow: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !selectedFile
                              ? 'none'
                              : '0 12px 32px rgba(255, 107, 53, 0.6)',
                          },
                          '&:disabled': {
                            background: '#CCCCCC',
                            color: '#888',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {loading ? 'Enviando...' : '¡PARTICIPAR AHORA! 🎉'}
                      </Button>
                    </>
                  ) : (
                    // Pantalla de éxito
                    <Grow in>
                      <Box sx={{ textAlign: 'center', py: 5 }}>
                        <Box
                          sx={{
                            position: 'relative',
                            display: 'inline-block',
                            mb: 4,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 140,
                              height: 140,
                              mx: 'auto',
                              bgcolor: 'white',
                              border: '6px solid #4CAF50',
                              boxShadow: '0 12px 40px rgba(76, 175, 80, 0.4)',
                              animation: `${pulse} 2s ease-in-out infinite`,
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 80, color: '#4CAF50' }} />
                          </Avatar>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -20,
                              right: -20,
                              animation: `${bounce} 1s ease-in-out infinite`,
                            }}
                          >
                            <StarIcon sx={{ fontSize: 50, color: '#FFD700', filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5))' }} />
                          </Box>
                        </Box>
                        
                        <Typography
                          variant="h1"
                          sx={{
                            fontWeight: 900,
                            color: '#4CAF50',
                            mb: 3,
                            fontSize: { xs: '3rem', md: '4rem' },
                            textShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
                            letterSpacing: '-2px',
                          }}
                        >
                          ¡FELICIDADES! 🎉
                        </Typography>

                        <Typography
                          variant="h4"
                          sx={{
                            mb: 4,
                            color: '#333',
                            fontWeight: 700,
                            fontSize: { xs: '1.5rem', md: '1.8rem' },
                          }}
                        >
                          Tu participación fue registrada exitosamente
                        </Typography>

                        {datosExtraidos && (
                          <Paper
                            elevation={3}
                            sx={{
                              p: 4,
                              mb: 4,
                              background: 'linear-gradient(135deg, #F0FBFF 0%, #E3F9FF 100%)',
                              border: '3px solid #00D4FF',
                              borderRadius: 4,
                            }}
                          >
                            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#00D4FF' }}>
                              📊 Datos Confirmados
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600 }}>
                                  <strong>Boleta:</strong> {datosExtraidos.numero_boleta}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600 }}>
                                  <strong>Monto:</strong> ${datosExtraidos.monto?.toLocaleString('es-CL')}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600 }}>
                                  <strong>Tipo:</strong> {datosExtraidos.tipo}
                                </Typography>
                              </Grid>
                              {datosExtraidos.sucursal && (
                                <Grid item xs={12} md={6}>
                                  <Typography variant="body1" sx={{ color: '#333', fontWeight: 600 }}>
                                    <strong>Sucursal:</strong> {datosExtraidos.sucursal}
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        )}

                        <Button
                          variant="contained"
                          size="large"
                          onClick={resetForm}
                          sx={{
                            bgcolor: '#00D4FF',
                            color: 'white',
                            fontWeight: 800,
                            px: 6,
                            py: 2.5,
                            borderRadius: 50,
                            fontSize: '1.2rem',
                            textTransform: 'none',
                            boxShadow: '0 6px 20px rgba(0, 212, 255, 0.4)',
                            '&:hover': {
                              bgcolor: '#0099CC',
                              transform: 'translateY(-3px)',
                              boxShadow: '0 8px 24px rgba(0, 212, 255, 0.5)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          Nueva Participación
                        </Button>
                      </Box>
                    </Grow>
                  )}
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          {/* Panel de Premios e Instrucciones */}
          <Grid item xs={12} sm={12} md={4} lg={4} xl={4} sx={{ order: { xs: 1, sm: 1, md: 2 } }}>
            {/* Card de Premios */}
            <Zoom in timeout={1200}>
              <Card
                sx={{
                  background: 'white',
                  borderRadius: { xs: 2, sm: 2 },
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                  mb: 2,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: { xs: '3px', sm: '4px' },
                    background: 'linear-gradient(90deg, #FFD700 0%, #FF6B35 50%, #FFD700 100%)',
                    backgroundSize: '200% auto',
                    animation: `${shimmer} 3s linear infinite`,
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 28px rgba(255, 215, 0, 0.25)',
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 1.5, md: 2 } }}>
                  {/* Header del premio - Llamativo */}
                  <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 1, md: 1.2 } }}>
                    <Avatar
                      sx={{
                        width: { xs: 50, sm: 50, md: 55, lg: 60 },
                        height: { xs: 50, sm: 50, md: 55, lg: 60 },
                        mx: 'auto',
                        mb: { xs: 1, sm: 0.8, md: 1 },
                        bgcolor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        border: { xs: '3px solid #FFD700', sm: '3px solid #FFD700' },
                        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.5)',
                        animation: `${pulse} 2s ease-in-out infinite`,
                      }}
                    >
                      <TrophyIcon
                        sx={{
                          fontSize: { xs: 28, sm: 28, md: 30, lg: 32 },
                          color: 'white',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}
                      />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #FF6B35 0%, #FFD700 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: { xs: '1.1rem', sm: '1rem', md: '1.1rem', lg: '1.2rem' },
                        mb: { xs: 0.5, sm: 0.3, md: 0.5 },
                        letterSpacing: '0.5px',
                        lineHeight: 1.2,
                      }}
                    >
                      🏆 GRAN PREMIO 🏆
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: '#333',
                        fontSize: { xs: '0.85rem', sm: '0.85rem', md: '0.9rem', lg: '0.95rem' },
                        lineHeight: 1.2,
                        mb: { xs: 0.2, sm: 0.2 },
                      }}
                    >
                      Piscina Bestway Power Steel
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#666',
                        fontSize: { xs: '0.75rem', sm: '0.75rem', md: '0.8rem' },
                        display: 'block',
                      }}
                    >
                      640 x 274 x 132 cm
                    </Typography>
                  </Box>

                  {/* Imagen del premio - LLAMATIVA */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      borderRadius: { xs: 2, sm: 2 },
                      overflow: 'hidden',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
                      border: { xs: '3px solid #FFD700', sm: '3px solid #FFD700' },
                      mb: { xs: 1.5, sm: 1, md: 1.2 },
                      background: 'linear-gradient(135deg, #E3F9FF 0%, #B3E5FC 100%)',
                      animation: `${scaleIn} 0.6s ease-out`,
                      maxHeight: { xs: '100', sm: '200px', md: '420px', lg: '540px' },
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: '0 10px 24px rgba(255, 215, 0, 0.4)',
                        transition: 'all 0.3s ease',
                      }
                    }}
                  >
                    <Box
                      component="img"
                      src={beachPiscinaImg}
                      alt="Piscina Bestway Power Steel - Premio del Concurso"
                      sx={{
                        width: '100%',
                        height: { xs: 'auto', sm: '200px', md: '320px', lg: '440px' },
                        display: 'block',
                        objectFit: 'cover',
                        objectPosition: 'center',
                      }}
                    />
                    {/* Badge decorativo - Más visible */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: { xs: 8, sm: 8, md: 10 },
                        right: { xs: 8, sm: 8, md: 10 },
                        bgcolor: '#FFD700',
                        color: '#333',
                        px: { xs: 1.5, sm: 1.2, md: 1.5 },
                        py: { xs: 0.5, sm: 0.4, md: 0.5 },
                        borderRadius: 50,
                        fontWeight: 900,
                        fontSize: { xs: '0.75rem', sm: '0.7rem', md: '0.75rem' },
                        boxShadow: '0 3px 10px rgba(255, 215, 0, 0.6)',
                        border: '2px solid white',
                        animation: `${bounce} 2s ease-in-out infinite`,
                      }}
                    >
                      ¡PREMIO!
                    </Box>
                  </Box>

                  {/* Información destacada - Llamativa */}
                  <Box
                    sx={{
                      p: { xs: 1.5, sm: 1, md: 1.2 },
                      background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF5E1 100%)',
                      borderRadius: 2,
                      border: '3px solid #FFD700',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 900,
                        color: '#FF6B35',
                        fontSize: { xs: '0.85rem', sm: '0.85rem', md: '0.9rem', lg: '0.95rem' },
                        mb: { xs: 0.3, sm: 0.2 },
                        display: 'block',
                      }}
                    >
                      ✨ Valor: $1.300.000 ✨
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: '#666',
                        fontSize: { xs: '0.75rem', sm: '0.72rem', md: '0.75rem' },
                        display: 'block',
                        lineHeight: 1.3,
                      }}
                    >
                      Incluye bomba, escalera, cubierta y filtro
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Zoom>

            {/* Card de Requisitos - Compacto */}
            <Zoom in timeout={1400}>
              <Card
                sx={{
                  background: 'white',
                  borderRadius: 2,
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: { xs: '5px', sm: '5px' },
                    background: 'linear-gradient(90deg, #00D4FF 0%, #4CAF50 100%)',
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
                  }
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 1, md: 1.2 } }}>
                  <Box sx={{ textAlign: 'center', mb: { xs: 1, sm: 0.4, md: 0.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00D4FF', fontSize: { xs: '0.9rem', sm: '0.75rem', md: '0.8rem' } }}>
                      ✅ REQUISITOS
                    </Typography>
                  </Box>

                  <List dense sx={{ pt: 0, pb: 0 }}>
                    <ListItem sx={{ px: 0, py: { xs: 0.3, sm: 0.1 }, minHeight: 'auto' }}>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.65rem', md: '0.68rem' } }}>
                        ✓ Mínimo <strong style={{ color: '#FF6B35' }}>$5.000</strong>
                      </Typography>
                    </ListItem>
                    <Divider sx={{ my: { xs: 0.3, sm: 0.1 } }} />
                    <ListItem sx={{ px: 0, py: { xs: 0.3, sm: 0.1 }, minHeight: 'auto' }}>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.65rem', md: '0.68rem' } }}>
                        ✓ Desde <strong style={{ color: '#00D4FF' }}>07-11-25</strong>
                         -  Hasta <strong style={{ color: '#00D4FF' }}>24-12-25</strong>
                      </Typography>
                      
                    </ListItem>
                    <Divider sx={{ my: { xs: 0.3, sm: 0.1 } }} />
                    <ListItem sx={{ px: 0, py: { xs: 0.3, sm: 0.1 }, minHeight: 'auto' }}>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.65rem', md: '0.68rem' } }}>
                        ✓ Una por boleta
                      </Typography>
                    </ListItem>
                    <Divider sx={{ my: { xs: 0.3, sm: 0.1 } }} />
                    <ListItem sx={{ px: 0, py: { xs: 0.3, sm: 0.1 }, minHeight: 'auto' }}>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.65rem', md: '0.68rem' } }}>
                        ✓ Múltiples boletas OK
                      </Typography>
                    </ListItem>
                    <Divider sx={{ my: { xs: 0.3, sm: 0.1 } }} />
                    <ListItem sx={{ px: 0, py: { xs: 0.3, sm: 0.1 }, minHeight: 'auto' }}>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.65rem', md: '0.68rem' } }}>
                        ✓ Imagen legible
                      </Typography>
                    </ListItem>
                  </List>

                  <Box
                    sx={{
                      mt: { xs: 1, sm: 0.5 },
                      p: { xs: 1, sm: 0.5, md: 0.6 },
                      bgcolor: '#FFF5F0',
                      borderRadius: 1.5,
                      border: '2px solid #FF6B35',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: '#FF6B35',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.3,
                        fontSize: { xs: '0.8rem', sm: '0.68rem', md: '0.7rem' },
                      }}
                    >
                      <Box component="span" sx={{ fontSize: { xs: '1rem', sm: '0.85rem' } }}>🏊</Box>
                      ¡Suerte!
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>
      </Container>
    </Box>
    </>
  );
};

export default ConcursoPiscinasPage;