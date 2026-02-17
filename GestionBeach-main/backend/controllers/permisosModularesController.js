// backend/controllers/permisosModularesController.js - VERSIÓN SIMPLIFICADA
const { sql, poolPromise } = require('../config/db');

/**
 * Obtener sucursales permitidas para un perfil en un módulo específico
 */
exports.getSucursalesPermitidas = async (req, res) => {
  try {
    const { perfil_id, modulo_id } = req.query;

    if (!perfil_id || !modulo_id) {
      return res.status(400).json({
        success: false,
        message: 'perfil_id y modulo_id son requeridos'
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .input('moduloId', sql.Int, modulo_id)
      .query(`
        SELECT
          s.id,
          s.nombre,
          s.tipo_sucursal,
          s.direccion
        FROM perfil_modulo_sucursal pms
          INNER JOIN sucursales s ON s.id = pms.sucursal_id
        WHERE pms.perfil_id = @perfilId
          AND pms.modulo_id = @moduloId
        ORDER BY s.nombre
      `);

    res.json({
      success: true,
      sucursales: result.recordset
    });

  } catch (error) {
    console.error('Error obteniendo sucursales permitidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo sucursales permitidas',
      error: error.message
    });
  }
};

/**
 * Asignar sucursales a un perfil para un módulo específico - VERSIÓN SIMPLIFICADA
 */
exports.asignarSucursalesModulo = async (req, res) => {
  try {
    const { perfil_id, modulo_id, sucursales } = req.body;

    console.log('🔄 Asignando sucursales a perfil/módulo:', { perfil_id, modulo_id, sucursales });

    if (!perfil_id || !modulo_id || !Array.isArray(sucursales)) {
      return res.status(400).json({
        success: false,
        message: 'perfil_id, modulo_id y sucursales (array) son requeridos'
      });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // Eliminar asignaciones existentes para este perfil/módulo
      await transaction.request()
        .input('perfilId', sql.Int, perfil_id)
        .input('moduloId', sql.Int, modulo_id)
        .query(`
          DELETE FROM perfil_modulo_sucursal
          WHERE perfil_id = @perfilId AND modulo_id = @moduloId
        `);

      // Insertar nuevas asignaciones (SIMPLIFICADO: solo sucursal, sin permisos)
      for (const sucursal of sucursales) {
        await transaction.request()
          .input('perfilId', sql.Int, perfil_id)
          .input('moduloId', sql.Int, modulo_id)
          .input('sucursalId', sql.Int, sucursal.id)
          .query(`
            INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id)
            VALUES (@perfilId, @moduloId, @sucursalId)
          `);
      }

      await transaction.commit();

      console.log(`✅ ${sucursales.length} sucursales asignadas correctamente`);

      res.json({
        success: true,
        message: 'Sucursales asignadas correctamente',
        total_asignadas: sucursales.length
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error asignando sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error asignando sucursales',
      error: error.message
    });
  }
};

/**
 * Obtener resumen completo de permisos de un perfil
 */
exports.getResumenPermisosPerfil = async (req, res) => {
  try {
    const { perfil_id } = req.params;

    if (!perfil_id) {
      return res.status(400).json({
        success: false,
        message: 'perfil_id es requerido'
      });
    }

    const pool = await poolPromise;

    // Obtener información del perfil
    const perfilResult = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .query('SELECT id, nombre, descripcion FROM perfiles WHERE id = @perfilId');

    if (perfilResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Perfil no encontrado'
      });
    }

    const perfil = perfilResult.recordset[0];

    // Obtener módulos con sus sucursales
    const modulosResult = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .query(`
        SELECT DISTINCT
          m.id as modulo_id,
          m.nombre as modulo_nombre
        FROM modulos m
        INNER JOIN perfil_modulo_sucursal pms ON pms.modulo_id = m.id
        WHERE pms.perfil_id = @perfilId
        ORDER BY m.nombre
      `);

    const modulos = [];

    for (const modulo of modulosResult.recordset) {
      const sucursalesResult = await pool.request()
        .input('perfilId', sql.Int, perfil_id)
        .input('moduloId', sql.Int, modulo.modulo_id)
        .query(`
          SELECT
            s.id,
            s.nombre,
            s.tipo_sucursal
          FROM perfil_modulo_sucursal pms
          INNER JOIN sucursales s ON s.id = pms.sucursal_id
          WHERE pms.perfil_id = @perfilId AND pms.modulo_id = @moduloId
          ORDER BY s.nombre
        `);

      modulos.push({
        modulo_id: modulo.modulo_id,
        modulo_nombre: modulo.modulo_nombre,
        sucursales: sucursalesResult.recordset
      });
    }

    res.json({
      success: true,
      perfil,
      modulos
    });

  } catch (error) {
    console.error('Error obteniendo resumen de permisos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen de permisos',
      error: error.message
    });
  }
};

/**
 * Obtener sucursales permitidas para el usuario autenticado en un módulo
 */
exports.getMisSucursalesPermitidas = async (req, res) => {
  try {
    const { modulo_nombre } = req.query;
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!modulo_nombre) {
      return res.status(400).json({
        success: false,
        message: 'modulo_nombre es requerido'
      });
    }

    const pool = await poolPromise;

    // Obtener perfil del usuario
    const usuarioResult = await pool.request()
      .input('usuarioId', sql.Int, usuarioId)
      .query('SELECT perfil_id FROM usuarios WHERE id = @usuarioId');

    if (usuarioResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const perfil_id = usuarioResult.recordset[0].perfil_id;

    // Obtener sucursales permitidas
    const result = await pool.request()
      .input('perfilId', sql.Int, perfil_id)
      .input('moduloNombre', sql.VarChar, modulo_nombre)
      .query(`
        SELECT DISTINCT
          s.id,
          s.nombre,
          s.tipo_sucursal
        FROM perfil_modulo_sucursal pms
        INNER JOIN modulos m ON m.id = pms.modulo_id
        INNER JOIN sucursales s ON s.id = pms.sucursal_id
        WHERE pms.perfil_id = @perfilId
          AND m.nombre = @moduloNombre
        ORDER BY s.nombre
      `);

    res.json({
      success: true,
      sucursales: result.recordset
    });

  } catch (error) {
    console.error('Error obteniendo mis sucursales permitidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo sucursales permitidas',
      error: error.message
    });
  }
};
