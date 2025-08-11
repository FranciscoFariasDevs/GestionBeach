import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ textAlign: 'center', mt: 10 }}>
      <Box>
        <ErrorOutlineIcon sx={{ fontSize: 100, color: 'error.main' }} />
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Página no encontrada
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleGoBack}>
          Volver al inicio
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
