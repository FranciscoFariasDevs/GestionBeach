// frontend/src/pages/GestionPerfilesPage.jsx
import React from 'react';
import { Container } from '@mui/material';
import GestionPerfilesCompleta from '../components/GestionPerfilesCompleta';

const GestionPerfilesPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <GestionPerfilesCompleta />
    </Container>
  );
};

export default GestionPerfilesPage;
