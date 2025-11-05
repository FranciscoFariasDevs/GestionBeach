// frontend/src/App.js - VERSIÓN CORREGIDA CON HOMEPAGE
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

// ========================================
// LAYOUTS
// ========================================
import DashboardLayout from './layouts/DashboardLayout';

// ========================================
// PAGES - PÚBLICAS
// ========================================
import HomePage from './pages/HomePage'; // 🏠 LANDING PAGE PRINCIPAL
import LoginPage from './pages/LoginPage';
import ConsultorPage from './pages/ConsultorPage';
import ConcursoPiscinasPage from './pages/ConcursoPiscinasPage'; // 🆕 NUEVO
import ReservaCabanasPage from './pages/ReservaCabanasPage'; // 🏡 NUEVO - Mapa de Cabañas
import NotFoundPage from './pages/NotFoundPage';
import AdminCabanasPage from './pages/AdminCabanasPage'; // 🏡 NUEVO - Sistema de Cabañas
import SorteoConcursoPage from './pages/SorteoConcursoPage'; // 🎲 SORTEO DEL CONCURSO
import MaintenancePage from './pages/MaintenancePage'; // 🔧 PÁGINA DE MANTENIMIENTO

// ========================================
// CONFIGURACIÓN
// ========================================
import maintenanceConfig from './config/maintenanceConfig';

// ========================================
// PAGES - PRIVADAS
// ========================================
import WelcomePage from './pages/WelcomePage'; // 🎉 PÁGINA DE BIENVENIDA
import DashboardPage from './pages/DashboardPage';
import VentasPage from './pages/VentasPage';
import TarjetaEmpleadoPage from './pages/TarjetaEmpleadoPage';
import UsuarioPage from './pages/UsuarioPage';
import ModuloPage from './pages/ModuloPage';
import PerfilPage from './pages/PerfilPage';
import SupermercadosPage from './pages/SupermercadosPage';
import EstadoResultadosPage from './pages/EstadoResultados';
import MonitoreoPage from './pages/MonitoreoPage';
import EmpleadosPage from './pages/EmpleadosPage';
import RemuneracionesPage from './pages/RemuneracionesPage';
import CentrosCostosPage from './pages/CentrosCostosPage';
import FacturasXMLPage from './pages/FacturasXMLPage';
import RegistroComprasPage from './pages/RegistroComprasPage';
import InventarioPage from './pages/InventarioPage';

// ========================================
// COMPONENTS
// ========================================
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // 🔧 VERIFICACIÓN DE MODO MANTENIMIENTO
  // Si el modo mantenimiento está activado, muestra solo la página de mantenimiento
  // EXCEPTO para rutas permitidas (ej: /admin)
  const isMaintenanceActive = maintenanceConfig.isMaintenanceMode;
  const currentPath = window.location.pathname;
  const isAllowedRoute = maintenanceConfig.allowedRoutes.some(route =>
    currentPath.startsWith(route)
  );

  // Si está en mantenimiento y NO es una ruta permitida
  if (isMaintenanceActive && !isAllowedRoute) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3000}
        >
          <MaintenancePage />
        </SnackbarProvider>
      </ThemeProvider>
    );
  }

  // Modo normal - Renderiza todas las rutas
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={3000}
        >
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* ========================================== */}
                {/* RUTAS PÚBLICAS (Sin autenticación)         */}
                {/* ========================================== */}

                {/* 🏠 LANDING PAGE PRINCIPAL */}
                <Route path="/" element={<HomePage />} />

                {/* Login */}
                <Route path="/login" element={<LoginPage />} />

                {/* Consultor Público */}
                <Route path="/consultor" element={<ConsultorPage />} />

                {/* 🆕 CONCURSO DE PISCINAS - RUTA PÚBLICA */}
                <Route path="/concurso-piscinas" element={<ConcursoPiscinasPage />} />

                {/* 🏡 MAPA DE RESERVA DE CABAÑAS - RUTA PÚBLICA */}
                <Route path="/reserva-cabanas" element={<ReservaCabanasPage />} />

                {/* 🎲 SORTEO DEL CONCURSO - RUTA PÚBLICA */}
                <Route path="/sorteo-concurso" element={<SorteoConcursoPage />} />

                {/* ========================================== */}
                {/* RUTAS PRIVADAS - INTRANET                  */}
                {/* Las URLs serán /dashboard, /empleados, etc */}
                {/* ========================================== */}

                {/* Redirect de /intranet a /dashboard */}
                <Route path="/intranet" element={<Navigate to="/dashboard" replace />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >

                  {/* ========================================== */}
                  {/* PÁGINA DE BIENVENIDA                       */}
                  {/* ========================================== */}
                  <Route
                    path="/welcome"
                    element={
                      <ProtectedRoute>
                        <WelcomePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* DASHBOARD PRINCIPAL                        */}
                  {/* ========================================== */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute requiredRoute="/dashboard">
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO FINANCIERO                          */}
                  {/* ========================================== */}

                  {/* Estado de Resultados */}
                  <Route
                    path="/estado-resultado"
                    element={
                      <ProtectedRoute requiredRoute="/estado-resultado">
                        <EstadoResultadosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE MONITOREO                        */}
                  {/* ========================================== */}
                  <Route
                    path="/monitoreo"
                    element={
                      <ProtectedRoute requiredRoute="/monitoreo">
                        <MonitoreoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE REMUNERACIONES                   */}
                  {/* ========================================== */}
                  <Route
                    path="/remuneraciones"
                    element={
                      <ProtectedRoute requiredRoute="/remuneraciones">
                        <RemuneracionesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE INVENTARIO                       */}
                  {/* ========================================== */}
                  <Route
                    path="/inventario"
                    element={
                      <ProtectedRoute requiredRoute="/inventario">
                        <InventarioPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE VENTAS                           */}
                  {/* ========================================== */}
                  <Route
                    path="/ventas"
                    element={
                      <ProtectedRoute requiredRoute="/ventas">
                        <VentasPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE PRODUCTOS                        */}
                  {/* ========================================== */}
                  <Route
                    path="/productos"
                    element={
                      <ProtectedRoute requiredRoute="/productos">
                        <SupermercadosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE COMPRAS                          */}
                  {/* ========================================== */}

                  {/* Centros de Costos */}
                  <Route
                    path="/compras/centros-costos"
                    element={
                      <ProtectedRoute requiredRoute="/compras/centros-costos">
                        <CentrosCostosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Facturas XML */}
                  <Route
                    path="/compras/facturas-xml"
                    element={
                      <ProtectedRoute requiredRoute="/compras/facturas-xml">
                        <FacturasXMLPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Registro de Compras */}
                  <Route
                    path="/compras/registro-compras"
                    element={
                      <ProtectedRoute requiredRoute="/compras/registro-compras">
                        <RegistroComprasPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE RECURSOS HUMANOS                 */}
                  {/* ========================================== */}

                  {/* Empleados */}
                  <Route
                    path="/empleados"
                    element={
                      <ProtectedRoute requiredRoute="/empleados">
                        <EmpleadosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Tarjeta de Empleado */}
                  <Route
                    path="/tarjeta-empleado"
                    element={
                      <ProtectedRoute requiredRoute="/tarjeta-empleado">
                        <TarjetaEmpleadoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE ADMINISTRACIÓN DEL SISTEMA       */}
                  {/* Solo Admin y Super Admin                   */}
                  {/* ========================================== */}

                  {/* Gestión de Usuarios */}
                  <Route
                    path="/usuarios"
                    element={
                      <ProtectedRoute requiredRoute="/usuarios">
                        <UsuarioPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Gestión de Perfiles */}
                  <Route
                    path="/perfiles"
                    element={
                      <ProtectedRoute requiredRoute="/perfiles">
                        <PerfilPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Gestión de Módulos */}
                  <Route
                    path="/modulos"
                    element={
                      <ProtectedRoute requiredRoute="/modulos">
                        <ModuloPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Configuración del Sistema */}
                  <Route
                    path="/configuracion"
                    element={
                      <ProtectedRoute requiredRoute="/configuracion">
                        <div style={{ padding: '20px' }}>
                          <h2>Configuración del Sistema</h2>
                          <p>Módulo en desarrollo...</p>
                        </div>
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* MÓDULO DE CABAÑAS CON WHATSAPP             */}
                  {/* ✅ ACCESIBLE PARA TODOS LOS PERFILES       */}
                  {/* ========================================== */}
                  <Route
                    path="/admin/cabanas"
                    element={
                      <ProtectedRoute requiredRoute="/admin/cabanas">
                        <AdminCabanasPage />
                      </ProtectedRoute>
                    }
                  />

                </Route>

                {/* ========================================== */}
                {/* RUTA 404 - NO ENCONTRADO                   */}
                {/* ========================================== */}
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
