// frontend/src/components/ImageCropperUpload.jsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  IconButton,
  Fade,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PhotoCamera as CameraIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  CropFree as CropIcon,
} from '@mui/icons-material';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import api from '../api/api';

const ImageCropperUpload = ({ onNumeroDetectado, onImagenSeleccionada }) => {
  const [imagenSrc, setImagenSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: 'px',
    x: 50,
    y: 50,
    width: 300,
    height: 100,
  });
  const [archivoImagen, setArchivoImagen] = useState(null);
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

  const imagenRef = useRef(null);
  const inputFileRef = useRef(null);

  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Solo se permiten imágenes JPG, JPEG o PNG');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setArchivoImagen(file);
    setError('');
    setNumeroBoleta('');
    setNumeroConfirmado(false);
    setConfianzaOCR(null);

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagenSrc(reader.result);
    };
    reader.readAsDataURL(file);

    // Notificar al componente padre
    if (onImagenSeleccionada) {
      onImagenSeleccionada(file);
    }
  };

  // Procesar OCR con las coordenadas del crop
  const procesarOCR = async () => {
    if (!archivoImagen || !imagenRef.current) {
      setError('Selecciona una imagen primero');
      return;
    }

    setProcesandoOCR(true);
    setError('');
    setNumeroBoleta(''); // Limpiar número anterior si existe

    try {
      // Obtener dimensiones reales de la imagen
      const img = imagenRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      // Calcular coordenadas reales del crop
      const cropX = Math.round(crop.x * scaleX);
      const cropY = Math.round(crop.y * scaleY);
      const cropWidth = Math.round(crop.width * scaleX);
      const cropHeight = Math.round(crop.height * scaleY);

      console.log('📐 Coordenadas del crop:', { cropX, cropY, cropWidth, cropHeight });
      console.log('📐 Dimensiones imagen:', {
        display: { width: img.width, height: img.height },
        natural: { width: img.naturalWidth, height: img.naturalHeight },
      });

      // Crear FormData
      const formData = new FormData();
      formData.append('imagen_boleta', archivoImagen);
      formData.append('cropX', cropX.toString());
      formData.append('cropY', cropY.toString());
      formData.append('cropWidth', cropWidth.toString());
      formData.append('cropHeight', cropHeight.toString());

      // Enviar al backend
      const response = await api.post('/concurso-piscinas/ocr-crop', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Respuesta OCR:', response.data);

      if (response.data.success && response.data.numero_boleta) {
        setNumeroBoleta(response.data.numero_boleta);
        setConfianzaOCR(response.data.confianza);

        // Verificar si requiere confirmación (confianza baja)
        if (response.data.requiere_confirmacion && response.data.variaciones && response.data.variaciones.length > 1) {
          console.log('⚠️ Confianza baja, mostrando variaciones:', response.data.variaciones);
          setVariaciones(response.data.variaciones);
          setRequiereConfirmacion(true);

          // Validar todas las variaciones automáticamente
          validarTodasLasVariaciones(response.data.variaciones);
        } else {
          // Confianza alta, confirmar automáticamente
          setRequiereConfirmacion(false);
          setVariaciones([]);

          // Notificar al componente padre
          if (onNumeroDetectado) {
            onNumeroDetectado(response.data.numero_boleta);
          }
        }
      } else {
        setError('No fue encontrado el número. Por favor intente con una foto legible.');
      }
    } catch (error) {
      console.error('❌ Error al procesar OCR:', error);
      setError('No fue encontrado el número. Por favor intente con una foto legible.');
    } finally {
      setProcesandoOCR(false);
    }
  };

  // Validar todas las variaciones contra la BD
  const validarTodasLasVariaciones = async (variacionesArray) => {
    setValidandoVariaciones(true);
    const resultados = {};

    try {
      // Validar cada variación en paralelo
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

      // Convertir array a objeto
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

    // Notificar al componente padre
    if (onNumeroDetectado) {
      onNumeroDetectado(numero);
    }
  };

  // Confirmar número de boleta
  const confirmarNumero = () => {
    if (!numeroBoleta || numeroBoleta.trim().length === 0) {
      setError('No fue encontrado el número. Por favor intente con una foto legible.');
      return;
    }

    setNumeroConfirmado(true);
    setError('');

    // Notificar al componente padre
    if (onNumeroDetectado) {
      onNumeroDetectado(numeroBoleta);
    }
  };

  // Resetear todo
  const resetear = () => {
    setImagenSrc(null);
    setArchivoImagen(null);
    setNumeroBoleta('');
    setNumeroConfirmado(false);
    setConfianzaOCR(null);
    setError('');
    setVariaciones([]);
    setRequiereConfirmacion(false);
    setVariacionesValidadas({});
    setCrop({
      unit: 'px',
      x: 50,
      y: 50,
      width: 300,
      height: 100,
    });

    if (onImagenSeleccionada) {
      onImagenSeleccionada(null);
    }
    if (onNumeroDetectado) {
      onNumeroDetectado('');
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
        Cargar Imagen de la Boleta
      </Typography>

      {/* Botón de selección de archivo */}
      {!imagenSrc && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            ref={inputFileRef}
            style={{ display: 'none' }}
          />
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={() => inputFileRef.current?.click()}
            sx={{ px: 4, py: 1.5 }}
          >
            Seleccionar Imagen
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Formatos: JPG, JPEG, PNG (máximo 5MB)
          </Typography>
        </Box>
      )}

      {/* Imagen con cropper */}
      {imagenSrc && !numeroConfirmado && (
        <Fade in>
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Ajusta el recuadro sobre el número de boleta
              </Typography>
              <Typography variant="caption">
                Mueve y redimensiona el recuadro para enfocar exactamente el número de la boleta
              </Typography>
            </Alert>

            <Box
              sx={{
                position: 'relative',
                maxWidth: '100%',
                mx: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: '#000',
              }}
            >
              <ReactCrop
                crop={crop}
                onChange={(newCrop) => setCrop(newCrop)}
                aspect={undefined}
                minWidth={50}
                minHeight={30}
              >
                <img
                  ref={imagenRef}
                  src={imagenSrc}
                  alt="Boleta"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </ReactCrop>
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={procesarOCR}
                disabled={procesandoOCR}
                startIcon={procesandoOCR ? <CircularProgress size={20} /> : <CropIcon />}
                fullWidth
              >
                {procesandoOCR ? 'Detectando Número...' : 'Detectar Número'}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetear}
                startIcon={<RefreshIcon />}
              >
                Cambiar Imagen
              </Button>
            </Stack>
          </Box>
        </Fade>
      )}

      {/* Número detectado con múltiples opciones (confianza baja) */}
      {numeroBoleta && !numeroConfirmado && requiereConfirmacion && variaciones.length > 0 && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                ⚠️ Confianza Baja: {confianzaOCR?.toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                El OCR detectó "{numeroBoleta}", pero no está completamente seguro.
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                Selecciona el número correcto de las opciones:
              </Typography>
            </Alert>

            {validandoVariaciones && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Verificando números en la base de datos...
                </Typography>
              </Box>
            )}

            <Stack spacing={2} sx={{ mb: 2 }}>
              {variaciones.map((variacion, index) => {
                const validacion = variacionesValidadas[variacion];
                const existe = validacion?.existe || false;
                const yaRegistrada = validacion?.ya_registrada || false;
                const esValida = validacion?.datos?.valida || false;

                return (
                  <Paper
                    key={index}
                    elevation={2}
                    sx={{
                      p: 2,
                      border: '2px solid',
                      borderColor: existe
                        ? esValida
                          ? 'success.main'
                          : yaRegistrada
                          ? 'error.main'
                          : 'warning.main'
                        : 'grey.300',
                      bgcolor: existe
                        ? esValida
                          ? 'success.light'
                          : 'error.light'
                        : 'background.paper',
                      cursor: esValida ? 'pointer' : 'not-allowed',
                      opacity: esValida ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                      '&:hover': esValida
                        ? {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          }
                        : {},
                    }}
                    onClick={() => esValida && seleccionarVariacion(variacion)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                          {variacion}
                          {index === 0 && ' (Detectado)'}
                        </Typography>

                        {validandoVariaciones ? (
                          <Typography variant="body2" color="text.secondary">
                            Verificando...
                          </Typography>
                        ) : existe ? (
                          <>
                            <Typography variant="body2" fontWeight="bold" color={esValida ? 'success.dark' : 'error.dark'}>
                              {esValida
                                ? '✅ Existe en BD y es válida'
                                : yaRegistrada
                                ? '❌ Ya fue registrada en el concurso'
                                : '⚠️ No cumple requisitos del concurso'}
                            </Typography>
                            {validacion.datos && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                Monto: ${validacion.datos.monto?.toLocaleString('es-CL')} | Sucursal: {validacion.datos.sucursal}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            ❌ No existe en la base de datos
                          </Typography>
                        )}
                      </Box>

                      {esValida && (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => seleccionarVariacion(variacion)}
                        >
                          Seleccionar
                        </Button>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>

            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setNumeroBoleta('');
                setConfianzaOCR(null);
                setVariaciones([]);
                setRequiereConfirmacion(false);
                setVariacionesValidadas({});
              }}
              startIcon={<RefreshIcon />}
              fullWidth
            >
              Volver a Detectar
            </Button>
          </Box>
        </Fade>
      )}

      {/* Número detectado con alta confianza */}
      {numeroBoleta && !numeroConfirmado && !requiereConfirmacion && (
        <Fade in>
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                ✅ Número de Boleta: {numeroBoleta}
              </Typography>
              <Typography variant="body2">
                Confianza: {confianzaOCR?.toFixed(1)}%
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Si no es correcto, ajusta el recuadro y vuelve a detectar
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setNumeroBoleta('');
                  setConfianzaOCR(null);
                }}
                startIcon={<RefreshIcon />}
                sx={{ flex: 1 }}
              >
                Volver a Detectar
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={confirmarNumero}
                startIcon={<CheckIcon />}
                size="large"
                sx={{ flex: 2 }}
              >
                Confirmar Número
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
                Número de boleta confirmado: {numeroBoleta}
              </Typography>
              <Typography variant="body2">
                Imagen cargada correctamente
              </Typography>
            </Alert>

            <Button
              variant="outlined"
              onClick={resetear}
              startIcon={<RefreshIcon />}
              fullWidth
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
