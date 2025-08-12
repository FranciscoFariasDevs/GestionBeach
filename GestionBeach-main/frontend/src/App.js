// frontend/src/App.js - CON SISTEMA DE PERMISOS CASL.js
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
import EstadoResultadosPage from './pages/EstadoResultados';
import MonitoreoPage from './pages/MonitoreoPage';
import EmpleadosPage from './pages/EmpleadosPage';
import RemuneracionesPage from './pages/RemuneracionesPage';
import CentrosCostosPage from './pages/CentrosCostosPage';
import FacturasXMLPage from './pages/FacturasXMLPage';
import RegistroComprasPage from './pages/RegistroComprasPage';
import InventarioPage from './pages/InventarioPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';

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
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Redirect del root al dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Dashboard - Acceso básico para todos */}
                  <Route 
                    path="dashboard" 
                    element={
                      <ProtectedRoute requiredRoute="/dashboard">
                        <DashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Estado Resultado - Finanzas, Gerencia, Admin */}
                  <Route 
                    path="estado-resultado" 
                    element={
                      <ProtectedRoute requiredRoute="/estado-resultado">
                        <EstadoResultadosPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Monitoreo - Gerencia, Jefe Local, Admin */}
                  <Route 
                    path="monitoreo" 
                    element={
                      <ProtectedRoute requiredRoute="/monitoreo">
                        <MonitoreoPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Remuneraciones - RRHH, Finanzas, Gerencia, Admin */}
                  <Route 
                    path="remuneraciones" 
                    element={
                      <ProtectedRoute requiredRoute="/remuneraciones">
                        <RemuneracionesPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Inventario - Jefe Local, Gerencia, Admin */}
                  <Route 
                    path="inventario" 
                    element={
                      <ProtectedRoute requiredRoute="/inventario">
                        <InventarioPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Ventas - Jefe Local, Gerencia, Admin */}
                  <Route 
                    path="ventas" 
                    element={
                      <ProtectedRoute requiredRoute="/ventas">
                        <VentasPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Productos - Jefe Local, Gerencia, Admin */}
                  <Route 
                    path="productos/supermercados" 
                    element={
                      <ProtectedRoute requiredRoute="/productos/supermercados">
                        <SupermercadosPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Compras - Finanzas, Gerencia, Admin */}
                  <Route 
                    path="compras/centros-costos" 
                    element={
                      <ProtectedRoute requiredRoute="/compras/centros-costos">
                        <CentrosCostosPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="compras/facturas-xml" 
                    element={
                      <ProtectedRoute requiredRoute="/compras/facturas-xml">
                        <FacturasXMLPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="compras/registro-compras" 
                    element={
                      <ProtectedRoute requiredRoute="/compras/registro-compras">
                        <RegistroComprasPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Empleados - RRHH, Gerencia, Admin */}
                  <Route 
                    path="empleados" 
                    element={
                      <ProtectedRoute requiredRoute="/empleados">
                        <EmpleadosPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Tarjeta Empleado - RRHH, Gerencia, Admin */}
                  <Route 
                    path="tarjeta-empleado" 
                    element={
                      <ProtectedRoute requiredRoute="/tarjeta-empleado">
                        <TarjetaEmpleadoPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Gestión del Sistema - Solo Admin y Super Admin */}
                  <Route 
                    path="usuarios" 
                    element={
                      <ProtectedRoute requiredRoute="/usuarios">
                        <UsuarioPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="perfiles" 
                    element={
                      <ProtectedRoute requiredRoute="/perfiles">
                        <PerfilPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="modulos" 
                    element={
                      <ProtectedRoute requiredRoute="/modulos">
                        <ModuloPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="configuracion" 
                    element={
                      <ProtectedRoute requiredRoute="/configuracion">
                        <div style={{ padding: '20px' }}>
                          <h2>Configuración del Sistema</h2>
                          <p>Módulo en desarrollo...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
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