// controllers/centrosCostosController.js - CONTROLADOR COMPLETO
const { sql, poolPromise } = require('../config/db');

// Test de conexión específico para centros de costos
exports.testCentrosCostos = async (req, res) => {
  try {
    console.log('🔧 TEST - Verificando sistema de centros de costos...');
    
    const pool = await poolPromise;
    
    // Verificar tabla
    const testResult = await pool.request()
      .query('SELECT COUNT(*) as total FROM centros_costos');
    
    // Obtener algunos registros de ejemplo
    const sampleResult = await pool.request()
      .query('SELECT TOP 3 * FROM centros_costos ORDER BY nombre');
    
    console.log('✅ Sistema de centros de costos funcionando');
    
    return res.json({
      success: true,
      message: 'Sistema de centros de costos funcionando correctamente',
      data: {
        total_registros: testResult.recordset[0].total,
        ejemplos: sampleResult.recordset
      },
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error en test de centros de costos:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error en sistema de centros de costos',
      error: error.message
    });
  }
};

// Obtener todos los centros de costos
exports.getCentrosCostos = async (req, res) => {
  try {
    const { incluir_inactivos = 'false' } = req.query;
    console.log('📋 Obteniendo centros de costos...', { incluir_inactivos });
    
    const pool = await poolPromise;
    
    let whereClause = '';
    if (incluir_inactivos !== 'true') {
      whereClause = 'WHERE activo = 1';
    }
    
    const query = `
      SELECT 
        id, 
        nombre, 
        descripcion, 
        activo, 
        created_at, 
        updated_at,
        (SELECT COUNT(*) 
         FROM facturas_xml 
         WHERE id_centro_costo = cc.id) as total_facturas,
        (SELECT COALESCE(SUM(monto_total), 0) 
         FROM facturas_xml 
         WHERE id_centro_costo = cc.id) as monto_total
      FROM centros_costos cc
      ${whereClause}
      ORDER BY nombre
    `;
    
    console.log('Query ejecutada:', query);
    
    const result = await pool.request().query(query);
    
    console.log(`✅ ${result.recordset.length} centros de costos encontrados`);
    
    return res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('❌ Error al obtener centros de costos:', error);
    
    // Si la tabla facturas_xml no existe, intentar sin las subconsultas
    if (error.message.includes('facturas_xml')) {
      try {
        const pool = await poolPromise;
        
        let whereClause = '';
        if (req.query.incluir_inactivos !== 'true') {
          whereClause = 'WHERE activo = 1';
        }
        
        const simpleQuery = `
          SELECT 
            id, 
            nombre, 
            descripcion, 
            activo, 
            created_at, 
            updated_at,
            0 as total_facturas,
            0 as monto_total
          FROM centros_costos
          ${whereClause}
          ORDER BY nombre
        `;
        
        const result = await pool.request().query(simpleQuery);
        
        return res.json({
          success: true,
          data: result.recordset,
          message: 'Datos obtenidos sin estadísticas de facturas (tabla no existe aún)'
        });
      } catch (secondError) {
        return res.status(500).json({
          success: false,
          message: 'Error al obtener centros de costos',
          error: secondError.message
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al obtener centros de costos',
      error: error.message
    });
  }
};

// Obtener centro de costos por ID
exports.getCentroCostoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de centro de costos es requerido'
      });
    }
    
    console.log(`🔍 Buscando centro de costos: ${id}`);
    
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('id', sql.VarChar(10), id)
      .query(`
        SELECT 
          cc.*,
          (SELECT COUNT(*) FROM facturas_xml WHERE id_centro_costo = cc.id) as total_facturas,
          (SELECT COALESCE(SUM(monto_total), 0) FROM facturas_xml WHERE id_centro_costo = cc.id) as monto_total
        FROM centros_costos cc
        WHERE cc.id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Centro de costos no encontrado'
      });
    }
    
    console.log(`✅ Centro de costos encontrado: ${result.recordset[0].nombre}`);
    
    return res.json({
      success: true,
      data: result.recordset[0]
    });
    
  } catch (error) {
    console.error('❌ Error al obtener centro de costos:', error);
    
    // Si hay error con facturas_xml, intentar sin subconsultas
    if (error.message.includes('facturas_xml')) {
      try {
        const pool = await poolPromise;
        const result = await pool.request()
          .input('id', sql.VarChar(10), req.params.id)
          .query(`
            SELECT 
              *,
              0 as total_facturas,
              0 as monto_total
            FROM centros_costos
            WHERE id = @id
          `);
        
        if (result.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Centro de costos no encontrado'
          });
        }
        
        return res.json({
          success: true,
          data: result.recordset[0]
        });
      } catch (secondError) {
        return res.status(500).json({
          success: false,
          message: 'Error al obtener centro de costos',
          error: secondError.message
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al obtener centro de costos',
      error: error.message
    });
  }
};

// Crear nuevo centro de costos
exports.createCentroCosto = async (req, res) => {
  try {
    const { id, nombre, descripcion, activo = true } = req.body;
    
    console.log('📝 Creando centro de costos:', { id, nombre });
    
    if (!id || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'ID y nombre son requeridos'
      });
    }
    
    // Validar formato del ID (solo letras y números, máximo 10 caracteres)
    if (!/^[A-Z0-9]{1,10}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID debe contener solo letras mayúsculas y números, máximo 10 caracteres'
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar que no existe el ID
    const existeResult = await pool.request()
      .input('id', sql.VarChar(10), id)
      .query('SELECT COUNT(*) as count FROM centros_costos WHERE id = @id');
    
    if (existeResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un centro de costos con este ID'
      });
    }
    
    // Insertar nuevo centro de costos
    await pool.request()
      .input('id', sql.VarChar(10), id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query(`
        INSERT INTO centros_costos (id, nombre, descripcion, activo)
        VALUES (@id, @nombre, @descripcion, @activo)
      `);
    
    console.log(`✅ Centro de costos creado: ${id} - ${nombre}`);
    
    return res.status(201).json({
      success: true,
      message: 'Centro de costos creado exitosamente',
      data: { id, nombre, descripcion, activo }
    });
    
  } catch (error) {
    console.error('Error al crear centro de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Actualizar centro de costos
exports.updateCentroCosto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    
    console.log(`📝 Actualizando centro de costos: ${id}`);
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'Nombre es requerido'
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar que existe el centro de costos
    const existeResult = await pool.request()
      .input('id', sql.VarChar(10), id)
      .query('SELECT COUNT(*) as count FROM centros_costos WHERE id = @id');
    
    if (existeResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Centro de costos no encontrado'
      });
    }
    
    // Actualizar centro de costos
    await pool.request()
      .input('id', sql.VarChar(10), id)
      .input('nombre', sql.VarChar(100), nombre)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1)
      .query(`
        UPDATE centros_costos 
        SET nombre = @nombre, 
            descripcion = @descripcion, 
            activo = @activo,
            updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`✅ Centro de costos actualizado: ${id}`);
    
    return res.json({
      success: true,
      message: 'Centro de costos actualizado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al actualizar centro de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Eliminar centro de costos
exports.deleteCentroCosto = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando centro de costos: ${id}`);
    
    const pool = await poolPromise;
    
    // Verificar que existe
    const existeResult = await pool.request()
      .input('id', sql.VarChar(10), id)
      .query('SELECT COUNT(*) as count FROM centros_costos WHERE id = @id');
    
    if (existeResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Centro de costos no encontrado'
      });
    }
    
    // Verificar si tiene facturas asociadas (cuando exista la tabla)
    try {
      const facturasResult = await pool.request()
        .input('id', sql.VarChar(10), id)
        .query('SELECT COUNT(*) as count FROM facturas_xml WHERE id_centro_costo = @id');
      
      if (facturasResult.recordset[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el centro de costos porque tiene ${facturasResult.recordset[0].count} facturas asociadas`
        });
      }
    } catch (tableError) {
      console.log('Tabla facturas_xml no existe aún, continuando con eliminación');
    }
    
    // Eliminar centro de costos
    await pool.request()
      .input('id', sql.VarChar(10), id)
      .query('DELETE FROM centros_costos WHERE id = @id');
    
    console.log(`✅ Centro de costos eliminado: ${id}`);
    
    return res.json({
      success: true,
      message: 'Centro de costos eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar centro de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Cambiar estado (activar/desactivar)
exports.toggleEstadoCentroCosto = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    
    console.log(`🔄 Cambiando estado de centro de costos: ${id} a ${activo ? 'activo' : 'inactivo'}`);
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El valor de activo debe ser true o false'
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar que existe
    const existeResult = await pool.request()
      .input('id', sql.VarChar(10), id)
      .query('SELECT COUNT(*) as count FROM centros_costos WHERE id = @id');
    
    if (existeResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Centro de costos no encontrado'
      });
    }
    
    // Actualizar estado
    await pool.request()
      .input('id', sql.VarChar(10), id)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query(`
        UPDATE centros_costos 
        SET activo = @activo, updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`✅ Estado cambiado exitosamente: ${id}`);
    
    return res.json({
      success: true,
      message: `Centro de costos ${activo ? 'activado' : 'desactivado'} exitosamente`,
      activo: activo
    });
    
  } catch (error) {
    console.error('Error al cambiar estado del centro de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Buscar centros de costos
exports.searchCentrosCostos = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda'
      });
    }
    
    console.log(`🔍 Buscando centros de costos: ${q}`);
    
    const pool = await poolPromise;
    
    try {
      const result = await pool.request()
        .input('query', sql.VarChar, `%${q}%`)
        .query(`
          SELECT 
            cc.*,
            (SELECT COUNT(*) FROM facturas_xml WHERE id_centro_costo = cc.id) as total_facturas,
            (SELECT COALESCE(SUM(monto_total), 0) FROM facturas_xml WHERE id_centro_costo = cc.id) as monto_total
          FROM centros_costos cc
          WHERE cc.id LIKE @query 
             OR cc.nombre LIKE @query 
             OR cc.descripcion LIKE @query
          ORDER BY cc.nombre
        `);
      
      console.log(`✅ ${result.recordset.length} centros de costos encontrados`);
      
      return res.json({
        success: true,
        data: result.recordset
      });
    } catch (facturaError) {
      // Si hay error con facturas_xml, buscar sin subconsultas
      const result = await pool.request()
        .input('query', sql.VarChar, `%${q}%`)
        .query(`
          SELECT 
            *,
            0 as total_facturas,
            0 as monto_total
          FROM centros_costos
          WHERE id LIKE @query 
             OR nombre LIKE @query 
             OR descripcion LIKE @query
          ORDER BY nombre
        `);
      
      return res.json({
        success: true,
        data: result.recordset
      });
    }
    
  } catch (error) {
    console.error('Error en búsqueda de centros de costos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de centros de costos
exports.getEstadisticasCentrosCostos = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de centros de costos...');
    
    const pool = await poolPromise;
    
    // Estadísticas generales
    const generalResult = await pool.request()
      .query(`
        SELECT 
          COUNT(*) as total_centros,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as centros_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as centros_inactivos
        FROM centros_costos
      `);
    
    // Intentar obtener estadísticas de facturas (si la tabla existe)
    let estadisticasFacturas = {
      centros_con_facturas: 0,
      total_facturas: 0,
      monto_total_facturas: 0
    };
    
    try {
      const facturasResult = await pool.request()
        .query(`
          SELECT 
            COUNT(DISTINCT id_centro_costo) as centros_con_facturas,
            COUNT(*) as total_facturas,
            COALESCE(SUM(monto_total), 0) as monto_total_facturas
          FROM facturas_xml
        `);
      
      estadisticasFacturas = facturasResult.recordset[0];
    } catch (tableError) {
      console.log('Tabla facturas_xml no existe aún, usando valores por defecto');
    }
    
    // Top 5 centros por monto (si hay datos)
    let topCentros = [];
    try {
      const topCentrosResult = await pool.request()
        .query(`
          SELECT TOP 5
            cc.id,
            cc.nombre,
            COUNT(f.id) as total_facturas,
            COALESCE(SUM(f.monto_total), 0) as monto_total
          FROM centros_costos cc
          LEFT JOIN facturas_xml f ON cc.id = f.id_centro_costo
          WHERE cc.activo = 1
          GROUP BY cc.id, cc.nombre
          ORDER BY monto_total DESC
        `);
      
      topCentros = topCentrosResult.recordset;
    } catch (tableError) {
      console.log('Tabla facturas_xml no existe aún, top centros vacío');
    }
    
    const estadisticasCompletas = {
      ...generalResult.recordset[0],
      ...estadisticasFacturas
    };
    
    return res.json({
      success: true,
      data: {
        general: estadisticasCompletas,
        top_centros: topCentros
      }
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

module.exports = exports;