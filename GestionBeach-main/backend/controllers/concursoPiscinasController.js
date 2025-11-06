// backend/controllers/concursoPiscinasController.js
const { sql, poolPromise } = require('../config/db');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const Tesseract = require('tesseract.js');

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

// Procesar imagen con Sharp - OPTIMIZADO PARA OCR
const procesarImagen = async (buffer) => {
  try {
    console.log('📸 Procesando imagen con optimizaciones AGRESIVAS para OCR...');

    const imagenProcesada = await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Convertir a escala de grises para mejor OCR
      .grayscale()
      // Aumentar contraste dramáticamente
      .normalize()
      // Nitidez agresiva
      .sharpen({ sigma: 2 })
      // Aumentar brillo ligeramente
      .modulate({
        brightness: 1.1,
        saturation: 0
      })
      // Convertir a PNG para máxima calidad
      .png({
        quality: 100,
        compressionLevel: 0
      })
      .toBuffer();

    console.log(`✅ Imagen OPTIMIZADA: ${buffer.length} bytes -> ${imagenProcesada.length} bytes`);
    console.log('✅ Aplicado: Escala de grises + Normalización + Nitidez x2 + Brillo +10%');
    return imagenProcesada;
  } catch (error) {
    console.error('❌ Error al procesar imagen:', error);
    throw new Error('Error al procesar la imagen');
  }
};

// Extraer texto de imagen con OCR - MÚLTIPLES INTENTOS AGRESIVOS
const extraerTextoDeImagen = async (buffer) => {
  try {
    console.log('🔍🔍🔍 Iniciando OCR AGRESIVO con múltiples configuraciones...');

    const resultados = [];

    // INTENTO 1: Modo números agresivo
    console.log('📋 INTENTO 1: Modo SINGLE_LINE para números');
    try {
      const { data: data1 } = await Tesseract.recognize(
        buffer,
        'spa',
        {
          logger: info => {
            if (info.status === 'recognizing text') {
              console.log(`OCR-1 Progreso: ${Math.round(info.progress * 100)}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
          tessedit_char_whitelist: '0123456789NnoOBbLlEeTtAaFfIi.:- °#',
          tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
        }
      );
      resultados.push({ texto: data1.text, confianza: data1.confidence, modo: 'SINGLE_LINE' });
      console.log(`📝 RESULTADO 1: "${data1.text}" (Confianza: ${data1.confidence.toFixed(2)}%)`);
    } catch (e) {
      console.error('❌ Error en intento 1:', e.message);
    }

    // INTENTO 2: Modo bloque
    console.log('📋 INTENTO 2: Modo SINGLE_BLOCK');
    try {
      const { data: data2 } = await Tesseract.recognize(
        buffer,
        'spa',
        {
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: '0123456789NnoOBbLlEeTtAaFfIi.:- °#',
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        }
      );
      resultados.push({ texto: data2.text, confianza: data2.confidence, modo: 'SINGLE_BLOCK' });
      console.log(`📝 RESULTADO 2: "${data2.text}" (Confianza: ${data2.confidence.toFixed(2)}%)`);
    } catch (e) {
      console.error('❌ Error en intento 2:', e.message);
    }

    // INTENTO 3: Auto sin restricciones
    console.log('📋 INTENTO 3: Modo AUTO sin whitelist');
    try {
      const { data: data3 } = await Tesseract.recognize(
        buffer,
        'spa',
        {
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
        }
      );
      resultados.push({ texto: data3.text, confianza: data3.confidence, modo: 'AUTO' });
      console.log(`📝 RESULTADO 3: "${data3.text}" (Confianza: ${data3.confidence.toFixed(2)}%)`);
    } catch (e) {
      console.error('❌ Error en intento 3:', e.message);
    }

    // INTENTO 4: Modo sparse text (texto disperso)
    console.log('📋 INTENTO 4: Modo SPARSE_TEXT');
    try {
      const { data: data4 } = await Tesseract.recognize(
        buffer,
        'spa',
        {
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          tessedit_char_whitelist: '0123456789NnoO.:- ',
        }
      );
      resultados.push({ texto: data4.text, confianza: data4.confidence, modo: 'SPARSE_TEXT' });
      console.log(`📝 RESULTADO 4: "${data4.text}" (Confianza: ${data4.confidence.toFixed(2)}%)`);
    } catch (e) {
      console.error('❌ Error en intento 4:', e.message);
    }

    if (resultados.length === 0) {
      console.error('❌ TODOS LOS INTENTOS FALLARON');
      return { texto: '', confianza: 0, textoCompleto: '' };
    }

    // Combinar todos los textos
    const textoCompleto = resultados.map(r => r.texto).join('\n');
    const confianzaPromedio = resultados.reduce((sum, r) => sum + r.confianza, 0) / resultados.length;

    console.log('========================================');
    console.log('📝 TEXTO COMBINADO DE TODOS LOS INTENTOS:');
    console.log(textoCompleto);
    console.log('========================================');
    console.log(`💯 Confianza promedio: ${confianzaPromedio.toFixed(2)}%`);

    // Usar el resultado con mayor confianza como principal
    const mejorResultado = resultados.reduce((best, current) =>
      current.confianza > best.confianza ? current : best
    );

    console.log(`🏆 MEJOR RESULTADO: Modo ${mejorResultado.modo} con ${mejorResultado.confianza.toFixed(2)}%`);

    return {
      texto: textoCompleto,
      confianza: confianzaPromedio,
      textoCompleto: textoCompleto,
      mejorTexto: mejorResultado.texto
    };
  } catch (error) {
    console.error('❌ Error CRÍTICO en OCR:', error);
    return {
      texto: '',
      confianza: 0,
      textoCompleto: ''
    };
  }
};

// Extraer número de boleta del texto OCR - MODO AGRESIVO
const extraerNumeroBoleta = (textoOCR) => {
  try {
    console.log('🔍🔍🔍 Buscando número de boleta AGRESIVAMENTE...');
    console.log('Texto original completo:', textoOCR);

    // Limpiar texto
    let textoLimpio = textoOCR
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Texto limpio:', textoLimpio);

    // PATRONES EN ORDEN DE PRIORIDAD (de más específico a más general)
    const patrones = [
      // Patrones muy específicos primero
      /(?:NO|N|n|no)[°O\s.:_-]*(\d{5,})/i,           // No 123456, N° 123456, NO: 123456
      /(?:BOLETA|boleta)[\s:]*(\d{5,})/i,            // BOLETA 123456
      /(?:FOLIO|folio)[\s:]*(\d{5,})/i,              // FOLIO 123456
      /(?:NUMERO|numero|NUM|num)[\s:]*(\d{5,})/i,    // NUMERO 123456

      // Patrones más flexibles
      /[Nn][°oO\s.:-]{0,3}(\d{5,})/,                 // N 123456, n°123456
      /(\d{7,})/,                                     // 7 o más dígitos
      /(\d{6})/,                                      // Exactamente 6 dígitos
      /(\d{5})/,                                      // Exactamente 5 dígitos (más arriesgado)

      // FALLBACK ULTRA AGRESIVO: cualquier secuencia de números
      /(\d{4,})/,                                     // 4 o más dígitos (última opción)
    ];

    console.log(`📋 Probando ${patrones.length} patrones diferentes...`);

    // Intentar cada patrón
    for (let i = 0; i < patrones.length; i++) {
      const patron = patrones[i];
      const match = textoLimpio.match(patron);

      if (match && match[1]) {
        const numeroEncontrado = match[1].trim();

        // Validar que sea solo dígitos
        if (/^\d+$/.test(numeroEncontrado)) {
          console.log(`✅ ÉXITO con patrón ${i + 1}: "${numeroEncontrado}"`);
          console.log(`📝 Patrón usado: ${patron}`);
          return numeroEncontrado;
        }
      }
    }

    // Si no se encontró con patrones, buscar TODOS los números en el texto
    console.log('⚠️ Patrones fallaron, buscando TODOS los números en el texto...');
    const todosLosNumeros = textoLimpio.match(/\d+/g);

    if (todosLosNumeros && todosLosNumeros.length > 0) {
      console.log('📊 Números encontrados:', todosLosNumeros);

      // Priorizar números más largos
      const numeroMasLargo = todosLosNumeros.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );

      if (numeroMasLargo && numeroMasLargo.length >= 4) {
        console.log(`✅ Usando número más largo encontrado: "${numeroMasLargo}"`);
        return numeroMasLargo;
      }
    }

    console.log('❌ NO SE ENCONTRÓ NINGÚN NÚMERO DE BOLETA');
    console.log('💡 Texto recibido:', textoOCR);
    return null;
  } catch (error) {
    console.error('❌ Error al extraer número de boleta:', error);
    return null;
  }
};

// Generar variaciones de un número considerando confusiones comunes del OCR
const generarVariacionesNumero = (numeroOriginal) => {
  if (!numeroOriginal || numeroOriginal.length === 0) {
    return [];
  }

  console.log(`🔄 Generando variaciones para: ${numeroOriginal}`);

  // Mapeo de caracteres con confusión común en OCR
  const confusiones = {
    '5': ['8', '6', 'S'],
    '8': ['5', '0', 'B'],
    '0': ['8', 'O'],
    '1': ['7'],
    '6': ['5'],
    '3': ['8'],
    '7': ['1'],
  };

  const variaciones = new Set();
  variaciones.add(numeroOriginal); // Agregar el original

  // Generar variaciones para cada posición
  for (let i = 0; i < numeroOriginal.length; i++) {
    const char = numeroOriginal[i];
    const posiblesReemplazos = confusiones[char];

    if (posiblesReemplazos) {
      for (const reemplazo of posiblesReemplazos) {
        // Reemplazar solo ese carácter
        const variacion = numeroOriginal.substring(0, i) + reemplazo + numeroOriginal.substring(i + 1);
        // Solo agregar si es numérico
        if (/^\d+$/.test(variacion)) {
          variaciones.add(variacion);
        }
      }
    }
  }

  // Convertir Set a Array y limitar a las 5 más probables
  const resultado = Array.from(variaciones).slice(0, 5);
  console.log(`✅ Variaciones generadas (${resultado.length}):`, resultado);

  return resultado;
};

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
      direccion
    } = req.body;

    // Validaciones básicas
    if (!numero_boleta || !numero_boleta.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El número de boleta es requerido'
      });
    }

    if (!nombres || !apellidos || !rut || !email || !telefono || !direccion) {
      return res.status(400).json({
        success: false,
        message: 'Todos los datos son requeridos (nombres, apellidos, RUT, email, teléfono y dirección)'
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

    // 2. Validar boleta en BD real (busca automáticamente en todas las sucursales)
    console.log('🔍 Buscando boleta en todas las sucursales...');
    const validacionBoleta = await validarBoletaEnDB(numero_boleta, null, null);

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
      .input('tipo_sucursal', sql.VarChar, validacionBoleta.tipoSucursalBD)
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

// Obtener participantes para sorteo (solo activos y válidos)
exports.obtenerParticipantesSorteo = async (req, res) => {
  try {
    const pool = await poolPromise;

    const resultado = await pool.request()
      .query(`
        SELECT
          id,
          nombres,
          apellidos,
          rut,
          email,
          telefono,
          numero_boleta,
          fecha_participacion
        FROM dbo.participaciones_concurso
        WHERE estado = 'activo'
          AND boleta_valida = 1
          AND (ganador IS NULL OR ganador = 0)
        ORDER BY fecha_participacion ASC
      `);

    return res.json({
      success: true,
      total: resultado.recordset.length,
      participantes: resultado.recordset
    });

  } catch (error) {
    console.error('❌ Error al obtener participantes para sorteo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener participantes',
      error: error.message
    });
  }
};

// Marcar ganador del sorteo
exports.marcarGanador = async (req, res) => {
  try {
    const { participante_id, premio } = req.body;

    if (!participante_id) {
      return res.status(400).json({
        success: false,
        message: 'ID de participante requerido'
      });
    }

    const pool = await poolPromise;

    // Actualizar ganador
    const resultado = await pool.request()
      .input('id', sql.Int, participante_id)
      .input('premio', sql.VarChar, premio || 'Gran Premio')
      .query(`
        UPDATE dbo.participaciones_concurso
        SET ganador = 1,
            premio = @premio,
            fecha_sorteo = GETDATE()
        WHERE id = @id
      `);

    // Obtener datos del ganador
    const ganador = await pool.request()
      .input('id', sql.Int, participante_id)
      .query(`
        SELECT nombres, apellidos, email, numero_boleta, premio
        FROM dbo.participaciones_concurso
        WHERE id = @id
      `);

    console.log(`🎉 GANADOR REGISTRADO: ${ganador.recordset[0].nombres} ${ganador.recordset[0].apellidos}`);

    return res.json({
      success: true,
      message: 'Ganador registrado exitosamente',
      ganador: ganador.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error al marcar ganador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al marcar ganador',
      error: error.message
    });
  }
};

// NUEVO: Procesar OCR con coordenadas del crop
exports.procesarOCRConCrop = async (req, res) => {
  try {
    console.log('\n🔍 === PROCESANDO OCR CON CROP ===');

    // Validar archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió la imagen'
      });
    }

    // Obtener coordenadas del crop del body
    const { cropX, cropY, cropWidth, cropHeight } = req.body;

    console.log(`📐 Coordenadas del crop: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);

    let imagenParaOCR = req.file.buffer;

    // Si cropX > 0, entonces hay coordenadas válidas para recortar
    // Si cropX = 0, la imagen ya viene recortada del frontend
    if (cropX && parseInt(cropX) > 0 && cropY && cropWidth && cropHeight) {
      console.log('✂️ Recortando área seleccionada para OCR...');

      imagenParaOCR = await sharp(req.file.buffer)
        .extract({
          left: parseInt(cropX),
          top: parseInt(cropY),
          width: parseInt(cropWidth),
          height: parseInt(cropHeight)
        })
        // PREPROCESAMIENTO AGRESIVO PARA OCR
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .grayscale()              // Escala de grises
        .normalize()              // Normalizar contraste
        .sharpen({ sigma: 2 })    // Nitidez agresiva
        .modulate({
          brightness: 1.1,        // Aumentar brillo 10%
          saturation: 0
        })
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      console.log('✅ Área recortada + preprocesamiento AGRESIVO aplicado');
    } else {
      console.log('📸 Imagen ya viene recortada, aplicando preprocesamiento AGRESIVO...');

      // Preprocesamiento completo en imagen ya recortada
      imagenParaOCR = await sharp(req.file.buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .grayscale()              // Escala de grises
        .normalize()              // Normalizar contraste
        .sharpen({ sigma: 2 })    // Nitidez agresiva
        .modulate({
          brightness: 1.1,        // Aumentar brillo 10%
          saturation: 0
        })
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      console.log('✅ Preprocesamiento AGRESIVO aplicado: Grises + Normalize + Sharpen x2 + Brillo');
    }

    // Ejecutar OCR sobre el área seleccionada
    console.log('🔍 Ejecutando OCR...');
    const resultadoOCR = await extraerTextoDeImagen(imagenParaOCR);

    console.log('\n========================================');
    console.log('📄 TEXTO COMPLETO DETECTADO POR OCR:');
    console.log('========================================');
    console.log(resultadoOCR.texto);
    console.log('========================================');
    console.log(`💯 Confianza OCR: ${resultadoOCR.confianza.toFixed(2)}%`);
    console.log('========================================\n');

    // Extraer número de boleta
    const numeroBoleta = extraerNumeroBoleta(resultadoOCR.texto);

    console.log(`🎯 NÚMERO DE BOLETA EXTRAÍDO: ${numeroBoleta || '❌ NO DETECTADO'}`);
    console.log(`💯 Confianza OCR: ${resultadoOCR.confianza.toFixed(2)}%`);
    console.log('========================================\n');

    // Simplemente retornar el número con mejor confianza
    // Sin variaciones ni confirmación - experiencia transparente para el usuario
    return res.json({
      success: true,
      numero_boleta: numeroBoleta,
      detectado: numeroBoleta !== null,
      // Datos técnicos solo para logs internos, no se mostrarán al usuario
      _internal: {
        texto_completo: resultadoOCR.texto,
        confianza: resultadoOCR.confianza
      }
    });

  } catch (error) {
    console.error('❌ Error al procesar OCR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar OCR',
      error: error.message
    });
  }
};

// NUEVO: Validar boleta sin registrar (solo para confirmar existencia)
exports.validarBoletaSinRegistrar = async (req, res) => {
  try {
    const { numero_boleta } = req.body;

    if (!numero_boleta || !numero_boleta.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Número de boleta requerido'
      });
    }

    console.log(`🔍 Validando boleta ${numero_boleta} (sin registrar)...`);

    // Validar en BD
    const validacion = await validarBoletaEnDB(numero_boleta.trim(), null, null);

    if (validacion.existe) {
      console.log(`✅ Boleta encontrada: $${validacion.total} - ${validacion.nombreSucursal}`);

      // Verificar si ya fue registrada en el concurso
      const pool = await poolPromise;
      const yaRegistrada = await pool.request()
        .input('numero_boleta', sql.VarChar, numero_boleta.trim())
        .query('SELECT id FROM dbo.participaciones_concurso WHERE numero_boleta = @numero_boleta');

      return res.json({
        success: true,
        existe: true,
        ya_registrada: yaRegistrada.recordset.length > 0,
        datos: {
          numero: validacion.folio,
          monto: validacion.total,
          fecha: validacion.fecha,
          tipo: validacion.tipoDocumento,
          sucursal: validacion.nombreSucursal,
          cumple_monto: validacion.cumpleMonto,
          cumple_fecha: validacion.cumpleFecha,
          valida: validacion.cumpleMonto && validacion.cumpleFecha && yaRegistrada.recordset.length === 0
        }
      });
    } else {
      console.log(`❌ Boleta no encontrada en BD`);
      return res.json({
        success: true,
        existe: false,
        ya_registrada: false,
        datos: null
      });
    }

  } catch (error) {
    console.error('❌ Error al validar boleta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar boleta',
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