import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  Fade,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Divider,
  Stack,
  ButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { useSnackbar } from 'notistack';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  HotTub as HotTubIcon,
  Close as CloseIcon,
  NavigateBefore,
  NavigateNext,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  Bed as BedIcon,
  KingBed as KingBedIcon,
  DirectionsCar as CarIcon,
  LocationOn as LocationIcon,
  ContentCopy as CopyIcon,
  AccountBalance as BankIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import Carousel from 'react-material-ui-carousel';
import api from '../api/api';
import { enviarConfirmacionReservaCabana } from '../services/emailService';
import { useCabanaTutorial } from '../hooks/useCabanaTutorial';

// Colores ÚNICOS para cada cabaña (tonos VIBRANTES y brillantes)
const COLORES_CABANAS = {
  'path1': '#FF1744',  // Rojo vibrante
  'path2': '#FF6F00',  // Naranja intenso
  'path3': '#FFD600',  // Amarillo brillante
  'path4': '#00E676',  // Verde lima
  'path5': '#00BCD4',  // Cyan brillante
  'path6': '#2979FF',  // Azul eléctrico
  'path7': '#D500F9',  // Morado vibrante
  'path8': '#FF6D00',  // Naranja fuego
  'departamentoa': '#E91E63',  // Rosa fuerte
  'departamentob': '#9C27B0',  // Púrpura
  'departamentoA': '#E91E63',  // Rosa fuerte
  'departamentoB': '#9C27B0',  // Púrpura
};

// Mapeo de IDs del SVG a nombres de carpetas de imágenes
const ID_TO_FOLDER = {
  'path1': 'Cabaña 1',
  'path2': 'Cabaña 2',
  'path3': 'Cabaña 3',
  'path4': 'Cabaña 4',
  'path5': 'Cabaña 5',
  'path6': 'Cabaña 6',
  'path7': 'Cabaña 7',
  'path8': 'Cabaña 8',
  'departamentoa': 'Departamento A',
  'departamentob': 'Departamento B',
  'departamentoA': 'Departamento A',  // Con mayúscula también
  'departamentoB': 'Departamento B',  // Con mayúscula también
};

// Mapeo de IDs del SVG a nombres de cabañas para mostrar
const ID_TO_NOMBRE = {
  'path1': 'Cabaña 1',
  'path2': 'Cabaña 2',
  'path3': 'Cabaña 3',
  'path4': 'Cabaña 4',
  'path5': 'Cabaña 5',
  'path6': 'Cabaña 6',
  'path7': 'Cabaña 7',
  'path8': 'Cabaña 8',
  'departamentoa': 'Departamento A',
  'departamentob': 'Departamento B',
  'departamentoA': 'Departamento A',  // Con mayúscula también
  'departamentoB': 'Departamento B',  // Con mayúscula también
};

const ReservaCabanasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const svgContainerRef = useRef(null);
  const mapaRef = useRef(null);

  // Hook del tutorial de Shepherd.js
  const { resetTutorial } = useCabanaTutorial(svgContainerRef, mapaRef);

  // Estado para mostrar landing page o mapa
  const [mostrarMapa, setMostrarMapa] = useState(false);

  // Estados principales
  const [cabanas, setCabanas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [mantenciones, setMantenciones] = useState([]);
  const [tinajas, setTinajas] = useState([]);
  const [reservasTinajas, setReservasTinajas] = useState([]);
  const [selectedCabana, setSelectedCabana] = useState(null);
  const [loading, setLoading] = useState(true);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Estados para diálogo de reserva con Stepper
  const [openReservaDialog, setOpenReservaDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    cantidad_personas: 1,
    personas_extra: 0,
    cliente_nombre: '',
    cliente_apellido: '',
    cliente_telefono: '',
    cliente_email: '',
    cliente_rut: '',
    procedencia: '',
    tiene_auto: true,
    matriculas_auto: [''],
    fecha_inicio: null,
    fecha_fin: null,
    quiere_tinajas: false,
    tinajas_seleccionadas: [],
    metodo_pago: 'transferencia',
    tipo_pago: 'completo',
    estado_pago: 'pendiente',
    monto_pagado: 0,
    notas: '',
    codigo_descuento: '',
  });

  // Estado para carousel de imágenes
  const [carouselImages, setCarouselImages] = useState([]);
  // Estado para imágenes del carrusel hero
  const [heroCarouselImages, setHeroCarouselImages] = useState([]);

  // Estados para código de descuento
  const [codigoValidado, setCodigoValidado] = useState(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState('');

  // Pasarela de pago activa (khipu o webpay, cargado desde config)
  const [pasarelaPago, setPasarelaPago] = useState('khipu');

  // Estado para método de pago seleccionado
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(null); // 'transferencia', 'webpay' o 'khipu'
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reservaTransferenciaConfirmada, setReservaTransferenciaConfirmada] = useState(false);
  const [transferenciaHabilitada, setTransferenciaHabilitada] = useState(true); // Control de horario transferencias
  const [transferenciaEnviada, setTransferenciaEnviada] = useState(null); // null = no respondido, true = SI, false = NO
  const [tiempoRestante, setTiempoRestante] = useState(30 * 60); // 30 minutos en segundos
  const [fechaLimiteTransferencia, setFechaLimiteTransferencia] = useState(null);
  const [codigoUsoIncrementado, setCodigoUsoIncrementado] = useState(false); // Para evitar incrementar múltiples veces

  // Estado para comprobante de pago
  const [mostrarComprobante, setMostrarComprobante] = useState(false);
  const [datosComprobante, setDatosComprobante] = useState(null);

  // Estados para mejoras visuales
  const [disponibilidadHoy, setDisponibilidadHoy] = useState(0);
  const [disponibilidadFinSemana, setDisponibilidadFinSemana] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Efecto parallax para las imágenes del carousel
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 50]);

  // IDs de las cabañas en el SVG (exactamente como están en el archivo)
  const cabanaIds = [
    'path1',
    'path2',
    'path3',
    'path4',
    'path5',
    'path6',
    'path7',
    'path8',
    'departamentoA',  // ⚠️ MAYÚSCULA A
    'departamentoB'   // ⚠️ MAYÚSCULA B
  ];

  

  const steps = [
    'Info de Cabaña',
    'Personas y Fechas',
    'Tinajas (Opcional)',
    'Resumen y Pago'
  ];
  
  React.useEffect(() => {
    document.title = 'Reservas';

    // Cargar pasarela de pago activa
    api.get('/configuracion/pasarela')
      .then(r => { if (r.data.success) setPasarelaPago(r.data.pasarela); })
      .catch(() => {});

    // Verificar parámetros de URL para mensaje de pago
    const urlParams = new URLSearchParams(window.location.search);
    const pagoEstado = urlParams.get('pago');
    const reservaId = urlParams.get('reserva_id');

    if (pagoEstado === 'exitoso' && reservaId) {
      console.log(`💳 Pago exitoso detectado. Cargando reserva #${reservaId}`);

      // Cargar datos de la reserva para mostrar comprobante
      api.get(`/cabanas/reservas/${reservaId}`)
        .then(response => {
          console.log('📦 Respuesta de reserva:', response.data);

          if (response.data?.reserva) {
            setDatosComprobante(response.data.reserva);
            setMostrarComprobante(true);
            enqueueSnackbar(`✅ ¡Pago exitoso! Tu reserva #${reservaId} ha sido confirmada.`, {
              variant: 'success',
              autoHideDuration: 5000
            });

            // 📧 Enviar email de confirmación al cliente
            enviarConfirmacionReservaCabana(response.data.reserva)
              .then(emailResult => {
                if (emailResult.success) {
                  console.log('✅ Email de confirmación enviado correctamente');
                  enqueueSnackbar(`📧 Email de confirmación enviado a ${response.data.reserva.cliente_email}`, {
                    variant: 'info',
                    autoHideDuration: 4000
                  });
                } else {
                  console.error('❌ Error al enviar email:', emailResult.error);
                }
              })
              .catch(emailError => {
                console.error('❌ Error enviando email de confirmación:', emailError);
              });
          }

          // Limpiar parámetros de URL DESPUÉS de cargar datos
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch(error => {
          console.error('❌ Error al cargar datos de reserva:', error);
          enqueueSnackbar(`✅ ¡Pago exitoso! Tu reserva #${reservaId} ha sido confirmada. Revisa tu email.`, {
            variant: 'success',
            autoHideDuration: 8000
          });

          // Limpiar parámetros de URL incluso si hay error
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (pagoEstado === 'khipu_exitoso') {
      const paymentId = urlParams.get('payment_id');
      console.log(`💚 Pago Khipu detectado. payment_id=${paymentId}`);

      if (paymentId) {
        api.get(`/khipu/verificar/${paymentId}`)
          .then(response => {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (response.data.success && response.data.reserva_id) {
              return api.get(`/cabanas/reservas/${response.data.reserva_id}`);
            }
            enqueueSnackbar('✅ ¡Pago exitoso con Khipu! Tu reserva está siendo procesada. Revisa tu email.', {
              variant: 'success', autoHideDuration: 8000
            });
            return null;
          })
          .then(response => {
            if (response?.data?.reserva) {
              setDatosComprobante(response.data.reserva);
              setMostrarComprobante(true);
              enqueueSnackbar('✅ ¡Pago Khipu exitoso! Tu reserva ha sido confirmada.', {
                variant: 'success', autoHideDuration: 5000
              });
            }
          })
          .catch(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            enqueueSnackbar('✅ ¡Pago exitoso con Khipu! Tu reserva está siendo procesada. Revisa tu email.', {
              variant: 'success', autoHideDuration: 8000
            });
          });
      }
    } else if (pagoEstado === 'khipu_cancelado') {
      window.history.replaceState({}, document.title, window.location.pathname);
      enqueueSnackbar('❌ Pago con Khipu cancelado. Puedes intentarlo nuevamente.', {
        variant: 'warning', autoHideDuration: 6000
      });
    } else if (pagoEstado === 'error') {
      const codigo = urlParams.get('codigo');
      const error = urlParams.get('error');
      let mensaje = '❌ Error en el pago. Por favor, intenta nuevamente.';
      if (codigo) mensaje += ` (Código: ${codigo})`;
      if (error) mensaje += ` (${error})`;

      enqueueSnackbar(mensaje, {
        variant: 'error',
        autoHideDuration: 10000
      });
      // Limpiar parámetros de URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Restaurar título original al desmontar
    return () => {
      document.title = 'Intranet';
    };
  }, [enqueueSnackbar]);

  // ============================================
  // CONTADOR REGRESIVO PARA TRANSFERENCIAS
  // ============================================
  useEffect(() => {
    if (!reservaTransferenciaConfirmada || !fechaLimiteTransferencia) return;

    const interval = setInterval(() => {
      const ahora = new Date();
      const diferencia = Math.floor((fechaLimiteTransferencia - ahora) / 1000);

      if (diferencia <= 0) {
        setTiempoRestante(0);
        clearInterval(interval);
        // Aquí podrías agregar lógica para cancelar la reserva automáticamente
        enqueueSnackbar('⏰ El tiempo para completar la transferencia ha expirado', {
          variant: 'error',
          autoHideDuration: 8000
        });
      } else {
        setTiempoRestante(diferencia);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservaTransferenciaConfirmada, fechaLimiteTransferencia, enqueueSnackbar]);

  // ============================================
  // VERIFICAR HORARIO PARA TRANSFERENCIAS (8:00 - 16:30)
  // ============================================
  useEffect(() => {
    const verificarHorarioTransferencias = () => {
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutosActuales = ahora.getMinutes();
      const tiempoEnMinutos = horaActual * 60 + minutosActuales;
      const diaSemana = ahora.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

      const HORA_INICIO = 8 * 60; // 8:00 = 480 minutos
      const HORA_FIN = 16 * 60 + 30; // 16:30 = 990 minutos

      // Transferencias habilitadas solo si:
      // 1. Está en el horario permitido (8:00 - 16:30)
      // 2. NO es domingo (día 0)
      const habilitado = tiempoEnMinutos >= HORA_INICIO && tiempoEnMinutos <= HORA_FIN && diaSemana !== 0;

      // Si cambia el estado de habilitado
      if (transferenciaHabilitada !== habilitado) {
        setTransferenciaHabilitada(habilitado);

        // Si se deshabilita y el usuario tiene seleccionada transferencia, deseleccionar
        if (!habilitado && metodoPagoSeleccionado === 'transferencia') {
          setMetodoPagoSeleccionado(null);
          const mensaje = diaSemana === 0
            ? '🚫 Las transferencias bancarias no están disponibles los domingos. Por favor, usa WebPay.'
            : '⏰ Las transferencias bancarias ya no están disponibles (horario 8:00-16:30)';
          enqueueSnackbar(mensaje, {
            variant: 'warning',
            autoHideDuration: 6000
          });
        }
      }

      console.log(`⏰ Verificación horario transferencias: ${ahora.toLocaleTimeString('es-CL')} - ${habilitado ? 'HABILITADO' : 'DESHABILITADO'}`);
    };

    // Verificar inmediatamente al cargar
    verificarHorarioTransferencias();

    // Verificar cada minuto
    const interval = setInterval(verificarHorarioTransferencias, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [transferenciaHabilitada, metodoPagoSeleccionado, enqueueSnackbar]);

  const WHATSAPP_NUMBER = '+56942652034';

  // ============================================
  // FUNCIÓN PARA FORMATEAR TIEMPO RESTANTE
  // ============================================
  const formatearTiempoRestante = (segundos) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // FUNCIÓN PARA COPIAR AL PORTAPAPELES (Con fallback para HTTP)
  // ============================================

  const copiarAlPortapapeles = (texto) => {
    return new Promise((resolve) => {
      // Método 1: Clipboard API (solo funciona en HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(() => resolve(true))
          .catch(() => {
            // Si falla, intentar con el método fallback
            resolve(copiarConFallback(texto));
          });
      } else {
        // Si no existe clipboard API, usar fallback directamente
        resolve(copiarConFallback(texto));
      }
    });
  };

  const copiarConFallback = (texto) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      // Seleccionar el texto
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // Para iOS
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textarea.setSelectionRange(0, 999999);
      } else {
        textarea.select();
      }

      // Copiar
      const exitoso = document.execCommand('copy');
      document.body.removeChild(textarea);
      return exitoso;
    } catch (err) {
      console.error('Error en fallback:', err);
      return false;
    }
  };

  // ============================================
  // FUNCIÓN PARA NORMALIZAR NOMBRES
  // ============================================

  const normalizarNombre = (nombre) => {
    if (!nombre) return '';
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/\s+/g, ''); // Eliminar espacios
  };

  // ============================================
  // FUNCIONES AUXILIARES PARA MANEJO DE FECHAS
  // ============================================

  const parseServerDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatDateForServer = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para MOSTRAR fechas (sin problemas de zona horaria)
  const formatDateForDisplay = (date) => {
    if (!date) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isDateInRange = (date, startDate, endDate, includeEnd = false) => {
    if (!date || !startDate || !endDate) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Para mantenciones (includeEnd=true): incluir ambas fechas
    // Para reservas (includeEnd=false): el día de checkout no cuenta como ocupado
    if (includeEnd) {
      return d >= start && d <= end;
    } else {
      return d >= start && d < end;
    }
  };

  // Función para calcular disponibilidad
  const calcularDisponibilidad = () => {
    if (!cabanas.length) return;

    const hoy = getTodayDate();
    const proximoSabado = new Date(hoy);
    proximoSabado.setDate(hoy.getDate() + ((6 - hoy.getDay() + 7) % 7));

    const proximoDomingo = new Date(proximoSabado);
    proximoDomingo.setDate(proximoSabado.getDate() + 1);

    // Calcular cabañas disponibles HOY
    let disponiblesHoy = 0;
    cabanas.forEach(cabana => {
      const tieneReservaHoy = reservas.some(reserva => {
        if (reserva.estado === 'cancelada') return false;
        const inicio = parseServerDate(reserva.fecha_inicio);
        const fin = parseServerDate(reserva.fecha_fin);
        return reserva.cabana_id === cabana.id && isDateInRange(hoy, inicio, fin);
      });

      const tieneMantencionHoy = mantenciones.some(mant => {
        const inicio = parseServerDate(mant.fecha_inicio);
        const fin = parseServerDate(mant.fecha_fin);
        return mant.cabana_id === cabana.id && isDateInRange(hoy, inicio, fin, true);
      });

      if (!tieneReservaHoy && !tieneMantencionHoy) {
        disponiblesHoy++;
      }
    });

    // Calcular cabañas disponibles para el próximo FIN DE SEMANA (sábado-domingo)
    let disponiblesFinSemana = 0;
    cabanas.forEach(cabana => {
      const disponibleSabado = !reservas.some(reserva => {
        if (reserva.estado === 'cancelada') return false;
        const inicio = parseServerDate(reserva.fecha_inicio);
        const fin = parseServerDate(reserva.fecha_fin);
        return reserva.cabana_id === cabana.id && isDateInRange(proximoSabado, inicio, fin);
      }) && !mantenciones.some(mant => {
        const inicio = parseServerDate(mant.fecha_inicio);
        const fin = parseServerDate(mant.fecha_fin);
        return mant.cabana_id === cabana.id && isDateInRange(proximoSabado, inicio, fin, true);
      });

      const disponibleDomingo = !reservas.some(reserva => {
        if (reserva.estado === 'cancelada') return false;
        const inicio = parseServerDate(reserva.fecha_inicio);
        const fin = parseServerDate(reserva.fecha_fin);
        return reserva.cabana_id === cabana.id && isDateInRange(proximoDomingo, inicio, fin);
      }) && !mantenciones.some(mant => {
        const inicio = parseServerDate(mant.fecha_inicio);
        const fin = parseServerDate(mant.fecha_fin);
        return mant.cabana_id === cabana.id && isDateInRange(proximoDomingo, inicio, fin, true);
      });

      if (disponibleSabado && disponibleDomingo) {
        disponiblesFinSemana++;
      }
    });

    setDisponibilidadHoy(disponiblesHoy);
    setDisponibilidadFinSemana(disponiblesFinSemana);
  };

  // ============================================
  // CARGA DE DATOS
  // ============================================

  useEffect(() => {
    const inicializar = async () => {
      await cargarDatos();
      cargarSVG();
    };
    inicializar();
    cargarImagenesHero();
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, []);

  // Aplicar colores cuando cambien las cabañas o reservas Y el SVG esté cargado
  useEffect(() => {
    if (svgLoaded && cabanas.length > 0) {
      console.log(`🔄 Datos actualizados: ${cabanas.length} cabañas, ${reservas.length} reservas`);
      setTimeout(() => aplicarColores(), 100);
    }
  }, [cabanas, reservas, mantenciones, svgLoaded]);

  // Calcular disponibilidad cuando cambien los datos
  useEffect(() => {
    if (cabanas.length > 0) {
      calcularDisponibilidad();
    }
  }, [cabanas, reservas, mantenciones]);

  // Cargar imágenes del carrusel hero
  const cargarImagenesHero = () => {
    try {
      // Importar todas las imágenes de la carpeta carrusel
      const imageContext = require.context('../images/carrusel', false, /\.(png|jpe?g|svg|webp)$/);
      const images = imageContext.keys().map(imageContext);
      setHeroCarouselImages(images);
      console.log('📸 Imágenes del carrusel hero cargadas:', images.length);
    } catch (error) {
      console.error('Error al cargar imágenes del carrusel hero:', error);
    }
  };

  const cargarDatos = async () => {
    try {
      const [cabanasRes, reservasRes, mantencionesRes, tinajasRes, reservasTinajasRes, temporadaRes] = await Promise.all([
        api.get('/cabanas/cabanas'),
        api.get('/cabanas/reservas'),
        api.get('/cabanas/mantenciones/activas'),
        api.get('/cabanas/tinajas'),
        api.get('/cabanas/tinajas/reservas'),
        api.get('/configuracion/temporada'),
      ]);

      const cabanasData = cabanasRes.data?.cabanas || [];
      console.log(`✅ Datos cargados: ${cabanasData.length} cabañas`);

      // Guardar en el estado
      setCabanas(cabanasData);
      setReservas(reservasRes.data?.reservas || []);
      setMantenciones(mantencionesRes.data?.mantenciones || []);
      setTinajas(tinajasRes.data?.tinajas || []);
      setReservasTinajas(reservasTinajasRes.data?.reservas || []);

      // Cargar temporada actual desde el servidor
      if (temporadaRes.data?.success) {
        setTemporadaActual(temporadaRes.data.temporada);
        console.log(`✅ Temporada actual: ${temporadaRes.data.temporada}`);
      }

      setLoading(false);

      // Exponer globalmente para acceso desde eventos
      if (!window.appState) window.appState = {};
      window.appState.cabanas = cabanasData;
    } catch (error) {
      console.error('Error al cargar datos:', error);
      enqueueSnackbar('Error al cargar datos', { variant: 'error' });
      setLoading(false);
    }
  };

  // ============================================
  // FUNCIÓN PARA CARGAR IMÁGENES DESDE CARPETAS
  // ============================================

  const cargarImagenesCabana = async (idCabana) => {
    try {
      // Obtener el nombre de carpeta correcto usando el mapeo
      const nombreCarpeta = ID_TO_FOLDER[idCabana.toLowerCase()];

      if (!nombreCarpeta) {
        console.warn(`❌ No se encontró mapeo para: ${idCabana}`);
        return [];
      }

      console.log(`🖼️ Cargando imágenes para: ${nombreCarpeta}`);

      // 🎯 Cargar el manifest de imágenes (generado con el script)
      const response = await fetch('/images-manifest.json');

      if (!response.ok) {
        console.error('❌ No se pudo cargar images-manifest.json');
        return [];
      }

      const manifest = await response.json();
      const imagenes = manifest[nombreCarpeta] || [];

      console.log(`📸 Imágenes cargadas para ${nombreCarpeta}:`, imagenes.length);
      console.log('   Imágenes:', imagenes);

      return imagenes;
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      return [];
    }
  };

  // ============================================
  // MANEJO DEL SVG
  // ============================================

  const cargarSVG = async () => {
    try {
      const response = await fetch('/plano1.svg');
      if (!response.ok) throw new Error(`Error al cargar SVG: ${response.status}`);
      const svgText = await response.text();

      if (svgContainerRef.current && svgText) {
        svgContainerRef.current.innerHTML = svgText;

        setTimeout(() => {
          aplicarColores();
          configurarEventos();
          setSvgLoaded(true);
        }, 50);
      }
    } catch (error) {
      console.error('❌ Error al cargar SVG:', error);
    }
  };

  const obtenerEstadoCabana = (cabanaId, cabanasArray = cabanas) => {
    const idNormalizado = cabanaId.toLowerCase();
    const nombreCabana = ID_TO_NOMBRE[idNormalizado];

    console.log(`🔍 Buscando cabaña: ID="${cabanaId}", Nombre="${nombreCabana}"`);
    console.log(`📊 Total cabañas en array: ${cabanasArray.length}`);

    if (!nombreCabana) {
      console.warn(`⚠️ No se encontró mapeo para ID: ${cabanaId}`);
      return {
        estado: 'disponible',
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42',
        idOriginal: cabanaId
      };
    }

    // Buscar la cabaña comparando nombres normalizados (sin espacios ni tildes)
    const cabana = cabanasArray.find(c => {
      const nombreDB = normalizarNombre(c.nombre);  // "cabaña1"
      const nombreBuscado = normalizarNombre(nombreCabana);  // "cabaña1"
      console.log(`  Comparando: DB="${nombreDB}" (${c.nombre}) vs Buscado="${nombreBuscado}" (${nombreCabana})`);
      return nombreDB === nombreBuscado;
    });

    if (!cabana) {
      console.error(`❌ No se encontró la cabaña "${nombreCabana}" en el array`);
      console.error(`   Cabañas disponibles:`, cabanas.map(c => c.nombre));
      return { 
        estado: 'disponible', 
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42',
        idOriginal: cabanaId,
        nombreCabana
      };
    }

    const hoy = getTodayDate();
    const reservaActiva = reservas.find(r => {
      if (r.cabana_id !== cabana.id) return false;
      if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      return isDateInRange(hoy, fechaInicio, fechaFin);
    });

    if (!reservaActiva) {
      return { 
        estado: 'disponible', 
        color: COLORES_CABANAS[idNormalizado] || '#FF8C42', 
        cabana,
        idOriginal: cabanaId,
        nombreCabana
      };
    }

    if (reservaActiva.estado_pago === 'pagado' || reservaActiva.estado === 'confirmada') {
      return { 
        estado: 'reservada-pagada', 
        color: '#4CAF50', 
        cabana, 
        reserva: reservaActiva,
        idOriginal: cabanaId,
        nombreCabana
      };
    } else {
      return { 
        estado: 'reservada-pendiente', 
        color: '#FFC107', 
        cabana, 
        reserva: reservaActiva,
        idOriginal: cabanaId,
        nombreCabana
      };
    }
  };

  const aplicarColores = () => {
    console.log('🎨 === APLICANDO COLORES ===');
    console.log('🎯 IDs que estamos buscando:', cabanaIds);

    // 🔥 Obtener el elemento SVG del contenedor
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) {
      console.error('❌ No se encontró elemento SVG en el contenedor');
      return;
    }

    cabanaIds.forEach(id => {
      // 🎯 Buscar usando querySelector en el contexto del SVG
      const elemento = svgElement.querySelector(`#${id}`);

      if (elemento) {
        const { color, nombreCabana } = obtenerEstadoCabana(id);

        console.log(`✅ ENCONTRADO: "${id}" - Aplicando color: ${color}`);

        // 🔥 FORZAR aplicación de color con máxima prioridad y contorno negro visible
        elemento.setAttribute('fill', color);
        elemento.setAttribute('fill-opacity', '0.25');  // Más opacidad para mejor visibilidad
        elemento.setAttribute('stroke', '#000000');  // Contorno NEGRO para mejor definición
        elemento.setAttribute('stroke-width', '2.5');  // Borde más grueso para mejor visibilidad
        elemento.style.setProperty('fill', color, 'important');
        elemento.style.setProperty('fill-opacity', '0.25', 'important');  // Más opacidad
        elemento.style.setProperty('stroke', '#000000', 'important');  // Negro
        elemento.style.setProperty('stroke-width', '2.5', 'important');  // Más grueso
        elemento.style.opacity = '1';
        elemento.style.transition = 'all 0.3s ease';
        elemento.style.cursor = 'pointer';
        elemento.style.filter = 'brightness(1.0) contrast(1.1)';  // Mejor contraste

        // 🔢 AGREGAR NÚMERO/LETRA EN EL CENTRO DEL POLÍGONO
        const bbox = elemento.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        // Extraer número o letra del nombre
        let label = nombreCabana;
        if (nombreCabana.includes('Path')) {
          label = nombreCabana.replace('Path', '').trim();
        } else if (nombreCabana.includes('Departamento')) {
          label = nombreCabana.replace('Departamento', '').trim();
        } else if (nombreCabana.includes('Cabaña')) {
          label = nombreCabana.replace('Cabaña', '').trim();
        }

        // Remover texto anterior si existe
        const existingText = svgElement.querySelector(`#text-${id}`);
        if (existingText) {
          existingText.remove();
        }

        // Crear texto SVG
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('id', `text-${id}`);
        textElement.setAttribute('x', centerX);
        textElement.setAttribute('y', centerY);
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'central');
        textElement.setAttribute('font-size', '24');
        textElement.setAttribute('font-weight', 'bold');
        textElement.setAttribute('fill', '#000000');
        textElement.setAttribute('stroke', '#FFFFFF');
        textElement.setAttribute('stroke-width', '3');
        textElement.setAttribute('paint-order', 'stroke');
        textElement.setAttribute('pointer-events', 'none');
        textElement.style.fontFamily = 'Arial, sans-serif';
        textElement.textContent = label;

        svgElement.appendChild(textElement);

        // Verificar que se aplicó
        const computedStyle = window.getComputedStyle(elemento);
        console.log(`   → Fill aplicado: ${computedStyle.fill}, Stroke: ${computedStyle.stroke}, Label: ${label}`);
      } else {
        console.error(`❌ NO ENCONTRADO: "${id}"`);
      }
    });

    console.log('🎨 === FIN APLICAR COLORES ===');
  };

  const configurarEventos = () => {
    console.log('🖱️ Configurando eventos click...');

    // 🔥 Obtener el elemento SVG del contenedor
    const svgElement = svgContainerRef.current?.querySelector('svg');
    if (!svgElement) {
      console.error('❌ No se encontró elemento SVG en el contenedor');
      return;
    }

    cabanaIds.forEach(id => {
      // 🎯 Buscar usando querySelector en el contexto del SVG
      const elemento = svgElement.querySelector(`#${id}`);

      if (elemento) {
        console.log(`✅ Click configurado para: "${id}"`);
        elemento.style.cursor = 'pointer';

        // Agregar atributo para debugging
        elemento.setAttribute('data-clickeable', 'true');
        elemento.setAttribute('data-cabana-id', id);

        const handleClick = async (e) => {
          console.log(`🖱️ CLICK detectado en: "${id}"`);
          e.stopPropagation();

          // Obtener cabañas del estado actual
          const cabanasActuales = window.appState?.cabanas || [];
          console.log(`📊 Cabañas disponibles en click: ${cabanasActuales.length}`);

          const resultado = obtenerEstadoCabana(id, cabanasActuales);
          console.log('🔍 Resultado de obtenerEstadoCabana:', resultado);

          const { cabana, nombreCabana, estado, reserva } = resultado;

          // Si no existe cabaña en BD, mostrar error
          if (!cabana) {
            console.error(`❌ No se encontró cabaña para ID="${id}", nombreCabana="${nombreCabana}"`);
            enqueueSnackbar(`⚠️ La cabaña "${nombreCabana || id}" no está registrada en el sistema. Contacta al administrador.`, {
              variant: 'warning',
              autoHideDuration: 5000
            });
            return;
          }

          const cabanaData = cabana;

          console.log('📦 Cabaña:', cabanaData);
          setSelectedCabana(cabanaData);

          // Cargar imágenes usando el ID
          const imagenes = await cargarImagenesCabana(id);
          console.log(`📸 Imágenes cargadas: ${imagenes.length}`);
          setCarouselImages(imagenes);

          // Abrir stepper directamente
          setFormData({
            cantidad_personas: cabanaData.capacidad_personas || 1,
            personas_extra: 0,
            cliente_nombre: '',
            cliente_apellido: '',
            cliente_telefono: '',
            cliente_email: '',
            cliente_rut: '',
            procedencia: '',
            tiene_auto: true,
            matriculas_auto: [''],
            fecha_inicio: null,
            fecha_fin: null,
            quiere_tinajas: false,
            tinajas_seleccionadas: [],
            metodo_pago: 'transferencia',
            tipo_pago: 'completo',
            estado_pago: 'pendiente',
            monto_pagado: 0,
            notas: '',
          });
          setActiveStep(0);
          setOpenReservaDialog(true);
        };

        elemento.addEventListener('click', handleClick);

        elemento.addEventListener('mouseenter', () => {
          elemento.setAttribute('fill-opacity', '0.45');
          elemento.setAttribute('stroke-width', '3.5');
          elemento.style.setProperty('fill-opacity', '0.45', 'important');
          elemento.style.setProperty('stroke-width', '3.5', 'important');
          elemento.style.setProperty('stroke', '#000000', 'important');  // Mantener negro
          elemento.style.filter = 'brightness(1.1) contrast(1.15) drop-shadow(0 0 10px rgba(0, 0, 0, 0.3))';
        });

        elemento.addEventListener('mouseleave', () => {
          elemento.setAttribute('fill-opacity', '0.25');
          elemento.setAttribute('stroke-width', '2.5');
          elemento.style.setProperty('fill-opacity', '0.25', 'important');
          elemento.style.setProperty('stroke-width', '2.5', 'important');
          elemento.style.setProperty('stroke', '#000000', 'important');  // Mantener negro
          elemento.style.filter = 'brightness(1.0) contrast(1.1)';
        });
      } else {
        console.warn(`❌ No se pudo configurar click para: "${id}"`);
      }
    });
  };

  // ============================================
  // CUSTOM DAY COMPONENT PARA CALENDAR
  // ============================================

  const renderDayWithStatus = (date, selectedDates, pickersDayProps, tipo) => {
    if (!selectedCabana) return <PickersDay {...pickersDayProps} />;

    let dayColor = null;
    let dayLabel = '';
    let isDisabled = false;
    let isCheckoutDay = false;

    // ============================================
    // PRIORIDAD 1: MANTENCIONES (Máxima prioridad)
    // ============================================
    const mantencionesEnDia = mantenciones.filter(m => {
      if (m.cabana_id !== selectedCabana.id) return false;
      if (m.estado === 'cancelada') return false;

      const fechaInicio = parseServerDate(m.fecha_inicio);
      const fechaFin = parseServerDate(m.fecha_fin);

      // Para mantenciones: incluir tanto fecha_inicio como fecha_fin (ambos días bloqueados)
      return isDateInRange(date, fechaInicio, fechaFin, true);
    });

    if (mantencionesEnDia.length > 0) {
      const mantencion = mantencionesEnDia[0];
      dayColor = '#8D6E63'; // Color café/marrón para mantención
      dayLabel = `🔧 En Mantención: ${mantencion.motivo || 'Mantención preventiva'}`;
      isDisabled = true;

      return (
        <Tooltip title={dayLabel} arrow>
          <span>
            <PickersDay
              {...pickersDayProps}
              disabled={true}
              sx={{
                backgroundColor: dayColor,
                color: '#fff',
                fontWeight: 'bold',
                textDecoration: 'line-through',
                '&:hover': {
                  backgroundColor: dayColor,
                  filter: 'brightness(0.9)',
                },
              }}
            />
          </span>
        </Tooltip>
      );
    }

    // ============================================
    // CALENDARIO DE CHECKOUT - Lógica especial
    // ============================================
    if (tipo === 'fin' && formData.fecha_inicio) {
      const fechaInicioUsuario = new Date(formData.fecha_inicio);

      // Verificar si el usuario seleccionó un día de checkout (naranja) como check-in
      const reservaCheckoutEnInicio = reservas.find(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

        const fechaFin = parseServerDate(r.fecha_fin);
        return isSameDay(fechaInicioUsuario, fechaFin);
      });

      if (reservaCheckoutEnInicio) {
        // El usuario entró en un día de checkout (naranja)
        // AUTOMÁTICAMENTE: El día siguiente debe ser celeste (su checkout coincide con check-in existente)
        const diaSiguiente = new Date(fechaInicioUsuario);
        diaSiguiente.setDate(diaSiguiente.getDate() + 1);

        // Verificar si hay una reserva que empieza el día siguiente
        const reservaDiaSiguiente = reservas.find(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

          const fechaInicio = parseServerDate(r.fecha_inicio);
          return isSameDay(diaSiguiente, fechaInicio);
        });

        if (reservaDiaSiguiente && isSameDay(date, diaSiguiente)) {
          // Este día (día siguiente al check-in) es CELESTE
          dayColor = '#00BCD4'; // Celeste
          dayLabel = '✅ Checkout a las 12hrs / Check-in del otro reservante a las 14hrs';
          isDisabled = false;

          return (
            <Tooltip title={dayLabel} arrow>
              <span>
                <PickersDay
                  {...pickersDayProps}
                  disabled={isDisabled || pickersDayProps.disabled}
                  sx={{
                    backgroundColor: dayColor,
                    color: '#fff',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: dayColor,
                      filter: 'brightness(1.1)',
                    },
                  }}
                />
              </span>
            </Tooltip>
          );
        }

        // RESTRINGIR: Bloquear TODOS los checkouts (morados y naranjas) excepto el celeste
        const esOtroCheckout = reservas.some(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

          const fechaFin = parseServerDate(r.fecha_fin);
          // Bloquear cualquier checkout que NO sea el día siguiente (celeste)
          return isSameDay(date, fechaFin) && !isSameDay(date, diaSiguiente);
        });

        if (esOtroCheckout) {
          // Deshabilitar todos los checkouts excepto el celeste
          isDisabled = true;
        }
      }
    }

    // PRIMERO: Buscar reservas activas en este día (días ocupados entre check-in y check-out)
    const reservasEnDia = reservas.filter(r => {
      if (r.cabana_id !== selectedCabana.id) return false;
      if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

      const fechaInicio = parseServerDate(r.fecha_inicio);
      const fechaFin = parseServerDate(r.fecha_fin);

      // Un día está ocupado si está ENTRE check-in (inclusive) y check-out (exclusive)
      return isDateInRange(date, fechaInicio, fechaFin);
    });

    if (reservasEnDia.length > 0) {
      // ⛔ Día OCUPADO (entre check-in y check-out)
      const reserva = reservasEnDia[0];
      isDisabled = true;

      // Validar por estado de pago O por estado de reserva
      if (reserva.estado_pago === 'pagado' || reserva.estado === 'confirmada' || reserva.check_in_realizado) {
        dayColor = '#F44336'; // Rojo fuerte para fechas OCUPADAS
        dayLabel = '🚫 Ocupada (Pagada o Check-in)';
      } else if (reserva.estado_pago === 'pendiente' || reserva.estado === 'pendiente') {
        dayColor = '#FFC107'; // Amarillo para pendientes
        dayLabel = '⚠️ Pendiente de pago';
      }
    } else {
      // SEGUNDO: Verificar si es día de CHECKOUT (disponible para nuevo check-in)
      const reservasCheckout = reservas.filter(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

        const fechaFin = parseServerDate(r.fecha_fin);
        return isSameDay(date, fechaFin);
      });

      if (reservasCheckout.length > 0) {
        // Verificar si hay una reserva que empieza el día siguiente (conflicto de mismo día)
        const diaSiguiente = new Date(date);
        diaSiguiente.setDate(diaSiguiente.getDate() + 1);

        const reservaDiaSiguiente = reservas.find(r => {
          if (r.cabana_id !== selectedCabana.id) return false;
          if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

          const fechaInicio = parseServerDate(r.fecha_inicio);
          return isSameDay(diaSiguiente, fechaInicio);
        });

        if (reservaDiaSiguiente) {
          // ⚠️ DISPONIBLE pero con horarios ajustados: Hay una reserva que empieza al día siguiente
          // Checkout a las 12hrs, puede ingresar desde las 14hrs
          isCheckoutDay = true;
          dayColor = '#FF9800'; // Naranja para indicar checkout con reserva siguiente
          dayLabel = '✅ Disponible - Checkout 12hrs / Check-in desde 14hrs';
          isDisabled = false; // ✅ PERMITIR SELECCIONAR
        } else {
          // ✅ Es día de CHECKOUT - DISPONIBLE para nueva reserva
          isCheckoutDay = true;
          dayColor = '#9C27B0'; // Morado para checkout
          dayLabel = '✅ Disponible (Checkout)';
          isDisabled = false; // ✅ PERMITIR SELECCIONAR
        }
      }
    }

    return (
      <Tooltip title={dayLabel || 'Disponible'} arrow>
        <span>
          <PickersDay
            {...pickersDayProps}
            disabled={isDisabled || pickersDayProps.disabled}
            sx={{
              ...(dayColor && {
                backgroundColor: dayColor,
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: dayColor,
                  opacity: 0.8,
                },
                '&.Mui-disabled': {
                  backgroundColor: dayColor,
                  color: 'white',
                  opacity: 0.7,
                },
                // Estilo especial para días de checkout (no disabled)
                ...(isCheckoutDay && {
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#7B1FA2',
                    opacity: 1,
                  },
                }),
              }),
            }}
          />
        </span>
      </Tooltip>
    );
  };

  // ============================================
  // RENDERIZADO DE TINAJAS GRÁFICO
  // ============================================

  const renderTinajasVisual = () => {
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#FFF3E0',
            borderRadius: 3,
            border: '2px dashed #FFB74D'
          }}
        >
          <CalendarIcon sx={{ fontSize: 60, color: '#FFB74D', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Primero selecciona las fechas de la reserva
          </Typography>
        </Paper>
      );
    }

    // 🔍 DEBUG: Log TODAS las reservas de tinajas cargadas
    console.log('🔍 === DEBUG RESERVAS TINAJAS ===');
    console.log(`📊 Total reservas tinajas: ${reservasTinajas.length}`);
    reservasTinajas.forEach((rt, idx) => {
      console.log(`${idx + 1}. Tinaja ID: ${rt.tinaja_id}, Fecha: ${rt.fecha_uso}`);
    });
    console.log('🔍 === FIN DEBUG ===');

    const fechas = [];
    let currentDate = new Date(formData.fecha_inicio);
    const endDate = new Date(formData.fecha_fin);

    // Excluir el último día (checkout)
    while (currentDate < endDate) {
      fechas.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
          Selecciona Tinajas y Fechas
        </Typography>

        <Grid container spacing={3}>
          {tinajas.map(tinaja => (
            <Grid item xs={12} sm={6} md={4} key={tinaja.id}>
              <Card
                elevation={3}
                sx={{
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  p: 2,
                  color: 'white'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HotTubIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {tinaja.nombre || `Tinaja ${tinaja.numero}`}
                    </Typography>
                  </Box>
                </Box>

                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {fechas.map((fecha, idx) => {
                      const fechaStr = formatDateForServer(fecha);

                      // 🔍 DEBUG detallado de comparación de fechas
                      console.log(`\n🔍 Verificando fecha ${fechaStr} para tinaja "${tinaja.nombre}" (ID: ${tinaja.id})`);

                      // Verificar si esta fecha está ocupada
                      const estaOcupada = reservasTinajas.some(rt => {
                        // Log cada reserva que se está verificando
                        console.log(`  📋 Comparando con reserva: Tinaja ID ${rt.tinaja_id}, Fecha original: "${rt.fecha_uso}"`);

                        if (rt.tinaja_id !== tinaja.id) {
                          console.log(`  ⏩ SKIP - Diferente tinaja (${rt.tinaja_id} vs ${tinaja.id})`);
                          return false;
                        }

                        const fechaUsoReserva = formatDateForServer(parseServerDate(rt.fecha_uso));
                        const ocupada = fechaUsoReserva === fechaStr;

                        console.log(`  ⚙️ Procesada: "${rt.fecha_uso}" → Parseada → Formateada: "${fechaUsoReserva}"`);
                        console.log(`  🔍 Comparación: "${fechaUsoReserva}" === "${fechaStr}" → ${ocupada ? '✅ OCUPADA' : '❌ Libre'}`);

                        // Debug: mostrar en consola las comparaciones
                        if (ocupada) {
                          console.log(`  🚫 ¡¡¡FECHA OCUPADA!!! Tinaja ${tinaja.nombre}:`, {
                            fechaReserva: fechaUsoReserva,
                            fechaSeleccionada: fechaStr,
                            tinaja_id: rt.tinaja_id
                          });
                        }

                        return ocupada;
                      });

                      const estaSeleccionada = formData.tinajas_seleccionadas.some(ts =>
                        ts.tinaja_id === tinaja.id && formatDateForServer(ts.fecha_uso) === fechaStr
                      );

                      const handleClickFecha = () => {
                        if (estaOcupada) return;

                        if (estaSeleccionada) {
                          setFormData(prev => ({
                            ...prev,
                            tinajas_seleccionadas: prev.tinajas_seleccionadas.filter(ts =>
                              !(ts.tinaja_id === tinaja.id && formatDateForServer(ts.fecha_uso) === fechaStr)
                            )
                          }));
                        } else {
                          const temporada = getTemporadaActual();
                          const precio = temporada === 'alta'
                            ? tinaja.precio_temporada_alta
                            : tinaja.precio_temporada_baja;

                          setFormData(prev => ({
                            ...prev,
                            tinajas_seleccionadas: [
                              ...prev.tinajas_seleccionadas,
                              {
                                tinaja_id: tinaja.id,
                                tinaja_nombre: tinaja.nombre || `Tinaja ${tinaja.numero}`,
                                fecha_uso: fecha,
                                precio_dia: precio,
                              }
                            ]
                          }));
                        }
                      };

                      return (
                        <Chip
                          key={idx}
                          label={`${fecha.getDate()}/${fecha.getMonth() + 1}`}
                          size="medium"
                          onClick={handleClickFecha}
                          disabled={estaOcupada}
                          sx={{
                            bgcolor: estaOcupada ? '#FFCDD2' : estaSeleccionada ? '#4CAF50' : '#E0E0E0',
                            color: estaSeleccionada || estaOcupada ? 'white' : 'inherit',
                            fontWeight: estaSeleccionada ? 700 : 400,
                            cursor: estaOcupada ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            '&:hover': !estaOcupada ? {
                              bgcolor: estaSeleccionada ? '#45a049' : '#BDBDBD',
                            } : {},
                          }}
                        />
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Precio:
                    </Typography>
                    <Chip
                      label={`$${(getTemporadaActual() === 'alta'
                        ? tinaja.precio_temporada_alta
                        : tinaja.precio_temporada_baja)?.toLocaleString('es-CL')}/día`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {formData.tinajas_seleccionadas.length > 0 && (
          <Paper elevation={3} sx={{ mt: 4, p: 3, bgcolor: '#E8F5E9', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#2E7D32' }}>
              Tinajas Seleccionadas ({formData.tinajas_seleccionadas.length})
            </Typography>
            <Stack spacing={1}>
              {formData.tinajas_seleccionadas.map((ts, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {ts.tinaja_nombre} - {formatDateForServer(ts.fecha_uso)}
                  </Typography>
                  <Chip
                    label={`$${ts.precio_dia?.toLocaleString('es-CL')}`}
                    color="success"
                    size="small"
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    );
  };

  // ============================================
  // LÓGICA DE STEPPER Y RESERVA
  // ============================================

  // Estado para temporada (se carga desde el servidor)
  const [temporadaActual, setTemporadaActual] = useState('baja');

  const getTemporadaActual = () => {
    return temporadaActual;
  };

  const getPrecioActual = (cabana) => {
    if (!cabana) return 0;
    const temporada = getTemporadaActual();

    // Usar precios de temporada si existen, sino usar los precios antiguos como fallback
    if (temporada === 'alta') {
      return cabana.precio_temporada_alta || cabana.precio_fin_semana || cabana.precio_noche;
    } else {
      return cabana.precio_temporada_baja || cabana.precio_noche;
    }
  };

  const calcularCostoPersonasExtra = () => {
    if (!selectedCabana || !formData.fecha_inicio || !formData.fecha_fin) return 0;

    const capacidad = selectedCabana.capacidad_personas || 0;
    const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

    // Calcular cantidad de noches
    const fechaInicio = new Date(formData.fecha_inicio);
    const fechaFin = new Date(formData.fecha_fin);
    const diffTime = Math.abs(fechaFin - fechaInicio);
    const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // $20,000 por persona extra POR NOCHE
    return personasExtra * 20000 * cantidadNoches;
  };

  // Calcular subtotal SIN descuento
  const calcularPrecioTotal = () => {
    if (!selectedCabana || !formData.fecha_inicio || !formData.fecha_fin) return 0;

    const fechaInicio = new Date(formData.fecha_inicio);
    const fechaFin = new Date(formData.fecha_fin);
    const diffTime = Math.abs(fechaFin - fechaInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const precioNoche = getPrecioActual(selectedCabana);
    const costoPersonasExtra = calcularCostoPersonasExtra();
    const costoTinajas = formData.tinajas_seleccionadas.reduce((sum, t) => sum + parseFloat(t.precio_dia || 0), 0);

    return (precioNoche * diffDays) + costoPersonasExtra + costoTinajas;
  };

  // Calcular total CON descuento aplicado
  const calcularTotalConDescuento = () => {
    const subtotal = calcularPrecioTotal();
    const descuento = calcularDescuento(subtotal);
    return subtotal - descuento;
  };

  // Calcular monto a pagar según tipo de pago (completo o mitad)
  const calcularMontoAPagar = () => {
    const totalConDescuento = calcularTotalConDescuento();
    return formData.tipo_pago === 'mitad' ? totalConDescuento / 2 : totalConDescuento;
  };

  // Función para validar código de descuento
  const validarCodigoDescuento = async () => {
    if (!formData.codigo_descuento || formData.codigo_descuento.trim() === '') {
      setErrorCodigo('Ingresa un código');
      return;
    }

    // Validar que haya fechas seleccionadas
    if (!formData.fecha_inicio || !formData.fecha_fin) {
      setErrorCodigo('Primero selecciona las fechas de tu reserva');
      return;
    }

    setValidandoCodigo(true);
    setErrorCodigo('');

    try {
      const response = await api.post('/codigos-descuento/validar', {
        codigo: formData.codigo_descuento.trim(),
        cabana_id: selectedCabana?.id, // Enviar ID de cabaña para verificar si aplica
        fecha_inicio_reserva: formData.fecha_inicio, // Enviar fechas para validar rango
        fecha_fin_reserva: formData.fecha_fin
      });

      if (response.data.success && response.data.valido) {
        setCodigoValidado(response.data.data);
        setCodigoUsoIncrementado(false); // Resetear para el nuevo código
        enqueueSnackbar(`✅ Código aplicado: ${response.data.data.descripcion}`, { variant: 'success' });
      } else {
        setErrorCodigo('Código no válido');
        setCodigoValidado(null);
        setCodigoUsoIncrementado(false);
      }
    } catch (error) {
      console.error('Error al validar código:', error);
      setErrorCodigo(error.response?.data?.message || 'Código no válido');
      setCodigoValidado(null);
      setCodigoUsoIncrementado(false);
    } finally {
      setValidandoCodigo(false);
    }
  };

  // Función para calcular descuento
  const calcularDescuento = (subtotal) => {
    if (!codigoValidado) return 0;

    if (codigoValidado.tipo_descuento === 'porcentaje') {
      const descuento = subtotal * (parseFloat(codigoValidado.valor_descuento) / 100);
      return descuento;
    } else if (codigoValidado.tipo_descuento === 'monto_fijo') {
      const descuento = parseFloat(codigoValidado.valor_descuento);
      // El descuento no puede ser mayor al subtotal
      return Math.min(descuento, subtotal);
    }
    return 0;
  };

  // Función para formatear RUT chileno mientras el usuario escribe
  const formatearRUT = (rut) => {
    // Eliminar caracteres no válidos
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');

    if (rutLimpio.length === 0) return '';
    if (rutLimpio.length === 1) return rutLimpio;

    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    // Formatear el cuerpo con puntos
    let cuerpoFormateado = '';
    let contador = 0;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      if (contador > 0 && contador % 3 === 0) {
        cuerpoFormateado = '.' + cuerpoFormateado;
      }
      cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
      contador++;
    }

    return `${cuerpoFormateado}-${dv}`;
  };

  // Función para validar RUT chileno
  const validarRUT = (rut) => {
    if (!rut) return true; // RUT es opcional

    // Limpiar RUT
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 2) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvCalculado;
  };

  // Handler para el cambio de RUT con formateo en vivo
  const handleRUTChange = (e) => {
    const valor = e.target.value;
    const rutFormateado = formatearRUT(valor);
    setFormData({ ...formData, cliente_rut: rutFormateado });
  };

  // Función para formatear teléfono chileno mientras el usuario escribe
  const formatearTelefono = (telefono) => {
    // Eliminar todo excepto números
    const numeroLimpio = telefono.replace(/\D/g, '');

    // Si está vacío, retornar el prefijo
    if (numeroLimpio.length === 0) return '+569';

    // Si empieza con 56, quitar ese prefijo
    let numero = numeroLimpio;
    if (numero.startsWith('56')) {
      numero = numero.slice(2);
    }

    // Si empieza con 9, mantenerlo
    if (numero.startsWith('9')) {
      // Limitar a 9 dígitos (9 + 8 dígitos)
      numero = numero.slice(0, 9);
      return `+569${numero.slice(1)}`;
    }

    // Si no empieza con 9, agregarlo
    numero = numero.slice(0, 8);
    return `+569${numero}`;
  };

  // Handler para el cambio de teléfono con formateo en vivo
  const handleTelefonoChange = (e) => {
    const valor = e.target.value;

    // Si el usuario borra todo, dejar el campo vacío (no forzar +569)
    if (valor === '' || valor === '+' || valor === '+5' || valor === '+56') {
      setFormData({ ...formData, cliente_telefono: '' });
      return;
    }

    // Si el usuario está escribiendo y tiene contenido, formatear
    if (valor.length > 0) {
      const telefonoFormateado = formatearTelefono(valor);
      setFormData({ ...formData, cliente_telefono: telefonoFormateado });
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep((prev) => prev + 1);
      return;
    }

    if (activeStep === 1) {
      // Validar cantidad de personas
      if (!formData.cantidad_personas || formData.cantidad_personas < 1) {
        enqueueSnackbar('Debe ingresar al menos 1 persona', { variant: 'warning' });
        return;
      }

      // Validar nombre (sin números)
      if (!formData.cliente_nombre || formData.cliente_nombre.trim() === '') {
        enqueueSnackbar('El nombre es requerido', { variant: 'warning' });
        return;
      }
      if (/\d/.test(formData.cliente_nombre)) {
        enqueueSnackbar('El nombre no puede contener números', { variant: 'warning' });
        return;
      }

      // Validar teléfono (formato +569XXXXXXXX)
      if (!formData.cliente_telefono || formData.cliente_telefono.trim() === '') {
        enqueueSnackbar('El teléfono es requerido', { variant: 'warning' });
        return;
      }
      const telefonoLimpio = formData.cliente_telefono.replace(/\s/g, '');
      if (!/^\+569\d{8}$/.test(telefonoLimpio)) {
        enqueueSnackbar('El teléfono debe tener formato +569XXXXXXXX (ejemplo: +56912345678)', { variant: 'warning' });
        return;
      }

      // Validar email (OBLIGATORIO)
      if (!formData.cliente_email || formData.cliente_email.trim() === '') {
        enqueueSnackbar('El email es requerido para enviar la confirmación', { variant: 'warning' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.cliente_email)) {
        enqueueSnackbar('El email no tiene un formato válido', { variant: 'warning' });
        return;
      }

      // Validar RUT (OBLIGATORIO)
      if (!formData.cliente_rut || formData.cliente_rut.trim() === '') {
        enqueueSnackbar('El RUT es requerido', { variant: 'warning' });
        return;
      }
      if (!validarRUT(formData.cliente_rut)) {
        enqueueSnackbar('El RUT no es válido', { variant: 'warning' });
        return;
      }

      // Validar fechas
      if (!formData.fecha_inicio || !formData.fecha_fin) {
        enqueueSnackbar('Debe seleccionar fechas de inicio y fin', { variant: 'warning' });
        return;
      }

      // Validar que no sean fechas pasadas
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fechaInicio = new Date(formData.fecha_inicio);
      fechaInicio.setHours(0, 0, 0, 0);

      if (fechaInicio < hoy) {
        enqueueSnackbar('No se pueden hacer reservas en fechas pasadas', { variant: 'warning' });
        return;
      }

      if (formData.fecha_fin <= formData.fecha_inicio) {
        enqueueSnackbar('La fecha de fin debe ser posterior a la fecha de inicio', { variant: 'warning' });
        return;
      }

      // Validar que las fechas seleccionadas no tengan conflictos con reservas existentes
      const fechaInicioSeleccionada = new Date(formData.fecha_inicio);
      const fechaFinSeleccionada = new Date(formData.fecha_fin);
      fechaInicioSeleccionada.setHours(0, 0, 0, 0);
      fechaFinSeleccionada.setHours(0, 0, 0, 0);

      const reservaConflicto = reservas.find(r => {
        if (r.cabana_id !== selectedCabana.id) return false;
        if (r.estado === 'cancelada' || r.estado === 'temporal') return false;

        const fechaInicio = parseServerDate(r.fecha_inicio);
        const fechaFin = parseServerDate(r.fecha_fin);

        // Verificar si hay solapamiento de fechas
        return (
          (fechaInicioSeleccionada >= fechaInicio && fechaInicioSeleccionada < fechaFin) ||
          (fechaFinSeleccionada > fechaInicio && fechaFinSeleccionada <= fechaFin) ||
          (fechaInicioSeleccionada <= fechaInicio && fechaFinSeleccionada >= fechaFin)
        );
      });

      if (reservaConflicto) {
        const estadoReserva = reservaConflicto.estado_pago === 'pagado' ? 'Pagada' : 'Pago Pendiente';
        enqueueSnackbar(
          `❌ Las fechas seleccionadas están ocupadas. La cabaña tiene una reserva del ${formatDateForServer(parseServerDate(reservaConflicto.fecha_inicio))} al ${formatDateForServer(parseServerDate(reservaConflicto.fecha_fin))} (${estadoReserva})`,
          { variant: 'error', autoHideDuration: 7000 }
        );
        return;
      }
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // ============================================
  // MANEJO DE PAGO CON TRANSFERENCIA
  // ============================================
  const handlePagoTransferencia = async () => {
    try {
      setProcesandoPago(true);

      // ============================================
      // VERIFICAR HORARIO PERMITIDO (8:00 - 16:30) Y QUE NO SEA DOMINGO
      // ============================================
      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutosActuales = ahora.getMinutes();
      const tiempoEnMinutos = horaActual * 60 + minutosActuales;
      const diaSemana = ahora.getDay(); // 0 = domingo

      const HORA_INICIO = 8 * 60; // 8:00 = 480 minutos
      const HORA_FIN = 16 * 60 + 30; // 16:30 = 990 minutos

      // Verificar si es domingo
      if (diaSemana === 0) {
        enqueueSnackbar(
          '🚫 Los pagos por transferencia no están disponibles los domingos. Por favor, usa WebPay para completar tu reserva.',
          { variant: 'error', autoHideDuration: 7000 }
        );
        setProcesandoPago(false);
        return;
      }

      // Verificar horario
      if (tiempoEnMinutos < HORA_INICIO || tiempoEnMinutos > HORA_FIN) {
        enqueueSnackbar(
          '⏰ Los pagos por transferencia solo están disponibles entre las 8:00 y 16:30 hrs',
          { variant: 'error', autoHideDuration: 6000 }
        );
        setProcesandoPago(false);
        return;
      }

      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const precioNoche = getPrecioActual(selectedCabana);
      const costoPersonasExtra = calcularCostoPersonasExtra();

      // Calcular total con descuento
      const subtotalSinDescuento = calcularPrecioTotal();
      const descuento = calcularDescuento(subtotalSinDescuento);
      const precioTotal = subtotalSinDescuento - descuento;

      const capacidad = selectedCabana.capacidad_personas || 0;
      const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

      // Calcular monto a pagar según tipo_pago (completo o mitad)
      const montoPagar = formData.tipo_pago === 'mitad' ? precioTotal / 2 : precioTotal;

      // ============================================
      // CALCULAR FECHA LÍMITE (30 MINUTOS)
      // ============================================
      const fechaLimite = new Date();
      fechaLimite.setMinutes(fechaLimite.getMinutes() + 30);

      // Verificar que no exceda las 16:30
      const horaLimite = fechaLimite.getHours() * 60 + fechaLimite.getMinutes();
      if (horaLimite > HORA_FIN) {
        enqueueSnackbar(
          '⏰ Es muy tarde para procesar transferencias hoy. Intenta antes de las 16:00 hrs',
          { variant: 'error', autoHideDuration: 6000 }
        );
        setProcesandoPago(false);
        return;
      }

      const reservaData = {
        cabana_id: selectedCabana.id,
        cliente_nombre: formData.cliente_nombre,
        cliente_apellido: formData.cliente_apellido,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email,
        cliente_rut: formData.cliente_rut,
        procedencia: formData.procedencia,
        matriculas_auto: formData.matriculas_auto.filter(m => m.trim() !== ''),
        fecha_inicio: formatDateForServer(formData.fecha_inicio),
        fecha_fin: formatDateForServer(formData.fecha_fin),
        cantidad_personas: formData.cantidad_personas,
        personas_extra: personasExtra,
        costo_personas_extra: costoPersonasExtra,
        cantidad_noches: cantidadNoches,
        precio_por_noche: precioNoche,
        precio_total: precioTotal,
        precio_final: precioTotal,
        descuento: descuento,
        codigo_descuento: codigoValidado?.codigo || null,
        estado: 'pendiente',
        metodo_pago: 'transferencia',
        tipo_pago: formData.tipo_pago,
        estado_pago: 'pendiente',
        monto_pagado: 0,
        fecha_limite_pago: fechaLimite.toISOString(),
        origen: 'manual',
        notas: formData.notas,
        usuario_creacion: 'cliente',
        tinajas: formData.tinajas_seleccionadas.map(t => ({
          tinaja_id: t.tinaja_id,
          fecha_uso: formatDateForServer(t.fecha_uso),
          precio_dia: t.precio_dia,
        })),
      };

      const response = await api.post('/cabanas/reservas/publico', reservaData);

      // Incrementar uso del código de descuento si existe (solo una vez)
      if (codigoValidado && !codigoUsoIncrementado) {
        try {
          await api.post('/codigos-descuento/incrementar-uso', {
            codigo_id: codigoValidado.id
          });
          setCodigoUsoIncrementado(true);
        } catch (error) {
          console.error('Error al incrementar uso del código:', error);
        }
      }

      enqueueSnackbar('✅ Reserva creada. Tienes 30 minutos para enviar el comprobante de transferencia', {
        variant: 'success',
        autoHideDuration: 6000
      });

      // Mostrar información de pago
      const mensaje = `Debes transferir: $${montoPagar.toLocaleString('es-CL')}\n\n⏰ Tienes hasta las ${fechaLimite.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} para enviar el comprobante.\n\n⚠️ Si no envías el comprobante en 30 minutos, la reserva será eliminada automáticamente.`;

      enqueueSnackbar(mensaje, {
        variant: 'warning',
        autoHideDuration: 10000
      });

      // Activar el estado para mostrar la pregunta de confirmación
      setReservaTransferenciaConfirmada(true);
      setFechaLimiteTransferencia(fechaLimite);
      setTiempoRestante(30 * 60); // 30 minutos en segundos
      setTransferenciaEnviada(null); // Resetear estado
      cargarDatos();

    } catch (error) {
      console.error('Error al crear reserva:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear reserva',
        { variant: 'error' }
      );
    } finally {
      setProcesandoPago(false);
    }
  };

  // ============================================
  // MANEJO DE PAGO CON WEBPAY
  // ============================================
  const handlePagoWebpay = async () => {
    try {
      setProcesandoPago(true);

      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const precioNoche = getPrecioActual(selectedCabana);
      const costoPersonasExtra = calcularCostoPersonasExtra();

      // Calcular total con descuento
      const subtotalSinDescuento = calcularPrecioTotal();
      const descuento = calcularDescuento(subtotalSinDescuento);
      const precioTotal = subtotalSinDescuento - descuento;

      const capacidad = selectedCabana.capacidad_personas || 0;
      const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

      // Calcular monto a pagar según tipo_pago
      const montoPagar = formData.tipo_pago === 'mitad' ? precioTotal / 2 : precioTotal;

      // Preparar datos de la reserva (NO se crea aún, solo se envían a Webpay)
      const reservaData = {
        cabana_id: selectedCabana.id,
        cliente_nombre: formData.cliente_nombre,
        cliente_apellido: formData.cliente_apellido,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email,
        cliente_rut: formData.cliente_rut,
        procedencia: formData.procedencia,
        tiene_auto: formData.tiene_auto,
        matriculas_auto: formData.matriculas_auto.filter(m => m.trim() !== ''),
        fecha_inicio: formatDateForServer(formData.fecha_inicio),
        fecha_fin: formatDateForServer(formData.fecha_fin),
        cantidad_personas: formData.cantidad_personas,
        personas_extra: personasExtra,
        costo_personas_extra: costoPersonasExtra,
        cantidad_noches: cantidadNoches,
        precio_noche: precioNoche,
        precio_total: precioTotal,
        descuento_aplicado: descuento,
        codigo_descuento: codigoValidado?.codigo || null,
        tipo_pago: formData.tipo_pago,
        notas: formData.notas,
        tinajas: formData.tinajas_seleccionadas.map(t => ({
          tinaja_id: t.tinaja_id,
          fecha_uso: formatDateForServer(t.fecha_uso),
          precio_dia: t.precio_dia,
        })),
      };

      // Crear transacción de Webpay (ahora recibe reservaData, no reserva_id)
      const pagoResponse = await api.post('/webpay/crear', {
        monto: montoPagar,
        descripcion: `Reserva Cabaña ${selectedCabana.nombre} - ${formData.cliente_nombre} ${formData.cliente_apellido}`,
        reservaData: reservaData // Enviar datos para guardar pendiente
      });

      const { token, url } = pagoResponse.data.data;

      // Incrementar uso del código de descuento si existe (solo una vez)
      if (codigoValidado && !codigoUsoIncrementado) {
        try {
          await api.post('/codigos-descuento/incrementar-uso', {
            codigo_id: codigoValidado.id
          });
          setCodigoUsoIncrementado(true);
        } catch (error) {
          console.error('Error al incrementar uso del código:', error);
        }
      }

      // Crear formulario para redirección POST a Webpay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;

      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token_ws';
      tokenInput.value = token;

      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();

    } catch (error) {
      console.error('Error al procesar pago:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al procesar el pago',
        { variant: 'error' }
      );
      setProcesandoPago(false);
    }
  };

  const handlePagoKhipu = async () => {
    try {
      setProcesandoPago(true);

      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const precioNoche = getPrecioActual(selectedCabana);
      const costoPersonasExtra = calcularCostoPersonasExtra();
      const subtotalSinDescuento = calcularPrecioTotal();
      const descuento = calcularDescuento(subtotalSinDescuento);
      const precioTotal = subtotalSinDescuento - descuento;
      const capacidad = selectedCabana.capacidad_personas || 0;
      const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);
      const montoPagar = formData.tipo_pago === 'mitad' ? precioTotal / 2 : precioTotal;

      const reservaData = {
        cabana_id: selectedCabana.id,
        cliente_nombre: formData.cliente_nombre,
        cliente_apellido: formData.cliente_apellido,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email,
        cliente_rut: formData.cliente_rut,
        procedencia: formData.procedencia,
        tiene_auto: formData.tiene_auto,
        matriculas_auto: formData.matriculas_auto.filter(m => m.trim() !== ''),
        fecha_inicio: formatDateForServer(formData.fecha_inicio),
        fecha_fin: formatDateForServer(formData.fecha_fin),
        cantidad_personas: formData.cantidad_personas,
        personas_extra: personasExtra,
        costo_personas_extra: costoPersonasExtra,
        cantidad_noches: cantidadNoches,
        precio_noche: precioNoche,
        precio_total: precioTotal,
        descuento_aplicado: descuento,
        codigo_descuento: codigoValidado?.codigo || null,
        tipo_pago: formData.tipo_pago,
        notas: formData.notas,
        tinajas: formData.tinajas_seleccionadas.map(t => ({
          tinaja_id: t.tinaja_id,
          fecha_uso: formatDateForServer(t.fecha_uso),
          precio_dia: t.precio_dia,
        })),
      };

      const pagoResponse = await api.post('/khipu/crear', {
        monto: montoPagar,
        descripcion: `Reserva Cabaña ${selectedCabana.nombre} - ${formData.cliente_nombre} ${formData.cliente_apellido}`,
        reservaData,
      });

      const { payment_url } = pagoResponse.data.data;
      window.location.href = payment_url;

    } catch (error) {
      console.error('Error al procesar pago Khipu:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al procesar el pago con Khipu',
        { variant: 'error' }
      );
      setProcesandoPago(false);
    }
  };

  const handleCrearReserva = async () => {
    try {
      const fechaInicio = new Date(formData.fecha_inicio);
      const fechaFin = new Date(formData.fecha_fin);
      const diffTime = Math.abs(fechaFin - fechaInicio);
      const cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const precioNoche = getPrecioActual(selectedCabana);
      const costoPersonasExtra = calcularCostoPersonasExtra();
      const precioTotal = calcularPrecioTotal();
      const capacidad = selectedCabana.capacidad_personas || 0;
      const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

      const reservaData = {
        cabana_id: selectedCabana.id,
        cliente_nombre: formData.cliente_nombre,
        cliente_apellido: formData.cliente_apellido,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email,
        cliente_rut: formData.cliente_rut,
        procedencia: formData.procedencia,
        matriculas_auto: formData.matriculas_auto.filter(m => m.trim() !== ''),
        fecha_inicio: formatDateForServer(formData.fecha_inicio),
        fecha_fin: formatDateForServer(formData.fecha_fin),
        cantidad_personas: formData.cantidad_personas,
        personas_extra: personasExtra,
        costo_personas_extra: costoPersonasExtra,
        cantidad_noches: cantidadNoches,
        precio_por_noche: precioNoche,
        precio_total: precioTotal,
        precio_final: precioTotal,
        descuento: 0,
        estado: 'pendiente',
        metodo_pago: formData.metodo_pago,
        estado_pago: 'pendiente',
        monto_pagado: 0,
        origen: 'manual',
        notas: formData.notas,
        usuario_creacion: 'cliente',
        tinajas: formData.tinajas_seleccionadas.map(t => ({
          tinaja_id: t.tinaja_id,
          fecha_uso: formatDateForServer(t.fecha_uso),
          precio_dia: t.precio_dia,
        })),
      };

      await api.post('/cabanas/reservas/publico', reservaData);

      enqueueSnackbar('✅ Reserva creada exitosamente en estado PENDIENTE', { variant: 'success' });

      // Enviar email de confirmación
      const emailData = {
        ...reservaData,
        cabana_nombre: selectedCabana.nombre,
        cantidad_noches: cantidadNoches,
        precio_por_noche: precioNoche,
        costo_personas_extra: costoPersonasExtra,
        precio_total: precioTotal,
        personas_extra: personasExtra,
      };

      const emailResult = await enviarConfirmacionReservaCabana(emailData);
      if (emailResult.success) {
        enqueueSnackbar('📧 Email de confirmación enviado exitosamente', { variant: 'success' });
      } else {
        console.error('Error al enviar email:', emailResult.error);
        enqueueSnackbar('⚠️ Reserva creada pero no se pudo enviar el email de confirmación', { variant: 'warning' });
      }

      const montoPagar = calcularMontoAPagar();
      const mensaje = `¡Reserva confirmada!\n\nEnvía el comprobante de pago por ${montoPagar.toLocaleString('es-CL')} a WhatsApp`;
      enqueueSnackbar(mensaje, { variant: 'info', autoHideDuration: 10000 });

      setOpenReservaDialog(false);
      cargarDatos();
      setSelectedCabana(null);
    } catch (error) {
      console.error('Error al crear reserva:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Error al crear reserva',
        { variant: 'error' }
      );
    }
  };

  const abrirWhatsApp = () => {
    const montoPagar = calcularMontoAPagar();
    const mensaje = `Hola, quiero enviar el comprobante de pago de mi reserva por $${montoPagar.toLocaleString('es-CL')}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const cerrarDialogoReserva = () => {
    setOpenReservaDialog(false);
    setReservaTransferenciaConfirmada(false);
    setMetodoPagoSeleccionado(null);
    setActiveStep(0);
  };

  // ============================================
  // RENDERIZADO DEL STEPPER CON UI ELEGANTE
  // ============================================

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Paper
              elevation={2}
              sx={{
                mb: 2,
                p: 2,
                background: `linear-gradient(135deg, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'} 0%, ${COLORES_CABANAS[normalizarNombre(selectedCabana?.nombre)] || '#FF8C42'}CC 100%)`,
                color: 'white',
                borderRadius: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <BedIcon sx={{ fontSize: 36 }} />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {selectedCabana?.nombre}
                </Typography>
              </Box>

              <Box sx={{
                display: 'flex',
                gap: { xs: 1.5, sm: 3 },
                alignItems: 'center',
                flexDirection: { xs: 'column', sm: 'row' },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Box sx={{
                  textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Capacidad
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {selectedCabana?.capacidad_personas} personas
                  </Typography>
                </Box>

                <Box sx={{
                  textAlign: 'center',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Precio por Noche
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    ${getPrecioActual(selectedCabana).toLocaleString('es-CL')}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                    Temporada {getTemporadaActual() === 'alta' ? 'Alta' : 'Baja'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {carouselImages.length > 0 ? (
              <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                <Carousel
                  navButtonsAlwaysVisible
                  indicators
                  animation="slide"
                  duration={500}
                  NextIcon={<NavigateNext />}
                  PrevIcon={<NavigateBefore />}
                >
                  {carouselImages.map((img, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: '100%',
                        height: '300px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        bgcolor: '#000',
                      }}
                    >
                      <img
                        src={img}
                        alt={`${selectedCabana?.nombre} - Imagen ${idx + 1}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          console.error('Error cargando imagen:', img);
                          e.target.style.display = 'none';
                        }}
                      />
                    </Box>
                  ))}
                </Carousel>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#F5F5F5',
                  borderRadius: 2,
                  border: '2px dashed #BDBDBD',
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  mb: 2
                }}
              >
                <KingBedIcon sx={{ fontSize: 80, color: '#BDBDBD', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No hay imágenes disponibles
                </Typography>
              </Paper>
            )}

            {/* Información detallada con iconos y colores */}
            <Grid container spacing={2}>
              {/* Detalles rápidos con iconos */}
              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#E3F2FD', borderRadius: 2, textAlign: 'center' }}>
                  <BedIcon sx={{ fontSize: 32, color: '#1976D2', mb: 0.5 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Habitaciones
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#1976D2' }}>
                    {selectedCabana?.numero_habitaciones || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#F3E5F5', borderRadius: 2, textAlign: 'center' }}>
                  <Box sx={{ fontSize: 32, mb: 0.5 }}>🚿</Box>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Baños
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#7B1FA2' }}>
                    {selectedCabana?.numero_banos || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper elevation={2} sx={{ p: 1.5, bgcolor: '#FFF3E0', borderRadius: 2, textAlign: 'center' }}>
                  <LocationIcon sx={{ fontSize: 32, color: '#F57C00', mb: 0.5 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Ubicación
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#F57C00', fontSize: '0.75rem' }}>
                    {selectedCabana?.ubicacion || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              {/* Amenidades con chips coloridos */}
              {selectedCabana?.amenidades && (
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#424242', display: 'flex', alignItems: 'center', gap: 1 }}>
                      ✨ Amenidades e Incluye
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {(() => {
                        try {
                          const amenidadesArray = typeof selectedCabana.amenidades === 'string'
                            ? JSON.parse(selectedCabana.amenidades)
                            : selectedCabana.amenidades;

                          const coloresAmenidades = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
                            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
                            '#F8B739', '#52B788', '#E63946', '#A8DADC'
                          ];

                          return amenidadesArray.map((amenidad, index) => (
                            <Chip
                              key={index}
                              label={amenidad}
                              size="small"
                              sx={{
                                bgcolor: coloresAmenidades[index % coloresAmenidades.length],
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                '& .MuiChip-label': {
                                  px: 1.5
                                },
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            />
                          ));
                        } catch (e) {
                          console.error('Error parsing amenidades:', e);
                          return null;
                        }
                      })()}
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 1:
        // PASO 2: Fechas, Personas y Datos del Cliente - LAYOUT COMPACTO
        const capacidad = selectedCabana?.capacidad_personas || 0;
        const personasExtra = Math.max(0, formData.cantidad_personas - capacidad);

        // Calcular noches si hay fechas seleccionadas
        let cantidadNoches = 0;
        if (formData.fecha_inicio && formData.fecha_fin) {
          const fechaInicioCalc = new Date(formData.fecha_inicio);
          const fechaFinCalc = new Date(formData.fecha_fin);
          const diffTime = Math.abs(fechaFinCalc - fechaInicioCalc);
          cantidadNoches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const precioNocheCabana = getPrecioActual(selectedCabana);
        const costoExtra = personasExtra * 20000 * (cantidadNoches || 1);
        const costoTotalNoche = (cantidadNoches > 0) ? (precioNocheCabana * cantidadNoches) + costoExtra : 0;

        return (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={7}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#E3F2FD' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#1976D2', width: 40, height: 40 }}>
                      <CalendarIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Fechas de Reserva
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong style={{ color: '#F44336' }}>Rojo</strong>: Ocupada • <strong style={{ color: '#FFC107' }}>Amarillo</strong>: Pendiente • <strong style={{ color: '#9C27B0' }}>Morado</strong>: Checkout
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={6}>
                      <DatePicker
                        label="Check-In"
                        value={formData.fecha_inicio}
                        onChange={(newValue) => {
                          setFormData({ ...formData, fecha_inicio: newValue });
                          // Invalidar código si cambian las fechas
                          if (codigoValidado) {
                            setCodigoValidado(null);
                            setErrorCodigo('Las fechas cambiaron. Valida el código nuevamente.');
                          }
                        }}
                        minDate={new Date()}
                        slots={{
                          day: (props) => renderDayWithStatus(props.day, [], props, 'inicio'),
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            size: 'small',
                            sx: {
                              bgcolor: 'white',
                              borderRadius: 1,
                              '& .MuiOutlinedInput-root': {
                                bgcolor: 'white'
                              }
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={6}>
                      <DatePicker
                        label="Check-Out"
                        value={formData.fecha_fin}
                        onChange={(newValue) => {
                          setFormData({ ...formData, fecha_fin: newValue });
                          // Invalidar código si cambian las fechas
                          if (codigoValidado) {
                            setCodigoValidado(null);
                            setErrorCodigo('Las fechas cambiaron. Valida el código nuevamente.');
                          }
                        }}
                        minDate={formData.fecha_inicio || new Date()}
                        slots={{
                          day: (props) => renderDayWithStatus(props.day, [], props, 'fin'),
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            variant: 'outlined',
                            size: 'small',
                            sx: {
                              bgcolor: 'white',
                              borderRadius: 1,
                              '& .MuiOutlinedInput-root': {
                                bgcolor: 'white'
                              }
                            }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#FFF3E0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#FF8C42', width: 40, height: 40 }}>
                      <PeopleIcon sx={{ fontSize: 24 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        ¿Cuántas personas?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Capacidad: <strong>{capacidad}</strong> {personasExtra > 0 && `(+${personasExtra} extra)`}
                      </Typography>
                    </Box>
                  </Box>

                  {!formData.fecha_inicio || !formData.fecha_fin ? (
                    <Paper elevation={0} sx={{ p: 1.5, textAlign: 'center', bgcolor: '#FFF3E0', borderRadius: 1, border: '2px dashed #FFB74D' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Selecciona las fechas primero
                      </Typography>
                    </Paper>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                        <IconButton
                          onClick={() => setFormData({ ...formData, cantidad_personas: Math.max(1, formData.cantidad_personas - 1) })}
                          disabled={formData.cantidad_personas <= 1}
                          sx={{
                            bgcolor: '#FF8C42',
                            color: 'white',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: '#FF7722' },
                            '&:disabled': { bgcolor: '#E0E0E0' }
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>

                        <Paper elevation={0} sx={{ px: 3, py: 1, bgcolor: 'white', borderRadius: 1, border: `3px solid #FF8C42` }}>
                          <Typography variant="h3" sx={{ fontWeight: 900, color: '#FF8C42', minWidth: '50px', textAlign: 'center' }}>
                            {formData.cantidad_personas}
                          </Typography>
                        </Paper>

                        <IconButton
                          onClick={() => setFormData({ ...formData, cantidad_personas: formData.cantidad_personas + 1 })}
                          disabled={personasExtra >= 3}
                          sx={{
                            bgcolor: '#FF8C42',
                            color: 'white',
                            width: 40,
                            height: 40,
                            '&:hover': { bgcolor: '#FF7722' },
                            '&:disabled': { bgcolor: '#E0E0E0' }
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                      {personasExtra >= 3 && (
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: '#F57C00', fontWeight: 600 }}>
                          ⚠️ Máximo 3 extra
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {cantidadNoches > 0 && (
              <Paper elevation={3} sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, flex: '1 1 auto' }}>
                        <Typography variant="caption" color="text.secondary">Cabaña × Noches:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ${precioNocheCabana.toLocaleString('es-CL')} × {cantidadNoches} = ${(precioNocheCabana * cantidadNoches).toLocaleString('es-CL')}
                        </Typography>
                      </Box>

                      {personasExtra > 0 && (
                        <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, flex: '1 1 auto' }}>
                          <Typography variant="caption" color="text.secondary">Personas Extra:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#F57C00' }}>
                            {personasExtra} × {cantidadNoches} × $20k = ${costoExtra.toLocaleString('es-CL')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">TOTAL</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                        ${costoTotalNoche.toLocaleString('es-CL')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">(sin tinajas)</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: '#2196F3', width: 40, height: 40 }}>
                  <PersonIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Tus Datos
                </Typography>
              </Box>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nombre"
                    value={formData.cliente_nombre}
                    onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Apellido"
                    value={formData.cliente_apellido}
                    onChange={(e) => setFormData({ ...formData, cliente_apellido: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Teléfono"
                    value={formData.cliente_telefono}
                    onChange={handleTelefonoChange}
                    required
                    placeholder="+569XXXXXXXX"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email"
                    type="email"
                    value={formData.cliente_email}
                    onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="RUT"
                    value={formData.cliente_rut}
                    onChange={handleRUTChange}
                    required
                    placeholder="12.345.678-9"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Procedencia"
                    value={formData.procedencia}
                    onChange={(e) => setFormData({ ...formData, procedencia: e.target.value })}
                    placeholder="Ciudad de origen"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CarIcon sx={{ fontSize: 20 }} />
                Información de Vehículo
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!formData.tiene_auto}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        tiene_auto: !e.target.checked,
                        matriculas_auto: e.target.checked ? [] : ['']
                      });
                    }}
                  />
                }
                label={<Typography variant="body2">No voy en auto particular</Typography>}
              />

              {formData.tiene_auto && (
                <Box sx={{ mt: 1 }}>
                  {formData.matriculas_auto.map((matricula, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`Matrícula ${index + 1}`}
                        value={matricula}
                        onChange={(e) => {
                          const nuevasMatriculas = [...formData.matriculas_auto];
                          nuevasMatriculas[index] = e.target.value.toUpperCase();
                          setFormData({ ...formData, matriculas_auto: nuevasMatriculas });
                        }}
                        placeholder="AA-BB-12"
                      />
                      {formData.matriculas_auto.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            const nuevasMatriculas = formData.matriculas_auto.filter((_, i) => i !== index);
                            setFormData({ ...formData, matriculas_auto: nuevasMatriculas });
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setFormData({ ...formData, matriculas_auto: [...formData.matriculas_auto, ''] });
                    }}
                  >
                    Agregar vehículo
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        );

      case 2:
        // PASO 3: Tinajas - COMPACTO
        return (
          <Box>
            <Paper elevation={3} sx={{ p: 2, mb: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#F3E5F5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: '#9C27B0', width: 50, height: 50 }}>
                  <HotTubIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ¿Deseas agregar tinajas?
                </Typography>
              </Box>
              <ButtonGroup size="medium" variant="contained">
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: true })}
                  variant={formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 3,
                    py: 1,
                    bgcolor: formData.quiere_tinajas ? '#9C27B0' : 'transparent',
                    '&:hover': { bgcolor: formData.quiere_tinajas ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' }
                  }}
                >
                  Sí, quiero
                </Button>
                <Button
                  onClick={() => setFormData({ ...formData, quiere_tinajas: false, tinajas_seleccionadas: [] })}
                  variant={!formData.quiere_tinajas ? 'contained' : 'outlined'}
                  sx={{
                    px: 3,
                    py: 1,
                    bgcolor: !formData.quiere_tinajas ? '#9C27B0' : 'transparent',
                    '&:hover': { bgcolor: !formData.quiere_tinajas ? '#7B1FA2' : 'rgba(156, 39, 176, 0.1)' }
                  }}
                >
                  No, gracias
                </Button>
              </ButtonGroup>
            </Paper>

            {formData.quiere_tinajas && renderTinajasVisual()}
          </Box>
        );

      case 3:
        // PASO 4: Resumen y Pago
        const subtotalSinDescuento = calcularPrecioTotal();
        const descuento = calcularDescuento(subtotalSinDescuento);
        const total = subtotalSinDescuento - descuento;
        const montoPagar = formData.tipo_pago === 'mitad' ? total / 2 : total;

        // Calcular desglose detallado
        const fechaInicioResumen = new Date(formData.fecha_inicio);
        const fechaFinResumen = new Date(formData.fecha_fin);
        const diffTimeResumen = Math.abs(fechaFinResumen - fechaInicioResumen);
        const nochesReserva = Math.ceil(diffTimeResumen / (1000 * 60 * 60 * 24));
        const precioNoche = getPrecioActual(selectedCabana);
        const subtotalCabana = precioNoche * nochesReserva;
        const costoPersonasExtra = calcularCostoPersonasExtra();
        const capacidadCabana = selectedCabana?.capacidad_personas || 0;
        const personasExtraResumen = Math.max(0, formData.cantidad_personas - capacidadCabana);
        const costoTinajas = formData.tinajas_seleccionadas.reduce((sum, t) => sum + parseFloat(t.precio_dia || 0), 0);

        return (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F5F5', height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, textAlign: 'center' }}>
                    Resumen de la Reserva
                  </Typography>

                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Cabaña:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedCabana?.nombre}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Cliente:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.cliente_nombre} {formData.cliente_apellido}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Personas:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formData.cantidad_personas}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Check-In:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.fecha_inicio ? formatDateForDisplay(formData.fecha_inicio) : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">Check-Out:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formData.fecha_fin ? formatDateForDisplay(formData.fecha_fin) : '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, borderRadius: 2, bgcolor: '#E8F5E9', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#2E7D32', textAlign: 'center' }}>
                    Desglose de Costos
                  </Typography>

                  <Stack spacing={1}>
                    <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Cabaña {selectedCabana?.nombre}:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${precioNoche.toLocaleString('es-CL')} × {nochesReserva} = ${subtotalCabana.toLocaleString('es-CL')}
                      </Typography>
                    </Box>

                    {personasExtraResumen > 0 && (
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Personas Extra:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F57C00' }}>
                          {personasExtraResumen} × {nochesReserva} × $20k = ${costoPersonasExtra.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    {formData.tinajas_seleccionadas.length > 0 && (
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Tinajas:</Typography>
                        {formData.tinajas_seleccionadas.map((ts, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', pl: 1 }}>
                            • {ts.tinaja_nombre}: ${ts.precio_dia?.toLocaleString('es-CL')}
                          </Typography>
                        ))}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#9C27B0', mt: 0.5 }}>
                          = ${costoTinajas.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    {/* Campo de código de descuento */}
                    <Box sx={{ p: 1.5, bgcolor: '#FFF8E1', borderRadius: 1, border: '2px dashed #FFA726' }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1, color: '#F57C00' }}>
                        ¿Tienes un código promocional?
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Ej: VERANO2025"
                          value={formData.codigo_descuento}
                          onChange={(e) => {
                            setFormData({ ...formData, codigo_descuento: e.target.value.toUpperCase() });
                            setErrorCodigo('');
                            setCodigoValidado(null);
                          }}
                          error={!!errorCodigo}
                          helperText={errorCodigo}
                          disabled={!!codigoValidado}
                          sx={{ bgcolor: 'white' }}
                        />
                        {!codigoValidado ? (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={validarCodigoDescuento}
                            disabled={validandoCodigo || !formData.codigo_descuento}
                            sx={{
                              minWidth: '100px',
                              bgcolor: '#FF9800',
                              '&:hover': { bgcolor: '#F57C00' }
                            }}
                          >
                            {validandoCodigo ? 'Validando...' : 'Aplicar'}
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setCodigoValidado(null);
                              setFormData({ ...formData, codigo_descuento: '' });
                            }}
                            sx={{ minWidth: '100px' }}
                          >
                            Quitar
                          </Button>
                        )}
                      </Stack>
                      {codigoValidado && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#2E7D32', fontWeight: 600 }}>
                          ✓ {codigoValidado.descripcion}
                        </Typography>
                      )}
                    </Box>

                    {/* Mostrar descuento si existe */}
                    {codigoValidado && descuento > 0 && (
                      <Box sx={{ p: 1, bgcolor: '#E8F5E9', borderRadius: 1, border: '2px solid #4CAF50' }}>
                        <Typography variant="caption" color="text.secondary">Descuento ({codigoValidado.codigo}):</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                          - ${descuento.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}

                    <Divider />

                    <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#2E7D32' }}>
                        TOTAL: ${total.toLocaleString('es-CL')}
                      </Typography>
                      {codigoValidado && descuento > 0 && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', textDecoration: 'line-through' }}>
                          Antes: ${subtotalSinDescuento.toLocaleString('es-CL')}
                        </Typography>
                      )}
                    </Box>

                    <Paper elevation={0} sx={{ p: 1.5, mt: 1, bgcolor: formData.tipo_pago === 'completo' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)', border: `2px solid ${formData.tipo_pago === 'completo' ? '#4CAF50' : '#FF9800'}`, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textAlign: 'center' }}>
                    Forma de Pago
                  </Typography>

                  <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                      value={formData.tipo_pago}
                      onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                    >
                      <Paper elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: formData.tipo_pago === 'completo' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'completo' ? '2px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 1 }}>
                        <FormControlLabel
                          value="completo"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Completo: ${total.toLocaleString('es-CL')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Pago total
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>

                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: formData.tipo_pago === 'mitad' ? '#E8F5E9' : '#F5F5F5', border: formData.tipo_pago === 'mitad' ? '2px solid #4CAF50' : '1px solid #E0E0E0', borderRadius: 1 }}>
                        <FormControlLabel
                          value="mitad"
                          control={<Radio size="small" />}
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Mitad: ${(total / 2).toLocaleString('es-CL')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                50% ahora, 50% al check-in
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </RadioGroup>
                  </FormControl>
                    </Paper>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, border: '2px solid #9E9E9E', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#424242', mb: 1 }}>
                    💳 Selecciona tu Método de Pago
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                    Monto a Pagar: ${montoPagar.toLocaleString('es-CL')}
                  </Typography>
                </Box>

                {/* Opción 1: Transferencia Bancaria */}
                <Paper
                  elevation={metodoPagoSeleccionado === 'transferencia' ? 4 : 0}
                  onClick={() => transferenciaHabilitada && setMetodoPagoSeleccionado('transferencia')}
                  sx={{
                    p: 2,
                    mb: 2,
                    cursor: transferenciaHabilitada ? 'pointer' : 'not-allowed',
                    border: metodoPagoSeleccionado === 'transferencia' ? '3px solid #2196F3' : '2px solid #E0E0E0',
                    borderRadius: 2,
                    bgcolor: !transferenciaHabilitada ? '#F5F5F5' : (metodoPagoSeleccionado === 'transferencia' ? '#E3F2FD' : 'white'),
                    opacity: transferenciaHabilitada ? 1 : 0.5,
                    transition: 'all 0.3s',
                    '&:hover': transferenciaHabilitada ? {
                      borderColor: '#2196F3',
                      boxShadow: 3
                    } : {}
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <BankIcon sx={{ fontSize: 32, color: transferenciaHabilitada ? '#2196F3' : '#9E9E9E' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} color={transferenciaHabilitada ? 'inherit' : 'text.disabled'}>
                        Transferencia Bancaria
                      </Typography>
                      <Typography variant="caption" color={transferenciaHabilitada ? 'text.secondary' : 'text.disabled'}>
                        {transferenciaHabilitada ? 'Reserva por 30 minutos' : 'No disponible'}
                      </Typography>
                    </Box>
                    {metodoPagoSeleccionado === 'transferencia' && transferenciaHabilitada && (
                      <CheckCircleIcon sx={{ fontSize: 28, color: '#2196F3' }} />
                    )}
                  </Box>
                  {transferenciaHabilitada ? (
                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                      Tienes 30 minutos para completar la transferencia o se cancelará automáticamente
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ fontSize: '0.75rem' }}>
                      {new Date().getDay() === 0
                        ? '🚫 Las transferencias no están disponibles los domingos. Usa WebPay para completar tu reserva.'
                        : '⏰ Las transferencias solo están disponibles de lunes a sábado, de 8:00 a 16:30 hrs'}
                    </Alert>
                  )}
                </Paper>

                {/* Opción 2: Khipu / Webpay (según config admin) */}
                {pasarelaPago === 'khipu' ? (
                  <Paper
                    elevation={metodoPagoSeleccionado === 'khipu' ? 4 : 0}
                    onClick={() => setMetodoPagoSeleccionado('khipu')}
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: metodoPagoSeleccionado === 'khipu' ? '3px solid #00C853' : '2px solid #E0E0E0',
                      borderRadius: 2,
                      bgcolor: metodoPagoSeleccionado === 'khipu' ? '#F1FFF6' : 'white',
                      transition: 'all 0.3s',
                      '&:hover': { borderColor: '#00C853', boxShadow: 3 }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ bgcolor: '#00C853', width: 40, height: 40, fontSize: '1.2rem' }}>💚</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#00C853">
                          Pagar con Khipu
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Transferencia inmediata desde tu app bancaria
                        </Typography>
                      </Box>
                      {metodoPagoSeleccionado === 'khipu' && (
                        <CheckCircleIcon sx={{ fontSize: 28, color: '#00C853' }} />
                      )}
                    </Box>
                    <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                      Pago seguro e inmediato. La reserva se confirma al instante.
                    </Alert>
                  </Paper>
                ) : (
                  <Paper
                    elevation={metodoPagoSeleccionado === 'webpay' ? 4 : 0}
                    onClick={() => setMetodoPagoSeleccionado('webpay')}
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: metodoPagoSeleccionado === 'webpay' ? '3px solid #1565C0' : '2px solid #E0E0E0',
                      borderRadius: 2,
                      bgcolor: metodoPagoSeleccionado === 'webpay' ? '#E3F2FD' : 'white',
                      transition: 'all 0.3s',
                      '&:hover': { borderColor: '#1565C0', boxShadow: 3 }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ bgcolor: '#1565C0', width: 40, height: 40, fontSize: '1.2rem' }}>💳</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#1565C0">
                          Pagar con Webpay
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tarjeta de crédito o débito (Transbank)
                        </Typography>
                      </Box>
                      {metodoPagoSeleccionado === 'webpay' && (
                        <CheckCircleIcon sx={{ fontSize: 28, color: '#1565C0' }} />
                      )}
                    </Box>
                    <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                      Pago seguro con tarjeta. Serás redirigido a Webpay.
                    </Alert>
                  </Paper>
                )}

                {/* Botón para confirmar el método seleccionado */}
                {!reservaTransferenciaConfirmada && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={
                      !metodoPagoSeleccionado ||
                      procesandoPago ||
                      (metodoPagoSeleccionado === 'transferencia' && !transferenciaHabilitada)
                    }
                    onClick={() => {
                      if (metodoPagoSeleccionado === 'transferencia') handlePagoTransferencia();
                      else if (metodoPagoSeleccionado === 'khipu') handlePagoKhipu();
                      else if (metodoPagoSeleccionado === 'webpay') handlePagoWebpay();
                    }}
                    sx={{
                      py: 1.5,
                      fontWeight: 900,
                      fontSize: '1rem',
                      borderRadius: 2,
                      background: metodoPagoSeleccionado === 'khipu'
                        ? 'linear-gradient(135deg, #00C853 0%, #009624 100%)'
                        : metodoPagoSeleccionado === 'webpay'
                          ? 'linear-gradient(135deg, #1565C0 0%, #003c8f 100%)'
                          : 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                      boxShadow: 4,
                      '&:hover': { boxShadow: 6 },
                      '&:disabled': { background: '#E0E0E0' }
                    }}
                  >
                    {procesandoPago ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : metodoPagoSeleccionado === 'transferencia' ? (
                      '🏦 Confirmar Reserva'
                    ) : metodoPagoSeleccionado === 'khipu' ? (
                      '💚 Pagar con Khipu'
                    ) : metodoPagoSeleccionado === 'webpay' ? (
                      '💳 Pagar con Webpay'
                    ) : (
                      'Selecciona un Método de Pago'
                    )}
                  </Button>
                )}
              </Paper>
              </Grid>
            </Grid>

            <Stack spacing={2} sx={{ mt: 2 }}>
              {reservaTransferenciaConfirmada && (
                <Paper elevation={4} sx={{ p: 3, borderRadius: 3, border: '3px solid #FF9800' }}>
                  {/* Contador regresivo */}
                  <Box sx={{ textAlign: 'center', mb: 3, p: 2, bgcolor: tiempoRestante <= 300 ? '#FFEBEE' : '#FFF3E0', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Tiempo restante para completar la transferencia:
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: tiempoRestante <= 300 ? '#D32F2F' : '#F57C00', fontFamily: 'monospace' }}>
                      {formatearTiempoRestante(tiempoRestante)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tiempoRestante <= 300 ? '⚠️ ¡Quedan menos de 5 minutos!' : '⏰ No olvides enviar tu comprobante'}
                    </Typography>
                  </Box>

                  {/* Si aún no ha respondido */}
                  {transferenciaEnviada === null && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, color: '#1976D2' }}>
                        ¿Ya enviaste la transferencia?
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={() => setTransferenciaEnviada(true)}
                            sx={{
                              py: 2,
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                              boxShadow: 4,
                              '&:hover': {
                                boxShadow: 6,
                                background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)'
                              }
                            }}
                          >
                            ✅ SÍ
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={() => setTransferenciaEnviada(false)}
                            sx={{
                              py: 2,
                              fontSize: '1.2rem',
                              fontWeight: 900,
                              background: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)',
                              boxShadow: 4,
                              '&:hover': {
                                boxShadow: 6,
                                background: 'linear-gradient(135deg, #C62828 0%, #B71C1C 100%)'
                              }
                            }}
                          >
                            ❌ NO
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Si respondió NO */}
                  {transferenciaEnviada === false && (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        📋 Realiza la transferencia y luego envía el comprobante
                      </Alert>
                      <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                        Transfiere <strong style={{ color: '#D32F2F', fontSize: '1.3rem' }}>${montoPagar.toLocaleString('es-CL')}</strong>
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<WhatsAppIcon />}
                        onClick={abrirWhatsApp}
                        sx={{
                          bgcolor: '#25D366',
                          color: 'white',
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          py: 1.5,
                          mb: 2,
                          '&:hover': { bgcolor: '#20BA5A' }
                        }}
                      >
                        📲 Enviar Comprobante al {WHATSAPP_NUMBER}
                      </Button>
                      <Button
                        variant="text"
                        fullWidth
                        onClick={() => setTransferenciaEnviada(null)}
                        sx={{ color: '#757575' }}
                      >
                        ← Volver
                      </Button>
                    </Box>
                  )}

                  {/* Si respondió SÍ */}
                  {transferenciaEnviada === true && (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        ✅ ¡Excelente! Tu reserva quedará en estado PENDIENTE hasta que se confirme el pago
                      </Alert>
                      <Typography variant="body2" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
                        El administrador revisará tu transferencia y confirmará tu reserva a la brevedad.
                      </Typography>
                      <Stack spacing={1.5}>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          startIcon={<WhatsAppIcon />}
                          onClick={abrirWhatsApp}
                          sx={{
                            bgcolor: '#25D366',
                            color: 'white',
                            fontWeight: 700,
                            '&:hover': { bgcolor: '#20BA5A' }
                          }}
                        >
                          📲 Enviar Comprobante (Opcional)
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={cerrarDialogoReserva}
                          sx={{
                            borderColor: '#1976D2',
                            color: '#1976D2',
                            fontWeight: 600
                          }}
                        >
                          Cerrar
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Paper>
              )}

              <TextField
                fullWidth
                size="small"
                label="Notas adicionales (opcional)"
                multiline
                rows={3}
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                variant="outlined"
                placeholder="¿Alguna solicitud especial?"
              />

              <Paper elevation={1} sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFB74D' }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1, color: '#E65100' }}>
                  POLÍTICAS DE CANCELACIÓN
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>1.</strong> Cancelación con <strong>10+ días</strong>: reembolso 100%
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>2.</strong> Cancelación con <strong>5 días</strong>: reembolso 50%
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>3.</strong> Cancelación con <strong>1 día</strong>: sin reembolso
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    <strong>4.</strong> Salida anticipada: sin devolución
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', fontSize: '0.65rem', fontStyle: 'italic', color: '#6D4C41' }}>
                  Atte. Cabañas El Mirador de Dichato
                </Typography>
              </Paper>
            </Stack>
          </Box>
        );

      default:
        return 'Paso desconocido';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #B3E5FC 0%, #81D4FA 10%, #4FC3F7 20%, #E1F5FE 40%, #FFFFFF 70%, #FFFFFF 100%)',
          backgroundAttachment: 'fixed',
          py: 4,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 10%, rgba(129, 212, 250, 0.3) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(179, 229, 252, 0.25) 0%, transparent 50%)',
            pointerEvents: 'none',
          }
        }}
      >
        <Container maxWidth="xl">
          {/* Hero Section - Presentación Elegante con Carrusel */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Box sx={{ textAlign: 'center', mb: 6, position: 'relative', zIndex: 1 }}>
              <Paper
                elevation={8}
                sx={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
                  borderRadius: 4,
                  border: '3px solid #2196F3',
                  boxShadow: '0 12px 40px rgba(33, 150, 243, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    background: 'linear-gradient(90deg, #2196F3 0%, #64B5F6 50%, #2196F3 100%)',
                  }
                }}
              >
                {/* Carrusel de Imágenes Hero */}
                {heroCarouselImages.length > 0 ? (
                  <Box sx={{ position: 'relative', mb: 4 }}>
                    {/* Contador de Disponibilidad - Flotante sobre el carousel */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5, type: "spring", stiffness: 200 }}
                      style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        zIndex: 10,
                      }}
                    >
                      <Stack spacing={1}>
                        {disponibilidadHoy > 0 && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ color: '#4CAF50 !important' }} />}
                            label={`${disponibilidadHoy} ${disponibilidadHoy === 1 ? 'cabaña disponible' : 'cabañas disponibles'} hoy`}
                            sx={{
                              background: 'linear-gradient(135deg, #FFFFFF 0%, #E8F5E9 100%)',
                              backdropFilter: 'blur(10px)',
                              border: '2px solid #4CAF50',
                              fontWeight: 700,
                              fontSize: { xs: '0.75rem', sm: '0.9rem' },
                              px: { xs: 1, sm: 2 },
                              py: { xs: 2, sm: 2.5 },
                              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                              '& .MuiChip-icon': {
                                color: '#4CAF50',
                              }
                            }}
                          />
                        )}
                        {disponibilidadFinSemana > 0 && (
                          <Chip
                            icon={<CalendarIcon sx={{ color: '#FF9800 !important' }} />}
                            label={`${disponibilidadFinSemana} ${disponibilidadFinSemana === 1 ? 'disponible' : 'disponibles'} fin de semana`}
                            sx={{
                              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF3E0 100%)',
                              backdropFilter: 'blur(10px)',
                              border: '2px solid #FF9800',
                              fontWeight: 700,
                              fontSize: { xs: '0.7rem', sm: '0.85rem' },
                              px: { xs: 1, sm: 2 },
                              py: { xs: 2, sm: 2.5 },
                              boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                              '& .MuiChip-icon': {
                                color: '#FF9800',
                              }
                            }}
                          />
                        )}
                      </Stack>
                    </motion.div>

                    {/* Indicador de Swipe en Móvil */}
                    <Box
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'absolute',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        px: 3,
                        py: 1.5,
                        borderRadius: 3,
                        alignItems: 'center',
                        gap: 1,
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            opacity: 0.8,
                          },
                          '50%': {
                            opacity: 1,
                          },
                        },
                      }}
                    >
                      <NavigateBefore sx={{ fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Desliza para ver más
                      </Typography>
                      <NavigateNext sx={{ fontSize: 20 }} />
                    </Box>
                    <Carousel
                      navButtonsAlwaysVisible
                      indicators
                      animation="fade"
                      duration={700}
                      interval={5000}
                      NextIcon={<NavigateNext />}
                      PrevIcon={<NavigateBefore />}
                      navButtonsProps={{
                        style: {
                          backgroundColor: 'rgba(33, 150, 243, 0.8)',
                          borderRadius: '50%',
                          margin: '0 20px',
                        }
                      }}
                      indicatorIconButtonProps={{
                        style: {
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 5px',
                        }
                      }}
                      activeIndicatorIconButtonProps={{
                        style: {
                          color: '#2196F3',
                        }
                      }}
                    >
                      {heroCarouselImages.map((img, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            width: '100%',
                            height: '500px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            bgcolor: '#000',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.img
                            src={img}
                            alt={`Vista de cabañas ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '110%',
                              objectFit: 'cover',
                              y: parallaxY,
                            }}
                            onError={(e) => {
                              console.error('Error cargando imagen del carrusel:', img);
                              e.target.style.display = 'none';
                            }}
                          />
                          {/* Overlay con gradiente + CTA superpuesto */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '65%',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                              pointerEvents: 'none',
                            }}
                          />
                          {/* CTA superpuesto sobre el carrusel */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: { xs: 24, sm: 40 },
                              left: '50%',
                              transform: 'translateX(-50%)',
                              textAlign: 'center',
                              zIndex: 5,
                              width: '90%',
                            }}
                          >
                            <Typography
                              variant="h3"
                              sx={{
                                color: 'white',
                                fontWeight: 900,
                                fontSize: { xs: '1.6rem', sm: '2.8rem' },
                                textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                                mb: { xs: 1, sm: 2 },
                                letterSpacing: '-0.01em',
                              }}
                            >
                              Cabañas El Mirador
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                color: 'rgba(255,255,255,0.88)',
                                fontSize: { xs: '0.85rem', sm: '1.1rem' },
                                mb: { xs: 2, sm: 3 },
                                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                              }}
                            >
                              Frente al mar · Dichato · Tinajas · Pago online
                            </Typography>
                            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                              <Button
                                variant="contained"
                                size="large"
                                onClick={() => mapaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                sx={{
                                  py: { xs: 1.5, sm: 2.5 },
                                  px: { xs: 4, sm: 8 },
                                  fontSize: { xs: '1.1rem', sm: '1.6rem' },
                                  fontWeight: 900,
                                  background: 'linear-gradient(135deg, #FF6B00 0%, #FF9900 100%)',
                                  color: '#FFFFFF',
                                  borderRadius: { xs: 2, sm: 3 },
                                  border: '3px solid rgba(255,255,255,0.4)',
                                  boxShadow: '0 8px 32px rgba(255, 107, 0, 0.5)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  backdropFilter: 'blur(4px)',
                                  pointerEvents: 'auto',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #FF8C00 0%, #FFB300 100%)',
                                    boxShadow: '0 12px 40px rgba(255, 107, 0, 0.7)',
                                  },
                                }}
                              >
                                🏖️ RESERVA YA
                              </Button>
                            </motion.div>
                          </Box>
                        </Box>
                      ))}
                    </Carousel>
                  </Box>
                ) : null}

                {/* Contenido Textual — compacto */}
                <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 3, sm: 4 }, pt: heroCarouselImages.length > 0 ? { xs: 2, sm: 3 } : { xs: 4, sm: 6 } }}>
                  {/* Título solo si no hay carrusel */}
                  {heroCarouselImages.length === 0 && (
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #1976D2 0%, #2196F3 50%, #64B5F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        mb: 2,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Bienvenidos a Cabañas El Mirador
                    </Typography>
                  )}

                  {/* Strip de beneficios */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    justifyContent="center"
                    alignItems="center"
                    sx={{ mb: 3, flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}
                  >
                    {[
                      { icon: <BedIcon />, label: 'Diseño Moderno', sub: 'Arquitectura contemporánea', color: '#1976D2' },
                      { icon: <HotTubIcon />, label: 'Tinajas Premium', sub: 'Experiencia única', color: '#9C27B0' },
                      { icon: <PeopleIcon />, label: 'Para Tu Familia', sub: 'Espacios amplios', color: '#F44336' },
                      { icon: <LocationIcon />, label: 'Frente al Mar', sub: 'Vista al Pacífico', color: '#00897B' },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.12, duration: 0.4 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2,
                            py: 1,
                            borderRadius: 3,
                            bgcolor: `${item.color}12`,
                            border: `1.5px solid ${item.color}30`,
                          }}
                        >
                          <Avatar sx={{ bgcolor: item.color, width: 38, height: 38 }}>
                            {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                          </Avatar>
                          <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.sub}
                            </Typography>
                          </Box>
                        </Box>
                      </motion.div>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2, borderColor: '#E3F2FD' }} />

                  {/* Instrucción + CTA si no hay carrusel */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#1976D2', fontWeight: 700, mb: 0.5 }}>
                        Selecciona tu Cabaña Ideal
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#546E7A' }}>
                        Haz clic en cualquier cabaña del mapa para reservar
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={() => mapaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        sx={{
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #FF6B00 0%, #FF9900 100%)',
                          borderRadius: 3,
                          px: 3,
                          boxShadow: '0 4px 16px rgba(255,107,0,0.35)',
                          '&:hover': { background: 'linear-gradient(135deg, #FF8C00 0%, #FFB300 100%)', boxShadow: '0 6px 20px rgba(255,107,0,0.5)' }
                        }}
                      >
                        🏖️ Ver mapa
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={resetTutorial}
                        startIcon={<InfoIcon />}
                        sx={{ color: '#2196F3', textTransform: 'none', fontSize: '0.8rem' }}
                      >
                        Tutorial
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </motion.div>

          {/* Mapa SVG - Siempre visible abajo */}
          <Box ref={mapaRef} sx={{ mt: { xs: 4, sm: 8 }, mb: { xs: 2, sm: 4 } }}>
            <Zoom in timeout={1200}>
              <Paper
                elevation={10}
                sx={{
                  p: { xs: 1, sm: 2 }, // Menos padding en móvil
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: { xs: 2, sm: 4 }, // Menos border radius en móvil
                  maxWidth: { xs: '100%', sm: '900px' }, // Ancho completo en móvil
                  margin: '0 auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: { xs: '2px solid #2196F3', sm: '3px solid #2196F3' }, // Borde más delgado en móvil
                  boxShadow: '0 12px 40px rgba(33, 150, 243, 0.25)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Box
                  ref={svgContainerRef}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    filter: 'brightness(1.1) contrast(1.0) saturate(1.3)',
                    '& svg': {
                      width: '100%',
                      height: 'auto',
                      maxHeight: { xs: '70vh', sm: '500px' }, // Mucho más alto en móvil (70% de la altura de la pantalla)
                      filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))',
                    },
                  }}
                />
              </Paper>
            </Zoom>
          </Box>
        </Container>

        {/* Dialog de Reserva con Stepper */}
        <Dialog
          open={openReservaDialog}
          onClose={cerrarDialogoReserva}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              width: '95vw',
              maxWidth: '1400px'
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#FFF3E0', borderBottom: '3px solid #FF8C42' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#D84315' }}>
              Nueva Reserva - {selectedCabana?.nombre}
            </Typography>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              p: 2,
              maxHeight: '75vh',
              overflowY: 'auto'
            }}
          >
            <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box>
              {getStepContent(activeStep)}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'space-between', bgcolor: '#F5F5F5' }}>
            {!reservaTransferenciaConfirmada && (
              <>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  size="large"
                  sx={{ fontWeight: 600 }}
                >
                  Atrás
                </Button>

                <Box>
                  <Button
                    onClick={cerrarDialogoReserva}
                    sx={{ mr: 2, fontWeight: 600 }}
                    size="large"
                  >
                    Cancelar
                  </Button>

                  {activeStep !== steps.length - 1 && (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      endIcon={<ArrowForwardIcon />}
                      size="large"
                      sx={{
                        bgcolor: '#FF8C42',
                        fontWeight: 700,
                        px: 4,
                        '&:hover': { bgcolor: '#FF7722' },
                      }}
                    >
                      Siguiente
                    </Button>
                  )}
                </Box>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Dialog de Comprobante de Pago Profesional */}
        <Dialog
          open={mostrarComprobante}
          onClose={() => setMostrarComprobante(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
          {datosComprobante && (
            <>
              {/* Header con Logo y Empresa */}
              <Box sx={{
                background: 'linear-gradient(135deg, #1976D2 0%, #2196F3 100%)',
                p: 3,
                color: 'white',
                borderBottom: '4px solid #FFD700'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <img
                      src="/logo.png"
                      alt="Beach Logo"
                      style={{ height: 60, filter: 'brightness(0) invert(1)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
                      BEACH
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Cabañas y Departamentos
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 70, mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                    ¡RESERVA CONFIRMADA!
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                    Pago procesado exitosamente
                  </Typography>
                </Box>
              </Box>

              <DialogContent sx={{ p: 4, bgcolor: '#FAFAFA' }}>
                {/* Información de la Empresa */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'white', border: '1px solid #E0E0E0' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">EMISOR</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        Beach Cabañas S.A.
                      </Typography>
                      <Typography variant="caption" display="block">
                        Camino a la Playa S/N
                      </Typography>
                      <Typography variant="caption" display="block">
                        Contacto: reservas@beach.cl
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">FECHA EMISIÓN</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                        {new Date().toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#1976D2', mt: 1 }}>
                        N° {String(datosComprobante.id).padStart(6, '0')}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Datos del Cliente */}
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: 'white', border: '1px solid #E0E0E0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976D2', mb: 2 }}>
                    DATOS DEL CLIENTE
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">NOMBRE COMPLETO</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {datosComprobante.cliente_nombre} {datosComprobante.cliente_apellido}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">RUT</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {datosComprobante.cliente_rut || 'No proporcionado'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">EMAIL</Typography>
                      <Typography variant="body2">{datosComprobante.cliente_email}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">TELÉFONO</Typography>
                      <Typography variant="body2">{datosComprobante.cliente_telefono}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Detalles de la Reserva */}
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: 'white', border: '1px solid #E0E0E0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976D2', mb: 2 }}>
                    DETALLES DE LA RESERVA
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Alojamiento:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Cabaña (ID: {datosComprobante.cabana_id})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Check-In:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(datosComprobante.fecha_inicio).toLocaleDateString('es-CL', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Check-Out:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(datosComprobante.fecha_fin).toLocaleDateString('es-CL', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Cantidad de Personas:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {datosComprobante.cantidad_personas} persona(s)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Noches:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {Math.ceil((new Date(datosComprobante.fecha_fin) - new Date(datosComprobante.fecha_inicio)) / (1000 * 60 * 60 * 24))} noche(s)
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Desglose de Pago */}
                <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: '#F5F9FF', border: '2px solid #2196F3' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976D2', mb: 2 }}>
                    RESUMEN DE PAGO
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">Subtotal:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${datosComprobante.precio_total?.toLocaleString('es-CL')}
                      </Typography>
                    </Box>
                    {datosComprobante.descuento > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="error">Descuento:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          -${datosComprobante.descuento?.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    )}
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, bgcolor: 'white', px: 2, borderRadius: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976D2' }}>
                        TOTAL PAGADO:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#4CAF50' }}>
                        ${datosComprobante.monto_pagado?.toLocaleString('es-CL')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Método de Pago:</Typography>
                      <Chip
                        label={datosComprobante.metodo_pago === 'webpay' ? 'Webpay Plus (Transbank)' : 'Transferencia Bancaria'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Estado:</Typography>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={datosComprobante.estado_pago === 'pagado' ? 'PAGADO COMPLETO' : 'PAGO PARCIAL'}
                        color={datosComprobante.estado_pago === 'pagado' ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Stack>
                </Paper>

                {/* Alertas Importantes */}
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Confirmación enviada a: {datosComprobante.cliente_email}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Revisa tu bandeja de entrada y carpeta de spam
                  </Typography>
                </Alert>

                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Código de Reserva: #{String(datosComprobante.id).padStart(6, '0')}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Presenta este código al momento del check-in
                  </Typography>
                </Alert>

                {/* Términos */}
                <Box sx={{ mt: 3, p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFB74D' }}>
                  <Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 1, color: '#E65100' }}>
                    ⚠️ TÉRMINOS Y CONDICIONES
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • Check-in: 15:00 hrs | Check-out: 12:00 hrs
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • Cancelación: hasta 48hrs antes sin cargo
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • No se admiten mascotas salvo autorización previa
                  </Typography>
                </Box>
              </DialogContent>

              <DialogActions sx={{ p: 3, bgcolor: '#FAFAFA', borderTop: '1px solid #E0E0E0', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => window.print()}
                  sx={{
                    borderColor: '#1976D2',
                    color: '#1976D2',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#1565C0', bgcolor: '#E3F2FD' }
                  }}
                >
                  Imprimir
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setMostrarComprobante(false)}
                  sx={{
                    bgcolor: '#1976D2',
                    fontWeight: 700,
                    px: 4,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': { bgcolor: '#1565C0', boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)' }
                  }}
                >
                  Cerrar
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ReservaCabanasPage;