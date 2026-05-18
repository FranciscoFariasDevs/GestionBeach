// src/components/DynamicExpenseSection.jsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { formatCurrency } from '../pages/EstadoResultados/utils';

const expenseCatalog = {
  administrativos: [
    { id: 'seguros', label: 'Seguros' },
    { id: 'gastosComunes', label: 'Gastos Comunes' },
    { id: 'electricidad', label: 'Electricidad' },
    { id: 'agua', label: 'Agua' },
    { id: 'telefonia', label: 'Telefonía Celular' },
    { id: 'alarma', label: 'Alarma' },
    { id: 'internet', label: 'Internet' },
    { id: 'facturasNet', label: 'Facturas Net' },
    { id: 'transbank', label: 'Transbank' },
    { id: 'patenteMunicipal', label: 'Patente Municipal' },
    { id: 'contribuciones', label: 'Contribuciones' },
    { id: 'petroleo', label: 'Petróleo' },
    { id: 'otros', label: 'Otros Gastos' },
  ],
  venta: [
    { id: 'fletes', label: 'Costo por Fletes' },
    { id: 'finiquitos', label: 'Finiquitos' },
    { id: 'mantenciones', label: 'Mantenciones' },
    { id: 'publicidad', label: 'Publicidad' },
  ],
  otros: [
    { id: 'mermaVenta', label: 'Merma Venta' },
    { id: 'costoArriendo', label: 'Costo de Arriendo' },
    { id: 'ingresoFletes', label: 'Ingresos por Fletes' },
    { id: 'otrosIngresos', label: 'Otros Ingresos Financieros' },
  ],
};

// Devuelve solo dígitos como entero
const parseClp = (str) =>
  parseInt(String(str).replace(/\./g, '').replace(/[^\d]/g, ''), 10) || 0;

// Formatea un número entero con puntos de miles (es-CL)
const formatClp = (n) => {
  const num = Math.round(Math.abs(n) || 0);
  if (num === 0) return '';
  return num.toLocaleString('es-CL');
};

// Hook interno para manejar un campo de monto con formato CLP
const useClpInput = (initialValue = 0) => {
  const [display, setDisplay] = useState(initialValue > 0 ? formatClp(initialValue) : '');
  const [value, setValue] = useState(initialValue);

  const onChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
    const num = parseInt(raw, 10) || 0;
    setValue(num);
    setDisplay(num === 0 ? '' : formatClp(num));
  };

  const reset = (newValue = 0) => {
    setValue(newValue);
    setDisplay(newValue > 0 ? formatClp(newValue) : '');
  };

  return { display, value, onChange, reset };
};

const DynamicExpenseSection = ({
  category,
  title,
  description,
  existingExpenses = [],
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  disabled = false,
}) => {
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [customLabel, setCustomLabel] = useState('');

  const addAmount = useClpInput(0);
  const editAmount = useClpInput(0);

  const availableExpenses = expenseCatalog[category]
    ? expenseCatalog[category].filter(
        (expense) => !existingExpenses.find((e) => e.id === expense.id)
      )
    : [];

  const selectedCatalogItem = expenseCatalog[category]?.find(
    (e) => e.id === selectedExpenseType
  );

  // Si el tipo seleccionado es 'otros' en cualquier categoría, se permite nombre libre
  const allowsCustomName = selectedExpenseType === 'otros' || selectedExpenseType === 'otrosIngresos';

  const handleOpenAddDialog = () => {
    if (!selectedExpenseType) return;
    addAmount.reset(0);
    setCustomLabel('');
    setDialogOpen(true);
  };

  const handleAddExpense = () => {
    if (!selectedCatalogItem) return;
    const label =
      allowsCustomName && customLabel.trim()
        ? customLabel.trim()
        : selectedCatalogItem.label;
    onAddExpense({
      id: selectedCatalogItem.id,
      label,
      amount: addAmount.value,
    });
    setDialogOpen(false);
    setSelectedExpenseType('');
    addAmount.reset(0);
    setCustomLabel('');
  };

  const handleOpenEditDialog = (expense) => {
    setEditingExpense(expense);
    editAmount.reset(expense.amount);
    setCustomLabel(expense.label);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingExpense) return;
    const catalogItem = expenseCatalog[category]?.find((e) => e.id === editingExpense.id);
    const defaultLabel = catalogItem?.label || editingExpense.label;
    const isOtros = editingExpense.id === 'otros' || editingExpense.id === 'otrosIngresos';
    const label =
      isOtros && customLabel.trim() ? customLabel.trim() : defaultLabel;
    onUpdateExpense({
      ...editingExpense,
      label,
      amount: editAmount.value,
    });
    setEditDialogOpen(false);
    setEditingExpense(null);
    editAmount.reset(0);
    setCustomLabel('');
  };

  const total = existingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {/* Selector + botón agregar */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControl
          sx={{ minWidth: 260 }}
          size="small"
          disabled={disabled || availableExpenses.length === 0}
        >
          <InputLabel>Seleccione un tipo de gasto</InputLabel>
          <Select
            value={selectedExpenseType}
            label="Seleccione un tipo de gasto"
            onChange={(e) => setSelectedExpenseType(e.target.value)}
          >
            {availableExpenses.map((expense) => (
              <MenuItem key={expense.id} value={expense.id}>
                {expense.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          disabled={!selectedExpenseType || disabled}
        >
          Agregar
        </Button>
      </Box>

      {/* Tabla */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Concepto</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 100 }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {existingExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin gastos agregados. Use el selector para añadir.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              existingExpenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{expense.label}</TableCell>
                  <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(expense)}
                          disabled={disabled}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveExpense(expense)}
                          disabled={disabled}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
            {existingExpenses.length > 0 && (
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo agregar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar gasto</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {allowsCustomName && (
            <TextField
              label="Nombre del gasto"
              fullWidth
              size="small"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={selectedCatalogItem?.label || 'Ej: Gastos de limpieza'}
              helperText="Puede personalizar el nombre de este concepto"
            />
          )}
          {!allowsCustomName && (
            <Typography variant="body2" color="text.secondary">
              Concepto: <strong>{selectedCatalogItem?.label}</strong>
            </Typography>
          )}
          <TextField
            autoFocus={!allowsCustomName}
            label="Monto"
            fullWidth
            size="small"
            value={addAmount.display}
            onChange={addAmount.onChange}
            inputProps={{ inputMode: 'numeric' }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            helperText="Ingrese el valor en pesos chilenos"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddExpense} color="primary" variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo editar */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Editar gasto</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(editingExpense?.id === 'otros' || editingExpense?.id === 'otrosIngresos') && (
            <TextField
              label="Nombre del gasto"
              fullWidth
              size="small"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              helperText="Puede personalizar el nombre"
            />
          )}
          {!(editingExpense?.id === 'otros' || editingExpense?.id === 'otrosIngresos') && (
            <Typography variant="body2" color="text.secondary">
              Concepto: <strong>{editingExpense?.label}</strong>
            </Typography>
          )}
          <TextField
            autoFocus
            label="Monto"
            fullWidth
            size="small"
            value={editAmount.display}
            onChange={editAmount.onChange}
            inputProps={{ inputMode: 'numeric' }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            helperText="Ingrese el valor en pesos chilenos"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DynamicExpenseSection;
