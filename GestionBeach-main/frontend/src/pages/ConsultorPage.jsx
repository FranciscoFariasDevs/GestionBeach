import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Fade,
} from '@mui/material';
import { LocalOfferOutlined } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import barcodeIcon from '@iconify-icons/mdi/barcode-scan';
import logoImg from './logo.png';

// Estilos
const MainContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
}));

const Logo = styled('img')(() => ({
  height: 100,
  marginBottom: 30,
}));

const ScannerIcon = styled(Box)(({ theme }) => ({
  background: theme.palette.primary.light,
  borderRadius: '50%',
  padding: theme.spacing(4),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
}));

const ProductCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  borderRadius: 20,
  boxShadow: theme.shadows[6],
  marginTop: theme.spacing(3),
  minWidth: 350,
}));

const PriceDisplay = styled(Box)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(3, 5),
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  marginTop: theme.spacing(3),
}));

const ConsultorPage = () => {
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        if (codigo.length > 3) {
          buscarProducto(codigo);
        }
        setCodigo('');
      } else {
        setCodigo((prev) => prev + e.key);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [codigo]);

  const buscarProducto = async (cod) => {
    setLoading(true);
    try {
      const res = await fetch(`http://192.168.100.92:5000/api/productos?q=${encodeURIComponent(cod)}`);
      if (!res.ok) throw new Error('No encontrado');
      const data = await res.json();
      setProducto(data);
      setTimeout(() => setProducto(null), 5000);
    } catch (err) {
      setProducto({
        nombre: 'Producto no encontrado',
        precio: null,
      });
      setTimeout(() => setProducto(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <MainContainer>
      <Logo src={logoImg} alt="Logo" />

      {!producto ? (
        <>
          <ScannerIcon>
            <Icon icon={barcodeIcon} style={{ fontSize: '90px', color: '#1976d2' }} />
          </ScannerIcon>
          <Typography variant="h3" color="primary" fontWeight="bold">
            Escanea tu producto
          </Typography>
          {loading && <CircularProgress sx={{ mt: 3 }} />}
        </>
      ) : (
        <Fade in={!!producto}>
          <ProductCard>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
              {producto.nombre}
            </Typography>

            {producto.codigo && (
              <Typography variant="h6" color="textSecondary">
                Código: <strong>{producto.codigo}</strong>
              </Typography>
            )}

            {producto.precio ? (
              <PriceDisplay>
                <LocalOfferOutlined sx={{ mr: 2, fontSize: 40 }} />
                <Typography variant="h3" fontWeight="bold">
                  {formatCurrency(producto.precio)}
                </Typography>
              </PriceDisplay>
            ) : (
              <Typography variant="h6" color="error" mt={3}>
                No se encontró el producto
              </Typography>
            )}
          </ProductCard>
        </Fade>
      )}
    </MainContainer>
  );
};

export default ConsultorPage;
