import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Spinner,
  Alert,
  ProgressBar,
  Modal,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faServer,
  faDatabase,
  faNetworkWired,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faSync,
  faChartLine,
  faClock,
  faEnvelope,
  faPaperPlane,
  faCog,
} from '@fortawesome/free-solid-svg-icons';
import api from '../api/api';
import { 
  verificarSucursalesCriticas, 
  enviarEmailPrueba, 
  verificarConfiguracion,
  obtenerEstadisticasMonitoreo,
  limpiarCache
} from '../services/emailService.js';

const MonitoreoPage = () => {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  
  // Estados para modales y notificaciones
  const [showModalEmail, setShowModalEmail] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // 📊 Estados para monitoreo crítico (10+ minutos)
  const [estadisticasMonitoreo, setEstadisticasMonitoreo] = useState({
    sucursalesMonitoreadas: 0,
    sucursalesEnProblemas: [],
    tiempoAlertaCritica: 10,
    tiempoEntreAlertas: 30
  });

  // Función para mostrar toast
  const mostrarToast = (mensaje, variante = 'success') => {
    setToastMessage(mensaje);
    setToastVariant(variante);
    setShowToast(true);
  };

  // 🔄 FUNCIÓN PRINCIPAL: Verificar estado de sucursales
  const verificarEstado = useCallback(async () => {
    setVerificando(true);
    setError('');
    try {
      const response = await api.get('/monitoreo/estado/todas');
      if (response.data.success) {
        setSucursales(response.data.sucursales);
        setUltimaActualizacion(new Date());
        
        // 🔴 ÚNICA VERIFICACIÓN: Solo enviar emails después de 10+ minutos
        const alertasCriticas = await verificarSucursalesCriticas(response.data.sucursales);
        
        // 📊 Actualizar estadísticas de monitoreo
        const stats = obtenerEstadisticasMonitoreo();
        setEstadisticasMonitoreo(stats);
        
        // 📝 Log y notificación de alertas críticas enviadas
        if (alertasCriticas.length > 0) {
          console.log(`🔴 Enviadas ${alertasCriticas.length} alertas críticas:`, alertasCriticas);
          const tiposAlertas = alertasCriticas.map(a => a.tipo).join(', ');
          mostrarToast(
            `🔴 ${alertasCriticas.length} alerta(s) enviada(s): ${tiposAlertas}`, 
            'danger'
          );
        }
        
      } else {
        setError(response.data.message || 'Error al verificar estado');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
      console.error('Error verificando estado:', err);
    } finally {
      setVerificando(false);
      setLoading(false);
    }
  }, []);

  // Verificar sucursal individual
  const verificarSucursal = async (id) => {
    try {
      const response = await api.get(`/monitoreo/estado/sucursal/${id}`);
      if (response.data.success) {
        setSucursales((prev) =>
          prev.map((suc) => (suc.id === id ? response.data.sucursal : suc))
        );
        mostrarToast(`Sucursal ${id} verificada correctamente`);
      }
    } catch (err) {
      console.error('Error verificando sucursal:', err);
      mostrarToast('Error verificando sucursal', 'danger');
    }
  };

  // 📧 Enviar email de prueba manual
  const manejarEmailPrueba = async () => {
    setEnviandoEmail(true);
    try {
      const resultado = await enviarEmailPrueba();
      
      if (resultado.success) {
        mostrarToast('✅ Email de prueba enviado a fariseodesarrollador@gmail.com', 'success');
        setShowModalEmail(false);
      } else {
        mostrarToast('❌ Error enviando email: ' + resultado.error, 'danger');
      }
    } catch (error) {
      console.error('Error enviando email:', error);
      mostrarToast('❌ Error de conexión al enviar email', 'danger');
    } finally {
      setEnviandoEmail(false);
    }
  };

  // 🔧 Verificar configuración de email
  const manejarVerificarConfig = () => {
    const resultado = verificarConfiguracion();
    
    if (resultado.success) {
      mostrarToast('✅ ' + resultado.message, 'success');
    } else {
      mostrarToast('❌ ' + resultado.error, 'warning');
    }
  };

  // 🗑️ Limpiar cache de monitoreo
  const manejarLimpiarCache = () => {
    limpiarCache();
    setEstadisticasMonitoreo({
      sucursalesMonitoreadas: 0,
      sucursalesEnProblemas: [],
      tiempoAlertaCritica: 10,
      tiempoEntreAlertas: 30
    });
    mostrarToast('🗑️ Cache de monitoreo limpiado', 'info');
  };

  // useEffect para carga inicial
  useEffect(() => {
    verificarEstado();
  }, [verificarEstado]);

  // useEffect para auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        verificarEstado();
      }, 30000); // Cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, verificarEstado]);

  // Funciones auxiliares para UI
  const getBadgeVariant = (activo, conectado) => {
    if (activo && conectado) return 'success';
    if (activo && !conectado) return 'warning';
    return 'danger';
  };

  const getEstadoGeneral = (ping, baseDatos) => {
    if (ping?.activo && baseDatos?.conectado) return 'Operativo';
    if (ping?.activo && !baseDatos?.conectado) return 'Sin BD';
    return 'Desconectado';
  };

  // Cálculos de estadísticas
  const total = sucursales.length;
  const activas = sucursales.filter((s) => s.ping?.activo).length;
  const conectadasBD = sucursales.filter((s) => s.baseDatos?.conectado).length;
  const operativas = sucursales.filter((s) => s.ping?.activo && s.baseDatos?.conectado).length;

  const calcularPorcentaje = (valor) => total > 0 ? (valor / total) * 100 : 0;

  if (loading) {
    return (
      <Container fluid className="mt-4">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Verificando estado de sucursales...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container fluid className="mt-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h2>
                <FontAwesomeIcon icon={faServer} className="me-2" />
                Monitoreo de Sucursales
              </h2>
              <div>
                {/* 📧 BOTÓN: Gestión de Email */}
                <Button
                  variant="outline-success"
                  onClick={() => setShowModalEmail(true)}
                  className="me-2"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                  Notificaciones
                </Button>
                
                <Button
                  variant="outline-primary"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="me-2"
                >
                  <FontAwesomeIcon icon={faClock} className="me-1" />
                  Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                </Button>
                
                <Button
                  variant="primary"
                  onClick={verificarEstado}
                  disabled={verificando}
                >
                  <FontAwesomeIcon
                    icon={faSync}
                    className={`me-1 ${verificando ? 'fa-spin' : ''}`}
                  />
                  {verificando ? 'Verificando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* 📊 Alerta de Monitoreo Crítico */}
        {estadisticasMonitoreo.sucursalesEnProblemas.length > 0 && (
          <Row className="mb-4">
            <Col>
              <Alert variant="warning">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                <strong>⏰ Monitoreo Crítico Activo</strong>
                <div className="mt-2">
                  <small>
                    🔴 <strong>{estadisticasMonitoreo.sucursalesEnProblemas.length}</strong> sucursal(es) 
                    en seguimiento crítico (caídas por más de {estadisticasMonitoreo.tiempoAlertaCritica} minutos)
                  </small>
                  <div className="mt-2">
                    {estadisticasMonitoreo.sucursalesEnProblemas.map((problema, index) => (
                      <div key={index} className="border-start border-danger ps-2 mb-1">
                        <small>
                          <strong>Sucursal {problema.id}</strong>: 
                          {problema.tiempoCaida} min caída ({problema.tipoError})
                          {problema.faltanParaAlerta > 0 && (
                            <span className="text-info"> - Alerta en {problema.faltanParaAlerta} min</span>
                          )}
                          {problema.yaEnviada && problema.proximaAlerta > 0 && (
                            <span className="text-muted"> - Próxima en {problema.proximaAlerta} min</span>
                          )}
                          {problema.yaEnviada && problema.proximaAlerta === 0 && (
                            <span className="text-success"> - ✅ Alerta enviada</span>
                          )}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </Alert>
            </Col>
          </Row>
        )}

        {/* Estadísticas Generales */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FontAwesomeIcon icon={faServer} size="2x" className="text-primary mb-2" />
                <h4>{total}</h4>
                <p className="text-muted mb-0">Total Sucursales</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FontAwesomeIcon icon={faNetworkWired} size="2x" className="text-success mb-2" />
                <h4>{activas}</h4>
                <p className="text-muted mb-0">Red Activa</p>
                <ProgressBar now={calcularPorcentaje(activas)} variant="success" />
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FontAwesomeIcon icon={faDatabase} size="2x" className="text-info mb-2" />
                <h4>{conectadasBD}</h4>
                <p className="text-muted mb-0">BD Conectadas</p>
                <ProgressBar now={calcularPorcentaje(conectadasBD)} variant="info" />
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FontAwesomeIcon icon={faCheckCircle} size="2x" className="text-warning mb-2" />
                <h4>{operativas}</h4>
                <p className="text-muted mb-0">Operativas</p>
                <ProgressBar now={calcularPorcentaje(operativas)} variant="warning" />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {ultimaActualizacion && (
          <Row className="mb-3">
            <Col>
              <small className="text-muted">
                <FontAwesomeIcon icon={faClock} className="me-1" />
                Última actualización: {ultimaActualizacion.toLocaleString()}
                {estadisticasMonitoreo.sucursalesEnProblemas.length > 0 && (
                  <span className="ms-3 text-warning">
                    🔴 {estadisticasMonitoreo.sucursalesEnProblemas.length} sucursal(es) en monitoreo crítico
                  </span>
                )}
              </small>
            </Col>
          </Row>
        )}

        {/* Tabla de sucursales */}
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <FontAwesomeIcon icon={faChartLine} className="me-2" />
                Estado Detallado de Sucursales
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Sucursal</th>
                        <th>IP</th>
                        <th>Tipo</th>
                        <th>Estado General</th>
                        <th>Red</th>
                        <th>BD</th>
                        <th>Ping (ms)</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sucursales.map((sucursal) => {
                        const enMonitoreoCritico = estadisticasMonitoreo.sucursalesEnProblemas.find(
                          p => p.id === sucursal.id.toString()
                        );
                        
                        return (
                          <tr 
                            key={sucursal.id}
                            className={enMonitoreoCritico ? 'table-warning' : ''}
                          >
                            <td>
                              <strong>{sucursal.id}</strong>
                              {enMonitoreoCritico && (
                                <span className="ms-1" title={`En monitoreo crítico: ${enMonitoreoCritico.tiempoCaida} min`}>
                                  🔴
                                </span>
                              )}
                            </td>
                            <td>
                              <div>
                                <strong>{sucursal.nombre}</strong>
                                <br />
                                <small className="text-muted">{sucursal.database}</small>
                                {enMonitoreoCritico && (
                                  <div>
                                    <small className="text-warning">
                                      ⏰ {enMonitoreoCritico.tiempoCaida} min caída
                                    </small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td><code>{sucursal.ip}:{sucursal.puerto}</code></td>
                            <td><Badge bg="secondary">{sucursal.tipo}</Badge></td>
                            <td>
                              <Badge
                                bg={getBadgeVariant(sucursal.ping?.activo, sucursal.baseDatos?.conectado)}
                              >
                                {getEstadoGeneral(sucursal.ping, sucursal.baseDatos)}
                              </Badge>
                            </td>
                            <td>
                              <FontAwesomeIcon
                                icon={sucursal.ping?.activo ? faCheckCircle : faTimesCircle}
                                className={sucursal.ping?.activo ? 'text-success' : 'text-danger'}
                              />
                              {sucursal.ping?.error && (
                                <small className="text-danger d-block">{sucursal.ping.error}</small>
                              )}
                            </td>
                            <td>
                              <FontAwesomeIcon
                                icon={sucursal.baseDatos?.conectado ? faCheckCircle : faTimesCircle}
                                className={sucursal.baseDatos?.conectado ? 'text-success' : 'text-danger'}
                              />
                              {sucursal.baseDatos?.error && (
                                <small className="text-danger d-block">{sucursal.baseDatos.error}</small>
                              )}
                            </td>
                            <td>
                              {sucursal.ping?.activo ? (
                                <Badge bg="success">{sucursal.ping.tiempo}ms</Badge>
                              ) : (
                                <Badge bg="danger">N/A</Badge>
                              )}
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => verificarSucursal(sucursal.id)}
                              >
                                <FontAwesomeIcon icon={faSync} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* 📧 MODAL: Gestión de Notificaciones */}
      <Modal show={showModalEmail} onHide={() => setShowModalEmail(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faEnvelope} className="me-2" />
            Sistema de Notificaciones
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <FontAwesomeIcon icon={faEnvelope} size="3x" className="text-primary mb-3" />
            <h5>Sistema de Alertas Automáticas</h5>
            <p className="text-muted">
              Envío automático de notificaciones a <strong>fariseodesarrollador@gmail.com</strong> cuando 
              las sucursales presentan problemas prolongados.
            </p>
          </div>

          <div className="border rounded p-3 mb-3 bg-light">
            <h6>📋 Criterios de Alertas:</h6>
            <ul className="mb-2">
              <li>🔴 <strong>Alerta Crítica</strong> - Se envía SOLO después de 10+ minutos sin conexión</li>
              <li>✅ <strong>Alerta de Recuperación</strong> - Se envía cuando la sucursal se recupera (si estuvo 10+ min caída)</li>
            </ul>
            
            <h6>🔄 Frecuencia:</h6>
            <ul className="mb-0">
              <li>⏰ Primera alerta: Después de 10 minutos exactos</li>
              <li>🔄 Alertas adicionales: Máximo 1 cada 30 minutos por sucursal</li>
              <li>🚫 NO hay alertas inmediatas (sin spam)</li>
            </ul>
          </div>

          <div className="alert alert-info">
            <FontAwesomeIcon icon={faClock} className="me-2" />
            <strong>Sistema de Monitoreo Inteligente:</strong> 
            <br />• Verificación cada 30 segundos (cuando auto-refresh está ON)
            <br />• Tracking automático del tiempo de caída por sucursal
            <br />• Solo notifica problemas prolongados (10+ minutos)
          </div>

          {estadisticasMonitoreo.sucursalesEnProblemas.length > 0 && (
            <div className="alert alert-warning">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              <strong>Estado Actual:</strong> {estadisticasMonitoreo.sucursalesEnProblemas.length} sucursal(es) 
              en monitoreo crítico
              <div className="mt-2">
                {estadisticasMonitoreo.sucursalesEnProblemas.map((problema, index) => (
                  <div key={index}>
                    <small>
                      • Sucursal {problema.id}: {problema.tiempoCaida} min caída
                      {problema.yaEnviada ? ' (✅ Notificada)' : ` (⏳ ${problema.faltanParaAlerta} min para alerta)`}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={manejarVerificarConfig}
          >
            <FontAwesomeIcon icon={faCog} className="me-1" />
            Verificar Config
          </Button>
          
          <Button 
            variant="outline-warning" 
            onClick={manejarLimpiarCache}
            className="me-2"
          >
            <FontAwesomeIcon icon={faSync} className="me-1" />
            Limpiar Cache
          </Button>
          
          <Button 
            variant="primary" 
            onClick={manejarEmailPrueba}
            disabled={enviandoEmail}
          >
            <FontAwesomeIcon 
              icon={faPaperPlane} 
              className={`me-1 ${enviandoEmail ? 'fa-spin' : ''}`} 
            />
            {enviandoEmail ? 'Enviando...' : 'Enviar Prueba'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 🍞 TOAST para notificaciones */}
      <ToastContainer className="position-fixed bottom-0 end-0 p-3">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          delay={5000} 
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <FontAwesomeIcon icon={faServer} className="me-2" />
            <strong className="me-auto">Sistema de Monitoreo</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default MonitoreoPage;