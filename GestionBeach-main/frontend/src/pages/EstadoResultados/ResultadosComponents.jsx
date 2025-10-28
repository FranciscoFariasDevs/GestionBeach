// src/pages/EstadoResultados/ResultadosComponents.jsx - VERSIÓN MEJORADA PROFESIONAL
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Grid,
  Divider,
  Stack,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  alpha
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PercentIcon from '@mui/icons-material/Percent';
import InfoIcon from '@mui/icons-material/Info';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BugReportIcon from '@mui/icons-material/BugReport';
import GetAppIcon from '@mui/icons-material/GetApp';
import PrintIcon from '@mui/icons-material/Print';

const formatCurrency = (value) => {
  const numValue = Number(value) || 0;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(numValue);
};

const calcularPorcentaje = (value, total, decimals = 1) => {
  if (!total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Componente para mostrar líneas del estado de resultados
 */
export const ResultadoLineItem = ({ 
  label, 
  value = 0, 
  bold, 
  indent = 0, 
  color, 
  icon, 
  percentage, 
  percentageOf,
  editable = false,
  onEdit = () => {},
  isSystemGenerated = false,
  showTooltip = false,
  tooltipText = ''
}) => {
  const theme = useTheme();
  
  const numValue = Number(value) || 0;
  const calculatedPercentage = percentageOf && percentageOf !== 0
    ? calcularPorcentaje(numValue, percentageOf) + '%' 
    : percentage;
  
  const formattedValue = formatCurrency(numValue);
  
  let IconComponent = null;
  if (icon === 'up') {
    IconComponent = <ArrowUpwardIcon fontSize="small" sx={{ color: theme.palette.success.main }} />;
  } else if (icon === 'down') {
    IconComponent = <ArrowDownwardIcon fontSize="small" sx={{ color: theme.palette.error.main }} />;
  } else if (icon === 'right') {
    IconComponent = <ArrowRightIcon fontSize="small" sx={{ color: theme.palette.info.main }} />;
  }
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: 1,
        px: 2,
        borderRadius: 1,
        border: '1px solid transparent',
        pl: indent + 2,
        mb: 0.5,
        backgroundColor: bold ? 
          `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.primary.main}12 100%)` : 
          (isSystemGenerated ? `${theme.palette.grey[100]}` : 'transparent'),
        borderColor: bold ? `${theme.palette.primary.main}20` : 'transparent',
        '&:hover': {
          backgroundColor: bold ? 
            `linear-gradient(135deg, ${theme.palette.primary.main}12 0%, ${theme.palette.primary.main}18 100%)` : 
            `${theme.palette.grey[50]}`,
          borderColor: `${theme.palette.primary.main}30`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {IconComponent}
        <Typography 
          variant={bold ? "subtitle2" : "body2"} 
          fontWeight={bold ? 'bold' : 'medium'}
          color={color || (isSystemGenerated ? 'text.secondary' : 'text.primary')}
        >
          {label}
        </Typography>
        {isSystemGenerated && (
          <Chip 
            label="Sistema" 
            size="small" 
            variant="outlined"
            sx={{ 
              height: 20, 
              fontSize: '0.7rem',
              color: 'text.secondary',
              borderColor: 'text.secondary'
            }}
          />
        )}
        {showTooltip && (
          <Tooltip title={tooltipText} arrow>
            <InfoIcon fontSize="small" sx={{ color: 'info.main', ml: 0.5 }} />
          </Tooltip>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography 
          variant={bold ? "subtitle2" : "body2"} 
          fontWeight={bold ? 'bold' : 'medium'} 
          color={color || (isSystemGenerated ? 'text.secondary' : 'text.primary')}
        >
          {formattedValue}
        </Typography>
        
        {calculatedPercentage && (
          <Chip 
            label={calculatedPercentage}
            size="small"
            sx={{ 
              height: 24,
              fontSize: '0.75rem',
              backgroundColor: `${theme.palette.info.main}15`,
              color: 'info.main',
              fontWeight: 'medium'
            }}
          />
        )}
        
        {editable && !isSystemGenerated && (
          <Tooltip title="Editar valor">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

/**
 * Componente para secciones del estado de resultados
 */
export const ResultadoSection = ({ title, children, total, totalLabel = "Total", percentageOf, icon }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ mb: 3 }}>
      <Paper 
        elevation={0}
        sx={{ 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ 
          py: 2,
          px: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {icon}
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ py: 2 }}>
          {children}
          
          {total !== undefined && (
            <Box sx={{ mt: 2, mx: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <ResultadoLineItem 
                label={totalLabel} 
                value={total} 
                bold={true}
                color={theme.palette.primary.main}
                percentageOf={percentageOf}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

/**
 * COMPONENTE PARA MOSTRAR DESGLOSE DE COSTOS PATRONALES
 */
export const CostosPatronalesDetalle = ({ resumen, porcentajes }) => {
  const theme = useTheme();
  
  if (!resumen || !porcentajes) return null;
  
  const costosPatronales = [
    { 
      label: 'Caja de Compensación', 
      monto: resumen.total_caja_compensacion, 
      porcentaje: porcentajes.caja_compen,
      descripcion: 'Calculado sobre total imponible'
    },
    { 
      label: 'AFC (Ahorro Fondo Cesantía)', 
      monto: resumen.total_afc, 
      porcentaje: porcentajes.afc,
      descripcion: 'Calculado sobre total imponible'
    },
    { 
      label: 'SIS (Seguro Invalidez y Sobrevivencia)', 
      monto: resumen.total_sis, 
      porcentaje: porcentajes.sis,
      descripcion: 'Calculado sobre total imponible'
    },
    { 
      label: 'ACH (Asociación Chilena de Seguridad)', 
      monto: resumen.total_ach, 
      porcentaje: porcentajes.ach,
      descripcion: 'Calculado sobre total imposiciones'
    },
    { 
      label: 'Imposiciones', 
      monto: resumen.total_imposiciones_patronales, 
      porcentaje: porcentajes.imposiciones,
      descripcion: 'Calculado sobre total imponible'
    }
  ];
  
  const totalCostosPatronales = costosPatronales.reduce((sum, item) => sum + (item.monto || 0), 0);
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        borderRadius: 2,
        border: `2px solid ${theme.palette.info.main}`,
        background: `linear-gradient(135deg, ${theme.palette.info.main}08 0%, ${theme.palette.info.main}15 100%)`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PercentIcon sx={{ color: 'info.main' }} />
        <Typography variant="h6" fontWeight="bold">
          Desglose de Costos Patronales
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {costosPatronales.map((item, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight="medium">
                  {item.label}
                </Typography>
                <Chip 
                  label={`${item.porcentaje}%`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Stack>
              <Typography variant="h6" color="success.main" fontWeight="bold" mb={0.5}>
                {formatCurrency(item.monto)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {item.descripcion}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      <Divider sx={{ my: 2 }} />
      
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight="bold">
          Total Costos Patronales:
        </Typography>
        <Typography variant="h5" color="warning.main" fontWeight="bold">
          {formatCurrency(totalCostosPatronales)}
        </Typography>
      </Stack>
      
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>TOTAL CARGO = Total Pago + Costos Patronales</strong>
          <br />
          Total Pago = Líquido a Pagar + Total Descuentos
          <br />
          Este valor se distribuye entre gastos de ventas y administrativos.
        </Typography>
      </Alert>
    </Paper>
  );
};

/**
 * Componente para mostrar el estado de resultados detallado CON COSTOS PATRONALES
 */
export const EstadoResultadosDetallado = ({ data, datosRemuneraciones }) => {
  const theme = useTheme();
  
  if (!data) return null;
  
  return (
    <Card sx={{ 
      borderRadius: 3, 
      boxShadow: `0 8px 32px ${theme.palette.grey[500]}15`,
      height: '100%',
      background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
    }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              Estado de Resultados Detallado
            </Typography>
          </Box>
        }
        subheader="Con costos patronales incluidos en sueldos"
        sx={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2,
        }}
      />
      
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Ingresos */}
          <ResultadoSection 
            title="Ingresos"
            icon={<MonetizationOnIcon />}
            total={data.ingresos.totalIngresos}
            totalLabel="Total Ingresos"
          >
            <ResultadoLineItem 
              label="Ventas" 
              value={data.ingresos.ventas}
              isSystemGenerated={true}
              icon="up"
            />
            <ResultadoLineItem 
              label="Ingresos por Fletes" 
              value={data.ingresos.otrosIngresos.fletes}
              indent={1}
            />
          </ResultadoSection>
          
          {/* Costos */}
          <ResultadoSection 
            title="Costos"
            icon={<ShoppingCartIcon />}
            total={data.costos.totalCostos}
            totalLabel="Total Costos"
          >
            <ResultadoLineItem 
              label="Costo de Ventas" 
              value={data.costos.costoVentas}
              isSystemGenerated={true}
              icon="down"
            />
            <ResultadoLineItem 
              label="Compras del Período" 
              value={data.costos.compras}
              isSystemGenerated={true}
              icon="down"
            />
            <ResultadoLineItem 
              label="Merma de Venta" 
              value={data.costos.mermaVenta}
              indent={1}
            />
          </ResultadoSection>
          
          {/* Utilidad Bruta */}
          <Box sx={{ my: 3 }}>
            <ResultadoLineItem 
              label="UTILIDAD BRUTA" 
              value={data.utilidadBruta}
              bold={true}
              color={theme.palette.success.main}
              percentageOf={data.ingresos.ventas}
              icon="up"
            />
          </Box>
          
          {/* Gastos Operativos CON INDICADOR DE COSTOS PATRONALES */}
          <ResultadoSection 
            title="Gastos Operativos"
            icon={<BusinessIcon />}
            total={data.gastosOperativos.totalGastosOperativos}
            totalLabel="Total Gastos Operativos"
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              Gastos de Venta
            </Typography>
            <ResultadoLineItem 
              label="Sueldos Ventas" 
              value={data.gastosOperativos.gastosVenta.sueldos}
              isSystemGenerated={true}
              indent={1}
              showTooltip={true}
              tooltipText="Incluye costos patronales: Caja Compensación, AFC, SIS, ACH, Imposiciones"
            />
            <ResultadoLineItem 
              label="Fletes" 
              value={data.gastosOperativos.gastosVenta.fletes}
              indent={1}
            />
            <ResultadoLineItem 
              label="Mantenciones" 
              value={data.gastosOperativos.gastosVenta.mantenciones}
              indent={1}
            />
            <ResultadoLineItem 
              label="Publicidad" 
              value={data.gastosOperativos.gastosVenta.publicidad}
              indent={1}
            />
            
            <Typography variant="subtitle2" fontWeight="bold" sx={{ px: 2, py: 1, mt: 2, color: 'text.secondary' }}>
              Gastos Administrativos
            </Typography>
            <ResultadoLineItem 
              label="Sueldos Administrativos" 
              value={data.gastosOperativos.gastosAdministrativos.sueldos}
              isSystemGenerated={true}
              indent={1}
              showTooltip={true}
              tooltipText="Incluye costos patronales: Caja Compensación, AFC, SIS, ACH, Imposiciones"
            />
            <ResultadoLineItem 
              label="Servicios Básicos" 
              value={data.gastosOperativos.gastosAdministrativos.electricidad + 
                     data.gastosOperativos.gastosAdministrativos.agua}
              indent={1}
            />
            <ResultadoLineItem 
              label="Comunicaciones" 
              value={data.gastosOperativos.gastosAdministrativos.telefonia + 
                     data.gastosOperativos.gastosAdministrativos.internet}
              indent={1}
            />
            <ResultadoLineItem 
              label="Gastos Legales" 
              value={data.gastosOperativos.gastosAdministrativos.patenteMunicipal + 
                     data.gastosOperativos.gastosAdministrativos.contribuciones}
              indent={1}
            />
          </ResultadoSection>
          
          {/* Utilidad Operativa */}
          <Box sx={{ my: 3 }}>
            <ResultadoLineItem 
              label="UTILIDAD OPERATIVA" 
              value={data.utilidadOperativa}
              bold={true}
              color={theme.palette.info.main}
              percentageOf={data.ingresos.ventas}
              icon="up"
            />
          </Box>
          
          {/* Otros Gastos e Ingresos */}
          <ResultadoSection 
            title="Otros Gastos e Ingresos"
            icon={<AttachMoneyIcon />}
          >
            <ResultadoLineItem 
              label="Costo de Arriendo" 
              value={data.costoArriendo}
              icon="down"
            />
            <ResultadoLineItem 
              label="Otros Ingresos Financieros" 
              value={data.otrosIngresosFinancieros}
              icon="up"
            />
          </ResultadoSection>
          
          {/* Resultado Final */}
          <Box sx={{ mt: 4, p: 3, borderRadius: 2, backgroundColor: `${theme.palette.success.main}08` }}>
            <ResultadoLineItem 
              label="UTILIDAD ANTES DE IMPUESTOS" 
              value={data.utilidadAntesImpuestos}
              bold={true}
              color={theme.palette.success.main}
              percentageOf={data.ingresos.ventas}
            />
            <ResultadoLineItem 
              label="Impuestos (19%)" 
              value={data.impuestos}
              color={theme.palette.error.main}
              percentageOf={data.ingresos.ventas}
            />
            <Divider sx={{ my: 2 }} />
            <ResultadoLineItem 
              label="UTILIDAD NETA" 
              value={data.utilidadNeta}
              bold={true}
              color={theme.palette.success.main}
              percentageOf={data.ingresos.ventas}
            />
          </Box>
          
          {/* MOSTRAR DESGLOSE DE COSTOS PATRONALES SI ESTÁ DISPONIBLE */}
          {datosRemuneraciones?.resumen && datosRemuneraciones?.porcentajes_aplicados && (
            <Box sx={{ mt: 4 }}>
              <CostosPatronalesDetalle 
                resumen={datosRemuneraciones.resumen}
                porcentajes={datosRemuneraciones.porcentajes_aplicados}
              />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Componente para el análisis financiero
 */
export const AnalisisFinanciero = ({ data }) => {
  const theme = useTheme();
  
  if (!data) return null;
  
  const ventas = data.ingresos?.ventas || 0;
  const utilidadBruta = data.utilidadBruta || 0;
  const utilidadOperativa = data.utilidadOperativa || 0;
  const utilidadNeta = data.utilidadNeta || 0;
  const gastosOperativos = data.gastosOperativos?.totalGastosOperativos || 0;
  const costos = data.costos?.totalCostos || 0;
  
  const ratios = {
    margenBruto: ventas > 0 ? (utilidadBruta / ventas) * 100 : 0,
    margenOperativo: ventas > 0 ? (utilidadOperativa / ventas) * 100 : 0,
    margenNeto: ventas > 0 ? (utilidadNeta / ventas) * 100 : 0,
    eficienciaCostos: ventas > 0 ? (costos / ventas) * 100 : 0,
    eficienciaGastos: ventas > 0 ? (gastosOperativos / ventas) * 100 : 0
  };
  
  return (
    <Grid container spacing={4}>
      <Grid item xs={12} lg={8}>
        <Card sx={{ borderRadius: 3, boxShadow: `0 8px 32px ${theme.palette.grey[500]}15` }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: 'success.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Análisis de Rentabilidad
                </Typography>
              </Box>
            }
            subheader="Indicadores clave de rendimiento financiero con costos patronales"
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {ratios.margenBruto.toFixed(1)}%
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    Margen Bruto
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(ratios.margenBruto, 100)}
                    sx={{ 
                      mt: 1, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: theme.palette.success.light + '30',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.main,
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {ratios.margenOperativo.toFixed(1)}%
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    Margen Operativo
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(ratios.margenOperativo, 100)}
                    sx={{ 
                      mt: 1, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: theme.palette.info.light + '30',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.info.main,
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="secondary.main">
                    {ratios.margenNeto.toFixed(1)}%
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    Margen Neto
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(ratios.margenNeto, 100)}
                    sx={{ 
                      mt: 1, 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: theme.palette.secondary.light + '30',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.secondary.main,
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Estructura de Costos y Gastos
              </Typography>
              
              <Box sx={{ display: 'flex', height: 40, borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                <Box 
                  sx={{ 
                    flex: ratios.eficienciaCostos / 100,
                    backgroundColor: theme.palette.error.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Costos {ratios.eficienciaCostos.toFixed(0)}%
                </Box>
                <Box 
                  sx={{ 
                    flex: ratios.eficienciaGastos / 100,
                    backgroundColor: theme.palette.warning.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Gastos {ratios.eficienciaGastos.toFixed(0)}%
                </Box>
                <Box 
                  sx={{ 
                    flex: ratios.margenNeto / 100,
                    backgroundColor: theme.palette.success.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Utilidad {ratios.margenNeto.toFixed(0)}%
                </Box>
              </Box>
              
              <Typography variant="caption" color="textSecondary">
                Distribución porcentual respecto a las ventas totales (incluye costos patronales en gastos)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} lg={4}>
        <Card sx={{ borderRadius: 3, boxShadow: `0 8px 32px ${theme.palette.grey[500]}15` }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Información del Período
                </Typography>
              </Box>
            }
          />
          <CardContent>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, backgroundColor: 'primary.main' }}>
                    <MonetizationOnIcon fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Ventas Totales"
                  secondary={formatCurrency(ventas)}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, backgroundColor: 'error.main' }}>
                    <ShoppingCartIcon fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Costos Totales"
                  secondary={formatCurrency(costos)}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, backgroundColor: 'warning.main' }}>
                    <PeopleIcon fontSize="small" />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary="Gastos Operativos"
                  secondary={formatCurrency(gastosOperativos)}
                  primaryTypographyProps={{
                    sx: { fontSize: '0.9rem' }
                  }}
                  secondaryTypographyProps={{
                    sx: { fontSize: '0.85rem' }
                  }}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32, backgroundColor: 'success.main' }}>
                    <TrendingUpIcon fontSize="small" />
                  </Avatar>
                </ListItemIcon>
              <ListItemText
                  primary="Utilidad Neta"
                  secondary={formatCurrency(utilidadNeta)}
                />
              </ListItem>
            </List>
            
            {data.datosOriginales && (
              <Box sx={{ mt: 3, p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Datos del Sistema
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Facturas:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.datosOriginales.numeroFacturas}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Ventas:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.datosOriginales.numeroVentas}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Empleados:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {data.datosOriginales.numeroEmpleados || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Total Cargo:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {formatCurrency(data.datosOriginales.totalRemuneraciones)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Observaciones
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  backgroundColor: theme.palette.info.main + '08',
                  borderColor: theme.palette.info.main + '30'
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Margen bruto: {ratios.margenBruto.toFixed(1)}% 
                  {ratios.margenBruto > 30 ? ' (Excelente)' : ratios.margenBruto > 20 ? ' (Bueno)' : ' (Requiere atención)'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Eficiencia operativa: {ratios.margenOperativo.toFixed(1)}%
                  {ratios.margenOperativo > 15 ? ' (Muy buena)' : ratios.margenOperativo > 10 ? ' (Aceptable)' : ' (Mejorable)'}
                </Typography>
                <Typography variant="body2">
                  • Rentabilidad final: {ratios.margenNeto.toFixed(1)}%
                  {ratios.margenNeto > 10 ? ' (Excelente)' : ratios.margenNeto > 5 ? ' (Buena)' : ' (Crítica)'}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="info.main" fontWeight="medium">
                  ℹ️ Los gastos incluyen costos patronales calculados según porcentajes configurados
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

/**
 * 🆕 COMPONENTE KPI CARD PROFESIONAL - DISEÑO GERENCIAL MEJORADO
 */
export const KPICard = ({ title, value, subtitle, icon, trend, trendValue, color = 'primary', bgGradient }) => {
  const theme = useTheme();

  const IconComponent = icon;
  const colorMain = theme.palette[color]?.main || theme.palette.primary.main;
  const colorLight = alpha(colorMain, 0.1);
  const colorDark = alpha(colorMain, 0.8);

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        background: bgGradient || `linear-gradient(135deg, ${colorLight} 0%, ${alpha(colorMain, 0.05)} 100%)`,
        border: `1px solid ${alpha(colorMain, 0.2)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(colorMain, 0.15)}`,
          border: `1px solid ${alpha(colorMain, 0.4)}`,
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          {/* Header con icono */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.75rem',
                  mb: 1
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: colorDark,
                  lineHeight: 1.2,
                  fontSize: '2rem'
                }}
              >
                {typeof value === 'number' ? formatCurrency(value) : value}
              </Typography>
            </Box>

            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: alpha(colorMain, 0.15),
                color: colorMain,
                boxShadow: `0 4px 12px ${alpha(colorMain, 0.2)}`
              }}
            >
              {IconComponent}
            </Avatar>
          </Box>

          {/* Tendencia y subtitle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.8rem'
                }}
              >
                {subtitle}
              </Typography>
            )}

            {trend && trendValue !== undefined && (
              <Chip
                size="small"
                icon={trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={`${trendValue > 0 ? '+' : ''}${trendValue}%`}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 24,
                  bgcolor: trend === 'up'
                    ? alpha(theme.palette.success.main, 0.15)
                    : alpha(theme.palette.error.main, 0.15),
                  color: trend === 'up'
                    ? theme.palette.success.main
                    : theme.palette.error.main,
                  border: `1px solid ${trend === 'up'
                    ? alpha(theme.palette.success.main, 0.3)
                    : alpha(theme.palette.error.main, 0.3)}`,
                  '& .MuiChip-icon': {
                    fontSize: 16
                  }
                }}
              />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * 🆕 COMPONENTE HEADER EJECUTIVO MEJORADO PROFESIONAL
 */
export const ExecutiveHeader = ({
  sucursal,
  periodo,
  razonSocial,
  fechaCreacion,
  estado,
  onDebugAPI,
  onExportExcel,
  onPrint,
  clasificacion,
  numeroFacturas,
  numeroVentas,
  numeroEmpleados
}) => {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={{
      p: 4, mb: 0, borderRadius: 3,
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, right: 0,
        width: '300px', height: '300px',
        background: `radial-gradient(circle, ${alpha('#fff', 0.1)} 0%, transparent 70%)`,
        transform: 'translate(30%, -30%)'
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0, left: 0,
        width: '250px', height: '250px',
        background: `radial-gradient(circle, ${alpha('#fff', 0.08)} 0%, transparent 70%)`,
        transform: 'translate(-30%, 30%)'
      }
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1.5, fontWeight: 600 }}>
            Estado de Resultados
          </Typography>
          <Typography variant="h3" fontWeight="800" sx={{ mb: 1, mt: 0.5 }}>
            {razonSocial}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Chip
              label={sucursal}
              sx={{
                bgcolor: alpha('#fff', 0.25),
                color: 'white',
                fontWeight: 700,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.3)}`
              }}
              icon={<LocationOnIcon sx={{ color: 'white !important' }} />}
            />
            <Chip
              label={periodo}
              sx={{
                bgcolor: alpha('#fff', 0.25),
                color: 'white',
                fontWeight: 700,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha('#fff', 0.3)}`
              }}
              icon={<CalendarTodayIcon sx={{ color: 'white !important' }} />}
            />
            {estado && (
              <Chip
                label={estado.toUpperCase()}
                sx={{
                  bgcolor: estado === 'borrador' ? alpha('#FFA726', 0.9) :
                           estado === 'guardado' ? alpha('#29B6F6', 0.9) : alpha('#66BB6A', 0.9),
                  color: 'white',
                  fontWeight: 700,
                  backdropFilter: 'blur(10px)'
                }}
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          {onDebugAPI && (
            <Tooltip title="Debug APIs">
              <IconButton
                onClick={onDebugAPI}
                sx={{
                  color: 'white',
                  bgcolor: alpha('#fff', 0.15),
                  '&:hover': { bgcolor: alpha('#fff', 0.25) }
                }}
              >
                <BugReportIcon />
              </IconButton>
            </Tooltip>
          )}
          {onExportExcel && (
            <Tooltip title="Exportar a Excel">
              <IconButton
                onClick={onExportExcel}
                sx={{
                  color: 'white',
                  bgcolor: alpha('#fff', 0.15),
                  '&:hover': { bgcolor: alpha('#fff', 0.25) }
                }}
              >
                <GetAppIcon />
              </IconButton>
            </Tooltip>
          )}
          {onPrint && (
            <Tooltip title="Imprimir">
              <IconButton
                onClick={onPrint}
                sx={{
                  color: 'white',
                  bgcolor: alpha('#fff', 0.15),
                  '&:hover': { bgcolor: alpha('#fff', 0.25) }
                }}
              >
                <PrintIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 2.5, bgcolor: alpha('#fff', 0.2) }} />

      <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha('#fff', 0.12),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ReceiptIcon sx={{ fontSize: 28, opacity: 0.9 }} />
              <Box>
                <Typography variant="h5" fontWeight="700">
                  {numeroFacturas}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Facturas Procesadas
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha('#fff', 0.12),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShoppingCartIcon sx={{ fontSize: 28, opacity: 0.9 }} />
              <Box>
                <Typography variant="h5" fontWeight="700">
                  {numeroVentas}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Ventas Registradas
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha('#fff', 0.12),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <PeopleIcon sx={{ fontSize: 28, opacity: 0.9 }} />
              <Box>
                <Typography variant="h5" fontWeight="700">
                  {numeroEmpleados}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Total Empleados
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha('#fff', 0.12),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#fff', 0.2)}`
          }}>
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Clasificación
              </Typography>
              {clasificacion ? (
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`${clasificacion.empleados_admin} Admin`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#2196F3', 0.9),
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  />
                  <Chip
                    label={`${clasificacion.empleados_ventas} Ventas`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#4CAF50', 0.9),
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  />
                </Stack>
              ) : (
                <Typography variant="caption">N/A</Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2.5, position: 'relative', zIndex: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Generado el {fechaCreacion}
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * 🆕 COMPONENTE INDICADOR CON PROGRESO VISUAL
 */
export const IndicatorProgress = ({ label, value, total, color = 'primary', format = 'currency' }) => {
  const theme = useTheme();
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorMain = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {label}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h6" fontWeight={700} color={colorMain}>
            {format === 'currency' ? formatCurrency(value) : `${value}%`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / {format === 'currency' ? formatCurrency(total) : `${total}%`}
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(colorMain, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: colorMain,
              backgroundImage: `linear-gradient(90deg, ${colorMain} 0%, ${theme.palette[color]?.dark || colorMain} 100%)`
            }
          }}
        />
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 0,
            top: -20,
            fontWeight: 700,
            color: colorMain,
            fontSize: '0.7rem'
          }}
        >
          {percentage.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
};