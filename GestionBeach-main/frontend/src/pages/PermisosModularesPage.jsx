// frontend/src/pages/PermisosModularesPage.jsx
import React from 'react';
import { Container } from '@mui/material';
import PermisosModularesManager from '../components/PermisosModularesManager';

const PermisosModularesPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PermisosModularesManager />
    </Container>
  );
};

export default PermisosModularesPage;
