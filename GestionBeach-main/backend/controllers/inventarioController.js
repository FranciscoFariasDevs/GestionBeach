// backend/controllers/InventarioController.js
const { sql, poolPromise } = require('../config/db'); // GestionBeach
const { sql: sqlProd, poolPromise: poolPromiseProd } = require('../config/dbp'); // ERIZ (productos)

// Importar servicios con manejo de errores
let whatsappService = null;
let pdfService = null;

try {
  whatsappService = require('../services/whatsappService');
  console.log('✅ WhatsApp Service cargado');
} catch (error) {
  console.warn('⚠️ WhatsApp Service no disponible:', error.message);
}

try {
  pdfService = require('../services/pdfService');
  console.log('✅ PDF Service cargado');
} catch (error) {
  console.warn('⚠️ PDF Service no disponible, creando mock...');
  // Crear un mock básico si no existe el servicio
  pdfService = {
    generateExpirationReport: async (productos, dias) => {
      console.log('📄 Mock PDF: Generando reporte de vencimientos...');
      return {
        success: true,
        filename: `vencimientos_${Date.now()}.pdf`,
        url: '/api/inventario/download/mock.pdf',
        productos: productos.length
      };
    },
    generateInventoryReport: async (productos) => {
      console.log('📄 Mock PDF: Generando reporte de inventario...');
      return {
        success: true,
        filename: `inventario_${Date.now()}.pdf`,
        url: '/api/inventario/download/mock.pdf',
        productos: productos.length
      };
    },
    generatePromotionReport: async (productos) => {
      console.log('📄 Mock PDF: Generando reporte de promociones...');
      return {
        success: true,
        filename: `promociones_${Date.now()}.pdf`,
        url: '/api/inventario/download/mock.pdf',
        productos: productos.length
      };
    },
    getFilePath: (filename) => './mock.pdf'
  };
}


class InventarioController {
  
  // Obtener productos recientes desde Sinfowin (ERIZ) con indicador de procesamiento
  static async obtenerProductosRecientes(req, res) {
    let poolSucursal = null;

    try {
      const { limit = 200, search = '', fechaDesde = '', fechaHasta = '', sucursal_id = '' } = req.query;

      console.log('📦 Obteniendo productos recientes desde Sinfowin...', {
        sucursal_id,
        search,
        fechaDesde,
        fechaHasta,
        limit
      });

      // Validar que se proporcione sucursal_id
      if (!sucursal_id || sucursal_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Se requiere el ID de la sucursal para obtener productos'
        });
      }

      // PASO 1: Obtener configuración de la sucursal desde BD principal
      const poolGestion = await poolPromise;
      const sucursalResult = await poolGestion.request()
        .input('sucursalId', sql.Int, parseInt(sucursal_id))
        .query('SELECT * FROM sucursales WHERE id = @sucursalId');

      if (sucursalResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
      }

      const sucursal = sucursalResult.recordset[0];
      console.log(`🏪 Conectando a sucursal: ${sucursal.nombre}`);

      // PASO 2: Configurar conexión a BD de la sucursal
      const sucursalConfig = {
        user: sucursal.usuario,
        password: sucursal.contrasena,
        server: sucursal.ip,
        port: sucursal.puerto,
        database: sucursal.base_datos,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          requestTimeout: 45000,
          enableArithAbort: true,
          connectionTimeout: 15000
        }
      };

      // PASO 3: Conectar a BD de sucursal
      poolSucursal = await new sql.ConnectionPool(sucursalConfig).connect();
      console.log('✅ Conexión a BD sucursal establecida');

      // PASO 4: Construir query (misma estructura que losMasVendidos)
      const limitNumber = parseInt(limit) || 200;

      let query = `
        SELECT TOP ${limitNumber}
          pr.dc_codigo_barra AS codigo,
          ISNULL(pr.dg_glosa_producto, 'Sin Descripción') AS nombre,
          pr.df_fecha_precio AS fechaIngreso,
          ISNULL(fa.dg_glosa, 'General') AS categoria,
          1 AS cantidad
        FROM tb_productos pr
          LEFT JOIN tb_familias fa ON fa.dn_correlativo = pr.dn_correlativo_familia
        WHERE pr.dc_codigo_barra IS NOT NULL
          AND pr.dc_codigo_barra != ''
          AND pr.dg_glosa_producto IS NOT NULL
          AND pr.dg_glosa_producto != ''
          AND LEN(LTRIM(RTRIM(pr.dc_codigo_barra))) > 0
      `;

      const request = poolSucursal.request();

      // Filtro de búsqueda
      if (search && search.trim().length > 0) {
        query += ` AND (pr.dc_codigo_barra LIKE @search OR pr.dg_glosa_producto LIKE @search)`;
        request.input('search', sql.NVarChar, `%${search.trim()}%`);
      }

      // Filtros de fecha
      if (fechaDesde && fechaDesde.trim() !== '') {
        query += ` AND pr.df_fecha_precio >= @fechaDesde`;
        request.input('fechaDesde', sql.DateTime, fechaDesde);
      }

      if (fechaHasta && fechaHasta.trim() !== '') {
        query += ` AND pr.df_fecha_precio <= @fechaHasta`;
        request.input('fechaHasta', sql.DateTime, fechaHasta);
      }

      query += ` ORDER BY pr.df_fecha_precio DESC`;

      console.log('🔍 Ejecutando query...');
      const result = await request.query(query);
      console.log(`📊 Resultados: ${result.recordset.length} registros`);
      
      // Obtener códigos de productos ya procesados (con manejo de errores)
      let procesadosSet = new Set();
      try {
        const poolGestion = await poolPromise;
        const codigosProcesados = await poolGestion.request()
          .query('SELECT DISTINCT dc_codigo_barra FROM inventario_extendido WHERE activo = 1');
        
        procesadosSet = new Set(
          codigosProcesados.recordset.map(p => p.dc_codigo_barra)
        );
      } catch (error) {
        console.warn('⚠️ No se pudieron obtener productos procesados:', error.message);
      }
      
      // Agregar ID único, formatear datos y marcar estado de procesamiento
      const productos = result.recordset.map((producto, index) => ({
        id: `prod_${producto.codigo}_${index}`,
        ...producto,
        fechaIngreso: producto.fechaIngreso ? 
          new Date(producto.fechaIngreso).toISOString().split('T')[0] : null,
        procesado: procesadosSet.has(producto.codigo), // Indicador si ya fue procesado
        estado: procesadosSet.has(producto.codigo) ? 'procesado' : 'pendiente'
      }));
      
      console.log(`✅ ${productos.length} productos obtenidos desde ${sucursal.nombre}`);
      console.log(`📊 ${productos.filter(p => p.procesado).length} ya procesados, ${productos.filter(p => !p.procesado).length} pendientes`);

      res.json({
        success: true,
        data: productos,
        total: productos.length,
        resumen: {
          total: productos.length,
          procesados: productos.filter(p => p.procesado).length,
          pendientes: productos.filter(p => !p.procesado).length
        },
        sucursal: sucursal.nombre,
        message: `Productos obtenidos exitosamente desde ${sucursal.nombre}`
      });

    } catch (error) {
      console.error('❌ Error al obtener productos desde Sinfowin:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos desde Sinfowin',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      // IMPORTANTE: Cerrar conexión en el finally para asegurar que siempre se cierre
      if (poolSucursal) {
        try {
          await poolSucursal.close();
          console.log('🔐 Conexión BD sucursal cerrada');
        } catch (closeError) {
          console.error('⚠️ Error al cerrar conexión:', closeError.message);
        }
      }
    }
  }
  
  // Agregar datos adicionales de trazabilidad
  static async agregarDatosAdicionales(req, res) {
    try {
      const {
        productosIds,
        fechaVencimiento,
        temperatura,
        observaciones
      } = req.body;
      
      console.log('📝 Agregando datos adicionales a productos:', { 
        productosCount: productosIds?.length,
        fechaVencimiento,
        tieneTemperatura: !!temperatura
      });
      
      // Validaciones mejoradas
      if (!productosIds || !Array.isArray(productosIds) || productosIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar al menos un producto válido'
        });
      }
      
      if (!fechaVencimiento || fechaVencimiento.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Fecha de vencimiento es obligatoria'
        });
      }
      
      // Validar que la fecha de vencimiento no sea en el pasado
      const fechaVenc = new Date(fechaVencimiento);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaVenc < hoy) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de vencimiento no puede ser anterior a hoy'
        });
      }
      
      const poolGestion = await poolPromise; // GestionBeach
      const poolProd = await poolPromiseProd; // ERIZ
      
      const productosInsertados = [];
      const errores = [];
      const productosYaProcesados = [];
      
      for (const productoId of productosIds) {
        try {
          // Extraer código de barra del ID con validación
          const match = productoId.match(/^prod_(.+?)_\d+$/);
          if (!match) {
            errores.push(`ID de producto inválido: ${productoId}`);
            continue;
          }
          
          const codigoBarra = match[1];
          
          if (!codigoBarra || codigoBarra.trim() === '') {
            errores.push(`Código de barra vacío para producto: ${productoId}`);
            continue;
          }
          
          // Verificar si ya existe en inventario extendido
          const existeResult = await poolGestion.request()
            .input('codigo', sql.NVarChar, codigoBarra)
            .query(`
              SELECT id_inventario, dg_glosa_producto 
              FROM inventario_extendido 
              WHERE dc_codigo_barra = @codigo AND activo = 1
            `);
          
          if (existeResult.recordset.length > 0) {
            const producto = existeResult.recordset[0];
            productosYaProcesados.push(`${producto.dg_glosa_producto} (${codigoBarra})`);
            continue;
          }
          
          // Obtener datos del producto desde ERIZ con validación
          const productResult = await poolProd.request()
            .input('codigo', sql.NVarChar, codigoBarra)
            .query(`
              SELECT TOP 1 
                dc_codigo_barra,
                dg_glosa_producto,
                df_fecha_precio
              FROM tb_productos 
              WHERE dc_codigo_barra = @codigo
                AND dg_glosa_producto IS NOT NULL
                AND dg_glosa_producto != ''
              ORDER BY df_fecha_precio DESC
            `);
          
          if (productResult.recordset.length === 0) {
            errores.push(`Producto con código ${codigoBarra} no encontrado en Sinfowin`);
            continue;
          }
          
          const producto = productResult.recordset[0];
          
          // Insertar en inventario extendido
          const insertRequest = poolGestion.request()
            .input('dc_codigo_barra', sql.NVarChar, producto.dc_codigo_barra)
            .input('dg_glosa_producto', sql.NVarChar, producto.dg_glosa_producto)
            .input('df_fecha_precio', sql.DateTime, producto.df_fecha_precio)
            .input('fecha_vencimiento', sql.Date, fechaVencimiento);
          
          // Solo agregar temperatura si se proporciona
          if (temperatura && temperatura.trim() !== '') {
            insertRequest.input('temperatura', sql.NVarChar, temperatura.trim());
          } else {
            insertRequest.input('temperatura', sql.NVarChar, null);
          }
          
          // Solo agregar observaciones si se proporcionan
          if (observaciones && observaciones.trim() !== '') {
            insertRequest.input('observaciones', sql.NVarChar, observaciones.trim());
          } else {
            insertRequest.input('observaciones', sql.NVarChar, null);
          }
          
          const insertResult = await insertRequest.query(`
            INSERT INTO inventario_extendido (
              dc_codigo_barra, dg_glosa_producto, df_fecha_precio,
              fecha_vencimiento, temperatura, observaciones,
              fecha_creacion, fecha_actualizacion, activo, promocion
            ) VALUES (
              @dc_codigo_barra, @dg_glosa_producto, @df_fecha_precio,
              @fecha_vencimiento, @temperatura, @observaciones,
              GETDATE(), GETDATE(), 1, 0
            );
            SELECT SCOPE_IDENTITY() as id_inventario;
          `);
          
          productosInsertados.push({
            id_inventario: insertResult.recordset[0].id_inventario,
            codigo: producto.dc_codigo_barra,
            nombre: producto.dg_glosa_producto,
            fechaVencimiento: fechaVencimiento,
            temperatura: temperatura || null
          });
          
        } catch (error) {
          console.error(`❌ Error procesando producto ${productoId}:`, error);
          errores.push(`Error en producto ${productoId}: ${error.message}`);
        }
      }
      
      console.log(`✅ Proceso completado:`, {
        insertados: productosInsertados.length,
        errores: errores.length,
        yaProcesados: productosYaProcesados.length
      });
      
      res.json({
        success: true,
        data: {
          insertados: productosInsertados.length,
          errores: errores.length,
          yaProcesados: productosYaProcesados.length,
          detalles: productosInsertados,
          errores_detalle: errores,
          ya_procesados: productosYaProcesados
        },
        message: `Procesamiento completado: ${productosInsertados.length} productos nuevos, ${productosYaProcesados.length} ya existían, ${errores.length} errores`
      });
      
    } catch (error) {
      console.error('❌ Error al agregar datos adicionales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar datos adicionales',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  // Obtener productos con datos extendidos
  static async obtenerProductosExtendidos(req, res) {
    try {
      const { search = '', promocion = '', diasVencimiento = 30, sucursal_id = '' } = req.query;

      console.log('📋 Obteniendo productos con datos extendidos...', {
        sucursal_id,
        search,
        promocion,
        diasVencimiento
      });

      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        console.log('⚠️ Tabla inventario_extendido no existe, devolviendo array vacío');
        return res.json({
          success: true,
          data: [],
          total: 0,
          estadisticas: {
            total: 0,
            criticos: 0,
            warnings: 0,
            promociones: 0,
            conTemperatura: 0
          },
          message: 'No hay productos extendidos (tabla no existe)'
        });
      }
      
      let query = `
        SELECT 
          id_inventario as id,
          dc_codigo_barra as codigo,
          dg_glosa_producto as nombre,
          df_fecha_precio as fechaIngreso,
          fecha_vencimiento as fechaVencimiento,
          temperatura,
          observaciones,
          ISNULL(promocion, 0) as promocion,
          DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento,
          fecha_creacion as fechaCreacion,
          fecha_actualizacion as fechaActualizacion,
          CASE 
            WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 3 THEN 'critico'
            WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7 THEN 'warning'
            ELSE 'normal'
          END as estadoVencimiento
        FROM inventario_extendido
        WHERE ISNULL(activo, 1) = 1
      `;
      
      const request = pool.request();

      // Verificar si la columna sucursal_id existe en la tabla
      const checkColumnResult = await pool.request().query(`
        SELECT COUNT(*) as existe
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'inventario_extendido'
        AND COLUMN_NAME = 'sucursal_id'
      `);

      const hasSucursalColumn = checkColumnResult.recordset[0].existe > 0;

      // Filtro de sucursal si existe la columna y se especificó sucursal_id
      if (sucursal_id && sucursal_id.trim() !== '' && hasSucursalColumn) {
        query += ` AND sucursal_id = @sucursalId`;
        request.input('sucursalId', sql.Int, parseInt(sucursal_id));
        console.log(`🏪 Filtrando por sucursal_id: ${sucursal_id}`);
      } else if (sucursal_id && sucursal_id.trim() !== '' && !hasSucursalColumn) {
        console.warn('⚠️ Columna sucursal_id no existe en inventario_extendido, mostrando todos los productos');
      }

      // Filtros con validación
      if (search && search.trim().length > 0) {
        query += ` AND (dc_codigo_barra LIKE @search OR dg_glosa_producto LIKE @search)`;
        request.input('search', sql.NVarChar, `%${search.trim()}%`);
      }

      if (promocion === 'true') {
        query += ` AND ISNULL(promocion, 0) = 1`;
      } else if (promocion === 'false') {
        query += ` AND ISNULL(promocion, 0) = 0`;
      }

      if (diasVencimiento && !isNaN(diasVencimiento)) {
        query += ` AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= @diasVencimiento`;
        request.input('diasVencimiento', sql.Int, parseInt(diasVencimiento));
      }
      
      query += ` ORDER BY fecha_vencimiento ASC`;
      
      const result = await request.query(query);
      
      // Formatear fechas y agregar metadatos
      const productos = result.recordset.map(producto => ({
        ...producto,
        cantidad: Math.floor(Math.random() * 100) + 1, // Cantidad simulada
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null,
        fechaIngreso: producto.fechaIngreso ? 
          new Date(producto.fechaIngreso).toISOString().split('T')[0] : null,
        fechaCreacion: producto.fechaCreacion ? 
          new Date(producto.fechaCreacion).toISOString().split('T')[0] : null,
        requiereTemperatura: !!(producto.temperatura && producto.temperatura.trim() !== '')
      }));
      
      // Estadísticas adicionales
      const stats = {
        total: productos.length,
        criticos: productos.filter(p => p.estadoVencimiento === 'critico').length,
        warnings: productos.filter(p => p.estadoVencimiento === 'warning').length,
        promociones: productos.filter(p => p.promocion).length,
        conTemperatura: productos.filter(p => p.requiereTemperatura).length
      };
      
      console.log(`✅ ${productos.length} productos extendidos obtenidos`, stats);
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        estadisticas: stats,
        message: 'Productos extendidos obtenidos exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error al obtener productos extendidos:', error);
      
      // Si hay error de SQL, devolver respuesta vacía pero exitosa
      res.json({
        success: true,
        data: [],
        total: 0,
        estadisticas: {
          total: 0,
          criticos: 0,
          warnings: 0,
          promociones: 0,
          conTemperatura: 0
        },
        message: 'No se pudieron cargar productos extendidos',
        warning: error.message
      });
    }
  }
  // En InventarioController.js - agregar este método
static async eliminarProducto(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }
    
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        UPDATE inventario_extendido 
        SET activo = 0, fecha_actualizacion = GETDATE() 
        WHERE id_inventario = @id
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({
        success: true,
        message: 'Producto eliminado del seguimiento exitosamente'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
}
  
  // Obtener estadísticas del inventario
  static async obtenerEstadisticas(req, res) {
    try {
      console.log('📊 Generando estadísticas de inventario...');
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        console.log('⚠️ Tabla inventario_extendido no existe, devolviendo estadísticas vacías');
        return res.json({
          success: true,
          data: {
            totalProductos: 0,
            productosVenciendo: 0,
            promociones: 0,
            productosCriticos: 0,
            productosWarning: 0,
            productosConTemperatura: 0,
            proximoVencimiento: null,
            ultimoProcesado: null
          },
          message: 'Estadísticas inicializadas (tabla no existe)'
        });
      }
      
      const result = await pool.request().query(`
        SELECT 
          COUNT(*) as totalProductos,
          SUM(CASE WHEN ISNULL(promocion, 0) = 1 THEN 1 ELSE 0 END) as promociones,
          SUM(CASE WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 3 THEN 1 ELSE 0 END) as productosCriticos,
          SUM(CASE WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) BETWEEN 4 AND 7 THEN 1 ELSE 0 END) as productosWarning,
          SUM(CASE WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7 THEN 1 ELSE 0 END) as productosVenciendo,
          SUM(CASE WHEN temperatura IS NOT NULL AND temperatura != '' THEN 1 ELSE 0 END) as productosConTemperatura,
          MIN(fecha_vencimiento) as proximoVencimiento,
          MAX(fecha_creacion) as ultimoProcesado
        FROM inventario_extendido
        WHERE ISNULL(activo, 1) = 1
      `);
      
      const stats = result.recordset[0];
      
      const estadisticas = {
        totalProductos: stats.totalProductos || 0,
        productosVenciendo: stats.productosVenciendo || 0,
        promociones: stats.promociones || 0,
        productosCriticos: stats.productosCriticos || 0,
        productosWarning: stats.productosWarning || 0,
        productosConTemperatura: stats.productosConTemperatura || 0,
        proximoVencimiento: stats.proximoVencimiento ? 
          new Date(stats.proximoVencimiento).toISOString().split('T')[0] : null,
        ultimoProcesado: stats.ultimoProcesado ? 
          new Date(stats.ultimoProcesado).toISOString().split('T')[0] : null
      };
      
      console.log('✅ Estadísticas generadas:', estadisticas);
      
      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas obtenidas exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      
      // Devolver estadísticas vacías en caso de error
      res.json({
        success: true,
        data: {
          totalProductos: 0,
          productosVenciendo: 0,
          promociones: 0,
          productosCriticos: 0,
          productosWarning: 0,
          productosConTemperatura: 0,
          proximoVencimiento: null,
          ultimoProcesado: null
        },
        message: 'Estadísticas inicializadas por error',
        warning: error.message
      });
    }
  }
  
  // Cambiar estado de promoción
  static async cambiarPromocion(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      console.log(`🏷️ Cambiando estado de promoción para producto ${id}...`);
      
      const pool = await poolPromise;
      
      // Obtener estado actual
      const currentResult = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query('SELECT ISNULL(promocion, 0) as promocion, dg_glosa_producto FROM inventario_extendido WHERE id_inventario = @id AND ISNULL(activo, 1) = 1');
      
      if (currentResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado o inactivo'
        });
      }
      
      const currentProduct = currentResult.recordset[0];
      const newPromocionState = !currentProduct.promocion;
      
      // Actualizar estado con timestamp
      await pool.request()
        .input('id', sql.Int, parseInt(id))
        .input('promocion', sql.Bit, newPromocionState)
        .query(`
          UPDATE inventario_extendido 
          SET promocion = @promocion, fecha_actualizacion = GETDATE() 
          WHERE id_inventario = @id
        `);
      
      console.log(`✅ Promoción ${newPromocionState ? 'activada' : 'desactivada'} para ${currentProduct.dg_glosa_producto}`);
      
      res.json({
        success: true,
        data: {
          id: parseInt(id),
          promocion: newPromocionState,
          nombre: currentProduct.dg_glosa_producto
        },
        message: `Promoción ${newPromocionState ? 'activada' : 'desactivada'} exitosamente`
      });
      
    } catch (error) {
      console.error('❌ Error al cambiar promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar estado de promoción',
        error: error.message
      });
    }
  }
  
  // Obtener producto por ID
  static async obtenerProductoPorId(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }
      
      console.log(`🔍 Obteniendo producto por ID: ${id}`);
      
      const pool = await poolPromise;
      
      const result = await pool.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
          SELECT 
            id_inventario as id,
            dc_codigo_barra as codigo,
            dg_glosa_producto as nombre,
            df_fecha_precio as fechaIngreso,
            fecha_vencimiento as fechaVencimiento,
            temperatura,
            observaciones,
            ISNULL(promocion, 0) as promocion,
            DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento,
            fecha_creacion as fechaCreacion,
            fecha_actualizacion as fechaActualizacion,
            CASE 
              WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 3 THEN 'critico'
              WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7 THEN 'warning'
              ELSE 'normal'
            END as estadoVencimiento
          FROM inventario_extendido
          WHERE id_inventario = @id AND ISNULL(activo, 1) = 1
        `);
      
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado o inactivo'
        });
      }
      
      const producto = result.recordset[0];
      
      // Formatear fechas
      producto.fechaVencimiento = producto.fechaVencimiento ? 
        new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null;
      producto.fechaIngreso = producto.fechaIngreso ? 
        new Date(producto.fechaIngreso).toISOString().split('T')[0] : null;
      producto.fechaCreacion = producto.fechaCreacion ? 
        new Date(producto.fechaCreacion).toISOString().split('T')[0] : null;
      producto.fechaActualizacion = producto.fechaActualizacion ? 
        new Date(producto.fechaActualizacion).toISOString().split('T')[0] : null;
      
      // Agregar metadatos
      producto.requiereTemperatura = !!(producto.temperatura && producto.temperatura.trim() !== '');
      producto.cantidad = Math.floor(Math.random() * 100) + 1; // Simulado
      
      console.log(`✅ Producto obtenido: ${producto.nombre}`);
      
      res.json({
        success: true,
        data: producto,
        message: 'Producto obtenido exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error al obtener producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }
  
  // Test de conexión mejorado
  static async testConexion(req, res) {
    try {
      console.log('🔧 Probando conexiones de inventario...');
      
      const tests = {};
      
      // Test conexión GestionBeach
      try {
        const poolGestion = await poolPromise;
        
        const dbInfo = await poolGestion.request().query(`
          SELECT 
            DB_NAME() as BaseDatos,
            USER_NAME() as Usuario,
            @@SERVERNAME as Servidor
        `);
        
        const checkInventario = await poolGestion.request().query(`
          SELECT COUNT(*) as existe 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'inventario_extendido'
        `);
        
        let inventarioCount = 0;
        if (checkInventario.recordset[0].existe > 0) {
          const testGestion = await poolGestion.request()
            .query('SELECT COUNT(*) as count FROM inventario_extendido');
          inventarioCount = testGestion.recordset[0].count;
        }
        
        tests.gestionBeach = {
          status: 'connected',
          baseDatos: dbInfo.recordset[0].BaseDatos,
          usuario: dbInfo.recordset[0].Usuario,
          servidor: dbInfo.recordset[0].Servidor,
          inventarioExtendido: inventarioCount,
          tablaExiste: checkInventario.recordset[0].existe > 0,
          timestamp: new Date().toISOString()
        };
        
      } catch (err) {
        tests.gestionBeach = {
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString()
        };
      }
      
      // Test conexión ERIZ
      try {
        const poolProd = await poolPromiseProd;
        
        const dbInfoProd = await poolProd.request().query(`
          SELECT 
            DB_NAME() as BaseDatos,
            USER_NAME() as Usuario,
            @@SERVERNAME as Servidor
        `);
        
        const testProd = await poolProd.request()
          .query('SELECT COUNT(*) as count FROM tb_productos WHERE dc_codigo_barra IS NOT NULL');
        
        tests.eriz = {
          status: 'connected',
          baseDatos: dbInfoProd.recordset[0].BaseDatos,
          usuario: dbInfoProd.recordset[0].Usuario,
          servidor: dbInfoProd.recordset[0].Servidor,
          productos: testProd.recordset[0].count,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        tests.eriz = {
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString()
        };
      }
      
      // Test servicios
      tests.services = {
        whatsapp: whatsappService ? 'available' : 'not_loaded',
        pdf: pdfService ? 'available' : 'not_loaded'
      };
      
      const allConnected = tests.gestionBeach.status === 'connected' && tests.eriz.status === 'connected';
      
      res.json({
        success: allConnected,
        data: tests,
        message: allConnected ? 
          'Todas las conexiones de inventario funcionando correctamente' : 
          'Algunas conexiones tienen problemas'
      });
      
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error en test de conexiones de inventario',
        error: error.message
      });
    }
  }

  // Método para crear la tabla automáticamente
  static async crearTablaInventario(req, res) {
    try {
      console.log('🏗️ Creando tabla inventario_extendido...');
      
      const pool = await poolPromise;
      
      // Verificar si ya existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe > 0) {
        return res.json({
          success: true,
          message: 'La tabla inventario_extendido ya existe',
          data: { action: 'no_action', reason: 'table_exists' }
        });
      }
      
      // Crear la tabla
      await pool.request().query(`
        CREATE TABLE inventario_extendido (
          id_inventario INT IDENTITY(1,1) PRIMARY KEY,
          dc_codigo_barra NVARCHAR(50) NOT NULL,
          dg_glosa_producto NVARCHAR(255) NOT NULL,
          df_fecha_precio DATETIME,
          fecha_vencimiento DATE NOT NULL,
          temperatura NVARCHAR(50),
          observaciones NVARCHAR(MAX),
          promocion BIT DEFAULT 0,
          activo BIT DEFAULT 1,
          fecha_creacion DATETIME DEFAULT GETDATE(),
          fecha_actualizacion DATETIME DEFAULT GETDATE()
        );
        
        -- Crear índices para mejorar rendimiento
        CREATE INDEX IX_inventario_codigo ON inventario_extendido(dc_codigo_barra);
        CREATE INDEX IX_inventario_vencimiento ON inventario_extendido(fecha_vencimiento);
        CREATE INDEX IX_inventario_activo ON inventario_extendido(activo);
      `);
      
      console.log('✅ Tabla inventario_extendido creada exitosamente');
      
      res.json({
        success: true,
        message: 'Tabla inventario_extendido creada exitosamente',
        data: { 
          action: 'created',
          table: 'inventario_extendido',
          indexes: ['IX_inventario_codigo', 'IX_inventario_vencimiento', 'IX_inventario_activo']
        }
      });
      
    } catch (error) {
      console.error('❌ Error al crear tabla:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear tabla inventario_extendido',
        error: error.message
      });
    }
  }

  // ====== MÉTODOS DE WHATSAPP ======

  // Enviar alerta por WhatsApp (SOLO AUTOMÁTICO)
  static async enviarAlertaWhatsApp(req, res) {
    try {
      const { diasAlerta = 7, forzarEnvio = false } = req.body;
      
      console.log(`📱 Enviando alerta WhatsApp AUTOMÁTICA para productos que vencen en ${diasAlerta} días...`);
      
      // Verificar si el servicio WhatsApp está disponible
      if (!whatsappService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de WhatsApp no está disponible',
          error: 'WhatsApp service not loaded',
          troubleshooting: 'Verificar que whatsappService.js esté correctamente configurado'
        });
      }
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        // Enviar mensaje de que no hay tabla pero todo está OK
        const emptyResult = await whatsappService.sendWhatsAppAlert([], diasAlerta);
        
        return res.json({
          success: true,
          data: {
            sent: emptyResult.success,
            reason: 'Tabla de inventario no existe - mensaje de estado enviado',
            productosVenciendo: 0,
            whatsappResult: emptyResult
          },
          message: 'Alerta de estado enviada (no hay tabla de inventario)'
        });
      }
      
      // Obtener productos próximos a vencer
      const result = await pool.request()
        .input('diasAlerta', sql.Int, parseInt(diasAlerta))
        .query(`
          SELECT 
            id_inventario as id,
            dc_codigo_barra as codigo,
            dg_glosa_producto as nombre,
            fecha_vencimiento as fechaVencimiento,
            temperatura,
            ISNULL(promocion, 0) as promocion,
            DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
          FROM inventario_extendido
          WHERE ISNULL(activo, 1) = 1 
            AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= @diasAlerta
          ORDER BY diasVencimiento ASC
        `);
      
      const productosVenciendo = result.recordset.map(producto => ({
        ...producto,
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null
      }));
      
      console.log(`📋 ${productosVenciendo.length} productos próximos a vencer encontrados`);
      
      // Enviar WhatsApp AUTOMÁTICAMENTE
      const whatsappResult = await whatsappService.sendWhatsAppAlert(productosVenciendo, parseInt(diasAlerta));
      
      console.log('✅ Resultado de WhatsApp automático:', whatsappResult);
      
      // Respuesta según el resultado
      if (whatsappResult.success) {
        // ÉXITO: Mensaje enviado automáticamente
        res.json({
          success: true,
          data: {
            sent: true,
            method: 'automatic',
            whatsappResult,
            productosVenciendo: productosVenciendo.length,
            productos: productosVenciendo.slice(0, 5)
          },
          message: `✅ Alerta enviada automáticamente por WhatsApp: ${productosVenciendo.length} productos próximos a vencer`
        });
      } else {
        // ERROR: No se pudo enviar automáticamente
        res.status(500).json({
          success: false,
          message: '❌ Error al enviar alerta automática por WhatsApp',
          error: whatsappResult.error,
          errorCode: whatsappResult.errorCode,
          troubleshooting: whatsappResult.troubleshooting,
          data: {
            sent: false,
            method: 'automatic_failed',
            whatsappResult,
            productosVenciendo: productosVenciendo.length,
            messagePreview: whatsappResult.messagePreview
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error crítico al enviar alerta WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Error crítico al enviar alerta por WhatsApp',
        error: error.message,
        troubleshooting: {
          checkTwilioCredentials: 'Verificar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env',
          checkTwilioNumbers: 'Verificar TWILIO_WHATSAPP_NUMBER y TWILIO_WHATSAPP_TO',
          checkTwilioPackage: 'Verificar que npm install twilio esté ejecutado',
          checkSandbox: 'Verificar que el número esté autorizado en Twilio Sandbox'
        }
      });
    }
  }

  // Test de WhatsApp
  static async testWhatsApp(req, res) {
    try {
      console.log('🧪 Ejecutando test de WhatsApp...');
      
      if (!whatsappService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de WhatsApp no está disponible'
        });
      }
      
      const testResult = await whatsappService.sendTestMessage();
      
      res.json({
        success: true,
        data: testResult,
        message: 'Test de WhatsApp ejecutado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error en test WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Error en test de WhatsApp',
        error: error.message
      });
    }
  }

  // Estado del servicio WhatsApp
  static async estadoWhatsApp(req, res) {
    try {
      if (!whatsappService) {
        return res.json({
          success: true,
          data: {
            service: 'WhatsApp',
            available: false,
            error: 'Servicio no cargado',
            timestamp: new Date().toISOString()
          },
          message: 'Servicio WhatsApp no disponible'
        });
      }
      
      const connectionTest = await whatsappService.testConnection();
      
      res.json({
        success: true,
        data: {
          service: 'WhatsApp',
          ...connectionTest
        },
        message: 'Estado del servicio WhatsApp obtenido'
      });
      
    } catch (error) {
      console.error('❌ Error al obtener estado WhatsApp:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado del servicio WhatsApp',
        error: error.message
      });
    }
  }

  // ====== MÉTODOS PARA PDFs Y REPORTES ======

  // Generar reporte PDF de vencimientos
  static async generarReporteVencimientos(req, res) {
    try {
      const { diasAlerta = 7 } = req.query;
      
      console.log('📄 Generando reporte PDF de vencimientos...');
      
      if (!pdfService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no está disponible'
        });
      }
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        return res.json({
          success: true,
          data: {
            url: '/api/inventario/download/empty_report.pdf',
            filename: 'reporte_vacio.pdf',
            productos: 0
          },
          message: 'Reporte vacío generado (tabla no existe)'
        });
      }
      
      // Obtener productos próximos a vencer
      const result = await pool.request()
        .input('diasAlerta', sql.Int, parseInt(diasAlerta))
        .query(`
          SELECT 
            id_inventario as id,
            dc_codigo_barra as codigo,
            dg_glosa_producto as nombre,
            fecha_vencimiento as fechaVencimiento,
            temperatura,
            observaciones,
            ISNULL(promocion, 0) as promocion,
            DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
          FROM inventario_extendido
          WHERE ISNULL(activo, 1) = 1 
            AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= @diasAlerta
          ORDER BY diasVencimiento ASC
        `);
      
      const productos = result.recordset.map(producto => ({
        ...producto,
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null
      }));
      
      // Generar PDF
      const pdfResult = await pdfService.generateExpirationReport(productos, parseInt(diasAlerta));
      
      console.log('✅ Reporte PDF generado:', pdfResult.filename);
      
      res.json({
        success: true,
        data: pdfResult,
        message: `Reporte PDF generado: ${productos.length} productos próximos a vencer`
      });
      
    } catch (error) {
      console.error('❌ Error al generar reporte PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte PDF',
        error: error.message
      });
    }
  }

  // Generar reporte PDF completo de inventario
  static async generarReporteInventario(req, res) {
    try {
      console.log('📄 Generando reporte PDF completo de inventario...');
      
      if (!pdfService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no está disponible'
        });
      }
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        return res.json({
          success: true,
          data: {
            url: '/api/inventario/download/empty_inventory.pdf',
            filename: 'inventario_vacio.pdf',
            productos: 0
          },
          message: 'Reporte de inventario vacío generado (tabla no existe)'
        });
      }
      
      // Obtener todos los productos extendidos
      const result = await pool.request().query(`
        SELECT 
          id_inventario as id,
          dc_codigo_barra as codigo,
          dg_glosa_producto as nombre,
          fecha_vencimiento as fechaVencimiento,
          temperatura,
          observaciones,
          ISNULL(promocion, 0) as promocion,
          DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
        FROM inventario_extendido
        WHERE ISNULL(activo, 1) = 1 
        ORDER BY fecha_vencimiento ASC
      `);
      
      const productos = result.recordset.map(producto => ({
        ...producto,
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null
      }));
      
      // Generar PDF
      const pdfResult = await pdfService.generateInventoryReport(productos);
      
      console.log('✅ Reporte completo PDF generado:', pdfResult.filename);
      
      res.json({
        success: true,
        data: pdfResult,
        message: `Reporte completo generado: ${productos.length} productos`
      });
      
    } catch (error) {
      console.error('❌ Error al generar reporte completo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte completo',
        error: error.message
      });
    }
  }

  // Generar reporte PDF de promociones
  static async generarReportePromociones(req, res) {
    try {
      console.log('📄 Generando reporte PDF de promociones...');
      
      if (!pdfService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no está disponible'
        });
      }
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        return res.json({
          success: true,
          data: {
            url: '/api/inventario/download/empty_promotions.pdf',
            filename: 'promociones_vacias.pdf',
            productos: 0
          },
          message: 'Reporte de promociones vacío generado (tabla no existe)'
        });
      }
      
      // Obtener productos en promoción
      const result = await pool.request().query(`
        SELECT 
          id_inventario as id,
          dc_codigo_barra as codigo,
          dg_glosa_producto as nombre,
          fecha_vencimiento as fechaVencimiento,
          temperatura,
          observaciones,
          ISNULL(promocion, 0) as promocion,
          DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
        FROM inventario_extendido
        WHERE ISNULL(activo, 1) = 1 
          AND ISNULL(promocion, 0) = 1
        ORDER BY fecha_vencimiento ASC
      `);
      
      const productos = result.recordset.map(producto => ({
        ...producto,
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null
      }));
      
      // Generar PDF
      const pdfResult = await pdfService.generatePromotionReport(productos);
      
      console.log('✅ Reporte promociones PDF generado:', pdfResult.filename);
      
      res.json({
        success: true,
        data: pdfResult,
        message: `Reporte de promociones generado: ${productos.length} productos`
      });
      
    } catch (error) {
      console.error('❌ Error al generar reporte promociones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte de promociones',
        error: error.message
      });
    }
  }

  // Descargar archivo PDF
  static async descargarPDF(req, res) {
    try {
      const { filename } = req.params;
      
      console.log(`📥 Descargando archivo: ${filename}`);
      
      if (!pdfService) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no está disponible'
        });
      }
      
      const filePath = pdfService.getFilePath(filename);
      
      // Verificar que el archivo existe
      if (!require('fs').existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }
      
      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Enviar archivo
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error al enviar archivo:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error al descargar archivo'
            });
          }
        } else {
          console.log('✅ Archivo descargado exitosamente:', filename);
        }
      });
      
    } catch (error) {
      console.error('❌ Error en descarga:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar descarga',
        error: error.message
      });
    }
  }

  // Generar datos para impresión
  static async generarDatosImpresion(req, res) {
    try {
      const { tipo = 'vencimientos', diasAlerta = 7 } = req.query;
      
      console.log(`🖨️ Generando datos para impresión: ${tipo}`);
      
      const pool = await poolPromise;
      
      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'inventario_extendido'
      `);
      
      if (checkTable.recordset[0].existe === 0) {
        return res.json({
          success: true,
          data: {
            titulo: 'REPORTE VACÍO',
            fecha: new Date().toLocaleDateString('es-CL'),
            hora: new Date().toLocaleTimeString('es-CL'),
            criterio: 'Tabla de inventario no existe',
            totalProductos: 0,
            productos: [],
            resumen: { criticos: 0, warnings: 0, promociones: 0, conTemperatura: 0 }
          },
          message: 'Datos de impresión vacíos generados (tabla no existe)'
        });
      }
      
      let query = '';
      let params = {};
      
      switch (tipo) {
        case 'vencimientos':
          query = `
            SELECT 
              dc_codigo_barra as codigo,
              dg_glosa_producto as nombre,
              fecha_vencimiento as fechaVencimiento,
              temperatura,
              ISNULL(promocion, 0) as promocion,
              DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
            FROM inventario_extendido
            WHERE ISNULL(activo, 1) = 1 
              AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= @diasAlerta
            ORDER BY diasVencimiento ASC
          `;
          params.diasAlerta = parseInt(diasAlerta);
          break;
          
        case 'promociones':
          query = `
            SELECT 
              dc_codigo_barra as codigo,
              dg_glosa_producto as nombre,
              fecha_vencimiento as fechaVencimiento,
              temperatura,
              DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
            FROM inventario_extendido
            WHERE ISNULL(activo, 1) = 1 
              AND ISNULL(promocion, 0) = 1
            ORDER BY fecha_vencimiento ASC
          `;
          break;
          
        case 'inventario':
        default:
          query = `
            SELECT 
              dc_codigo_barra as codigo,
              dg_glosa_producto as nombre,
              fecha_vencimiento as fechaVencimiento,
              temperatura,
              ISNULL(promocion, 0) as promocion,
              DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento
            FROM inventario_extendido
            WHERE ISNULL(activo, 1) = 1 
            ORDER BY fecha_vencimiento ASC
          `;
          break;
      }
      
      const request = pool.request();
      Object.keys(params).forEach(key => {
        request.input(key, sql.Int, params[key]);
      });
      
      const result = await request.query(query);
      
      const productos = result.recordset.map(producto => ({
        ...producto,
        fechaVencimiento: producto.fechaVencimiento ? 
          new Date(producto.fechaVencimiento).toISOString().split('T')[0] : null
      }));
      
      // Preparar datos para impresión
      const datosImpresion = {
        titulo: tipo === 'vencimientos' ? 'PRODUCTOS PRÓXIMOS A VENCER' :
                tipo === 'promociones' ? 'PRODUCTOS EN PROMOCIÓN' : 'INVENTARIO COMPLETO',
        fecha: new Date().toLocaleDateString('es-CL'),
        hora: new Date().toLocaleTimeString('es-CL'),
        criterio: tipo === 'vencimientos' ? `Productos que vencen en ${diasAlerta} días o menos` : '',
        totalProductos: productos.length,
        productos: productos,
        resumen: {
          criticos: productos.filter(p => p.diasVencimiento <= 3).length,
          warnings: productos.filter(p => p.diasVencimiento > 3 && p.diasVencimiento <= 7).length,
          promociones: productos.filter(p => p.promocion).length,
          conTemperatura: productos.filter(p => p.temperatura).length
        }
      };
      
      console.log('✅ Datos de impresión generados:', datosImpresion.totalProductos, 'productos');
      
      res.json({
        success: true,
        data: datosImpresion,
        message: `Datos de impresión generados: ${productos.length} productos`
      });
      
    } catch (error) {
      console.error('❌ Error al generar datos de impresión:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar datos de impresión',
        error: error.message
      });
    }
  }

  // Obtener notificaciones de inventario (productos vencidos y por vencer)
  static async obtenerNotificaciones(req, res) {
    try {
      console.log('🔔 Obteniendo notificaciones de inventario...');

      const pool = await poolPromise;
      const userId = req.user?.id || req.userId; // Obtener ID del usuario autenticado

      // Verificar si la tabla existe
      const checkTable = await pool.request().query(`
        SELECT COUNT(*) as existe
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = 'inventario_extendido'
      `);

      if (checkTable.recordset[0].existe === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'No hay notificaciones (tabla no existe)'
        });
      }

      // Obtener perfil y sucursales permitidas del usuario
      let sucursalesPermitidas = [];
      if (userId) {
        const perfilResult = await pool.request()
          .input('userId', sql.Int, userId)
          .query(`
            SELECT perfil_id
            FROM empleados
            WHERE id = @userId
          `);

        if (perfilResult.recordset.length > 0) {
          const perfilId = perfilResult.recordset[0].perfil_id;

          // Obtener sucursales del perfil
          const sucursalesResult = await pool.request()
            .input('perfilId', sql.Int, perfilId)
            .query(`
              SELECT sucursal_id
              FROM perfiles_sucursales
              WHERE perfil_id = @perfilId
            `);

          sucursalesPermitidas = sucursalesResult.recordset.map(s => s.sucursal_id);
          console.log('📍 Sucursales permitidas para el usuario:', sucursalesPermitidas);
        }
      }

      // Obtener nombres de sucursales
      const sucursalesNombresResult = await pool.request()
        .query('SELECT id, nombre FROM sucursales');

      const sucursalesMap = {};
      sucursalesNombresResult.recordset.forEach(s => {
        sucursalesMap[s.id] = s.nombre;
      });

      // Query para productos vencidos y próximos a vencer
      let query = `
        SELECT
          dc_codigo_barra as codigo,
          dg_glosa_producto as nombre,
          fecha_vencimiento as fechaVencimiento,
          DATEDIFF(day, GETDATE(), fecha_vencimiento) as diasVencimiento,
          ISNULL(sucursal_id, 0) as sucursal_id,
          CASE
            WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) < 0 THEN 'vencido'
            WHEN DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7 THEN 'por_vencer'
            ELSE 'normal'
          END as tipo
        FROM inventario_extendido
        WHERE ISNULL(activo, 1) = 1
          AND DATEDIFF(day, GETDATE(), fecha_vencimiento) <= 7
      `;

      // Filtrar por sucursales permitidas si no es superusuario
      const request = pool.request();
      if (sucursalesPermitidas.length > 0) {
        const sucursalesIds = sucursalesPermitidas.join(',');
        query += ` AND ISNULL(sucursal_id, 0) IN (${sucursalesIds})`;
        console.log('🔒 Filtrando notificaciones por sucursales:', sucursalesIds);
      }

      query += ` ORDER BY diasVencimiento ASC`;

      const result = await request.query(query);

      // Formatear notificaciones
      const notificaciones = result.recordset.map(producto => {
        const sucursalNombre = sucursalesMap[producto.sucursal_id] || 'Todas las sucursales';

        if (producto.tipo === 'vencido') {
          const diasVencido = Math.abs(producto.diasVencimiento);
          return {
            tipo: 'vencido',
            titulo: `Producto vencido hace ${diasVencido} día${diasVencido !== 1 ? 's' : ''}`,
            descripcion: `${producto.nombre} (${producto.codigo})`,
            sucursal: sucursalNombre,
            sucursal_id: producto.sucursal_id,
            codigo: producto.codigo,
            diasVencimiento: producto.diasVencimiento
          };
        } else {
          return {
            tipo: 'por_vencer',
            titulo: `Producto vence en ${producto.diasVencimiento} día${producto.diasVencimiento !== 1 ? 's' : ''}`,
            descripcion: `${producto.nombre} (${producto.codigo})`,
            sucursal: sucursalNombre,
            sucursal_id: producto.sucursal_id,
            codigo: producto.codigo,
            diasVencimiento: producto.diasVencimiento
          };
        }
      });

      console.log(`✅ ${notificaciones.length} notificaciones generadas`);

      res.json({
        success: true,
        data: notificaciones,
        total: notificaciones.length,
        resumen: {
          vencidos: notificaciones.filter(n => n.tipo === 'vencido').length,
          porVencer: notificaciones.filter(n => n.tipo === 'por_vencer').length
        },
        message: 'Notificaciones obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al obtener notificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones de inventario',
        error: error.message
      });
    }
  }
}

module.exports = InventarioController;