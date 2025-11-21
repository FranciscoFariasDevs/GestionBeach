// frontend/src/pages/PagoExitosoPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../api/api';

const PagoExitosoPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transaccion, setTransaccion] = useState(null);

  const reservaId = searchParams.get('reserva_id');
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      cargarTransaccion();
    }
  }, [token]);

  const cargarTransaccion = async () => {
    try {
      const response = await api.get(`/webpay/transaccion/${token}`);
      if (response.data.success) {
        setTransaccion(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar transacción:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)',
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
            {/* Header con icono de éxito */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #66BB6A 0%, #43A047 100%)',
                p: 4,
                textAlign: 'center',
                color: 'white'
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircleIcon sx={{ fontSize: 100, mb: 2 }} />
              </motion.div>
              <Typography variant="h3" fontWeight={900} gutterBottom>
                ¡Pago Exitoso!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.95 }}>
                Tu reserva ha sido confirmada
              </Typography>
            </Box>

            {/* Información de la transacción */}
            <Box sx={{ p: 4 }}>
              {transaccion && (
                <Card elevation={0} sx={{ mb: 3, bgcolor: '#F5F5F5', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon /> Detalles de la Transacción
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Reserva:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        #{transaccion.reserva_id}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Cliente:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {transaccion.cliente_nombre} {transaccion.cliente_apellido}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Monto Pagado:</Typography>
                      <Typography variant="h6" fontWeight={900} color="success.main">
                        ${parseFloat(transaccion.monto).toLocaleString('es-CL')}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">Orden de Compra:</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {transaccion.buy_order}
                      </Typography>
                    </Box>

                    {transaccion.authorization_code && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Código Autorización:</Typography>
                        <Chip
                          label={transaccion.authorization_code}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Estado:</Typography>
                      <Chip
                        label={transaccion.estado}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Box
                sx={{
                  p: 3,
                  bgcolor: '#E3F2FD',
                  borderRadius: 2,
                  border: '2px solid #2196F3',
                  mb: 3
                }}
              >
                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
                  📧 Recibirás un email de confirmación con todos los detalles de tu reserva
                </Typography>
              </Box>

              {/* Botones de acción */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/')}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontWeight: 700
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

export default PagoExitosoPage;
