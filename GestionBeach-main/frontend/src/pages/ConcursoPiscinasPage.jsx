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
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  Pool as PoolIcon,
  Receipt as ReceiptIcon,
  Cancel as CancelIcon,
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
import fondoIntro from '../images/fondo.jpg';
import estrellaIcon from '../images/estrella.png';

// Animaciones profesionales
const float = keyframes`
  0%, 100% { transform: translateY(-50%) translateX(0px) rotate(0deg); }
  50% { transform: translateY(-50%) translateX(-10px) rotate(-2deg); }
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
  const fileInputRef = useRef(null);

  // Estados del formulario
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaBoleta, setFechaBoleta] = useState('');
  const [tipoSucursal, setTipoSucursal] = useState('Supermercado');

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

  // Manejar cambio de RUT con formateo
  const handleRutChange = (e) => {
    const value = e.target.value;
    const formateado = formatearRUT(value);
    setRut(formateado);
    actualizarStep();
  };

  // Estados de la imagen
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500); // 2.5 segundos para la animación de intro
    return () => clearTimeout(timer);
  }, []);


  // Actualizar step automáticamente
  const actualizarStep = () => {
    if (nombres && apellidos && rut && email && telefono && direccion) {
      if (numeroBoleta && fechaBoleta && tipoSucursal) {
        if (selectedFile) {
          setActiveStep(3);
        } else {
          setActiveStep(2);
        }
      } else {
        setActiveStep(1);
      }
    } else {
      setActiveStep(0);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        enqueueSnackbar('Por favor selecciona una imagen válida', { variant: 'error' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        enqueueSnackbar('La imagen no debe superar los 5MB', { variant: 'error' });
        return;
      }

      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      
      enqueueSnackbar('Imagen cargada correctamente', { variant: 'success' });
      actualizarStep();
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    if (!nombres.trim()) {
      enqueueSnackbar('Por favor ingresa tu nombre', { variant: 'warning' });
      return false;
    }

    if (!apellidos.trim()) {
      enqueueSnackbar('Por favor ingresa tus apellidos', { variant: 'warning' });
      return false;
    }

    if (!rut.trim()) {
      enqueueSnackbar('Por favor ingresa tu RUT', { variant: 'warning' });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
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

    if (!numeroBoleta.trim()) {
      enqueueSnackbar('Por favor ingresa el número de boleta', { variant: 'warning' });
      return false;
    }

    if (!fechaBoleta) {
      enqueueSnackbar('Por favor ingresa la fecha de la boleta', { variant: 'warning' });
      return false;
    }

    if (!selectedFile) {
      enqueueSnackbar('Por favor selecciona una imagen de la boleta', { variant: 'warning' });
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
      formData.append('fecha_boleta', fechaBoleta);
      formData.append('tipo_sucursal', tipoSucursal);
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
    setFechaBoleta('');
    setTipoSucursal('Supermercado');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setActiveStep(0);
    setParticipacionExitosa(false);
    setDatosExtraidos(null);
  };

  // Remover imagen seleccionada
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    actualizarStep();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Pantalla de intro con imagen de fondo */}
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
            animation: `${zoomIntro} 2.5s ease-out forwards`,
            overflow: 'visible',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '200%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
              animation: `${shimmerIntro} 2s infinite`,
              zIndex: 2,
            },
          }}
        >
          {/* Gotas de agua cayendo - Optimizado */}
          {[...Array(8)].map((_, i) => {
            const randomLeft = Math.random() * 100;
            const randomDelay = Math.random() * 2;
            const randomDuration = 1.5 + Math.random() * 1.5;

            return (
              <Box
                key={`drop-${i}`}
                sx={{
                  position: 'absolute',
                  left: `${randomLeft}%`,
                  top: `-50px`,
                  width: `${14 + Math.random() * 18}px`,
                  height: `${24 + Math.random() * 32}px`,
                  background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.9) 0%, rgba(0, 212, 255, 0.6) 100%)',
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  animation: `${waterDrop} ${randomDuration}s ease-in infinite`,
                  animationDelay: `${randomDelay}s`,
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  zIndex: 3,
                }}
              />
            );
          })}

          {/* Splash PNG de agua - Más ligero */}
          {[...Array(6)].map((_, i) => {
            const randomTop = 20 + Math.random() * 60;
            const randomLeft = 10 + Math.random() * 80;
            const randomDelay = i * 0.3;
            const randomSize = 80 + Math.random() * 60;

            return (
              <Box
                key={`splash-${i}`}
                sx={{
                  position: 'absolute',
                  left: `${randomLeft}%`,
                  top: `${randomTop}%`,
                  width: `${randomSize}px`,
                  height: `${randomSize}px`,
                  opacity: 0,
                  animation: `${waterSplash} 2s ease-out infinite`,
                  animationDelay: `${randomDelay}s`,
                  zIndex: 1,
                  fontSize: `${randomSize}px`,
                }}
              >
                💧
              </Box>
            );
          })}

          <Box
            sx={{
              position: 'relative',
              maxWidth: { xs: '90%', md: '70%', lg: '60%' },
              maxHeight: '80vh',
              padding: 4,
              background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 50%, #0077AA 100%)',
              borderRadius: 4,
              boxShadow: '0 20px 80px rgba(0, 0, 0, 0.3)',
              animation: `${zoomIntro} 2.5s ease-out forwards`,
              overflow: 'hidden',
              zIndex: 5,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '200%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                animation: `${shimmerIntro} 1.5s ease-in-out infinite`,
                zIndex: 10,
              },
            }}
          >
            <Box
              component="img"
              src={fondoIntro}
              alt="Intro"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'relative',
                zIndex: 0,
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

      {/* Imagen de fondo - Más pequeña y con bordes redondeados */}
      <Box
        component="img"
        src={fondoImage}
        alt="Piscina"
        sx={{
          position: 'fixed',
          right: { xs: 10, sm: 20, md: 40 },
          top: '50%',
          transform: 'translateY(-50%)',
          width: { xs: '180px', sm: '220px', md: '280px', lg: '320px' },
          height: 'auto',
          opacity: 0.95,
          zIndex: 1,
          animation: `${float} 8s ease-in-out infinite`,
          pointerEvents: 'none',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          border: '4px solid white',
        }}
      />

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
                  width: 80,
                  height: 80,
                  filter: 'drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6))',
                }}
              />
            </Box>

            {/* Título principal */}
            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
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
                fontWeight: 900,
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

        <Grid container spacing={2} justifyContent="flex-start">
          {/* Formulario principal */}
          <Grid item xs={12} sm={10} md={6} lg={5}>
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
                              label="Email"
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

                      {/* PASO 2: Datos de la Boleta */}
                      <Grow in timeout={600}>
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
                                bgcolor: 'linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%)',
                                width: 28,
                                height: 28,
                                boxShadow: '0 2px 6px rgba(255, 107, 53, 0.3)',
                              }}
                            >
                              <ReceiptIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: '#333',
                                fontSize: { xs: '0.9rem', md: '1rem' },
                              }}
                            >
                              Datos de la Boleta
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <TextField
                              fullWidth
                              label="Número de Boleta"
                              value={numeroBoleta}
                              onChange={(e) => {
                                setNumeroBoleta(e.target.value);
                                actualizarStep();
                              }}
                              placeholder="Ej: 123456789"
                              variant="outlined"
                              disabled={loading}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  '& fieldset': {
                                    borderColor: '#E0E0E0',
                                    borderWidth: 2,
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#00D4FF',
                                    borderWidth: 2,
                                  },
                                  '&.Mui-focused': {
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.1)',
                                    '& fieldset': {
                                      borderColor: '#00D4FF',
                                      borderWidth: 2,
                                    },
                                  },
                                },
                                '& .MuiInputLabel-root': {
                                  fontWeight: 600,
                                  fontSize: '0.95rem',
                                  color: '#666',
                                  '&.Mui-focused': {
                                    color: '#00D4FF',
                                    fontWeight: 700,
                                  },
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              label="Fecha de la Boleta"
                              type="date"
                              value={fechaBoleta}
                              onChange={(e) => {
                                setFechaBoleta(e.target.value);
                                actualizarStep();
                              }}
                              variant="outlined"
                              disabled={loading}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              inputProps={{
                                min: "2025-10-08" // Fecha mínima
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: '#F8F9FA',
                                  fontSize: '1rem',
                                  fontWeight: 600,
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

                      {/* PASO 3: Upload Image */}
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

                          {!previewUrl ? (
                            <Paper
                              elevation={0}
                              sx={{
                                p: 5,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #F0FBFF 0%, #E3F9FF 100%)',
                                border: '4px dashed #00D4FF',
                                borderRadius: 4,
                                cursor: 'pointer',
                                transition: 'all 0.4s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: '-100%',
                                  width: '100%',
                                  height: '100%',
                                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
                                  animation: `${shimmer} 3s infinite`,
                                },
                                '&:hover': {
                                  borderColor: '#FF6B35',
                                  background: 'linear-gradient(135deg, #FFF5F0 0%, #FFE8DD 100%)',
                                  transform: 'scale(1.02)',
                                  boxShadow: '0 12px 32px rgba(0, 212, 255, 0.3)',
                                },
                              }}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <CloudUploadIcon 
                                sx={{ 
                                  fontSize: 80, 
                                  color: '#00D4FF',
                                  mb: 2,
                                  filter: 'drop-shadow(0 4px 8px rgba(0, 212, 255, 0.3))',
                                }} 
                              />
                              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#333' }}>
                                Sube tu imagen aquí
                              </Typography>
                              <Typography variant="body1" sx={{ color: '#666', mb: 3, fontWeight: 500 }}>
                                JPG, PNG o JPEG • Máximo 5MB
                              </Typography>
                              <Button
                                variant="contained"
                                startIcon={<PhotoCameraIcon />}
                                sx={{
                                  bgcolor: '#00D4FF',
                                  color: 'white',
                                  fontWeight: 800,
                                  px: 5,
                                  py: 2,
                                  borderRadius: 50,
                                  textTransform: 'none',
                                  fontSize: '1.1rem',
                                  boxShadow: '0 6px 20px rgba(0, 212, 255, 0.4)',
                                  '&:hover': {
                                    bgcolor: '#0099CC',
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 8px 24px rgba(0, 212, 255, 0.5)',
                                  },
                                  transition: 'all 0.3s ease',
                                }}
                              >
                                Seleccionar Archivo
                              </Button>
                            </Paper>
                          ) : (
                            <Paper
                              elevation={3}
                              sx={{
                                p: 2,
                                background: 'white',
                                border: '4px solid #00D4FF',
                                borderRadius: 4,
                                boxShadow: '0 8px 24px rgba(0, 212, 255, 0.3)',
                              }}
                            >
                              <Box sx={{ position: 'relative' }}>
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '400px',
                                    objectFit: 'contain',
                                    borderRadius: '16px',
                                  }}
                                />
                                <IconButton
                                  onClick={handleRemoveImage}
                                  sx={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 12,
                                    bgcolor: 'rgba(255, 0, 0, 0.95)',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                    '&:hover': {
                                      bgcolor: '#D32F2F',
                                      transform: 'scale(1.15) rotate(90deg)',
                                    },
                                    transition: 'all 0.3s ease',
                                  }}
                                  disabled={loading}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Box>
                              <Box
                                sx={{
                                  mt: 2,
                                  p: 2,
                                  bgcolor: '#E8F5E9',
                                  borderRadius: 2,
                                  textAlign: 'center',
                                  border: '2px solid #4CAF50',
                                }}
                              >
                                <Typography
                                  variant="h6"
                                  sx={{ 
                                    fontWeight: 800, 
                                    color: '#4CAF50', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: 1 
                                  }}
                                >
                                  <CheckCircleIcon fontSize="medium" />
                                  ¡Imagen lista!
                                </Typography>
                              </Box>
                            </Paper>
                          )}

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                            disabled={loading}
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
                                height: 16,
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
                            <Typography
                              variant="h6"
                              sx={{ 
                                mt: 2, 
                                textAlign: 'center', 
                                fontWeight: 800, 
                                color: '#00D4FF',
                              }}
                            >
                              Procesando {uploadProgress}%
                            </Typography>
                          </Box>
                        </Grow>
                      )}

                      {/* Botón Submit */}
                      <Button
                        fullWidth
                        variant="contained"
                        size="medium"
                        onClick={handleSubmit}
                        disabled={loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !fechaBoleta || !selectedFile}
                        startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SendIcon />}
                        sx={{
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: 800,
                          background: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !fechaBoleta || !selectedFile
                            ? '#CCCCCC'
                            : 'linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%)',
                          color: 'white',
                          borderRadius: 50,
                          boxShadow: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !fechaBoleta || !selectedFile
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
                            transform: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !fechaBoleta || !selectedFile ? 'none' : 'translateY(-4px)',
                            boxShadow: loading || !nombres || !apellidos || !rut || !email || !telefono || !direccion || !numeroBoleta || !fechaBoleta || !selectedFile
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
                          variant="h2"
                          sx={{
                            fontWeight: 900,
                            color: '#4CAF50',
                            mb: 2,
                            fontSize: { xs: '2.5rem', md: '3rem' },
                            textShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                          }}
                        >
                          ¡FELICIDADES! 🎉
                        </Typography>

                        <Typography variant="h5" sx={{ mb: 4, color: '#666', fontWeight: 600 }}>
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

          {/* Panel de Premios e Instrucciones - Debajo del formulario */}
          <Grid item xs={12} sm={10} md={6} lg={5}>
            {/* Card de Premios */}
            <Zoom in timeout={1200}>
              <Card
                sx={{
                  background: 'white',
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
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
                    height: '3px',
                    background: 'linear-gradient(90deg, #FFD700 0%, #FF6B35 100%)',
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 50,
                        height: 50,
                        mx: 'auto',
                        mb: 1,
                        bgcolor: '#FFF5F0',
                        border: '3px solid #FFD700',
                        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                      }}
                    >
                      <TrophyIcon
                        sx={{
                          fontSize: 30,
                          color: '#FF6B35',
                        }}
                      />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#FF6B35', fontSize: '1.1rem' }}>
                      PREMIOS
                    </Typography>
                  </Box>

                  <List sx={{ pt: 0 }}>
                    {[
                      { pos: '1°', title: 'Gran Premio', desc: 'Piscina completa + accesorios', color: '#FFD700', bg: '#FFFBEA' },
                      { pos: '2°', title: 'Segundo Premio', desc: 'Kit de mantenimiento', color: '#00D4FF', bg: '#F0FBFF' },
                      { pos: '3°', title: 'Tercer Premio', desc: 'Productos para piscina', color: '#4CAF50', bg: '#E8F5E9' },
                    ].map((premio, index) => (
                      <React.Fragment key={index}>
                        <ListItem
                          sx={{
                            borderRadius: 2,
                            mb: 1,
                            bgcolor: premio.bg,
                            transition: 'all 0.3s ease',
                            border: `2px solid ${premio.color}20`,
                            py: 0.5,
                            '&:hover': {
                              transform: 'translateX(4px)',
                              boxShadow: `0 2px 8px ${premio.color}40`,
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: premio.color,
                                fontWeight: 800,
                                width: 35,
                                height: 35,
                                fontSize: '0.9rem',
                                boxShadow: `0 2px 8px ${premio.color}60`,
                              }}
                            >
                              {premio.pos}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={premio.title}
                            secondary={premio.desc}
                            primaryTypographyProps={{
                              fontWeight: 800,
                              color: '#333',
                              fontSize: '0.85rem',
                            }}
                            secondaryTypographyProps={{
                              color: '#666',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        </ListItem>
                        {index < 2 && <Divider sx={{ my: 0.5 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Zoom>

            {/* Card de Requisitos */}
            <Zoom in timeout={1400}>
              <Card
                sx={{
                  background: 'white',
                  borderRadius: 2,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #00D4FF 0%, #4CAF50 100%)',
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#00D4FF', fontSize: '1rem' }}>
                      ✅ REQUISITOS
                    </Typography>
                  </Box>
                  
                  <List sx={{ pt: 0 }}>
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ Compra mínima de <strong style={{ color: '#FF6B35' }}>$5.000</strong>
                      </Typography>
                    </ListItem>
                    <Divider />
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ Fecha desde <strong style={{ color: '#00D4FF' }}>08-10-2025</strong>
                      </Typography>
                    </ListItem>
                    <Divider />
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ Una participación por boleta
                      </Typography>
                    </ListItem>
                    <Divider />
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ Múltiples boletas permitidas
                      </Typography>
                    </ListItem>
                    <Divider />
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ Imagen clara y legible
                      </Typography>
                    </ListItem>
                  </List>

                  <Box
                    sx={{
                      mt: 1.5,
                      p: 1.5,
                      bgcolor: '#FFF5F0',
                      borderRadius: 2,
                      border: '2px solid #FF6B35',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: '#FF6B35',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🏊</span>
                      ¡Suerte en el sorteo!
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