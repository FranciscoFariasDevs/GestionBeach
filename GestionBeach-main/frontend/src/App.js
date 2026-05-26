// frontend/src/App.js - VERSIÓN CORREGIDA CON HOMEPAGE
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import PagoExitosoPage from './pages/PagoExitosoPage'; // 💳 PÁGINA DE PAGO EXITOSO
import PagoErrorPage from './pages/PagoErrorPage'; // 💳 PÁGINA DE ERROR EN PAGO
import ReportarProblemaPage from './pages/ReportarProblemaPage'; // 🎫 REPORTAR PROBLEMA (TICKETS)
import GamesPage from './pages/GamesPage'; // 🎮 RINCON DE RELAJO (SECRETO)
import RadioPage from './pages/RadioPage'; // 📻 RADIO EN VIVO

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
import MiPerfilPage from './pages/MiPerfilPage'; // 👤 MI PERFIL PERSONAL
import SupermercadosPage from './pages/SupermercadosPage';
import EstadoResultadosPage from './pages/EstadoResultados';
import IngresoGastosPage from './pages/EstadoResultados/IngresoGastosPage';
import MonitoreoPage from './pages/MonitoreoPage';
import EmpleadosPage from './pages/EmpleadosPage';
import RemuneracionesPage from './pages/RemuneracionesPage';
import CentrosCostosPage from './pages/CentrosCostosPage';
import FacturasXMLPage from './pages/FacturasXMLPage';
import RegistroComprasPage from './pages/RegistroComprasPage';
import PlanificacionPage from './pages/PlanificacionPage';
import InventarioPage from './pages/InventarioPage';
import CodigosDescuentoPage from './pages/CodigosDescuentoPage'; // 🎫 CÓDIGOS DE DESCUENTO
import MisTicketsPage from './pages/MisTicketsPage'; // 🎫 SISTEMA DE TICKETS
import MantencionesDashboard from './pages/MantencionesDashboard'; // 🔧 MANTENCIONES
import BoletasFoliosPage from './pages/BoletasFoliosPage';
import ResumenEjecutivoPage from './pages/ResumenEjecutivoPage';
import ConsultarProductoPage from './pages/ConsultarProductoPage';
import RotacionFerreteriasPage from './pages/RotacionFerreteriasPage';
import RentabilidadPage from './pages/RentabilidadPage';
import MargenesPage from './pages/MargenesPage';
import GuiasPage from './pages/GuiasPage';
import ResumenValorizadoPage from './pages/ResumenValorizadoPage';
import StocksPage from './pages/StocksPage';
import AnulacionesPage from './pages/AnulacionesPage';
import CargarInventarioPage from './pages/CargarInventarioPage';
import GruposChatPage from './pages/GruposChatPage';
import MonitorOrdenesPage from './pages/MonitorOrdenesPage';
import AjustesPage from './pages/AjustesPage';
import ProveedoresProductoPage from './pages/ProveedoresProductoPage';
import OrganigramaPage from './pages/OrganigramaPage';
import KanbanPage from './pages/KanbanPage';
import CotizacionesPage from './pages/CotizacionesPage'; // 📄 COTIZACIONES
import AIConsultaPage from './pages/AIConsultaPage'; // 🤖 CONSULTA IA
import MegafoniaEmisorPage from './pages/MegafoniaEmisorPage'; // 📢 MEGAFONÍA EMISOR
import MegafoniaReceptorPage from './pages/MegafoniaReceptorPage'; // 📢 MEGAFONÍA RECEPTOR
import ComparadorPage from './pages/ComparadorPage'; // 🔍 COMPARADOR DE PRECIOS Y STOCK

// ========================================
// COMPONENTS
// ========================================
import ProtectedRoute from './components/ProtectedRoute';

// Componente para limpiar overlays de Shepherd en cada cambio de ruta
function ShepherdCleanup() {
  const location = useLocation();

  useEffect(() => {
    // Limpiar overlays de Shepherd cada vez que cambie la ruta
    const cleanShepherdOverlays = () => {
      const overlays = document.querySelectorAll('.shepherd-modal-overlay-container');
      const elements = document.querySelectorAll('.shepherd-element');
      const targets = document.querySelectorAll('.shepherd-target');

      overlays.forEach(overlay => overlay.remove());
      elements.forEach(el => el.remove());
      targets.forEach(target => {
        target.classList.remove('shepherd-target');
        target.classList.remove('shepherd-enabled');
      });

      // Limpiar cualquier estilo inline que Shepherd pueda haber agregado
      document.body.style.overflow = '';
    };

    cleanShepherdOverlays();
  }, [location.pathname]);

  return null;
}

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
              {/* Limpiar overlays de Shepherd en cada cambio de ruta */}
              <ShepherdCleanup />

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

                {/* 💳 PÁGINAS DE PAGO - RUTAS PÚBLICAS */}
                <Route path="/pago-exitoso" element={<PagoExitosoPage />} />
                <Route path="/pago-error" element={<PagoErrorPage />} />

                {/* 🎫 SISTEMA DE TICKETS - RUTA PÚBLICA */}
                <Route path="/reportar-problema" element={<ReportarProblemaPage />} />

                {/* 🎮 RINCON DE RELAJO - RUTA SECRETA */}
                <Route path="/games" element={<GamesPage />} />

                {/* 📻 RADIO EN VIVO - RUTA PÚBLICA */}
                <Route path="/radio" element={<RadioPage />} />

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
                  {/* MI PERFIL PERSONAL                         */}
                  {/* ========================================== */}
                  <Route
                    path="/mi-perfil"
                    element={
                      <ProtectedRoute>
                        <MiPerfilPage />
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

                  {/* Estado de Resultados — Visualización (solo lectura) */}
                  <Route
                    path="/estado-resultado"
                    element={
                      <ProtectedRoute requiredRoute="/estado-resultado">
                        <EstadoResultadosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Estado de Resultados — Ingreso de Gastos */}
                  <Route
                    path="/estado-resultado/ingreso-gastos"
                    element={
                      <ProtectedRoute requiredRoute="/estado-resultado/ingreso-gastos">
                        <IngresoGastosPage />
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

                  <Route
                    path="/los-mas-vendidos"
                    element={
                      <ProtectedRoute requiredRoute="/los-mas-vendidos">
                        <SupermercadosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Consultar Producto (migrado sistema viejo) */}
                  <Route
                    path="/productos/consultar"
                    element={
                      <ProtectedRoute requiredRoute="/productos/consultar">
                        <ConsultarProductoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rotacion Ferreterias (migrado sistema viejo) */}
                  <Route
                    path="/productos/rotacion-ferreterias"
                    element={
                      <ProtectedRoute requiredRoute="/productos/rotacion-ferreterias">
                        <RotacionFerreteriasPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rentabilidad (migrado sistema viejo) */}
                  <Route
                    path="/productos/rentabilidad"
                    element={
                      <ProtectedRoute requiredRoute="/productos/rentabilidad">
                        <RentabilidadPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Margenes por Vendedor (migrado sistema viejo) */}
                  <Route
                    path="/productos/margenes"
                    element={
                      <ProtectedRoute requiredRoute="/productos/margenes">
                        <MargenesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Ajustes de Bodega (migrado sistema viejo) */}
                  <Route
                    path="/productos/ajustes"
                    element={
                      <ProtectedRoute requiredRoute="/productos/ajustes">
                        <AjustesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Guias (migrado sistema viejo) */}
                  <Route
                    path="/productos/guias"
                    element={
                      <ProtectedRoute requiredRoute="/productos/guias">
                        <GuiasPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Resumen Valorizado (migrado sistema viejo) */}
                  <Route
                    path="/productos/resumen-valorizado"
                    element={
                      <ProtectedRoute requiredRoute="/productos/resumen-valorizado">
                        <ResumenValorizadoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Stocks (migrado sistema viejo) */}
                  <Route
                    path="/productos/stocks"
                    element={
                      <ProtectedRoute requiredRoute="/productos/stocks">
                        <StocksPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Anulaciones (migrado sistema viejo) */}
                  <Route
                    path="/productos/anulaciones"
                    element={
                      <ProtectedRoute requiredRoute="/productos/anulaciones">
                        <AnulacionesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Proveedores Producto (migrado sistema viejo) */}
                  <Route
                    path="/productos/proveedores"
                    element={
                      <ProtectedRoute requiredRoute="/productos/proveedores">
                        <ProveedoresProductoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Cargar Inventario (migrado sistema viejo) */}
                  <Route
                    path="/productos/cargar-inventario"
                    element={
                      <ProtectedRoute requiredRoute="/productos/cargar-inventario">
                        <CargarInventarioPage />
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

                  {/* Planificación - Control de Pagos */}
                  <Route
                    path="/compras/planificacion"
                    element={
                      <ProtectedRoute requiredRoute="/compras/planificacion">
                        <PlanificacionPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Monitor Ordenes de Compra (migrado sistema viejo) */}
                  <Route
                    path="/compras/monitor-ordenes"
                    element={
                      <ProtectedRoute requiredRoute="/compras/monitor-ordenes">
                        <MonitorOrdenesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Comparador de Precios y Stock (migrado sistema viejo) */}
                  <Route
                    path="/productos/comparador"
                    element={
                      <ProtectedRoute requiredRoute="/productos/comparador">
                        <ComparadorPage />
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
                  {/* MÓDULO DE RECURSOS HUMANOS (NUEVO)         */}
                  {/* ========================================== */}

                  {/* Boletas y Folios */}
                  <Route
                    path="/recursos-humanos/boletas-folios"
                    element={
                      <ProtectedRoute requiredRoute="/recursos-humanos/boletas-folios">
                        <BoletasFoliosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Resumen Ejecutivo */}
                  <Route
                    path="/recursos-humanos/resumen-ejecutivo"
                    element={
                      <ProtectedRoute requiredRoute="/recursos-humanos/resumen-ejecutivo">
                        <ResumenEjecutivoPage />
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

                  {/* Grupos de Chat */}
                  <Route
                    path="/grupos-chat"
                    element={
                      <ProtectedRoute requiredRoute="/grupos-chat">
                        <GruposChatPage />
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

                  {/* ========================================== */}
                  {/* CÓDIGOS DE DESCUENTO                       */}
                  {/* Solo Admin y Super Admin                   */}
                  {/* ========================================== */}
                  <Route
                    path="/codigos-descuento"
                    element={
                      <ProtectedRoute requiredRoute="/codigos-descuento">
                        <CodigosDescuentoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* ========================================== */}
                  {/* SISTEMA DE TICKETS - MIS TICKETS           */}
                  {/* Solo SuperAdmin, Administrador, Soporte    */}
                  {/* ========================================== */}
                  <Route
                    path="/mis-tickets"
                    element={
                      <ProtectedRoute requiredRoute="/mis-tickets">
                        <MisTicketsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* MÓDULO MANTENCIONES */}
                  <Route
                    path="/mantenciones"
                    element={
                      <ProtectedRoute requiredRoute="/mantenciones">
                        <MantencionesDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* MÓDULO ORGANIGRAMA */}
                  <Route
                    path="/organigrama"
                    element={
                      <ProtectedRoute requiredRoute="/organigrama">
                        <OrganigramaPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* MÓDULO KANBAN */}
                  <Route
                    path="/kanban"
                    element={
                      <ProtectedRoute requiredRoute="/kanban">
                        <KanbanPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 📄 MÓDULO COTIZACIONES */}
                  <Route
                    path="/cotizaciones"
                    element={
                      <ProtectedRoute requiredRoute="/cotizaciones">
                        <CotizacionesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 🤖 CONSULTA INTELIGENTE IA */}
                  <Route
                    path="/ai-consulta"
                    element={
                      <ProtectedRoute>
                        <AIConsultaPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 📢 MEGAFONÍA IP */}
                  <Route
                    path="/megafonia/emisor"
                    element={
                      <ProtectedRoute requiredRoute="/megafonia/emisor">
                        <MegafoniaEmisorPage />
                      </ProtectedRoute>
                    }
                  />

                </Route>

                {/* Receptor: ruta pública (se abre en el parlante de la sucursal, sin login) */}
                <Route
                  path="/megafonia/receptor"
                  element={<MegafoniaReceptorPage />}
                />
                <Route
                  path="/megafonia/receptor/:sucursalId"
                  element={<MegafoniaReceptorPage />}
                />

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
