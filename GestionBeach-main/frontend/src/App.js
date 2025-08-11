// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './contexts/AuthContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import theme from './theme';
import 'bootstrap/dist/css/bootstrap.min.css';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VentasPage from './pages/VentasPage';
import TarjetaEmpleadoPage from './pages/TarjetaEmpleadoPage';
import UsuarioPage from './pages/UsuarioPage';
import ModuloPage from './pages/ModuloPage';
import PerfilPage from './pages/PerfilPage';
import NotFoundPage from './pages/NotFoundPage';
import ConsultorPage from './pages/ConsultorPage';
import SupermercadosPage from './pages/SupermercadosPage';
//import FerreteriasProdPage from './pages/FerreteriasProdPage';
//import MultitiendasProdPage from './pages/MultitiendasProdPage';
import EstadoResultadosPage from './pages/EstadoResultados';
import MonitoreoPage from './pages/MonitoreoPage';

// Páginas existentes
import EmpleadosPage from './pages/EmpleadosPage';
import RemuneracionesPage from './pages/RemuneracionesPage';

// Nuevas páginas de Compras
import CentrosCostosPage from './pages/CentrosCostosPage';
import FacturasXMLPage from './pages/FacturasXMLPage';
import RegistroComprasPage from './pages/RegistroComprasPage';

// Nueva página de Inventario
import InventarioPage from './pages/InventarioPage';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Rutas públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/consultor" element={<ConsultorPage />} />

                {/* Rutas privadas dentro del layout del dashboard */}
                <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="estado-resultado" element={<EstadoResultadosPage />} />
                  <Route path="monitoreo" element={<MonitoreoPage />} />
                  <Route path="ventas" element={<VentasPage />} />
                  <Route path="tarjeta-empleado" element={<TarjetaEmpleadoPage />} />
                  <Route path="usuarios" element={<UsuarioPage />} />
                  <Route path="modulos" element={<ModuloPage />} />
                  <Route path="perfiles" element={<PerfilPage />} />
                  
                  {/* Rutas de Empleados y Remuneraciones */}
                  <Route path="empleados" element={<EmpleadosPage />} />
                  <Route path="remuneraciones" element={<RemuneracionesPage />} />

                  {/* NUEVA RUTA DE INVENTARIO */}
                  <Route path="inventario" element={<InventarioPage />} />

                  {/* Submenú de Productos */}
                  <Route path="productos/supermercados" element={<SupermercadosPage />} />

                  {/* RUTAS DE COMPRAS */}
                  <Route path="compras/centros-costos" element={<CentrosCostosPage />} />
                  <Route path="compras/facturas-xml" element={<FacturasXMLPage />} />
                  <Route path="compras/registro-compras" element={<RegistroComprasPage />} />

                </Route>

                {/* Ruta 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;