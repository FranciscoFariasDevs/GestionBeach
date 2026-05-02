// frontend/src/components/BuscadorInteligente.jsx
// Spotlight-style semantic search (Ctrl+K / Cmd+K)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  InputBase,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import StoreIcon from '@mui/icons-material/Store';
import DashboardIcon from '@mui/icons-material/Dashboard';
import api from '../api/api';

const TIPO_CONFIG = {
  modulo:    { label: 'Módulo',    color: 'primary',  Icon: DashboardIcon },
  empleado:  { label: 'Empleado',  color: 'success',  Icon: PersonIcon    },
  producto:  { label: 'Producto',  color: 'warning',  Icon: InventoryIcon },
  proveedor: { label: 'Proveedor', color: 'info',     Icon: StoreIcon     },
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function BuscadorInteligente({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery]           = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState(0);
  const [error, setError]           = useState(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 350);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResultados([]);
      setSelected(0);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResultados([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/busqueda?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => {
        if (!cancelled) {
          setResultados(res.data.resultados || []);
          setSelected(0);
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo conectar con el buscador');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (resultado) => {
      onClose();
      if (resultado?.ruta) navigate(resultado.ruta);
    },
    [navigate, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      if (resultados[selected]) handleSelect(resultados[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          mt: '8vh',
          verticalAlign: 'top',
        },
      }}
      sx={{ '& .MuiBackdrop-root': { backdropFilter: 'blur(4px)' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search input */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            gap: 1.5,
          }}
        >
          {loading ? (
            <CircularProgress size={20} thickness={5} />
          ) : (
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
          )}
          <InputBase
            inputRef={inputRef}
            fullWidth
            placeholder="Buscar empleados, productos, módulos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ fontSize: '1rem', '& input': { py: 0.5 } }}
          />
          <Chip label="Esc" size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
        </Box>

        {/* Results */}
        {error && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}

        {!error && resultados.length > 0 && (
          <List disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {resultados.map((r, i) => {
              const cfg = TIPO_CONFIG[r.tipo] || TIPO_CONFIG.modulo;
              const Icon = cfg.Icon;
              const isSelected = i === selected;
              return (
                <React.Fragment key={`${r.tipo}-${r.label}-${i}`}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleSelect(r)}
                    sx={{
                      px: 2.5,
                      py: 1.2,
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                      },
                    }}
                  >
                    <Icon
                      sx={{
                        mr: 1.5,
                        color: `${cfg.color}.main`,
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={500} noWrap>
                            {r.label}
                          </Typography>
                          <Chip
                            label={cfg.label}
                            color={cfg.color}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {r.descripcion}
                          {r.meta ? ` · ${r.meta}` : ''}
                        </Typography>
                      }
                    />
                    {isSelected && (
                      <NavigateNextIcon sx={{ color: 'text.disabled', fontSize: 18, flexShrink: 0 }} />
                    )}
                  </ListItemButton>
                  {i < resultados.length - 1 && <Divider component="li" />}
                </React.Fragment>
              );
            })}
          </List>
        )}

        {/* Empty state */}
        {!loading && !error && query.length >= 2 && resultados.length === 0 && (
          <Box sx={{ px: 3, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Sin resultados para "<strong>{query}</strong>"
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Prueba con otras palabras o conceptos relacionados
            </Typography>
          </Box>
        )}

        {/* Hint when empty */}
        {!loading && !error && query.length < 2 && (
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="caption" color="text.disabled" display="block" mb={1}>
              Sugerencias
            </Typography>
            {['sueldos del mes', 'quién maneja las compras', 'stock bajo', 'órdenes pendientes'].map((hint) => (
              <Chip
                key={hint}
                label={hint}
                size="small"
                variant="outlined"
                onClick={() => setQuery(hint)}
                sx={{ mr: 1, mb: 1, cursor: 'pointer', fontSize: '0.75rem' }}
              />
            ))}
          </Box>
        )}

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            px: 2.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          {[['↑↓', 'navegar'], ['↵', 'abrir'], ['Esc', 'cerrar']].map(([key, desc]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label={key} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
              <Typography variant="caption" color="text.disabled">{desc}</Typography>
            </Box>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.disabled" sx={{ alignSelf: 'center' }}>
            Búsqueda semántica
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
