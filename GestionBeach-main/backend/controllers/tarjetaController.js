// backend/controllers/tarjetaController.js
const { sql, poolPromise } = require('../config/db');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Obtener código de barras de una sucursal
exports.getBarcode = async (req, res) => {
  try {
    const { sucursal_id } = req.query;
    
    if (!sucursal_id) {
      return res.status(400).json({ message: 'ID de sucursal requerido' });
    }
    
    // Obtener pool de conexión
    const pool = await poolPromise;
    
    // Obtener información de la sucursal
    const sucursalResult = await pool.request()
      .input('sucursalId', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursalId');
    
    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }
    
    const sucursal = sucursalResult.recordset[0];
    
    // Conectar a la base de datos de la sucursal
    const configSucursal = {
      user: sucursal.usuario,
      password: sucursal.contrasena,
      server: sucursal.ip,
      database: sucursal.base_datos,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
    
    const poolSucursal = await new sql.ConnectionPool(configSucursal).connect();
    
    // Consultar el código de barras
    const result = await poolSucursal.request()
      .query("SELECT dg_password AS CodigoBarras FROM tb_seguridad WHERE dg_login = 'admin'");
    
    // Cerrar conexión
    await poolSucursal.close();
    
    if (result.recordset.length > 0) {
      return res.json({ barcode: result.recordset[0].CodigoBarras });
    } else {
      return res.status(404).json({ message: 'No se encontró el código de barras' });
    }
  } catch (error) {
    console.error('Error al obtener código de barras:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Generar tarjeta de empleado
exports.generarTarjeta = async (req, res) => {
  try {
    // Verificar datos
    if (!req.body.nombre || !req.body.cargo || !req.body.codigo_barras || !req.file) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }
    
    const { nombre, cargo, codigo_barras } = req.body;
    const foto = req.file;
    
    // Crear un directorio para archivos temporales si no existe
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Crear un PDF simple
    const pdfPath = path.join(tempDir, `tarjeta_${Date.now()}.pdf`);
    const doc = new PDFDocument({ size: [242, 153] }); // Tamaño aproximado de tarjeta
    const stream = fs.createWriteStream(pdfPath);
    
    doc.pipe(stream);
    
    // Diseñar la tarjeta (versión simplificada)
    doc.rect(5, 5, 232, 143).fillAndStroke('#f7f7f7', '#ccc');
    
    // Titulo
    doc.fontSize(14)
       .fillColor('#1c3d63')
       .text('TARJETA DE EMPLEADO', 70, 15);
    
    // Foto (si está disponible)
    if (foto && fs.existsSync(foto.path)) {
      doc.image(foto.path, 15, 35, { width: 60, height: 60 });
    } else {
      doc.rect(15, 35, 60, 60).stroke();
      doc.fontSize(8).text('No hay foto', 25, 55);
    }
    
    // Datos del empleado
    doc.fontSize(12)
       .fillColor('#1c3d63')
       .text('Nombre:', 85, 45)
       .fontSize(11)
       .fillColor('#333')
       .text(nombre.toUpperCase(), 85, 60);
    
    doc.fontSize(12)
       .fillColor('#1c3d63')
       .text('Cargo:', 85, 75)
       .fontSize(11)
       .fillColor('#ff5722')
       .text(cargo.toUpperCase(), 85, 90);
    
    // Código de barras (simulado)
    doc.rect(15, 110, 212, 30).fillAndStroke('#fff', '#ccc');
    doc.fontSize(8)
       .fillColor('#333')
       .text('Código de barras: ' + codigo_barras, 70, 123);
    
    doc.end();
    
    // Esperar a que se complete la escritura
    stream.on('finish', () => {
      // Enviar el PDF como respuesta
      const fileStream = fs.createReadStream(pdfPath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="tarjeta_${nombre.replace(/\s+/g, '_')}.pdf"`);
      
      fileStream.pipe(res);
      
      // Limpiar archivos temporales cuando se complete la respuesta
      res.on('finish', () => {
        fs.unlinkSync(pdfPath);
        if (foto && fs.existsSync(foto.path)) {
          fs.unlinkSync(foto.path);
        }
      });
    });
  } catch (error) {
    console.error('Error al generar tarjeta:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};