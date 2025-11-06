// frontend/src/components/ImageCropperUpload.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Fade,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CameraAlt as CameraAltIcon,
  FlipCameraAndroid as FlipCameraIcon,
  Crop as CropIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import api from '../api/api';

const ImageCropperUpload = ({ onNumeroDetectado, onImagenSeleccionada }) => {
  // Estados de cámara
  const [modoCaptura, setModoCaptura] = useState('archivo'); // 'archivo' o 'camara'
  const [stream, setStream] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camaraDisponible, setCamaraDisponible] = useState([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' (frontal) o 'environment' (trasera)

  // Estados de imagen
  const [imagenCapturada, setImagenCapturada] = useState(null);
  const [archivoImagen, setArchivoImagen] = useState(null);
  const [imagenOriginal, setImagenOriginal] = useState(null); // Para guardar la imagen original antes de crop

  // Estados para imagen manual con rectángulo
  const [imagenManualCargada, setImagenManualCargada] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Estados de procesamiento
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [confianzaOCR, setConfianzaOCR] = useState(null);
  const [error, setError] = useState('');
  const [numeroConfirmado, setNumeroConfirmado] = useState(false);

  // Estados para manejo de variaciones
  const [variaciones, setVariaciones] = useState([]);
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
  const [validandoVariaciones, setValidandoVariaciones] = useState(false);
  const [variacionesValidadas, setVariacionesValidadas] = useState({});

  // Referencias
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputFileRef = useRef(null);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);
  // Timer para auto-flip
  const autoFlipTimerRef = useRef(null);
  // Ref al botón físico de cambiar cámara para poder "clickearlo" programáticamente
  const flipButtonRef = useRef(null);

  // Dimensiones del rectángulo guía (proporción horizontal para boletas)
  const RECT_WIDTH_PERCENT = 0.85; // 85% del ancho
  const RECT_HEIGHT_PERCENT = 0.25; // 25% del alto

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // Obtener lista de cámaras disponibles
  const obtenerCamarasDisponibles = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoCameras = devices.filter(device => device.kind === 'videoinput');
      setCamaraDisponible(videoCameras);
      console.log('📷 Cámaras disponibles:', videoCameras);
      // Enviar lista de cámaras al backend para debugging
      try {
        api.post('/client-logs', { level: 'info', message: 'camaras_disponibles', meta: { videoCameras } }).catch(() => {});
      } catch (e) {
        // ignore
      }
      return videoCameras;
    } catch (error) {
      console.error('❌ Error obteniendo cámaras:', error);
      return [];
    }
  };

  // Helper para enviar logs al backend (no bloquear la UI)
  const sendBackendLog = async (level, message, meta = {}) => {
    try {
      // endpoint '/client-logs' debe existir en tu backend; si no, adapta
      await api.post('/client-logs', { level, message, meta }).catch(() => {});
    } catch (err) {
      // no hacer nada si falla
    }
  };

  // Iniciar cámara
  const iniciarCamara = async (usarFacingMode = true, desiredFacingMode = null) => {
    try {
      console.log('📷 Iniciando cámara...');

      // Detener stream anterior si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Intentar obtener cámaras disponibles y elegir un deviceId que NO sea la frontal
      const videoCameras = await obtenerCamarasDisponibles();

      const frontRegex = /front|face|user|frontal|delantera|selfie/i;
      const rearRegex = /back|rear|environment|trasera|posterior/i;

      // Preferir cámaras con etiqueta y que no coincidan con frontRegex
      let selectedCamera = videoCameras.find(d => d.label && !frontRegex.test(d.label));

      // Si no encontramos así, intentar buscar etiquetas que indiquen trasera
      if (!selectedCamera) {
        selectedCamera = videoCameras.find(d => d.label && rearRegex.test(d.label));
      }

      // Si aún no hay etiquetas (posible antes de permiso) o no se encontró, usar heurística: la última cámara
      if (!selectedCamera && videoCameras.length > 0) {
        selectedCamera = videoCameras[videoCameras.length - 1];
      }

      let constraints;

      if (selectedCamera) {
        console.log('📷 Intentando iniciar con deviceId seleccionado:', selectedCamera.deviceId, 'label:', selectedCamera.label);
        setCamaraSeleccionada(selectedCamera.deviceId);
        // Usar deviceId directamente para preferir trasera
        constraints = {
          video: {
            deviceId: { exact: selectedCamera.deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(mediaStream);
          setCamaraActiva(true);
          // Si se usó deviceId, asumimos intentamos la trasera (mejorar si se conoce otra heurística)
          setFacingMode('environment');
          setError('');

          if (videoRef.current) videoRef.current.srcObject = mediaStream;

          const activeDeviceId = mediaStream.getVideoTracks()?.[0]?.getSettings?.()?.deviceId || null;
          console.log('✅ Cámara iniciada con deviceId:', activeDeviceId);
          sendBackendLog('info', 'camera_started', { deviceId: activeDeviceId, chosenDeviceId: selectedCamera.deviceId, label: selectedCamera.label });

          // Actualizar lista de cámaras (labels aparecen después de permisos)
          await obtenerCamarasDisponibles();

          return mediaStream;
        } catch (err) {
          console.warn('⚠️ Falló getUserMedia con deviceId seleccionado, fallback a facingMode. Error:', err?.message || err);
          sendBackendLog('warn', 'camera_deviceid_failed', { deviceId: selectedCamera.deviceId, error: err?.message || String(err) });
        }
      }

      // Si no hay cámara seleccionada o el intento falló, usar facingMode como respaldo
      // Usar desiredFacingMode si se proporcionó (evita race con setState)
      const fm = desiredFacingMode ?? facingMode;

      if (usarFacingMode && fm) {
        constraints = {
          video: {
            facingMode: { exact: fm },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
      } else if (camaraSeleccionada) {
        constraints = {
          video: {
            deviceId: { exact: camaraSeleccionada },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
      } else {
        constraints = {
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        setCamaraActiva(true);
        setError('');

        if (videoRef.current) videoRef.current.srcObject = mediaStream;

        const activeDeviceId = mediaStream.getVideoTracks()?.[0]?.getSettings?.()?.deviceId || null;
        console.log('✅ Cámara iniciada (fallback), deviceId:', activeDeviceId, 'facingMode:', fm);
        sendBackendLog('info', 'camera_started_fallback', { deviceId: activeDeviceId, facingMode: fm, constraints });

        await obtenerCamarasDisponibles();

        return mediaStream;
      } catch (error) {
        console.error('❌ Error al iniciar cámara en fallback:', error);
        sendBackendLog('error', 'camera_start_error', { error: error?.message || String(error) });
        setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
        setCamaraActiva(false);
        return null;
      }

    } catch (error) {
      console.error('❌ Error inesperado al iniciar cámara:', error);
      sendBackendLog('error', 'camera_start_unexpected_error', { error: error?.message || String(error) });
      setError('No se pudo acceder a la cámara. Por favor verifica los permisos.');
      setCamaraActiva(false);
      return null;
    }
  };

  // Detener cámara
  const detenerCamara = () => {
    // Limpiar timer de auto-flip si existe
    if (autoFlipTimerRef.current) {
      clearTimeout(autoFlipTimerRef.current);
      autoFlipTimerRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCamaraActiva(false);
      console.log('📷 Cámara detenida');
    }
  };

  // Cambiar entre cámara frontal y trasera
  const cambiarCamara = async () => {
    // Si hay timer automático pendiente, limpiarlo para evitar duplicados
    if (autoFlipTimerRef.current) {
      clearTimeout(autoFlipTimerRef.current);
      autoFlipTimerRef.current = null;
    }

    const nuevoFacingMode = facingMode === 'user' ? 'environment' : 'user';
    // Actualizar el estado para reflejar la intención (no confiar en leerlo inmediatamente)
    setFacingMode(nuevoFacingMode);

    // Reiniciar cámara con el nuevo facing mode y reportar deviceId al backend
    if (camaraActiva) {
      // Pasar explícitamente el nuevoFacingMode para evitar condiciones de carrera con setFacingMode
      const mediaStream = await iniciarCamara(true, nuevoFacingMode);
      const activeDeviceId = mediaStream?.getVideoTracks()?.[0]?.getSettings?.()?.deviceId || null;
      console.log('🔁 Cámara cambiada a', nuevoFacingMode, 'deviceId:', activeDeviceId);
      sendBackendLog('info', 'camera_changed', { deviceId: activeDeviceId, facingMode: nuevoFacingMode });
    }
  };

  // Capturar foto de la cámara
  const capturarFoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // Dibujar el frame actual del video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Calcular dimensiones del rectángulo en píxeles
    const rectWidth = canvas.width * RECT_WIDTH_PERCENT;
    const rectHeight = canvas.height * RECT_HEIGHT_PERCENT;
    const rectX = (canvas.width - rectWidth) / 2;
    const rectY = (canvas.height - rectHeight) / 2;

    // Crear un nuevo canvas solo con el área recortada
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = rectWidth;
    croppedCanvas.height = rectHeight;
    const croppedCtx = croppedCanvas.getContext('2d');

    // Copiar solo el área del rectángulo
    croppedCtx.drawImage(
      canvas,
      rectX, rectY, rectWidth, rectHeight,
      0, 0, rectWidth, rectHeight
    );

    // Convertir a blob y luego a File
    croppedCanvas.toBlob((blob) => {
      const file = new File([blob], `boleta_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const imageUrl = URL.createObjectURL(blob);

      setImagenCapturada(imageUrl);
      setArchivoImagen(file);
      detenerCamara();
      setModoCaptura('archivo');
      setImagenManualCargada(false);

      // Notificar al componente padre
      if (onImagenSeleccionada) {
        onImagenSeleccionada(file);
      }

      console.log('✅ Foto capturada y recortada');
    }, 'image/jpeg', 0.95);
  };

  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no debe superar los 10MB');
      return;
    }

    setArchivoImagen(file);
    setError('');
    setNumeroBoleta('');
    setNumeroConfirmado(false);
    setConfianzaOCR(null);
    setImagenManualCargada(true);

    // Resetear posición y escala
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setImagenCapturada(e.target.result);
        setImagenOriginal(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Notificar al componente padre
    if (onImagenSeleccionada) {
      onImagenSeleccionada(file);
    }
  };

  // Manejo de arrastre de imagen
  const handleMouseDown = (e) => {
    if (!imagenManualCargada) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX || e.touches?.[0]?.clientX,
      y: e.clientY || e.touches?.[0]?.clientY
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imagenManualCargada) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    setImagePosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setDragStart({ x: clientX, y: clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejo de zoom con rueda del mouse
  const handleWheel = (e) => {
    if (!imagenManualCargada) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Capturar área del rectángulo desde imagen manual
  const capturarAreaRectangulo = () => {
    if (!imageRef.current || !imageContainerRef.current || !imagenOriginal) return;

    const container = imageContainerRef.current;
    const img = imageRef.current;

    // Obtener dimensiones del contenedor y la imagen mostrada
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Calcular posición y dimensiones del rectángulo en píxeles del contenedor
    const rectWidth = containerRect.width * RECT_WIDTH_PERCENT;
    const rectHeight = containerRect.height * RECT_HEIGHT_PERCENT;
    const rectX = (containerRect.width - rectWidth) / 2;
    const rectY = (containerRect.height - rectHeight) / 2;

    // Calcular la escala de la imagen original vs la imagen mostrada
    const scaleX = imageDimensions.width / img.offsetWidth;
    const scaleY = imageDimensions.height / img.offsetHeight;

    // Calcular posición del rectángulo relativa a la imagen (considerando offset y escala)
    const relativeX = (rectX - (imgRect.left - containerRect.left)) * scaleX / imageScale;
    const relativeY = (rectY - (imgRect.top - containerRect.top)) * scaleY / imageScale;
    const relativeWidth = rectWidth * scaleX / imageScale;
    const relativeHeight = rectHeight * scaleY / imageScale;

    console.log('📐 Recortando área:', { relativeX, relativeY, relativeWidth, relativeHeight });

    // Crear canvas temporal para recortar
    const canvas = document.createElement('canvas');
    canvas.width = relativeWidth;
    canvas.height = relativeHeight;
    const ctx = canvas.getContext('2d');

    // Cargar imagen original
    const imgElement = new Image();
    imgElement.onload = () => {
      // Dibujar solo el área del rectángulo
      ctx.drawImage(
        imgElement,
        Math.max(0, relativeX),
        Math.max(0, relativeY),
        relativeWidth,
        relativeHeight,
        0,
        0,
        relativeWidth,
        relativeHeight
      );

      // Convertir a blob
      canvas.toBlob((blob) => {
        const file = new File([blob], `boleta_crop_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);

        setImagenCapturada(imageUrl);
        setArchivoImagen(file);
        setImagenManualCargada(false);

        console.log('✅ Área recortada correctamente');
      }, 'image/jpeg', 0.95);
    };
    imgElement.src = imagenOriginal;
  };

  // Procesar OCR (sin crop, ya viene recortada)
  const procesarOCR = async () => {
    if (!archivoImagen) {
      setError('No hay imagen para procesar');
      return;
    }

    setProcesandoOCR(true);
    setError('');
    setNumeroBoleta('');

    try {
      const formData = new FormData();
      formData.append('imagen_boleta', archivoImagen);

      // Sin coordenadas porque ya viene recortada
      formData.append('cropX', '0');
      formData.append('cropY', '0');
      formData.append('cropWidth', '0');
      formData.append('cropHeight', '0');

      const response = await api.post('/concurso-piscinas/ocr-crop', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Respuesta:', response.data);

      if (response.data.success && response.data.numero_boleta) {
        const numeroDetectado = response.data.numero_boleta;

        // Proceso transparente: simplemente usar el número detectado
        setNumeroBoleta(numeroDetectado);
        setRequiereConfirmacion(false);
        setVariaciones([]);

        // Notificar al componente padre inmediatamente
        if (onNumeroDetectado) {
          onNumeroDetectado(numeroDetectado);
        }
      } else {
        setError('No se pudo detectar el número de boleta. Por favor intenta nuevamente.');
      }
    } catch (error) {
      console.error('❌ Error al procesar OCR:', error);
      setError('Error al procesar la imagen. Por favor intenta nuevamente.');
    } finally {
      setProcesandoOCR(false);
    }
  };

  // Validar todas las variaciones contra la BD
  const validarTodasLasVariaciones = async (variacionesArray) => {
    setValidandoVariaciones(true);
    const resultados = {};

    try {
      const promesas = variacionesArray.map(async (variacion) => {
        try {
          const response = await api.post('/concurso-piscinas/validar-boleta', {
            numero_boleta: variacion
          });

          return {
            numero: variacion,
            data: response.data
          };
        } catch (error) {
          console.error(`Error validando ${variacion}:`, error);
          return {
            numero: variacion,
            data: { success: false, existe: false }
          };
        }
      });

      const resultadosArray = await Promise.all(promesas);

      resultadosArray.forEach((resultado) => {
        resultados[resultado.numero] = resultado.data;
      });

      console.log('✅ Variaciones validadas:', resultados);
      setVariacionesValidadas(resultados);
    } catch (error) {
      console.error('❌ Error al validar variaciones:', error);
    } finally {
      setValidandoVariaciones(false);
    }
  };

  // Seleccionar una variación específica
  const seleccionarVariacion = (numero) => {
    setNumeroBoleta(numero);
    setRequiereConfirmacion(false);
    setNumeroConfirmado(true);
    setError('');

    if (onNumeroDetectado) {
      onNumeroDetectado(numero);
    }
  };

  // Confirmar número de boleta
  const confirmarNumero = () => {
    if (!numeroBoleta || numeroBoleta.trim().length === 0) {
      setError('Número de boleta no válido');
      return;
    }

    setNumeroConfirmado(true);
    setError('');

    if (onNumeroDetectado) {
      onNumeroDetectado(numeroBoleta);
    }
  };

  // Resetear todo
  const resetear = () => {
    detenerCamara();
    setImagenCapturada(null);
    setArchivoImagen(null);
    setImagenOriginal(null);
    setNumeroBoleta('');
    setNumeroConfirmado(false);
    setConfianzaOCR(null);
    setError('');
    setVariaciones([]);
    setRequiereConfirmacion(false);
    setVariacionesValidadas({});
    setModoCaptura('archivo');
    setImagenManualCargada(false);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);

    if (onImagenSeleccionada) {
      onImagenSeleccionada(null);
    }
    if (onNumeroDetectado) {
      onNumeroDetectado('');
    }
  };

  // Helper: solicitar permisos, elegir la trasera por deviceId y abrir el stream final
  const startCameraSelectingRear = async () => {
    try {
      // 1) Pedir permisos con un stream temporal para que aparezcan las labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = tempStream;

      // Esperar a que el video esté listo (loadedmetadata o playing) o timeout
      await new Promise((resolve) => {
        let resolved = false;
        const onReady = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 3500);

        videoRef.current?.addEventListener('loadedmetadata', onReady, { once: true });
        videoRef.current?.addEventListener('playing', onReady, { once: true });
      });

      // 2) Enumerar dispositivos y elegir la trasera por etiqueta si existe
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoCameras = devices.filter(d => d.kind === 'videoinput');
      const frontRegex = /front|face|user|frontal|delantera|selfie/i;
      const rearRegex = /back|rear|environment|trasera|posterior/i;

      // Preferir una con etiqueta que no sea frontal, luego una que indique trasera, luego la última
      let rear = videoCameras.find(d => d.label && !frontRegex.test(d.label));
      if (!rear) rear = videoCameras.find(d => d.label && rearRegex.test(d.label));
      if (!rear && videoCameras.length > 0) rear = videoCameras[videoCameras.length - 1];

      // 3) Detener el stream temporal
      try { tempStream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }

      // 4) Iniciar el stream final con deviceId seleccionado si existe
      if (rear?.deviceId) {
        setCamaraSeleccionada(rear.deviceId);
        const finalStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: rear.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });

        setStream(finalStream);
        setCamaraActiva(true);
        setFacingMode('environment');
        if (videoRef.current) videoRef.current.srcObject = finalStream;

        const activeDeviceId = finalStream.getVideoTracks()?.[0]?.getSettings?.()?.deviceId || null;
        console.log('✅ Cámara iniciada con deviceId (final):', activeDeviceId);
        sendBackendLog('info', 'camera_started_with_deviceid', { deviceId: activeDeviceId, chosenDeviceId: rear.deviceId, label: rear.label });

        await obtenerCamarasDisponibles();
        return finalStream;
      }

      // Si no se pudo elegir deviceId, usar el flujo existente como fallback
      return iniciarCamara(true);
    } catch (err) {
      console.warn('startCameraSelectingRear error:', err);
      return iniciarCamara(true);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '2px solid',
        borderColor: numeroConfirmado ? 'success.main' : 'divider',
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraIcon color="primary" />
        Capturar Boleta
      </Typography>

      {/* Selector de modo de captura */}
      {!imagenCapturada && !camaraActiva && !imagenManualCargada && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <ToggleButtonGroup
            value={modoCaptura}
            exclusive
            onChange={async (e, newMode) => {
              if (newMode !== null) {
                setModoCaptura(newMode);
                if (newMode === 'camara') {
                  try {
                    // Iniciar cámara normalmente
                    const mediaStream = await iniciarCamara();

                    // Si se inició correctamente, programar auto-flip tras 2000ms o cuando el video esté listo
                    if (mediaStream) {
                      // limpiar timer previo si existe
                      if (autoFlipTimerRef.current) {
                        clearTimeout(autoFlipTimerRef.current);
                        autoFlipTimerRef.current = null;
                      }

                      const videoEl = videoRef.current;

                      const triggerFlip = () => {
                        try {
                          if (flipButtonRef.current) {
                            // dispatch click al botón (equivalente a que el usuario lo presione)
                            flipButtonRef.current.click();
                          } else {
                            // fallback: llamar a la función directamente
                            cambiarCamara();
                          }
                        } catch (e) {
                          console.warn('Auto-flip programático falló:', e);
                        }
                      };

                      if (videoEl) {
                        const onReady = () => {
                          // asegurar que se dispara una sola vez
                          try { videoEl.removeEventListener('playing', onReady); videoEl.removeEventListener('loadedmetadata', onReady); } catch (e) {}
                          // dar un pequeño margen antes de activar flip
                          setTimeout(triggerFlip, 2000);
                        };

                        videoEl.addEventListener('loadedmetadata', onReady, { once: true });
                        videoEl.addEventListener('playing', onReady, { once: true });

                        // Fallback: si no llega evento, ejecutar tras 2000ms
                        autoFlipTimerRef.current = setTimeout(() => {
                          triggerFlip();
                          autoFlipTimerRef.current = null;
                        }, 1000);
                      } else {
                        // Si no hay elemento video referenciado, usar timeout simple
                        autoFlipTimerRef.current = setTimeout(async () => {
                          try {
                            if (flipButtonRef.current) flipButtonRef.current.click(); else await cambiarCamara();
                          } catch (e) { console.warn('Auto flip falló:', e); }
                          autoFlipTimerRef.current = null;
                        }, 1000);
                      }
                    }
                  } catch (err) {
                    console.warn('Error iniciando cámara automáticamente:', err);
                  }
                }
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="archivo" sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CropIcon />
                <Typography variant="caption">Subir Imagen</Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="camara" sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CameraAltIcon />
                <Typography variant="caption">Usar Cámara</Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>

          {modoCaptura === 'archivo' && (
            <>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                ref={inputFileRef}
                style={{ display: 'none' }}
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAltIcon />}
                onClick={() => inputFileRef.current?.click()}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Seleccionar o Tomar Foto
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Asegúrate de que el número de boleta sea legible
              </Typography>
            </>
          )}
        </Box>
      )}

      {/* Vista de cámara en vivo */}
      {camaraActiva && !imagenCapturada && (
        <Fade in>
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Coloca el número de boleta dentro del rectángulo
              </Typography>
              <Typography variant="caption">
                Asegúrate de tener buena iluminación y que el número esté enfocado
              </Typography>
            </Alert>

            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                mx: 'auto',
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Video de la cámara */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />

              {/* Overlay del rectángulo guía */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                }}
              >
                {/* Fondo oscuro con recorte */}
                <svg
                  width="100%"
                  height="100%"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <defs>
                    <mask id="hole">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={`${(1 - RECT_WIDTH_PERCENT) * 50}%`}
                        y={`${(1 - RECT_HEIGHT_PERCENT) * 50}%`}
                        width={`${RECT_WIDTH_PERCENT * 100}%`}
                        height={`${RECT_HEIGHT_PERCENT * 100}%`}
                        rx="8"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.5)" mask="url(#hole)" />
                </svg>

                {/* Rectángulo guía con bordes */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${(1 - RECT_WIDTH_PERCENT) * 50}%`,
                    top: `${(1 - RECT_HEIGHT_PERCENT) * 50}%`,
                    width: `${RECT_WIDTH_PERCENT * 100}%`,
                    height: `${RECT_HEIGHT_PERCENT * 100}%`,
                    border: '3px solid #00FF00',
                    borderRadius: 1,
                    boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {/* Esquinas del rectángulo */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                    <Box
                      key={corner}
                      sx={{
                        position: 'absolute',
                        width: '20px',
                        height: '20px',
                        border: '3px solid #00FF00',
                        ...(corner.includes('top') ? { top: -3 } : { bottom: -3 }),
                        ...(corner.includes('left') ? { left: -3 } : { right: -3 }),
                        ...(corner.includes('top') && corner.includes('left') && {
                          borderRight: 'none',
                          borderBottom: 'none',
                        }),
                        ...(corner.includes('top') && corner.includes('right') && {
                          borderLeft: 'none',
                          borderBottom: 'none',
                        }),
                        ...(corner.includes('bottom') && corner.includes('left') && {
                          borderRight: 'none',
                          borderTop: 'none',
                        }),
                        ...(corner.includes('bottom') && corner.includes('right') && {
                          borderLeft: 'none',
                          borderTop: 'none',
                        }),
                      }}
                    />
                  ))}
                </Box>

                {/* Texto de ayuda */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    Alinea el número de boleta dentro del rectángulo
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Controles de la cámara */}
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CameraAltIcon />}
                onClick={capturarFoto}
                size="large"
                sx={{ flex: 2 }}
              >
                Capturar Foto
              </Button>

              <IconButton
                color="primary"
                aria-label="Cambiar cámara"
                ref={flipButtonRef}
                onClick={async () => {
                  try {
                    await cambiarCamara();
                  } catch (e) {
                    console.warn('Error al cambiar cámara manualmente:', e);
                  }
                }}
                sx={{ opacity: 0, pointerEvents: 'none' }}
              >
                <FlipCameraIcon />
              </IconButton>

              <IconButton
                color="error"
                onClick={() => {
                  detenerCamara();
                  setModoCaptura('archivo');
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>
        </Fade>
      )}

      {/* Canvas oculto para procesar la captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Vista de imagen manual con rectángulo guía */}
      {imagenManualCargada && imagenCapturada && (
        <Fade in>
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Arrastra la imagen para alinear el número dentro del rectángulo
              </Typography>
              <Typography variant="caption">
                Usa el slider o la rueda del mouse para hacer zoom
              </Typography>
            </Alert>

            <Box
              ref={imageContainerRef}
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                height: '400px',
                mx: 'auto',
                bgcolor: '#000',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
            >
              {/* Imagen */}
              <img
                ref={imageRef}
                src={imagenCapturada}
                alt="Boleta"
                style={{
                  maxWidth: 'none',
                  height: '100%',
                  transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                  transformOrigin: 'center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />

              {/* Overlay del rectángulo guía (igual que la cámara) */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <defs>
                    <mask id="hole-manual">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={`${(1 - RECT_WIDTH_PERCENT) * 50}%`}
                        y={`${(1 - RECT_HEIGHT_PERCENT) * 50}%`}
                        width={`${RECT_WIDTH_PERCENT * 100}%`}
                        height={`${RECT_HEIGHT_PERCENT * 100}%`}
                        rx="8"
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.5)" mask="url(#hole-manual)" />
                </svg>

                <Box
                  sx={{
                    position: 'absolute',
                    left: `${(1 - RECT_WIDTH_PERCENT) * 50}%`,
                    top: `${(1 - RECT_HEIGHT_PERCENT) * 50}%`,
                    width: `${RECT_WIDTH_PERCENT * 100}%`,
                    height: `${RECT_HEIGHT_PERCENT * 100}%`,
                    border: '3px solid #00FF00',
                    borderRadius: 1,
                    boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                    <Box
                      key={corner}
                      sx={{
                        position: 'absolute',
                        width: '20px',
                        height: '20px',
                        border: '3px solid #00FF00',
                        ...(corner.includes('top') ? { top: -3 } : { bottom: -3 }),
                        ...(corner.includes('left') ? { left: -3 } : { right: -3 }),
                        ...(corner.includes('top') && corner.includes('left') && {
                          borderRight: 'none',
                          borderBottom: 'none',
                        }),
                        ...(corner.includes('top') && corner.includes('right') && {
                          borderLeft: 'none',
                          borderBottom: 'none',
                        }),
                        ...(corner.includes('bottom') && corner.includes('left') && {
                          borderRight: 'none',
                          borderTop: 'none',
                        }),
                        ...(corner.includes('bottom') && corner.includes('right') && {
                          borderLeft: 'none',
                          borderTop: 'none',
                        }),
                      }}
                    />
                  ))}
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" textAlign="center">
                    Arrastra para posicionar • Zoom: {(imageScale * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Control de zoom con slider */}
            <Box sx={{ mt: 2, px: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <ZoomOutIcon color="action" />
                <Slider
                  value={imageScale}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onChange={(e, value) => setImageScale(value)}
                  sx={{ flex: 1 }}
                />
                <ZoomInIcon color="action" />
                <Typography variant="caption" sx={{ minWidth: '45px', textAlign: 'right' }}>
                  {(imageScale * 100).toFixed(0)}%
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetear}
                startIcon={<RefreshIcon />}
                sx={{ flex: 1 }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={capturarAreaRectangulo}
                startIcon={<CheckIcon />}
                size="large"
                sx={{ flex: 2 }}
              >
                Detectar Número
              </Button>
            </Stack>
          </Box>
        </Fade>
      )}

      {/* Imagen capturada - Vista previa antes de procesar OCR */}
      {imagenCapturada && !imagenManualCargada && !numeroConfirmado && !procesandoOCR && (
        <Fade in>
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Imagen capturada correctamente
              </Typography>
              <Typography variant="caption">
                Presiona el botón para detectar el número de boleta
              </Typography>
            </Alert>

            <Box
              sx={{
                position: 'relative',
                maxWidth: '100%',
                mx: 'auto',
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            >
              <img
                src={imagenCapturada}
                alt="Boleta capturada"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetear}
                startIcon={<RefreshIcon />}
                sx={{ flex: 1 }}
              >
                Tomar Otra
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={procesarOCR}
                startIcon={<CheckIcon />}
                size="large"
                sx={{ flex: 2 }}
              >
                Detectar Número
              </Button>
            </Stack>
          </Box>
        </Fade>
      )}

      {/* Procesando */}
      {procesandoOCR && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Procesando imagen...
          </Typography>
        </Box>
      )}

      {/* Número detectado - Versión simplificada sin información técnica */}
      {numeroBoleta && !numeroConfirmado && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Número detectado: {numeroBoleta}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Si no es correcto, puedes tomar otra foto
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="primary"
                onClick={resetear}
                startIcon={<RefreshIcon />}
                sx={{ flex: 1 }}
              >
                Tomar Otra
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={confirmarNumero}
                startIcon={<CheckIcon />}
                size="large"
                sx={{ flex: 2 }}
              >
                Confirmar
              </Button>
            </Stack>
          </Box>
        </Fade>
      )}

      {/* Número confirmado */}
      {numeroConfirmado && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" icon={<CheckIcon />}>
              <Typography variant="body1" fontWeight="bold">
                Número confirmado: {numeroBoleta}
              </Typography>
            </Alert>

            {imagenCapturada && (
              <Box
                sx={{
                  mt: 2,
                  maxWidth: '300px',
                  mx: 'auto',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: 'success.main',
                }}
              >
                <img
                  src={imagenCapturada}
                  alt="Boleta confirmada"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </Box>
            )}

            <Button
              variant="outlined"
              color="primary"
              onClick={resetear}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Cambiar Imagen o Número
            </Button>
          </Box>
        </Fade>
      )}

      {/* Errores */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default ImageCropperUpload;
