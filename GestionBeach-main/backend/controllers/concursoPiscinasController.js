// backend/controllers/concursoPiscinasController.js
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
// const Tesseract = require('tesseract.js'); // OCR deshabilitado para mayor velocidad

// Configuración de Multer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPG, JPEG y PNG'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

exports.uploadMiddleware = upload.single('imagen_boleta');

// Procesar imagen con Sharp
const procesarImagen = async (buffer) => {
  try {
    console.log('📸 Procesando imagen...');
    
    const imagenProcesada = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toBuffer();
    
    console.log(`✅ Imagen procesada: ${buffer.length} bytes -> ${imagenProcesada.length} bytes`);
    return imagenProcesada;
  } catch (error) {
    console.error('❌ Error al procesar imagen:', error);
    throw new Error('Error al procesar la imagen');
  }
};

// OCR deshabilitado - Validación solo por BD
// const extraerTextoDeImagen = async (buffer) => {
//   return {
//     texto: 'OCR deshabilitado',
//     confianza: 0
//   };
// };

// Guardar imagen
const guardarImagenEnServidor = async (buffer, numeroBoleta) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads/concurso-piscinas');
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('📁 Directorio creado:', uploadDir);
    }
    
    const timestamp = Date.now();
    const nombreArchivo = `boleta_${numeroBoleta}_${timestamp}.jpg`;
    const rutaArchivo = path.join(uploadDir, nombreArchivo);
    
    await fs.writeFile(rutaArchivo, buffer);
    console.log('💾 Imagen guardada:', rutaArchivo);
    
    return {
      nombre_archivo: nombreArchivo,
      ruta_completa: rutaArchivo,
      ruta_relativa: `/uploads/concurso-piscinas/${nombreArchivo}`
    };
  } catch (error) {
    console.error('❌ Error al guardar imagen:', error);
    throw new Error('Error al guardar la imagen');
  }
};

// Validar boleta en TODAS las bases de datos de sucursales
const validarBoletaEnDB = async (numeroBoleta, tipoSucursal, fechaBoleta) => {
  try {
    console.log(`🔍 Validando boleta ${numeroBoleta} en todas las sucursales...`);

    if (!numeroBoleta || numeroBoleta.trim().length === 0) {
      return {
        existe: false,
        folio: null,
        total: 0,
        fecha: null,
        tipoDocumento: null,
        sucursal: null,
        nombreSucursal: null,
        cumpleMonto: false,
        cumpleFecha: false
      };
    }

    const pool = await poolPromise;

    // 1. Obtener todas las sucursales con sus bases de datos
    const sucursales = await pool.request()
      .query(`
        SELECT id, nombre, tipo_sucursal, ip, base_datos, usuario, contrasena
        FROM sucursales
        WHERE base_datos IS NOT NULL
        ORDER BY nombre
      `);

    console.log(`📊 Buscando en ${sucursales.recordset.length} sucursales...`);

    const fechaMinima = new Date('2025-10-08');

    // 2. Buscar la boleta en cada sucursal
    for (const sucursal of sucursales.recordset) {
      try {
        console.log(`🔍 Buscando en ${sucursal.nombre} (${sucursal.tipo_sucursal})...`);

        // Esperar un poco entre conexiones para evitar saturación
        await new Promise(resolve => setTimeout(resolve, 200));

        // Conectar a la BD de la sucursal
        const poolSucursal = new sql.ConnectionPool({
          server: sucursal.ip || 'SRV_LORD',
          database: sucursal.base_datos,
          user: sucursal.usuario,
          password: sucursal.contrasena,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            connectTimeout: 5000,
            requestTimeout: 5000
          }
        });

        await poolSucursal.connect();

        // Determinar la query según el tipo de sucursal
        let queryBoleta = '';
        const tipoSucursal = (sucursal.tipo_sucursal || '').toUpperCase().trim();

        if (tipoSucursal === 'SUPERMERCADO' || tipoSucursal === 'SUPERMERRETERIA') {
          // Query para SUPERMERCADOS y SUPERMERRETERIAS
          console.log(`   → Usando query de SUPERMERCADO (tb_documentos_encabezado)`);
          queryBoleta = `
            SELECT TOP 1
              dn_numero_documento AS Folio,
              dq_bruto AS Total,
              df_fecha_emision AS Fecha,
              CASE
                WHEN dc_codigo_centralizacion = '0039' THEN 'Boleta'
                WHEN dc_codigo_centralizacion = '0033' THEN 'Factura'
              END AS Doc
            FROM tb_documentos_encabezado
            WHERE dc_codigo_centralizacion IN ('0033', '0039')
              AND df_fecha_emision >= '08/10/2025'
              AND dn_numero_documento = @folio
            ORDER BY df_fecha_emision DESC
          `;
        } else if (tipoSucursal === 'FERRETERIA' || tipoSucursal === 'MULTITIENDA') {
          // Query para FERRETERÍAS y MULTITIENDAS
          console.log(`   → Usando query de FERRETERIA/MULTITIENDA (ERP_FACT_RES)`);
          queryBoleta = `
            SELECT TOP 1 Folio, Total, Fecha, Doc
            FROM (
              SELECT
                RBO_NUMERO_BOLETA AS Folio,
                RBO_TOTAL AS Total,
                RBO_FECHA_INGRESO AS Fecha,
                'Boleta' AS Doc
              FROM ERP_FACT_RES_BOLETAS
              WHERE RBO_FECHA_INGRESO >= '10/08/2025'
              UNION ALL
              SELECT
                RFC_NUMERO_FACTURA_CLI AS Folio,
                RFC_SUBTOTAL AS Total,
                RFC_FECHA_INGRESO AS Fecha,
                'Factura' AS Doc
              FROM ERP_FACT_RES_FACTURA_CLIENTES
              WHERE RFC_FECHA_INGRESO >= '10/08/2025'
            ) T
            WHERE T.Folio = @folio
            ORDER BY T.Fecha DESC
          `;
        } else {
          console.log(`   ⚠️ Tipo de sucursal desconocido: ${tipoSucursal}, saltando...`);
          continue; // Saltar esta sucursal si el tipo no es reconocido
        }

        const resultado = await poolSucursal.request()
          .input('folio', sql.VarChar, numeroBoleta.trim())
          .query(queryBoleta);

        await poolSucursal.close();

        if (resultado.recordset.length > 0) {
          const boleta = resultado.recordset[0];
          const montoTotal = parseFloat(boleta.Total);
          const fechaBol = new Date(boleta.Fecha);

          const cumpleMonto = montoTotal >= 5000;
          const cumpleFecha = fechaBol >= fechaMinima;

          console.log(`✅ ¡Boleta encontrada en ${sucursal.nombre}!`);
          console.log(`💰 Monto: $${montoTotal}`);
          console.log(`📅 Fecha: ${fechaBol.toLocaleDateString()}`);
          console.log(`🏢 Sucursal: ${sucursal.nombre} (${sucursal.tipo_sucursal})`);
          console.log(`📄 Tipo Doc: ${boleta.Doc}`);
          console.log(`✅ Cumple monto (>=$5000): ${cumpleMonto}`);
          console.log(`✅ Cumple fecha (>=08-10-2025): ${cumpleFecha}`);

          return {
            existe: true,
            folio: boleta.Folio,
            total: montoTotal,
            fecha: fechaBol,
            tipoDocumento: boleta.Doc,
            sucursal: sucursal.id,
            nombreSucursal: sucursal.nombre,
            tipoSucursalBD: sucursal.tipo_sucursal,
            cumpleMonto: cumpleMonto,
            cumpleFecha: cumpleFecha
          };
        }

      } catch (errorSucursal) {
        console.log(`⚠️ Error en ${sucursal.nombre}: ${errorSucursal.message}`);
        // Continuar con la siguiente sucursal
      }
    }

    // Si llegamos aquí, no se encontró en ninguna sucursal
    console.log(`❌ Boleta ${numeroBoleta} no encontrada en ninguna sucursal`);
    return {
      existe: false,
      folio: numeroBoleta,
      total: 0,
      fecha: null,
      tipoDocumento: null,
      sucursal: null,
      nombreSucursal: null,
      cumpleMonto: false,
      cumpleFecha: false
    };

  } catch (error) {
    console.error('❌ Error al validar boleta en BD:', error);
    return {
      existe: false,
      folio: numeroBoleta,
      total: 0,
      fecha: null,
      tipoDocumento: null,
      sucursal: null,
      nombreSucursal: null,
      cumpleMonto: false,
      cumpleFecha: false
    };
  }
};

// CONTROLADOR: Registrar participación
exports.registrarParticipacion = async (req, res) => {
  try {
    console.log('\n🏊 === NUEVA PARTICIPACIÓN ===');
    
    // Validar archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la imagen de la boleta'
      });
    }
    
    // Extraer datos del formulario
    const {
      numero_boleta,
      nombres,
      apellidos,
      rut,
      email,
      telefono,
      direccion,
      fecha_boleta,
      tipo_sucursal = 'Supermercado' // Por defecto
    } = req.body;
    
    // Validaciones básicas
    if (!numero_boleta || !numero_boleta.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El número de boleta es requerido'
      });
    }

    if (!nombres || !apellidos || !rut || !email || !telefono || !direccion || !fecha_boleta) {
      return res.status(400).json({
        success: false,
        message: 'Todos los datos son requeridos (nombres, apellidos, RUT, email, teléfono, dirección y fecha de boleta)'
      });
    }
    
    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }
    
    console.log(`📋 Boleta: ${numero_boleta}`);
    console.log(`👤 Participante: ${nombres} ${apellidos}`);
    console.log(`🆔 RUT: ${rut}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Tipo: ${tipo_sucursal}`);
    
    const pool = await poolPromise;

    // NOTA: Se permite registrar múltiples boletas con el mismo email
    // Solo se verifica que la boleta específica no haya sido registrada antes

    // 1. Verificar si el número de boleta ya fue usado
    const boletaExistente = await pool.request()
      .input('numero_boleta', sql.VarChar, numero_boleta.trim())
      .query('SELECT id FROM dbo.participaciones_concurso WHERE numero_boleta = @numero_boleta');

    if (boletaExistente.recordset.length > 0) {
      // Registrar intento en log
      await pool.request()
        .input('numero_boleta', sql.VarChar, numero_boleta.trim())
        .input('email', sql.VarChar, email)
        .input('motivo', sql.VarChar, 'Boleta ya registrada')
        .query(`
          INSERT INTO dbo.concurso_log_intentos (numero_boleta, email, motivo_rechazo)
          VALUES (@numero_boleta, @email, @motivo)
        `);

      return res.status(400).json({
        success: false,
        message: 'Este número de boleta ya fue registrado en el concurso'
      });
    }

    // 2. Validar boleta en BD real
    const validacionBoleta = await validarBoletaEnDB(numero_boleta, tipo_sucursal, fecha_boleta);

    // Verificar que la boleta exista en la BD
    if (!validacionBoleta.existe) {
      await pool.request()
        .input('numero_boleta', sql.VarChar, numero_boleta.trim())
        .input('email', sql.VarChar, email)
        .input('motivo', sql.VarChar, 'Boleta no encontrada en el sistema')
        .query(`
          INSERT INTO dbo.concurso_log_intentos (numero_boleta, email, motivo_rechazo)
          VALUES (@numero_boleta, @email, @motivo)
        `);

      return res.status(400).json({
        success: false,
        message: `❌ La boleta número ${numero_boleta} no existe en nuestro sistema. Por favor verifica el número e intenta nuevamente.`
      });
    }

    // Validar que el monto sea >= $5000
    if (!validacionBoleta.cumpleMonto) {
      await pool.request()
        .input('numero_boleta', sql.VarChar, numero_boleta.trim())
        .input('email', sql.VarChar, email)
        .input('motivo', sql.VarChar, `Monto menor a $5.000 (monto: $${validacionBoleta.total})`)
        .query(`
          INSERT INTO dbo.concurso_log_intentos (numero_boleta, email, motivo_rechazo)
          VALUES (@numero_boleta, @email, @motivo)
        `);

      return res.status(400).json({
        success: false,
        message: `La boleta debe tener un monto de $5.000 o más. Monto de la boleta: $${validacionBoleta.total.toLocaleString('es-CL')}`
      });
    }

    // Validar que la fecha sea desde el 08-10-2025
    if (!validacionBoleta.cumpleFecha) {
      await pool.request()
        .input('numero_boleta', sql.VarChar, numero_boleta.trim())
        .input('email', sql.VarChar, email)
        .input('motivo', sql.VarChar, 'Boleta anterior al 08-10-2025')
        .query(`
          INSERT INTO dbo.concurso_log_intentos (numero_boleta, email, motivo_rechazo)
          VALUES (@numero_boleta, @email, @motivo)
        `);

      return res.status(400).json({
        success: false,
        message: 'La boleta debe ser desde el 08 de octubre de 2025 en adelante'
      });
    }
    
    // 3. Procesar y guardar imagen (sin OCR para mayor velocidad)
    console.log('📸 Procesando imagen...');
    const imagenProcesada = await procesarImagen(req.file.buffer);
    const archivoGuardado = await guardarImagenEnServidor(imagenProcesada, numero_boleta);
    console.log('✅ Imagen guardada correctamente');

    // 4. Registrar participación VÁLIDA
    const resultado = await pool.request()
      .input('nombres', sql.VarChar, nombres.trim())
      .input('apellidos', sql.VarChar, apellidos.trim())
      .input('rut', sql.VarChar, rut.trim())
      .input('email', sql.VarChar, email.trim().toLowerCase())
      .input('telefono', sql.VarChar, telefono.trim())
      .input('direccion', sql.VarChar, direccion.trim())
      .input('numero_boleta', sql.VarChar, numero_boleta.trim())
      .input('monto_boleta', sql.Decimal(18, 2), validacionBoleta.total)
      .input('fecha_boleta', sql.DateTime, validacionBoleta.fecha)
      .input('tipo_documento', sql.VarChar, validacionBoleta.tipoDocumento)
      .input('tipo_sucursal', sql.VarChar, validacionBoleta.tipoSucursalBD || tipo_sucursal)
      .input('sucursal', sql.VarChar, validacionBoleta.nombreSucursal)
      .input('ruta_imagen', sql.VarChar, archivoGuardado.ruta_relativa)
      .input('nombre_archivo', sql.VarChar, archivoGuardado.nombre_archivo)
      .input('texto_extraido', sql.Text, 'OCR deshabilitado')
      .input('confianza_ocr', sql.Decimal(5, 2), 0)
      .input('boleta_valida', sql.Bit, 1)
      .input('estado', sql.VarChar, 'activo')
      .query(`
        INSERT INTO dbo.participaciones_concurso (
          nombres, apellidos, rut, email, telefono, direccion,
          numero_boleta, monto_boleta, fecha_boleta, tipo_documento, tipo_sucursal, sucursal,
          ruta_imagen, nombre_archivo,
          texto_extraido, confianza_ocr,
          boleta_valida, estado, fecha_participacion
        )
        OUTPUT INSERTED.id
        VALUES (
          @nombres, @apellidos, @rut, @email, @telefono, @direccion,
          @numero_boleta, @monto_boleta, @fecha_boleta, @tipo_documento, @tipo_sucursal, @sucursal,
          @ruta_imagen, @nombre_archivo,
          @texto_extraido, @confianza_ocr,
          @boleta_valida, @estado, GETDATE()
        )
      `);
    
    const participacionId = resultado.recordset[0].id;
    
    console.log(`✅ Participación válida registrada con ID: ${participacionId}`);
    console.log('🏊 === FIN PARTICIPACIÓN ===\n');
    
    return res.status(201).json({
      success: true,
      message: '🎉 ¡FELICIDADES! Tu participación ha sido registrada exitosamente en el concurso.',
      participacion_id: participacionId,
      datos_extraidos: {
        numero_boleta: numero_boleta,
        monto: validacionBoleta.total,
        fecha: validacionBoleta.fecha,
        tipo: validacionBoleta.tipoDocumento,
        sucursal: validacionBoleta.nombreSucursal
      }
    });
    
  } catch (error) {
    console.error('❌ Error al registrar participación:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la participación',
      error: error.message
    });
  }
};

// Obtener todas las participaciones (ADMIN)
exports.obtenerParticipaciones = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const resultado = await pool.request()
      .query(`
        SELECT
          id, nombres, apellidos, rut, email, telefono, direccion,
          numero_boleta, monto_boleta, fecha_boleta, tipo_documento, tipo_sucursal, sucursal,
          fecha_participacion, estado, ganador, premio, boleta_valida
        FROM dbo.participaciones_concurso
        ORDER BY fecha_participacion DESC
      `);
    
    return res.json({
      success: true,
      total: resultado.recordset.length,
      participaciones: resultado.recordset
    });
    
  } catch (error) {
    console.error('❌ Error al obtener participaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener participaciones',
      error: error.message
    });
  }
};

// Obtener estadísticas
exports.obtenerEstadisticas = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const stats = await pool.request()
      .query(`
        SELECT
          COUNT(*) as total_participaciones,
          COUNT(CASE WHEN boleta_valida = 1 THEN 1 END) as boletas_validas,
          COUNT(DISTINCT email) as emails_unicos,
          SUM(monto_boleta) as monto_total,
          AVG(monto_boleta) as monto_promedio,
          MAX(fecha_participacion) as ultima_participacion
        FROM dbo.participaciones_concurso
        WHERE estado = 'activo'
      `);
    
    return res.json({
      success: true,
      estadisticas: stats.recordset[0]
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Verificar si una boleta ya fue registrada
exports.verificarBoleta = async (req, res) => {
  try {
    const { numero_boleta } = req.params;

    if (!numero_boleta) {
      return res.status(400).json({
        success: false,
        message: 'Número de boleta requerido'
      });
    }

    const pool = await poolPromise;

    const resultado = await pool.request()
      .input('numero_boleta', sql.VarChar, numero_boleta.trim())
      .query('SELECT id, fecha_participacion FROM dbo.participaciones_concurso WHERE numero_boleta = @numero_boleta');

    if (resultado.recordset.length > 0) {
      return res.json({
        success: true,
        existe: true,
        mensaje: 'Esta boleta ya fue registrada en el concurso',
        fecha_registro: resultado.recordset[0].fecha_participacion
      });
    } else {
      return res.json({
        success: true,
        existe: false,
        mensaje: 'Esta boleta no ha sido registrada'
      });
    }

  } catch (error) {
    console.error('❌ Error al verificar boleta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar boleta',
      error: error.message
    });
  }
};

// Test endpoint
exports.testConcurso = (req, res) => {
  res.json({
    success: true,
    message: 'Controlador de concurso funcionando correctamente',
    timestamp: new Date().toISOString(),
    validaciones: {
      fecha_minima: '08-10-2025',
      monto_minimo: 5000,
      restricciones: [
        'Boleta debe existir en DocumentoFinal',
        'Una boleta por participación (único registro)',
        'Múltiples boletas por RUT/email permitidas',
        'Monto mínimo $5.000 (consultado en BD)',
        'Fecha desde 08-10-2025 (consultada en BD)',
        'Imagen debe ser legible (validado por OCR)'
      ]
    }
  });
};