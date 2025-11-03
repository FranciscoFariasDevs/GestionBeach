import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../api/api';

/**
 * Componente reutilizable para seleccionar sucursales
 * Muestra solo las sucursales permitidas para el usuario según su perfil
 */
export default function SucursalSelect({
  value,
  onChange,
  label = 'Sucursal',
  fullWidth = true,
  required = false,
  disabled = false,
  sx = {}
}) {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtiene las sucursales del usuario (filtradas por perfil)
      const response = await api.get('/sucursales');
      console.log('✅ Sucursales permitidas cargadas:', response.data);

      setSucursales(response.data || []);

      // Si solo hay una sucursal, seleccionarla automáticamente
      if (response.data.length === 1 && !value) {
        onChange({ target: { value: response.data[0].id } });
      }

    } catch (err) {
      console.error('❌ Error al cargar sucursales:', err);
      setError('Error al cargar sucursales');
      setSucursales([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <FormControl fullWidth={fullWidth} sx={sx}>
        <InputLabel>{label}</InputLabel>
        <Select
          value=""
          label={label}
          disabled
        >
          <MenuItem value="">
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Cargando sucursales...
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={sx}>
        {error}
      </Alert>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} required={required} sx={sx}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        onChange={onChange}
        label={label}
        disabled={disabled || sucursales.length === 0}
      >
        {sucursales.length === 0 ? (
          <MenuItem value="" disabled>
            No tienes sucursales asignadas
          </MenuItem>
        ) : (
          sucursales.map((sucursal) => (
            <MenuItem key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre} - {sucursal.tipo_sucursal}
            </MenuItem>
          ))
        )}
      </Select>
      {sucursales.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
          No tienes sucursales asignadas. Contacta al administrador.
        </Alert>
      )}
      {sucursales.length === 1 && (
        <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
          Solo tienes acceso a una sucursal
        </Alert>
      )}
    </FormControl>
  );
}
