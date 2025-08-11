import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  DownloadOutlined,
  BarChartOutlined,
  TrendingUpOutlined,
  InfoOutlined,
  KeyboardArrowDownOutlined,
  KeyboardArrowUpOutlined,
  SummarizeOutlined,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AutoReport = ({ data, startDate, endDate, loading, formatCurrency }) => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({
    ventas: true,
    rentabilidad: true,
    hallazgos: true,
  });
  const reportRef = React.useRef(null);

  // Función para generar el reporte
  const generateReport = async () => {
    setGeneratingReport(true);
    
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      if (!data) throw new Error("No hay datos disponibles");
      
      // Aquí procesamos directamente los mismos datos que ya están en el dashboard
      const procesarDatosReporte = () => {
        // Usamos exactamente los mismos datos que ya están siendo mostrados en los gráficos
        const { supermercados, ferreterias, multitiendas, total } = data;
        
        // Analizar distribución de ventas
        const distribucionVentas = [
          {
            tipo: "Supermercados",
            porcentaje: (supermercados.ventas / total.ventas * 100).toFixed(2),
            valor: supermercados.ventas
          },
          {
            tipo: "Ferreterías",
            porcentaje: (ferreterias.ventas / total.ventas * 100).toFixed(2),
            valor: ferreterias.ventas
          },
          {
            tipo: "Multitiendas",
            porcentaje: (multitiendas.ventas / total.ventas * 100).toFixed(2),
            valor: multitiendas.ventas
          }
        ].sort((a, b) => b.valor - a.valor); // Ordenar por valor descendente
        
        // Encontrar sucursal con mayor venta
        const todasSucursales = [
          ...supermercados.sucursales.map(s => ({ ...s, tipo: 'Supermercado' })),
          ...ferreterias.sucursales.map(s => ({ ...s, tipo: 'Ferretería' })),
          ...multitiendas.sucursales.map(s => ({ ...s, tipo: 'Multitienda' }))
        ];
        
        const sucursalMayorVenta = todasSucursales.reduce((max, sucursal) => 
          sucursal.ventas > max.ventas ? sucursal : max, 
          { ventas: 0 }
        );
        
        const sucursalMayorMargen = todasSucursales.reduce((max, sucursal) => 
          sucursal.margen > max.margen ? sucursal : max, 
          { margen: 0 }
        );
        
        // Calcular KPIs adicionales
        const margenPromedio = (total.margen).toFixed(2);
        const costoTotal = total.costos;
        const ventaTotal = total.ventas;
        const utilidadTotal = total.utilidad;
        
        // Análisis por tipo de sucursal
        const analisisTipoSucursal = [
          {
            tipo: "Supermercados",
            ventas: supermercados.ventas,
            costos: supermercados.costos,
            utilidad: supermercados.utilidad,
            margen: supermercados.margen.toFixed(2),
            cantidadSucursales: supermercados.sucursales.length,
            promedioVentasPorSucursal: (supermercados.ventas / supermercados.sucursales.length).toFixed(2)
          },
          {
            tipo: "Ferreterías",
            ventas: ferreterias.ventas,
            costos: ferreterias.costos,
            utilidad: ferreterias.utilidad,
            margen: ferreterias.margen.toFixed(2),
            cantidadSucursales: ferreterias.sucursales.length,
            promedioVentasPorSucursal: (ferreterias.ventas / ferreterias.sucursales.length).toFixed(2)
          },
          {
            tipo: "Multitiendas",
            ventas: multitiendas.ventas,
            costos: multitiendas.costos,
            utilidad: multitiendas.utilidad,
            margen: multitiendas.margen.toFixed(2),
            cantidadSucursales: multitiendas.sucursales.length,
            promedioVentasPorSucursal: (multitiendas.ventas / multitiendas.sucursales.length).toFixed(2)
          }
        ];
        
        // Top 5 sucursales por venta
        const topSucursalesPorVenta = [...todasSucursales]
          .sort((a, b) => b.ventas - a.ventas)
          .slice(0, 5);
        
        // Top 5 sucursales por margen
        const topSucursalesPorMargen = [...todasSucursales]
          .sort((a, b) => b.margen - a.margen)
          .slice(0, 5);
        
        // Generar hallazgos basados en los datos reales
        const tipoMayorMargen = analisisTipoSucursal.reduce((max, tipo) => 
          parseFloat(tipo.margen) > parseFloat(max.margen) ? tipo : max,
          { margen: 0 }
        );
        
        const tipoMenorMargen = analisisTipoSucursal.reduce((min, tipo) => 
          parseFloat(tipo.margen) < parseFloat(min.margen) ? tipo : min,
          { margen: 100 }
        );
        
        const diferenciaMargen = parseFloat(tipoMayorMargen.margen) - parseFloat(tipoMenorMargen.margen);
        
        // Porcentaje de contribución de la sucursal con mayor venta
        const porcentajeContribucionMayorVenta = (sucursalMayorVenta.ventas / ventaTotal * 100).toFixed(2);
        
        // Generar hallazgos basados en datos reales
        const hallazgos = [
          {
            titulo: `${tipoMayorMargen.tipo} presenta el mayor margen con ${tipoMayorMargen.margen}%`,
            detalle: `Supera por ${diferenciaMargen.toFixed(2)} puntos porcentuales al tipo de sucursal con menor margen (${tipoMenorMargen.tipo}).`
          },
          {
            titulo: `${sucursalMayorVenta.nombre} genera el ${porcentajeContribucionMayorVenta}% de las ventas totales`,
            detalle: `Con ventas de ${formatCurrency(sucursalMayorVenta.ventas)}, esta sucursal es la de mayor contribución.`
          },
          {
            titulo: `${sucursalMayorMargen.nombre} tiene el mayor margen con ${sucursalMayorMargen.margen.toFixed(2)}%`,
            detalle: `Esta sucursal demuestra la mejor eficiencia operativa.`
          },
          {
            titulo: `${distribucionVentas[0].tipo} representan el ${distribucionVentas[0].porcentaje}% de las ventas`,
            detalle: `Este tipo de sucursal es el principal generador de ingresos.`
          }
        ];
          
        return {
          periodoAnalisis: {
            inicio: startDate.toLocaleDateString(),
            fin: endDate.toLocaleDateString(),
            duracionDias: Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
          },
          kpis: {
            ventaTotal,
            costoTotal,
            utilidadTotal,
            margenPromedio,
          },
          distribucionVentas,
          analisisTipoSucursal,
          sucursalMayorVenta,
          sucursalMayorMargen,
          topSucursalesPorVenta,
          topSucursalesPorMargen,
          cantidadTotalSucursales: todasSucursales.length,
          fechaGeneracion: new Date().toLocaleString(),
          hallazgos
        };
      };
      
      // Generar el reporte
      const reporteGenerado = procesarDatosReporte();
      setReportData(reporteGenerado);
      
    } catch (error) {
      console.error("Error al generar el reporte:", error);
      // En un caso real, mostrarías un mensaje de error al usuario
    } finally {
      setGeneratingReport(false);
    }
  };

  // Manejar la exportación a PDF
  const handleExportPDF = () => {
    if (!reportRef.current) return;
    
    html2canvas(reportRef.current, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Añadir título
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Reporte General', pdfWidth/2, 15, { align: 'center' });
      
      // Añadir subtítulo con fechas
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      const subtitulo = `Período: ${reportData.periodoAnalisis.inicio} al ${reportData.periodoAnalisis.fin}`;
      pdf.text(subtitulo, pdfWidth/2, 22, { align: 'center' });
      
      // Calcular ratio para ajustar la imagen
      const imgRatio = canvas.height / canvas.width;
      const availableWidth = pdfWidth - 20; // Margen de 10mm por lado
      let imgWidth = availableWidth;
      let imgHeight = imgWidth * imgRatio;
      
      // Si la altura calculada es mayor que la página, ajustar proporciones
      if (imgHeight > pdfHeight - 40) { // 40mm para márgenes y título
        imgHeight = pdfHeight - 40;
        imgWidth = imgHeight / imgRatio;
      }
      
      // Añadir la imagen centrada
      const xOffset = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 30, imgWidth, imgHeight);
      
      // Añadir pie de página con fecha de generación
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generado el: ${reportData.fechaGeneracion}`, pdfWidth - 15, pdfHeight - 10, { align: 'right' });
      
      pdf.save(`Reporte_General_${new Date().toISOString().split('T')[0]}.pdf`);
    });
  };
  
  // Alternar la visibilidad de las secciones
  const toggleSection = (section) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Paper elevation={0} 
      sx={{ 
        p: 3, 
        mt: 3, 
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        bgcolor: '#fafafa'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
          <SummarizeOutlined sx={{ mr: 1 }} /> Reporte General Automatizado
        </Typography>
        
        {!reportData ? (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={generateReport}
            disabled={!data || loading || generatingReport}
            startIcon={generatingReport ? <CircularProgress size={20} color="inherit" /> : <BarChartOutlined />}
            sx={{ borderRadius: 2 }}
          >
            {generatingReport ? 'Generando...' : 'Generar Reporte'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportPDF}
            startIcon={<DownloadOutlined />}
            sx={{ borderRadius: 2 }}
          >
            Exportar a PDF
          </Button>
        )}
      </Box>
      
      {!reportData && !generatingReport && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">
            Presiona "Generar Reporte" para crear un análisis automático basado en los datos actuales.
          </Typography>
        </Box>
      )}
      
      {generatingReport && (
        <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Analizando datos...</Typography>
          <Typography color="textSecondary" sx={{ mt: 1 }}>
            Estamos procesando la información para generar un reporte completo
          </Typography>
        </Box>
      )}
      
      {reportData && (
        <Box ref={reportRef} sx={{ mt: 2 }}>
          {/* Encabezado del reporte */}
          <Box sx={{ 
            backgroundColor: '#1976d2', 
            color: 'white', 
            p: 2, 
            borderRadius: '8px 8px 0 0',
            mb: 3
          }}>
            <Typography variant="h6" fontWeight="bold">
              Reporte de Análisis de Ventas y Rendimiento
            </Typography>
            <Typography variant="body2">
              Período: {reportData.periodoAnalisis.inicio} al {reportData.periodoAnalisis.fin} ({reportData.periodoAnalisis.duracionDias} días)
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
              Generado el: {reportData.fechaGeneracion}
            </Typography>
          </Box>
          
          {/* Resumen ejecutivo */}
          <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Resumen Ejecutivo
            </Typography>
            <Typography variant="body1" paragraph>
              Durante el período analizado, se registró un total de ventas de <strong>{formatCurrency(reportData.kpis.ventaTotal)}</strong> con una utilidad de <strong>{formatCurrency(reportData.kpis.utilidadTotal)}</strong> y un margen promedio de <strong>{reportData.kpis.margenPromedio}%</strong>.
            </Typography>
            <Typography variant="body1">
              La distribución de ventas muestra que <strong>{reportData.distribucionVentas[0].tipo}</strong> representa el <strong>{reportData.distribucionVentas[0].porcentaje}%</strong> del total, siendo la categoría con mayor contribución. La sucursal con mejor desempeño es <strong>{reportData.sucursalMayorVenta.nombre}</strong> con ventas de <strong>{formatCurrency(reportData.sucursalMayorVenta.ventas)}</strong>, mientras que <strong>{reportData.sucursalMayorMargen.nombre}</strong> presenta el mejor margen con <strong>{reportData.sucursalMayorMargen.margen.toFixed(2)}%</strong>.
            </Typography>
          </Paper>
          
          {/* KPIs principales */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f0f7ff', height: '100%' }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Ventas Totales</Typography>
                <Typography variant="h5" fontWeight="bold">{formatCurrency(reportData.kpis.ventaTotal)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#fff4f0', height: '100%' }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Costos Totales</Typography>
                <Typography variant="h5" fontWeight="bold">{formatCurrency(reportData.kpis.costoTotal)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fff7', height: '100%' }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Utilidad Total</Typography>
                <Typography variant="h5" fontWeight="bold">{formatCurrency(reportData.kpis.utilidadTotal)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f0ff', height: '100%' }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Margen Promedio</Typography>
                <Typography variant="h5" fontWeight="bold">{reportData.kpis.margenPromedio}%</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Sección de Ventas */}
          <Paper elevation={1} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: '#f5f5f5',
                borderBottom: sectionsOpen.ventas ? '1px solid #e0e0e0' : 'none'
              }}
              onClick={() => toggleSection('ventas')}
              style={{ cursor: 'pointer' }}
            >
              <Typography variant="h6" fontWeight="bold">
                Análisis de Ventas
              </Typography>
              <IconButton size="small">
                {sectionsOpen.ventas ? <KeyboardArrowUpOutlined /> : <KeyboardArrowDownOutlined />}
              </IconButton>
            </Box>
            <Collapse in={sectionsOpen.ventas}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Distribución de Ventas por Tipo de Sucursal
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Tipo de Sucursal</strong></TableCell>
                        <TableCell align="right"><strong>Ventas</strong></TableCell>
                        <TableCell align="right"><strong>% del Total</strong></TableCell>
                        <TableCell align="right"><strong># Sucursales</strong></TableCell>
                        <TableCell align="right"><strong>Promedio por Sucursal</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.analisisTipoSucursal.map((item) => (
                        <TableRow key={item.tipo}>
                          <TableCell>{item.tipo}</TableCell>
                          <TableCell align="right">{formatCurrency(item.ventas)}</TableCell>
                          <TableCell align="right">{
                            ((item.ventas / reportData.kpis.ventaTotal) * 100).toFixed(2)
                          }%</TableCell>
                          <TableCell align="right">{item.cantidadSucursales}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(item.promedioVentasPorSucursal))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Top 5 Sucursales por Ventas
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Sucursal</strong></TableCell>
                        <TableCell><strong>Tipo</strong></TableCell>
                        <TableCell align="right"><strong>Ventas</strong></TableCell>
                        <TableCell align="right"><strong>% del Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.topSucursalesPorVenta.map((sucursal) => (
                        <TableRow key={sucursal.nombre}>
                          <TableCell>{sucursal.nombre}</TableCell>
                          <TableCell>{sucursal.tipo}</TableCell>
                          <TableCell align="right">{formatCurrency(sucursal.ventas)}</TableCell>
                          <TableCell align="right">{
                            ((sucursal.ventas / reportData.kpis.ventaTotal) * 100).toFixed(2)
                          }%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Collapse>
          </Paper>
          
          {/* Sección de Rentabilidad */}
          <Paper elevation={1} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: '#f5f5f5',
                borderBottom: sectionsOpen.rentabilidad ? '1px solid #e0e0e0' : 'none'
              }}
              onClick={() => toggleSection('rentabilidad')}
              style={{ cursor: 'pointer' }}
            >
              <Typography variant="h6" fontWeight="bold">
                Análisis de Rentabilidad
              </Typography>
              <IconButton size="small">
                {sectionsOpen.rentabilidad ? <KeyboardArrowUpOutlined /> : <KeyboardArrowDownOutlined />}
              </IconButton>
            </Box>
            <Collapse in={sectionsOpen.rentabilidad}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Comparación de Márgenes por Tipo de Sucursal
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Tipo de Sucursal</strong></TableCell>
                        <TableCell align="right"><strong>Ventas</strong></TableCell>
                        <TableCell align="right"><strong>Costos</strong></TableCell>
                        <TableCell align="right"><strong>Utilidad</strong></TableCell>
                        <TableCell align="right"><strong>Margen</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.analisisTipoSucursal.map((item) => (
                        <TableRow key={item.tipo}>
                          <TableCell>{item.tipo}</TableCell>
                          <TableCell align="right">{formatCurrency(item.ventas)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.costos)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.utilidad)}</TableCell>
                          <TableCell align="right">{item.margen}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Top 5 Sucursales por Margen
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>Sucursal</strong></TableCell>
                        <TableCell><strong>Tipo</strong></TableCell>
                        <TableCell align="right"><strong>Margen</strong></TableCell>
                        <TableCell align="right"><strong>Ventas</strong></TableCell>
                        <TableCell align="right"><strong>Utilidad</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.topSucursalesPorMargen.map((sucursal) => (
                        <TableRow key={sucursal.nombre}>
                          <TableCell>{sucursal.nombre}</TableCell>
                          <TableCell>{sucursal.tipo}</TableCell>
                          <TableCell align="right">{sucursal.margen.toFixed(2)}%</TableCell>
                          <TableCell align="right">{formatCurrency(sucursal.ventas)}</TableCell>
                          <TableCell align="right">{formatCurrency(sucursal.utilidad)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Collapse>
          </Paper>
          
          {/* Sección de Hallazgos Principales (sin recomendaciones) */}
          <Paper elevation={1} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: '#e3f2fd',
                borderBottom: sectionsOpen.hallazgos ? '1px solid #e0e0e0' : 'none'
              }}
              onClick={() => toggleSection('hallazgos')}
              style={{ cursor: 'pointer' }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#0d47a1' }}>
                Hallazgos Principales
              </Typography>
              <IconButton size="small">
                {sectionsOpen.hallazgos ? <KeyboardArrowUpOutlined /> : <KeyboardArrowDownOutlined />}
              </IconButton>
            </Box>
            <Collapse in={sectionsOpen.hallazgos}>
              <Box sx={{ p: 2 }}>
                <List>
                  {reportData.hallazgos.map((hallazgo, index) => (
                    <ListItem key={index} sx={{ py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <InfoOutlined color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={hallazgo.titulo} 
                        secondary={hallazgo.detalle}
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Collapse>
          </Paper>

          {/* Footer del reporte */}
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mt: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              Este reporte fue generado automáticamente basado en datos del período {reportData.periodoAnalisis.inicio} al {reportData.periodoAnalisis.fin}.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
              La información presentada sirve como herramienta de análisis para la toma de decisiones estratégicas.
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default AutoReport;