# Implementación de Modal para Asignar Sucursales a Empleados

## Paso 1: Agregar Estados (línea ~180 en RemuneracionesPage.jsx)

Después de los estados existentes, agregar:

```javascript
// 🆕 Estados para modal de empleados sin sucursal
const [openModalSinSucursal, setOpenModalSinSucursal] = useState(false);
const [empleadosSinSucursal, setEmpleadosSinSucursal] = useState([]);
const [asignacionesPendientes, setAsignacionesPendientes] = useState({});
const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
const [razonesSocialesDisponibles, setRazonesSocialesDisponibles] = useState([]);
```

## Paso 2: Agregar función para cargar opciones (después de los estados)

```javascript
// 🆕 Cargar sucursales y razones sociales
const cargarOpcionesAsignacion = useCallback(async () => {
  try {
    const [sucursalesRes, razonesRes] = await Promise.all([
      api.get('/sucursales'),
      api.get('/razonessociales')
    ]);

    if (sucursalesRes.data?.success) {
      setSucursalesDisponibles(sucursalesRes.data.sucursales || []);
    }

    if (razonesRes.data?.success) {
      setRazonesSocialesDisponibles(razonesRes.data.razones_sociales || []);
    }
  } catch (error) {
    console.error('Error cargando opciones:', error);
  }
}, []);

useEffect(() => {
  cargarOpcionesAsignacion();
}, [cargarOpcionesAsignacion]);
```

## Paso 3: Agregar función para detectar empleados sin sucursal

```javascript
// 🆕 Detectar empleados sin sucursal en los datos cargados
const detectarEmpleadosSinSucursal = useCallback((periodosData) => {
  const empleadosSin = [];
  const empleadosMap = new Map(); // Para evitar duplicados

  periodosData.forEach(periodo => {
    if (periodo.datos_remuneraciones && Array.isArray(periodo.datos_remuneraciones)) {
      periodo.datos_remuneraciones.forEach(dato => {
        // Verificar si el empleado no tiene sucursal
        if (!dato.sucursal_nombre || dato.sucursal_nombre === 'Sin Sucursal' ||
            !dato.id_sucursal || dato.id_sucursal === 0) {

          const key = `${dato.rut_empleado}-${periodo.id_periodo}`;

          if (!empleadosMap.has(key)) {
            empleadosMap.set(key, {
              id_empleado: dato.id_empleado,
              rut: dato.rut_empleado,
              nombre: dato.nombre_empleado,
              id_periodo: periodo.id_periodo,
              periodo_descripcion: periodo.descripcion,
              id_razon_social: dato.id_razon_social || null,
              nombre_razon: dato.nombre_razon || null
            });
          }
        }
      });
    }
  });

  return Array.from(empleadosMap.values());
}, []);
```

## Paso 4: Modificar la carga de períodos para detectar automáticamente

Buscar la función `obtenerPeriodos` y después de `setPeriodos(periodosOrdenados)`, agregar:

```javascript
// Después de setPeriodos(periodosOrdenados);
const empleadosSin = detectarEmpleadosSinSucursal(periodosOrdenados);
if (empleadosSin.length > 0) {
  setEmpleadosSinSucursal(empleadosSin);
  // Inicializar asignaciones pendientes
  const asignaciones = {};
  empleadosSin.forEach(emp => {
    asignaciones[`${emp.rut}-${emp.id_periodo}`] = {
      id_empleado: emp.id_empleado,
      id_razon_social: emp.id_razon_social || '',
      id_sucursal: ''
    };
  });
  setAsignacionesPendientes(asignaciones);
}
```

## Paso 5: Función para abrir el modal

```javascript
// 🆕 Abrir modal de asignación
const handleAbrirModalSinSucursal = useCallback(() => {
  if (empleadosSinSucursal.length > 0) {
    setOpenModalSinSucursal(true);
  }
}, [empleadosSinSucursal]);
```

## Paso 6: Función para manejar cambios en asignaciones

```javascript
// 🆕 Manejar cambio en asignaciones
const handleCambioAsignacion = useCallback((key, field, value) => {
  setAsignacionesPendientes(prev => ({
    ...prev,
    [key]: {
      ...prev[key],
      [field]: value
    }
  }));
}, []);
```

## Paso 7: Función para guardar asignaciones

```javascript
// 🆕 Guardar asignaciones de sucursales y razones sociales
const handleGuardarAsignaciones = useCallback(async () => {
  try {
    setLoading(true);

    // Convertir asignaciones a array
    const asignaciones = Object.values(asignacionesPendientes).filter(asig =>
      asig.id_razon_social && asig.id_sucursal
    );

    if (asignaciones.length === 0) {
      alert('Debe asignar al menos una razón social y sucursal');
      return;
    }

    console.log('Guardando asignaciones:', asignaciones);

    // Llamar al endpoint
    const response = await api.post('/remuneraciones/asignar-razon-social-sucursal', {
      asignaciones: asignaciones
    });

    if (response.data && response.data.success) {
      alert(`✅ ${response.data.data.empleados_actualizados} empleados actualizados exitosamente`);

      // Recargar períodos
      await obtenerPeriodos();

      // Cerrar modal
      setOpenModalSinSucursal(false);
      setEmpleadosSinSucursal([]);
      setAsignacionesPendientes({});
    }
  } catch (error) {
    console.error('Error guardando asignaciones:', error);
    alert('Error al guardar asignaciones: ' + (error.response?.data?.message || error.message));
  } finally {
    setLoading(false);
  }
}, [asignacionesPendientes, obtenerPeriodos]);
```

## Paso 8: Modificar el Alert para agregar botón

Buscar el Alert "Empleados sin sucursal detectados" (línea ~1992) y reemplazar con:

```jsx
{sucursal === 'Sin Sucursal' && (
  <Alert
    severity="error"
    sx={{ mb: 2 }}
    action={
      <Button
        color="inherit"
        size="small"
        onClick={handleAbrirModalSinSucursal}
        startIcon={<AssignmentIcon />}
      >
        Asignar Ahora
      </Button>
    }
  >
    <Typography variant="body2" fontWeight="bold">
      {empleadosSinSucursal.length} Empleados sin sucursal detectados
    </Typography>
    <Typography variant="body2">
      Estos registros contienen empleados sin sucursal asignada.
      Haz clic en "Asignar Ahora" para asignar sucursales y razones sociales.
    </Typography>
  </Alert>
)}
```

## Paso 9: Agregar imports necesarios

Al inicio del archivo, agregar a los imports de Material-UI:

```javascript
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
```

## Paso 10: Crear el Modal (antes del return final)

```jsx
// 🆕 MODAL PARA ASIGNAR SUCURSALES Y RAZONES SOCIALES
const renderModalAsignacionSucursales = () => (
  <Dialog
    open={openModalSinSucursal}
    onClose={() => setOpenModalSinSucursal(false)}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssignmentIcon color="primary" />
        <Typography variant="h6">
          Asignar Sucursales y Razones Sociales
        </Typography>
      </Box>
    </DialogTitle>

    <DialogContent dividers>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Se detectaron {empleadosSinSucursal.length} empleados sin sucursal asignada.
          Asigna la razón social y sucursal correspondiente a cada uno.
        </Typography>
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>RUT</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Período</strong></TableCell>
              <TableCell><strong>Razón Social</strong></TableCell>
              <TableCell><strong>Sucursal</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {empleadosSinSucursal.map((emp, index) => {
              const key = `${emp.rut}-${emp.id_periodo}`;
              const asignacion = asignacionesPendientes[key] || {};

              return (
                <TableRow key={key} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                  <TableCell>{emp.rut}</TableCell>
                  <TableCell>{emp.nombre}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.periodo_descripcion}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" required>
                      <Select
                        value={asignacion.id_razon_social || ''}
                        onChange={(e) => handleCambioAsignacion(key, 'id_razon_social', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Seleccionar...</em>
                        </MenuItem>
                        {razonesSocialesDisponibles.map(rs => (
                          <MenuItem key={rs.id} value={rs.id}>
                            {rs.nombre_razon}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" required>
                      <Select
                        value={asignacion.id_sucursal || ''}
                        onChange={(e) => handleCambioAsignacion(key, 'id_sucursal', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Seleccionar...</em>
                        </MenuItem>
                        {sucursalesDisponibles.map(suc => (
                          <MenuItem key={suc.id} value={suc.id}>
                            {suc.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Chip
          icon={<InfoIcon />}
          label={`Total: ${empleadosSinSucursal.length} empleados`}
          color="primary"
          variant="outlined"
        />
        <Chip
          icon={<CheckCircleIcon />}
          label={`Asignados: ${Object.values(asignacionesPendientes).filter(a => a.id_razon_social && a.id_sucursal).length}`}
          color="success"
          variant="outlined"
        />
      </Box>
    </DialogContent>

    <DialogActions sx={{ p: 2 }}>
      <Button
        onClick={() => setOpenModalSinSucursal(false)}
        variant="outlined"
      >
        Cancelar
      </Button>
      <Button
        onClick={handleGuardarAsignaciones}
        variant="contained"
        disabled={loading || Object.values(asignacionesPendientes).filter(a => a.id_razon_social && a.id_sucursal).length === 0}
        startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
      >
        {loading ? 'Guardando...' : 'Guardar Asignaciones'}
      </Button>
    </DialogActions>
  </Dialog>
);
```

## Paso 11: Renderizar el modal

En el `return` principal, antes de los otros dialogs, agregar:

```jsx
{/* Modal de asignación de sucursales */}
{renderModalAsignacionSucursales()}
```

## Paso 12: Agregar imports adicionales al final de los existentes

```javascript
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
```

## Resultado Final

Cuando se carguen períodos con empleados sin sucursal:
1. Se detectarán automáticamente
2. El Alert mostrará cuántos empleados sin sucursal hay
3. El botón "Asignar Ahora" abrirá el modal
4. El modal mostrará una tabla con todos los empleados sin sucursal
5. Se podrá asignar razón social y sucursal a cada uno
6. Al guardar, se actualizarán todos los empleados y se recargará la página

## Endpoints Requeridos

Asegúrate de que existe el endpoint en el backend:
```
POST /remuneraciones/asignar-razon-social-sucursal
```

Ya existe como `exports.asignarRazonSocialYSucursal` en `remuneracionesController.js` ✅
