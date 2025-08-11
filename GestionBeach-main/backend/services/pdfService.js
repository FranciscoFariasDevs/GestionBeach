// backend/services/pdfService.js
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    // Directorio para guardar los PDFs generados
    this.outputDir = path.join(__dirname, '../public/reports');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log('✅ Directorio de reportes creado:', this.outputDir);
    }
  }

  // Generar nombre de archivo único
  generateFileName(tipo) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tipo}_${timestamp}.pdf`;
  }

  // Obtener ruta completa del archivo
  getFilePath(filename) {
    return path.join(this.outputDir, filename);
  }

  // Generar contenido HTML básico para PDF
  generateHTMLContent(productos, options = {}) {
    const {
      titulo = 'REPORTE DE INVENTARIO',
      criterio = '',
      tipo = 'general'
    } = options;

    const fecha = new Date().toLocaleDateString('es-CL');
    const hora = new Date().toLocaleTimeString('es-CL');

    // Estadísticas
    const stats = {
      total: productos.length,
      criticos: productos.filter(p => p.diasVencimiento <= 3).length,
      warnings: productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7).length,
      promociones: productos.filter(p => p.promocion).length,
      conTemperatura: productos.filter(p => p.temperatura).length
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${titulo}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #f37d16;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #333;
            margin: 0;
            font-size: 24px;
        }
        
        .header .subtitle {
            color: #666;
            margin: 10px 0;
            font-size: 14px;
        }
        
        .info-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        
        .info-item {
            margin: 5px 0;
        }
        
        .info-item strong {
            color: #333;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 12px;
        }
        
        .critico { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
        .info { color: #1976d2; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f37d16;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .row-critico {
            background-color: #ffebee !important;
        }
        
        .row-warning {
            background-color: #fff3e0 !important;
        }
        
        .row-normal {
            background-color: #e8f5e8 !important;
        }
        
        .promocion-badge {
            background: #e91e63;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
        }
        
        .temperatura-info {
            font-style: italic;
            color: #666;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        
        @media print {
            body { margin: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${titulo}</h1>
        <div class="subtitle">Sistema de Gestión de Inventario y Trazabilidad</div>
    </div>
    
    <div class="info-section">
        <div>
            <div class="info-item"><strong>Fecha:</strong> ${fecha}</div>
            <div class="info-item"><strong>Hora:</strong> ${hora}</div>
            ${criterio ? `<div class="info-item"><strong>Criterio:</strong> ${criterio}</div>` : ''}
        </div>
        <div>
            <div class="info-item"><strong>Total productos:</strong> ${stats.total}</div>
            <div class="info-item"><strong>Generado por:</strong> Sistema automático</div>
        </div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number critico">${stats.criticos}</div>
            <div class="stat-label">Críticos (≤3 días)</div>
        </div>
        <div class="stat-card">
            <div class="stat-number warning">${stats.warnings}</div>
            <div class="stat-label">Advertencia (4-7 días)</div>
        </div>
        <div class="stat-card">
            <div class="stat-number info">${stats.promociones}</div>
            <div class="stat-label">En Promoción</div>
        </div>
        <div class="stat-card">
            <div class="stat-number success">${stats.conTemperatura}</div>
            <div class="stat-label">Con Control Temperatura</div>
        </div>
    </div>
    
    ${productos.length > 0 ? `
    <table>
        <thead>
            <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Fecha Vencimiento</th>
                <th>Días Restantes</th>
                <th>Temperatura</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${productos.map(producto => {
                const rowClass = producto.diasVencimiento <= 3 ? 'row-critico' : 
                               producto.diasVencimiento <= 7 ? 'row-warning' : 'row-normal';
                
                return `
                <tr class="${rowClass}">
                    <td><strong>${producto.codigo}</strong></td>
                    <td>${producto.nombre}</td>
                    <td>${producto.fechaVencimiento || 'N/A'}</td>
                    <td>
                        <strong>${producto.diasVencimiento}</strong> días
                    </td>
                    <td class="temperatura-info">
                        ${producto.temperatura || 'No requiere'}
                    </td>
                    <td>
                        ${producto.promocion ? '<span class="promocion-badge">PROMOCIÓN</span>' : ''}
                        ${producto.diasVencimiento <= 3 ? '<span style="color: #d32f2f;">CRÍTICO</span>' : 
                          producto.diasVencimiento <= 7 ? '<span style="color: #f57c00;">ADVERTENCIA</span>' : 
                          '<span style="color: #388e3c;">NORMAL</span>'}
                    </td>
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>
    ` : `
    <div style="text-align: center; padding: 40px; color: #666;">
        <h3>No hay productos que mostrar</h3>
        <p>No se encontraron productos que cumplan con los criterios especificados.</p>
    </div>
    `}
    
    <div class="footer">
        <p>Sistema de Gestión de Inventario - Reporte generado automáticamente</p>
        <p>Este documento contiene información confidencial de la empresa</p>
    </div>
</body>
</html>
    `;
  }

  // Método para generar PDF simulado (sin dependencias externas)
  async generateMockPDF(productos, options = {}) {
    const filename = this.generateFileName(options.tipo || 'reporte');
    const filePath = this.getFilePath(filename);
    
    // Generar contenido HTML
    const htmlContent = this.generateHTMLContent(productos, options);
    
    // Guardar como HTML (simulando PDF)
    fs.writeFileSync(filePath.replace('.pdf', '.html'), htmlContent);
    
    // Crear un archivo de texto simulando PDF
    const pdfContent = `
%PDF-SIMULADO
Reporte: ${options.titulo || 'Inventario'}
Fecha: ${new Date().toLocaleDateString('es-CL')}
Productos: ${productos.length}

Este es un PDF simulado para desarrollo.
En producción, aquí iría el contenido real del PDF.

Productos incluidos:
${productos.map(p => `- ${p.nombre} (${p.codigo}) - Vence: ${p.fechaVencimiento}`).join('\n')}

%FIN-PDF-SIMULADO
    `;
    
    fs.writeFileSync(filePath, pdfContent);
    
    return {
      success: true,
      filename: filename,
      url: `/api/inventario/download/${filename}`,
      htmlUrl: `/api/inventario/download/${filename.replace('.pdf', '.html')}`,
      productos: productos.length,
      path: filePath
    };
  }

  // Generar reporte de vencimientos
  async generateExpirationReport(productos, diasAlerta) {
    console.log('📄 Generando reporte de vencimientos...');
    
    return await this.generateMockPDF(productos, {
      titulo: 'REPORTE DE PRODUCTOS PRÓXIMOS A VENCER',
      criterio: `Productos que vencen en ${diasAlerta} días o menos`,
      tipo: 'vencimientos'
    });
  }

  // Generar reporte completo de inventario
  async generateInventoryReport(productos) {
    console.log('📄 Generando reporte completo de inventario...');
    
    return await this.generateMockPDF(productos, {
      titulo: 'REPORTE COMPLETO DE INVENTARIO',
      criterio: 'Todos los productos con datos extendidos',
      tipo: 'inventario'
    });
  }

  // Generar reporte de promociones
  async generatePromotionReport(productos) {
    console.log('📄 Generando reporte de promociones...');
    
    return await this.generateMockPDF(productos, {
      titulo: 'REPORTE DE PRODUCTOS EN PROMOCIÓN',
      criterio: 'Productos marcados para promoción especial',
      tipo: 'promociones'
    });
  }

  // Limpiar archivos antiguos (opcional)
  cleanOldFiles(maxAgeHours = 24) {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      files.forEach(file => {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo antiguo eliminado: ${file}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ Error al limpiar archivos antiguos:', error.message);
    }
  }
}

module.exports = new PDFService();