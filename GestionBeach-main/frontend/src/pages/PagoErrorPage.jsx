// frontend/src/pages/PagoErrorPage.jsx
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert
} from '@mui/material';
import {
  Error as ErrorIcon,
  Home as HomeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const PagoErrorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get('error');
  const codigo = searchParams.get('codigo');
  const reservaId = searchParams.get('reserva_id');

  const getMensajeError = () => {
    if (error === 'no_token') {
      return 'No se recibió información de la transacción';
    }
    if (error === 'transaccion_no_encontrada') {
      return 'No se encontró la transacción en nuestro sistema';
    }
    if (codigo) {
      return `El pago fue rechazado por el banco (Código: ${codigo})`;
    }
    return 'Ocurrió un error al procesar tu pago';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFEBEE 0%, #FFCDD2 50%, #EF9A9A 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper elevation={8} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            {/* Header con icono de error */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #EF5350 0%, #E53935 100%)',
                p: 4,
                textAlign: 'center',
                color: 'white'
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <ErrorIcon sx={{ fontSize: 100, mb: 2 }} />
              </motion.div>
              <Typography variant="h3" fontWeight={900} gutterBottom>
                Error en el Pago
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.95 }}>
                No se pudo completar tu transacción
              </Typography>
            </Box>

            {/* Información del error */}
            <Box sx={{ p: 4 }}>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body1" fontWeight={600}>
                  {getMensajeError()}
                </Typography>
              </Alert>

              <Box
                sx={{
                  p: 3,
                  bgcolor: '#FFF3E0',
                  borderRadius: 2,
                  border: '2px solid #FFB74D',
                  mb: 3
                }}
              >
                <Typography variant="body2" gutterBottom fontWeight={600}>
                  ¿Qué puedo hacer?
                </Typography>
                <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                  <li>Verifica que tu tarjeta tenga fondos suficientes</li>
                  <li>Asegúrate de ingresar correctamente los datos de tu tarjeta</li>
                  <li>Intenta con otro método de pago</li>
                  <li>Si el problema persiste, contacta con tu banco</li>
                </Typography>
              </Box>

              {/* Botones de acción */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={() => navigate('/reserva-cabanas')}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    fontWeight: 700
                  }}
                >
                  Intentar Nuevamente
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/')}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    borderWidth: 2,
                    fontWeight: 700,
                    '&:hover': {
                      borderWidth: 2
                    }
                  }}
                >
                  Volver al Inicio
                </Button>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default PagoErrorPage;
