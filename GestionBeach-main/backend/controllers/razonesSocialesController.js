// backend/controllers/razonesSocialesController.js
const { sql, poolPromise } = require('../config/db');


exports.getRazonesSociales = async (req, res) => {
  try {
    // Obtener usuario desde token JWT
    
    // Obtener pool de conexión
    const pool = await poolPromise;
    
    // Obtener sucursales a las que el usuario tiene acceso
    const result = await pool.request()
      .query(`SELECT * FROM razones_sociales ORDER BY nombre_razon
      `);
    
    return res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener razones:', error);
    return res.status(500).json({ message: 'Error en el servidor pruebe denuevo' });
  }
};

// Obtener una razón social por ID
exports.getRazonSocialById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM razones_sociales WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Razón social no encontrada' });
    }
    
    return res.json({ success: true, razon_social: result.recordset[0] });
  } catch (error) {
    console.error('Error al obtener razón social:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

// Crear una nueva razón social
exports.createRazonSocial = async (req, res) => {
  try {
    console.log('Datos recibidos en createRazonSocial:', JSON.stringify(req.body, null, 2));
    
    const { rut, nombre_razon, giro, activo } = req.body;
    
    // Validar datos requeridos
    if (!rut || !nombre_razon) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos incompletos. RUT y nombre de razón social son obligatorios' 
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar si ya existe una razón social con el mismo RUT
    const checkResult = await pool.request()
      .input('rut', sql.NVarChar, rut)
      .query('SELECT COUNT(*) as count FROM razones_sociales WHERE rut = @rut');
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya existe una razón social con este RUT' 
      });
    }
    
    const now = new Date();
    
    // Insertar la nueva razón social
    const result = await pool.request()
      .input('rut', sql.NVarChar, rut)
      .input('nombre_razon', sql.NVarChar, nombre_razon)
      .input('giro', sql.NVarChar, giro || null)
      .input('activo', sql.Bit, activo === undefined ? 1 : (activo ? 1 : 0))
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .query(`
        INSERT INTO razones_sociales (rut, nombre_razon, giro, activo, created_at, updated_at)
        VALUES (@rut, @nombre_razon, @giro, @activo, @created_at, @updated_at);
        
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const nuevaId = result.recordset[0].id;
    
    console.log(`Razón social creada con ID: ${nuevaId}`);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Razón social creada exitosamente', 
      id: nuevaId
    });
  } catch (error) {
    console.error('Error completo al crear razón social:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Actualizar una razón social
exports.updateRazonSocial = async (req, res) => {
  try {
    console.log('Datos recibidos en updateRazonSocial:', JSON.stringify(req.body, null, 2));
    
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido' 
      });
    }
    
    const { rut, nombre_razon, giro, activo } = req.body;
    
    const pool = await poolPromise;
    
    // Verificar si la razón social existe
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM razones_sociales WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Razón social no encontrada' 
      });
    }
    
    // Verificar si el RUT ya existe en otra razón social
    if (rut !== undefined) {
      const rutCheckResult = await pool.request()
        .input('rut', sql.NVarChar, rut)
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM razones_sociales WHERE rut = @rut AND id != @id');
      
      if (rutCheckResult.recordset[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe otra razón social con este RUT' 
        });
      }
    }
    
    // Preparar campos a actualizar
    const updateFields = [];
    const inputParams = {
      id: { type: sql.Int, value: id },
      updated_at: { type: sql.DateTime, value: new Date() }
    };
    
    if (rut !== undefined) {
      updateFields.push('rut = @rut');
      inputParams.rut = { type: sql.NVarChar, value: rut };
    }
    
    if (nombre_razon !== undefined) {
      updateFields.push('nombre_razon = @nombre_razon');
      inputParams.nombre_razon = { type: sql.NVarChar, value: nombre_razon };
    }
    
    if (giro !== undefined) {
      updateFields.push('giro = @giro');
      inputParams.giro = { type: sql.NVarChar, value: giro };
    }
    
    if (activo !== undefined) {
      updateFields.push('activo = @activo');
      inputParams.activo = { type: sql.Bit, value: activo ? 1 : 0 };
    }
    
    // Siempre actualizar updated_at
    updateFields.push('updated_at = @updated_at');
    
    if (updateFields.length === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se proporcionaron datos para actualizar' 
      });
    }
    
    // Construir y ejecutar la consulta
    const updateQuery = `
      UPDATE razones_sociales
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `;
    
    const request = pool.request();
    
    for (const [paramName, paramData] of Object.entries(inputParams)) {
      request.input(paramName, paramData.type, paramData.value);
    }
    
    await request.query(updateQuery);
    
    return res.json({ 
      success: true, 
      message: 'Razón social actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en updateRazonSocial:', error);
    
    let errorMessage = 'Error en el servidor';
    
    if (error.number === 2627) {
      errorMessage = 'Error: Ya existe un registro con esa información';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: error.message
    });
  }
};

// Eliminar una razón social
exports.deleteRazonSocial = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido' 
      });
    }
    
    const pool = await poolPromise;
    
    // Verificar si la razón social existe
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM razones_sociales WHERE id = @id');
    
    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Razón social no encontrada' 
      });
    }
    
    // Verificar si hay empleados asociados
    const empleadosResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM empleados WHERE id_razon_social = @id');
    
    if (empleadosResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar la razón social porque tiene empleados asociados',
        error: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    // Verificar si hay sucursales asociadas
    const sucursalesResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM sucursales_razones_sociales WHERE id_razon_social = @id');
    
    if (sucursalesResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar la razón social porque tiene sucursales asociadas',
        error: 'FOREIGN_KEY_CONSTRAINT'
      });
    }
    
    // Eliminar la razón social
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM razones_sociales WHERE id = @id');
    
    console.log(`Razón social con ID ${id} eliminada permanentemente de la base de datos`);
    
    return res.json({ 
      success: true, 
      message: 'Razón social eliminada permanentemente de la base de datos' 
    });
  } catch (error) {
    console.error('Error al eliminar razón social:', error);
    
    if (error.message && error.message.includes('REFERENCE constraint')) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar la razón social porque tiene registros relacionados en otras tablas.',
        error: 'FOREIGN_KEY_CONSTRAINT' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Cambiar estado (activar/desactivar) de una razón social
exports.toggleActiveStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { activo } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de razón social debe ser un número válido' 
      });
    }
    
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'El valor de activo debe ser true o false' 
      });
    }
    
    const pool = await poolPromise;
    
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM razones_sociales WHERE id = @id');
    
    if (checkResult.recordset[0].count === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Razón social no encontrada' 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('UPDATE razones_sociales SET activo = @activo, updated_at = GETDATE() WHERE id = @id');
    
    return res.json({ 
      success: true, 
      message: `Razón social ${activo ? 'activada' : 'desactivada'} exitosamente` 
    });
  } catch (error) {
    console.error('Error al cambiar estado de la razón social:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// Buscar razones sociales
exports.searchRazonesSociales = async (req, res) => {
  try {
    const query = req.query.query;
    const showInactive = req.query.showInactive === 'true';
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere un término de búsqueda' 
      });
    }
    
    const pool = await poolPromise;
    
    let sqlQuery = `
      SELECT * FROM razones_sociales 
      WHERE (rut LIKE @query OR nombre_razon LIKE @query OR giro LIKE @query)
    `;
    
    if (!showInactive) {
      sqlQuery += ' AND activo = 1';
    }
    
    sqlQuery += ' ORDER BY nombre_razon';
    
    const result = await pool.request()
      .input('query', sql.VarChar, `%${query}%`)
      .query(sqlQuery);
    
    return res.json({ success: true, razones_sociales: result.recordset });
  } catch (error) {
    console.error('Error al buscar razones sociales:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

// Obtener estadísticas de razones sociales
exports.getRazonesSocialesStats = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    // Contar razones sociales por estado (activo/inactivo)
    const estadoResult = await pool.request()
      .query(`
        SELECT 
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activas,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivas,
          COUNT(*) as total
        FROM razones_sociales
      `);
    
    // Contar empleados por razón social
    const empleadosResult = await pool.request()
      .query(`
        SELECT 
          rs.nombre_razon,
          COUNT(e.id) as total_empleados
        FROM razones_sociales rs
        LEFT JOIN empleados e ON rs.id = e.id_razon_social
        GROUP BY rs.id, rs.nombre_razon
        ORDER BY total_empleados DESC
      `);
    
    // Contar sucursales por razón social
    const sucursalesResult = await pool.request()
      .query(`
        SELECT 
          rs.nombre_razon,
          COUNT(srs.id_sucursal) as total_sucursales
        FROM razones_sociales rs
        LEFT JOIN sucursales_razones_sociales srs ON rs.id = srs.id_razon_social AND srs.activo = 1
        GROUP BY rs.id, rs.nombre_razon
        ORDER BY total_sucursales DESC
      `);
    
    return res.json({ 
      success: true, 
      estadisticas: {
        por_estado: estadoResult.recordset[0],
        empleados_por_razon: empleadosResult.recordset,
        sucursales_por_razon: sucursalesResult.recordset
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de razones sociales:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor',
      error: error.message
    });
  }
};