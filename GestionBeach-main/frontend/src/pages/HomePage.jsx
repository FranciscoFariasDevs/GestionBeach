import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enviarMensajeContacto, enviarPostulacion } from '../services/emailService';
import {
  AppBar,
  Toolbar,
  Button,
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Paper,
  Divider,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExpandMore,
  ExpandLess,
  Phone,
  LocationOn,
  Schedule,
  Hotel,
  Wifi,
  Restaurant,
  Nature,
  ShoppingBag,
  Checkroom,
  Home as HomeIcon,
  Devices,
  Login,
  CloudUpload,
  Close,
  CabinOutlined,
  Build,
  Store,
  ShoppingCart,
  AccountCircle
} from '@mui/icons-material';

// Import local images
import logoImg from '../images/logo.jpg';
import azulImg from '../images/WEB/azul.png';
import naranjaImg from '../images/WEB/naranja.png';
import moradoImg from '../images/WEB/morado.png';
import rojoImg from '../images/WEB/rojo.png';
import multitiendaImg from '../images/WEB/multitienda.jpeg';
import cabanaImg from '../images/WEB/cabaña.jpeg';
import ferreImg from '../images/WEB/Ferre.jpg';

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // Estados para el drawer móvil
  const [mobileDrawer, setMobileDrawer] = useState(false);

  // Estado para el formulario de postulación
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: '',
    curriculum: null
  });

  // Estado para el formulario de contacto
  const [contactData, setContactData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Sucursales - Datos reales
  const ferreteriasSucursales = [
    { nombre: 'Ferretería Chillán', direccion: 'RIO VIEJO 999, CHILLAN' },
    { nombre: 'Ferretería Quirihue', direccion: 'RUTA EL CONQUISTADOR 1002, QUIRIHUE' },
    { nombre: 'Ferretería Coelemu', direccion: 'TRES ESQUINAS S/N, COELEMU' },
    { nombre: 'Ferretería Tomé', direccion: 'LAS CAMELIAS 39, TOME' },
    { nombre: 'Ferretería Dichato', direccion: 'DANIEL VERA 876, DICHATO' }
  ];

  const supermercadosSucursales = [
    { nombre: 'Supermercado Tomé (Lord Cochrane)', direccion: 'LORD COCHRANE 1127, TOME' },
    { nombre: 'Supermercado Tomé (Enrique Molina)', direccion: 'ENRIQUE MOLINA 596, TOME' },
    { nombre: 'Supermercado Dichato', direccion: 'DANIEL VERA 890, DICHATO' },
    { nombre: 'Supermercado Dichato 2', direccion: 'DANIEL VERA 891, DICHATO' },
    { nombre: 'Supermercado Ranguelmo', direccion: 'LOS CIPRESES 77, RANGUELMO' },
    { nombre: 'Supermercado Coelemu', direccion: 'TRES ESQUINAS S/N, COELEMU' }
  ];

  const multitiendasSucursales = [
    { nombre: 'Multitienda Coelemu', direccion: 'TRES ESQUINAS S/N, COELEMU' },
    { nombre: 'Multitienda Tomé', direccion: 'VICENTE PALACIOS 3088, TOME' }
  ];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileDrawer(false);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setFormData({ ...formData, curriculum: event.target.files[0] });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const resultado = await enviarPostulacion(formData);

    if (resultado.success) {
      setSnackbar({ open: true, message: resultado.message });
      setFormData({ nombre: '', email: '', telefono: '', mensaje: '', curriculum: null });
    } else {
      setSnackbar({ open: true, message: 'Error al enviar la postulación. Por favor, intenta de nuevo o envía tu CV directamente a unete@beach.cl' });
    }
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    const resultado = await enviarMensajeContacto(contactData);

    if (resultado.success) {
      setSnackbar({ open: true, message: '¡Mensaje enviado exitosamente a comunicate@beach.cl!' });
      setContactData({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' });
    } else {
      setSnackbar({ open: true, message: 'Error al enviar el mensaje. Por favor, intenta de nuevo o escríbenos a comunicate@beach.cl' });
    }
  };

  // Navbar Desktop Menu
  const NavbarDesktop = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
      <Button
        color="inherit"
        onClick={() => scrollToSection('quienes-somos')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Quiénes Somos
      </Button>

      {/* Ferreterías - Scroll directo */}
      <Button
        color="inherit"
        startIcon={<Avatar src={naranjaImg} sx={{ width: 24, height: 24 }} />}
        onClick={() => scrollToSection('ferreterias')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Ferreterías
      </Button>

      {/* Supermercados - Scroll directo */}
      <Button
        color="inherit"
        startIcon={<Avatar src={rojoImg} sx={{ width: 24, height: 24 }} />}
        onClick={() => scrollToSection('supermercados')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Supermercados
      </Button>

      {/* Multitiendas - Scroll directo */}
      <Button
        color="inherit"
        startIcon={<Avatar src={naranjaImg} sx={{ width: 24, height: 24 }} />}
        onClick={() => scrollToSection('multitiendas')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Multitiendas
      </Button>

      <Button
        color="inherit"
        startIcon={<Avatar src={azulImg} sx={{ width: 24, height: 24 }} />}
        onClick={() => scrollToSection('unete')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Únete
      </Button>

      <Button
        color="inherit"
        startIcon={<Avatar src={moradoImg} sx={{ width: 24, height: 24 }} />}
        onClick={() => scrollToSection('contacto')}
        sx={{ '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)' } }}
      >
        Contacto
      </Button>

      {/* Cabañas, Tienda y Login - Destacados */}
      <Button
        variant="contained"
        startIcon={<CabinOutlined />}
        onClick={() => navigate('/reserva-cabanas')}
        sx={{
          bgcolor: '#ff9800',
          color: '#fff',
          fontWeight: 700,
          px: 3,
          py: 1,
          fontSize: '1rem',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
          '&:hover': {
            bgcolor: '#f57c00',
            boxShadow: '0 6px 16px rgba(255, 152, 0, 0.5)',
            transform: 'translateY(-2px)'
          },
          transition: 'all 0.3s ease'
        }}
      >
        Cabañas
      </Button>

      <Button
        variant="contained"
        startIcon={<ShoppingCart />}
        onClick={() => window.open('https://www.tiendabeach.cl', '_blank')}
        sx={{
          bgcolor: '#4caf50',
          color: '#fff',
          fontWeight: 700,
          px: 3,
          py: 1,
          fontSize: '1rem',
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
          '&:hover': {
            bgcolor: '#45a049',
            boxShadow: '0 6px 16px rgba(76, 175, 80, 0.5)',
            transform: 'translateY(-2px)'
          },
          transition: 'all 0.3s ease'
        }}
      >
        Tienda
      </Button>

      <Tooltip title="Ingresa" arrow placement="bottom">
        <IconButton
          onClick={() => navigate('/login')}
          sx={{
            bgcolor: '#2196f3',
            color: '#fff',
            width: 48,
            height: 48,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
            '&:hover': {
              bgcolor: '#1976d2',
              boxShadow: '0 6px 16px rgba(33, 150, 243, 0.5)',
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          <AccountCircle sx={{ fontSize: 28 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Mobile Drawer
  const MobileDrawer = () => (
    <Drawer
      anchor="right"
      open={mobileDrawer}
      onClose={() => setMobileDrawer(false)}
    >
      <Box sx={{ width: 280, pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pb: 1 }}>
          <IconButton onClick={() => setMobileDrawer(false)}>
            <Close />
          </IconButton>
        </Box>
        <List>
          <ListItem button onClick={() => scrollToSection('quienes-somos')}>
            <ListItemText primary="Quiénes Somos" />
          </ListItem>

          {/* Ferreterías - Scroll directo */}
          <ListItem button onClick={() => scrollToSection('ferreterias')}>
            <Avatar src={naranjaImg} sx={{ width: 24, height: 24, mr: 2 }} />
            <ListItemText primary="Ferreterías" />
          </ListItem>

          {/* Supermercados - Scroll directo */}
          <ListItem button onClick={() => scrollToSection('supermercados')}>
            <Avatar src={rojoImg} sx={{ width: 24, height: 24, mr: 2 }} />
            <ListItemText primary="Supermercados" />
          </ListItem>

          {/* Multitiendas - Scroll directo */}
          <ListItem button onClick={() => scrollToSection('multitiendas')}>
            <Avatar src={naranjaImg} sx={{ width: 24, height: 24, mr: 2 }} />
            <ListItemText primary="Multitiendas" />
          </ListItem>

          <ListItem button onClick={() => scrollToSection('unete')}>
            <Avatar src={azulImg} sx={{ width: 24, height: 24, mr: 2 }} />
            <ListItemText primary="Únete" />
          </ListItem>

          <ListItem button onClick={() => scrollToSection('contacto')}>
            <Avatar src={moradoImg} sx={{ width: 24, height: 24, mr: 2 }} />
            <ListItemText primary="Contacto" />
          </ListItem>

          <ListItem button onClick={() => navigate('/reserva-cabanas')}>
            <CabinOutlined sx={{ mr: 2 }} />
            <ListItemText primary="Cabañas" />
          </ListItem>

          <ListItem button onClick={() => window.open('https://www.tiendabeach.cl', '_blank')}>
            <ShoppingCart sx={{ mr: 2, color: '#4caf50' }} />
            <ListItemText primary="Tienda Beach" primaryTypographyProps={{ fontWeight: 600, color: '#4caf50' }} />
          </ListItem>

          <ListItem button onClick={() => navigate('/login')}>
            <AccountCircle sx={{ mr: 2, color: '#2196f3' }} />
            <ListItemText primary="Ingresa" primaryTypographyProps={{ fontWeight: 600, color: '#2196f3' }} />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );

  return (
    <Box sx={{ bgcolor: '#fff' }}>
      {/* Navbar */}
      <AppBar position="fixed" sx={{ bgcolor: '#fff', color: '#333', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Box
                component="img"
                src={logoImg}
                alt="Beach Logo"
                sx={{
                  height: { xs: 50, md: 60 },
                  width: 'auto',
                  cursor: 'pointer'
                }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              />
            </Box>

            {isMobile ? (
              <IconButton
                color="inherit"
                onClick={() => setMobileDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <NavbarDesktop />
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <MobileDrawer />

      {/* Main Content */}
      <Box sx={{ pt: { xs: 9, md: 10 } }}>

        {/* Hero Section */}
        <Box sx={{
          position: 'relative',
          py: { xs: 6, md: 10 },
          backgroundImage: `url(${ferreImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(rgba(255, 152, 0, 0.3), rgba(245, 124, 0, 0.4))',
            zIndex: 1
          }
        }}>
          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
            <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
              <Typography variant="h2" sx={{ fontWeight: 900, mb: 3, fontSize: { xs: '2rem', md: '3.5rem' }, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                Bienvenido a Beach
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, fontSize: { xs: '1.1rem', md: '1.5rem' }, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                Más de 20 años de experiencia sirviendo a nuestras comunidades con ferreterías, supermercados, cabañas y multitiendas de calidad
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => scrollToSection('ferreterias')}
                  sx={{
                    bgcolor: '#ff9800',
                    color: '#fff',
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    '&:hover': { bgcolor: '#f57c00', boxShadow: '0 6px 16px rgba(0,0,0,0.4)' }
                  }}
                >
                  Nuestras Ferreterías
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => scrollToSection('contacto')}
                  sx={{
                    borderColor: '#fff',
                    color: '#fff',
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderWidth: 2,
                    '&:hover': { borderColor: '#fff', borderWidth: 2, bgcolor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  Contáctanos
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Quienes Somos */}
            <Box id="quienes-somos" sx={{ py: 8, bgcolor: '#fff' }}>
              <Container maxWidth="lg">
                <Typography variant="h3" sx={{ color: '#ff9800', mb: 6, textAlign: 'center', fontWeight: 700 }}>
                  Quiénes Somos
                </Typography>
                <Grid container spacing={6} alignItems="center" justifyContent="center">
                  <Grid item xs={12} md={6}>
                <Typography variant="body1" paragraph sx={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Somos <strong>Beach Market</strong>, una empresa líder en el sector comercial con más de 20 años de experiencia
                  brindando servicios y productos de calidad a nuestras comunidades.
                </Typography>
                <Typography variant="body1" paragraph sx={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Ofrecemos una amplia gama de servicios que incluyen <strong>ferreterías</strong> con herramientas y materiales de construcción,
                  <strong> supermercados</strong> con productos frescos y de primera necesidad, <strong>cabañas turísticas</strong> para
                  un descanso inolvidable, y <strong>multitiendas</strong> con todo lo que necesitas para tu hogar y familia.
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Nuestro compromiso es brindar <strong>calidad, precios competitivos y atención excepcional</strong>,
                  siendo parte activa del crecimiento y desarrollo de las comunidades donde operamos.
                </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                      <Box
                        component="img"
                        src={logoImg}
                        alt="Beach Market"
                        sx={{
                          height: { xs: 250, md: 400 },
                          width: 'auto',
                          maxWidth: '90%',
                          objectFit: 'contain',
                          transition: 'transform 0.3s ease',
                          margin: '0 auto',
                          display: 'block',
                          '&:hover': { transform: 'scale(1.05)' }
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Container>
            </Box>

            {/* Ferreterias */}
        <Box id="ferreterias" sx={{ py: 8, bgcolor: '#fafafa' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Avatar src={naranjaImg} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, boxShadow: 3 }} />
              <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, fontWeight: 700 }}>
                Ferreterías Beach
              </Typography>
              <Typography variant="body1" sx={{ color: '#666', maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
                Encuentra todo lo que necesitas para tus proyectos de construcción y reparación.
                Herramientas de calidad, materiales y asesoría profesional.
              </Typography>
            </Box>

            <Box sx={{ mb: 6, maxWidth: 1000, mx: 'auto', display: 'flex', justifyContent: 'center' }}>
              <CardMedia
                component="img"
                image={ferreImg}
                alt="Ferretería Beach"
                sx={{ borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', height: 450, objectFit: 'cover', width: '100%' }}
              />
            </Box>

            <Grid container spacing={3} justifyContent="center">
              {ferreteriasSucursales.map((sucursal, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{
                    height: '100%',
                    borderTop: '4px solid #ff9800',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" sx={{ color: '#ff9800', mb: 3, fontWeight: 700 }}>
                        {sucursal.nombre}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                        <LocationOn sx={{ color: '#ff9800', mt: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {sucursal.direccion}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Schedule sx={{ color: '#ff9800' }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          8:30 AM - 6:30 PM
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Supermercados */}
        <Box id="supermercados" sx={{ py: 8, bgcolor: '#fff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Avatar src={rojoImg} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, boxShadow: 3 }} />
              <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, fontWeight: 700 }}>
                Supermercados Beach
              </Typography>
              <Typography variant="body1" sx={{ color: '#666', maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
                Tu destino para compras completas con productos frescos, ofertas especiales y
                la mejor atención. Todo lo que necesitas en un solo lugar.
              </Typography>
            </Box>

            <Box sx={{ mb: 6, maxWidth: 1000, mx: 'auto', display: 'flex', justifyContent: 'center' }}>
              <CardMedia
                component="img"
                image={multitiendaImg}
                alt="Supermercado Beach"
                sx={{ borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', height: 450, objectFit: 'cover', width: '100%' }}
              />
            </Box>

            <Grid container spacing={3} justifyContent="center">
              {supermercadosSucursales.map((sucursal, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{
                    height: '100%',
                    borderTop: '4px solid #ff9800',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" sx={{ color: '#ff9800', mb: 3, fontWeight: 700 }}>
                        {sucursal.nombre}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                        <LocationOn sx={{ color: '#ff9800', mt: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {sucursal.direccion}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Schedule sx={{ color: '#ff9800' }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          8:30 AM - 6:30 PM
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Cabañas */}
        <Box id="cabanas" sx={{ py: 8, bgcolor: '#fff3e0' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Avatar src={azulImg} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, boxShadow: 3 }} />
              <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, fontWeight: 700 }}>
                Cabañas Beach
              </Typography>
              <Typography variant="body1" sx={{ color: '#666', maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
                Descubre el descanso perfecto en nuestras cabañas rodeadas de naturaleza.
                Un escape ideal para disfrutar en familia o con amigos.
              </Typography>
            </Box>

            <Grid container spacing={6} alignItems="center" justifyContent="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Box
                    component="img"
                    src={cabanaImg}
                    alt="Cabañas Beach"
                    sx={{
                      borderRadius: 3,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      height: { xs: 300, md: 500 },
                      width: '100%',
                      maxWidth: '90%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                      margin: '0 auto',
                      display: 'block',
                      '&:hover': { transform: 'scale(1.02)' }
                    }}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h4" sx={{ color: '#ff9800', mb: 3, fontWeight: 700 }}>
                  Experiencia Única
                </Typography>
                <Typography variant="body1" paragraph sx={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Nuestras cabañas ofrecen una experiencia única de conexión con la naturaleza
                  sin renunciar a las comodidades modernas. Ubicadas en entornos privilegiados,
                  cada cabaña está equipada con todo lo necesario para una estadía inolvidable.
                </Typography>

                <Typography variant="h5" sx={{ color: '#ff9800', mb: 3, mt: 4, fontWeight: 700 }}>
                  Amenidades
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { icon: <Hotel />, text: 'Habitaciones cómodas' },
                    { icon: <Wifi />, text: 'WiFi gratuito' },
                    { icon: <Restaurant />, text: 'Cocina equipada' },
                    { icon: <Nature />, text: 'Entorno natural' }
                  ].map((amenidad, index) => (
                    <Grid item xs={6} key={index}>
                      <Card sx={{ borderLeft: '3px solid #ff9800', bgcolor: '#fff' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ color: '#ff9800' }}>{amenidad.icon}</Box>
                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 600 }}>
                              {amenidad.text}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/reserva-cabanas')}
                  sx={{
                    mt: 4,
                    bgcolor: '#ff9800',
                    color: '#fff',
                    fontWeight: 700,
                    py: 1.5,
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
                    '&:hover': {
                      bgcolor: '#f57c00',
                      boxShadow: '0 6px 16px rgba(255, 152, 0, 0.5)'
                    }
                  }}
                >
                  Reserva Ahora
                </Button>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Multitiendas */}
        <Box id="multitiendas" sx={{ py: 8, bgcolor: '#fff' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Avatar src={multitiendaImg} sx={{ width: 80, height: 80, mx: 'auto', mb: 2, boxShadow: 3 }} />
              <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, fontWeight: 700 }}>
                Multitiendas Beach
              </Typography>
              <Typography variant="body1" sx={{ color: '#666', maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
                Encuentra variedad, calidad y los mejores precios en nuestras multitiendas.
                Artículos para el hogar, electrónica y accesorios en un solo lugar.
              </Typography>
            </Box>

            <Box sx={{ mb: 6, maxWidth: 1000, mx: 'auto', display: 'flex', justifyContent: 'center' }}>
              <CardMedia
                component="img"
                image={multitiendaImg}
                alt="Multitiendas Beach"
                sx={{ borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', height: 450, objectFit: 'cover', width: '100%' }}
              />
            </Box>

            <Grid container spacing={3} sx={{ mb: 6 }} justifyContent="center">
              {[
                { icon: <HomeIcon />, titulo: 'Hogar', descripcion: 'Artículos para el hogar, decoración y muebles' },
                { icon: <Devices />, titulo: 'Electrónica', descripcion: 'Tecnología y electrodomésticos de última generación' },
                { icon: <ShoppingBag />, titulo: 'Accesorios', descripcion: 'Complementos y accesorios para cada ocasión' }
              ].map((categoria, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)'
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box sx={{ bgcolor: '#ff9800', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                        <Box sx={{ color: '#fff', fontSize: 32 }}>{categoria.icon}</Box>
                      </Box>
                      <Typography variant="h6" sx={{ color: '#ff9800', mb: 2, fontWeight: 700 }}>
                        {categoria.titulo}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        {categoria.descripcion}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h5" sx={{ color: '#ff9800', mb: 3, textAlign: 'center', fontWeight: 700 }}>
              Nuestras Sucursales
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }} justifyContent="center">
              {multitiendasSucursales.map((sucursal, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card sx={{
                    height: '100%',
                    borderTop: '4px solid #ff9800',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" sx={{ color: '#ff9800', mb: 3, fontWeight: 700 }}>
                        {sucursal.nombre}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                        <LocationOn sx={{ color: '#ff9800', mt: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {sucursal.direccion}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Schedule sx={{ color: '#ff9800' }} />
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          8:30 AM - 6:30 PM
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Unete */}
        <Box id="unete" sx={{ py: 8, bgcolor: '#fafafa' }}>
          <Container maxWidth="md">
            <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, textAlign: 'center', fontWeight: 700 }}>
              Únete al Equipo Beach
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mb: 6, textAlign: 'center', fontSize: '1.1rem' }}>
              Forma parte de una empresa en constante crecimiento. Envíanos tu currículum
              y datos de contacto para futuras oportunidades laborales.
            </Typography>

            <Card sx={{ borderTop: '4px solid #ff9800', boxShadow: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ color: '#ff9800', mb: 4, fontWeight: 700 }}>
                  Formulario de Postulación
                </Typography>

                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Correo Electrónico"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Teléfono"
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Mensaje (Opcional)"
                    multiline
                    rows={4}
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1, fontWeight: 600 }}>
                      Currículum (PDF, DOC, DOCX) *
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      sx={{
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        '&:hover': { borderColor: '#f57c00', bgcolor: 'rgba(255, 152, 0, 0.04)' }
                      }}
                    >
                      Subir Archivo
                      <input
                        type="file"
                        hidden
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        required
                      />
                    </Button>
                    {formData.curriculum && (
                      <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                        {formData.curriculum.name}
                      </Typography>
                    )}
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      bgcolor: '#ff9800',
                      '&:hover': { bgcolor: '#f57c00' },
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    Enviar Postulación
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Container>
        </Box>

        {/* Contacto */}
        <Box id="contacto" sx={{ py: 8, bgcolor: '#fff' }}>
          <Container maxWidth="md">
            <Typography variant="h3" sx={{ color: '#ff9800', mb: 2, textAlign: 'center', fontWeight: 700 }}>
              Contacto
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mb: 6, textAlign: 'center', fontSize: '1.1rem' }}>
              ¿Tienes alguna pregunta o comentario? Estamos aquí para ayudarte.
              Completa el formulario y nos pondremos en contacto contigo lo antes posible.
            </Typography>

            <Card sx={{ borderTop: '4px solid #ff9800', boxShadow: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ color: '#ff9800', mb: 4, fontWeight: 700 }}>
                  Envíanos un Mensaje
                </Typography>

                <form onSubmit={handleContactSubmit}>
                  <TextField
                    fullWidth
                    label="Nombre Completo"
                    required
                    value={contactData.nombre}
                    onChange={(e) => setContactData({ ...contactData, nombre: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Correo Electrónico"
                    type="email"
                    required
                    value={contactData.email}
                    onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Teléfono"
                    type="tel"
                    required
                    value={contactData.telefono}
                    onChange={(e) => setContactData({ ...contactData, telefono: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Asunto"
                    required
                    value={contactData.asunto}
                    onChange={(e) => setContactData({ ...contactData, asunto: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Mensaje"
                    multiline
                    rows={5}
                    required
                    value={contactData.mensaje}
                    onChange={(e) => setContactData({ ...contactData, mensaje: e.target.value })}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ff9800' }
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      bgcolor: '#ff9800',
                      '&:hover': { bgcolor: '#f57c00' },
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  >
                    Enviar Mensaje
                  </Button>
                </form>

                <Divider sx={{ my: 4 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Phone sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#666', mb: 1, fontWeight: 600 }}>
                        Teléfono
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        +56 9 0000 0000
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <LocationOn sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#666', mb: 1, fontWeight: 600 }}>
                        Dirección
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Dichato, Chile
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Schedule sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: '#666', mb: 1, fontWeight: 600 }}>
                        Horario
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Lun - Vie: 9:00 AM - 6:00 PM
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#212121', color: '#fff', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>  
              <Box
                component="img"
                src={logoImg}
                alt="Beach Market Logo"
                sx={{ height: 60, mb: 2, filter: 'brightness(0) invert(1)' }}
              />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Tu destino integral para ferreterías, supermercados, cabañas y multitiendas.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Enlaces Rápidos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button sx={{ color: '#fff', justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => scrollToSection('quienes-somos')}>
                  Quiénes Somos
                </Button>
                <Button sx={{ color: '#fff', justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => scrollToSection('ferreterias')}>
                  Ferreterías
                </Button>
                <Button sx={{ color: '#fff', justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => scrollToSection('supermercados')}>
                  Supermercados
                </Button>
                <Button sx={{ color: '#fff', justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => navigate('/reserva-cabanas')}>
                  Cabañas
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Contacto
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                Dichato, Chile
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                +56 9 0000 0000
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                info@beachmarket.cl
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.7 }}>
            &copy; 2025 Beach Market. Todos los derechos reservados.
          </Typography>
        </Container>
      </Box>

      {/* Snackbar for form submission */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
