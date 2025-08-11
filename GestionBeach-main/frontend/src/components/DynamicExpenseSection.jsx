// src/pages/EstadoResultados/components/DynamicExpenseSection.jsx
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { formatCurrency } from '../pages/EstadoResultados/utils';


// Catálogo de gastos disponibles por categoría
const expenseCatalog = {
  administrativos: [
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
  ]
};

/**
 * Componente para gestionar gastos de forma dinámica
 */
const DynamicExpenseSection = ({ 
  category,
  title, 
  description, 
  existingExpenses = [], 
  onAddExpense, 
  onUpdateExpense,
  onRemoveExpense,
  disabled = false 
}) => {
  const [selectedExpenseType, setSelectedExpenseType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);

  // Filtrar los gastos disponibles (que no están ya añadidos)
  const availableExpenses = expenseCatalog[category]
    ? expenseCatalog[category].filter(expense => 
        !existingExpenses.find(e => e.id === expense.id))
    : [];

  // Manejar la selección de un nuevo tipo de gasto
  const handleSelectChange = (event) => {
    setSelectedExpenseType(event.target.value);
  };

  // Abrir diálogo para añadir un gasto
  const handleOpenAddDialog = () => {
    if (!selectedExpenseType) return;
    setExpenseAmount('0');
    setDialogOpen(true);
  };

  // Añadir un nuevo gasto
  const handleAddExpense = () => {
    if (!expenseCatalog[category]) return;
    
    const selectedExpense = expenseCatalog[category].find(e => e.id === selectedExpenseType);
    if (selectedExpense) {
      onAddExpense({
        id: selectedExpense.id,
        label: selectedExpense.label,
        amount: Number(expenseAmount) || 0
      });
      setDialogOpen(false);
      setSelectedExpenseType('');
      setExpenseAmount('');
    }
  };

  // Abrir diálogo de edición
  const handleOpenEditDialog = (expense) => {
    setEditingExpense(expense);
    setExpenseAmount(expense.amount.toString());
    setEditDialogOpen(true);
  };

  // Guardar edición de gasto
  const handleSaveEdit = () => {
    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        amount: Number(expenseAmount) || 0
      });
      setEditDialogOpen(false);
      setEditingExpense(null);
      setExpenseAmount('');
    }
  };

  // Eliminar un gasto
  const handleRemoveExpense = (expense) => {
    onRemoveExpense(expense);
  };

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

      {/* Sección para agregar nuevos gastos */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 250 }} size="small" disabled={disabled || availableExpenses.length === 0}>
          <InputLabel id={`select-expense-${category}-label`}>Seleccione un tipo de gasto</InputLabel>
          <Select
            labelId={`select-expense-${category}-label`}
            id={`select-expense-${category}`}
            value={selectedExpenseType}
            label="Seleccione un tipo de gasto"
            onChange={handleSelectChange}
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

      {/* Tabla de gastos actuales */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Gasto</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 120 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {existingExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay gastos agregados. Utilice el selector para añadir nuevos gastos.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              existingExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.label}</TableCell>
                  <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title="Editar monto">
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
                          onClick={() => handleRemoveExpense(expense)}
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
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(existingExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para agregar nuevo gasto */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Agregar nuevo gasto</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ingrese el monto para: <strong>{
              selectedExpenseType && expenseCatalog[category]
                ? expenseCatalog[category].find(e => e.id === selectedExpenseType)?.label
                : ''
            }</strong>
          </DialogContentText>
          <TextField
            autoFocus
            label="Monto"
            type="number"
            fullWidth
            variant="outlined"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            InputProps={{
              startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddExpense} color="primary" variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar gasto */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar gasto</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Actualice el monto para: <strong>{editingExpense?.label}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            label="Monto"
            type="number"
            fullWidth
            variant="outlined"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            InputProps={{
              startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
            }}
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