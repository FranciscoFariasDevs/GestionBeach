import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faChartBar, 
  faShoppingCart, 
  faIdCard, 
  faCog, 
  faSignOutAlt,
  faServer 
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

function AppNavbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  
  // Si no hay usuario autenticado, no mostrar el navbar
  if (!user) return null;
  
  // Verificar si la ruta actual coincide con la ruta del ítem
  const isActive = (path) => location.pathname === path;
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <Navbar expand="lg" className="navbar-custom">
      <Container fluid>
        <Navbar.Brand as={Link} to="/dashboard">Beach Market</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              <FontAwesomeIcon icon={faHome} className="me-1" /> Inicio
            </Nav.Link>
            
            <Nav.Link as={Link} to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              <FontAwesomeIcon icon={faChartBar} className="me-1" /> Dashboard
            </Nav.Link>
            
            <Nav.Link as={Link} to="/monitoreo" className={isActive('/monitoreo') ? 'active' : ''}>
              <FontAwesomeIcon icon={faServer} className="me-1" /> Monitoreo
            </Nav.Link>
            
            <Nav.Link as={Link} to="/ventas" className={isActive('/ventas') ? 'active' : ''}>
              <FontAwesomeIcon icon={faShoppingCart} className="me-1" /> Ventas
            </Nav.Link>
            
            <Nav.Link as={Link} to="/tarjeta" className={isActive('/tarjeta') ? 'active' : ''}>
              <FontAwesomeIcon icon={faIdCard} className="me-1" /> Tarjeta Empleado
            </Nav.Link>
            
            <Nav.Link as={Link} to="/configuracion" className={isActive('/configuracion') ? 'active' : ''}>
              <FontAwesomeIcon icon={faCog} className="me-1" /> Configuración
            </Nav.Link>
          </Nav>
          
          <Nav>
            <Navbar.Text className="me-3">
              Bienvenido, {user.username}
            </Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar sesión
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;