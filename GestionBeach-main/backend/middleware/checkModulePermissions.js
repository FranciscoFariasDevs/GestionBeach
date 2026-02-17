// backend/middleware/checkModulePermissions.js
const { sql, poolPromise } = require('../config/db');

/**
 * Middleware para verificar permisos granulares por módulo y sucursal
 *
 * Uso:
 * router.get('/ventas', authMiddleware, checkModulePermissions('Ventas', 'leer'), ventasController.getVentas);
 * router.post('/ventas', authMiddleware, checkModulePermissions('Ventas', 'escribir'), ventasController.createVenta);
 */

const checkModulePermissions = (moduloNombre, tipoPermiso = 'leer') => {
  return async (req, res, next) => {
    try {
      console.log('\n🔐 === VERIFICANDO PERMISOS MODULARES ===');
      console.log(`📋 Módulo: ${moduloNombre}`);
      console.log(`🔑 Tipo permiso: ${tipoPermiso}`);

      // Obtener usuario del token JWT (añadido por authMiddleware)
      const usuario = req.user;
      if (!usuario || !usuario.id) {
        console.log('❌ Usuario no autenticado');
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      console.log(`👤 Usuario ID: ${usuario.id}`);

      const pool = await poolPromise;

      // Obtener perfil del usuario
      const userResult = await pool.request()
        .input('usuarioId', sql.Int, usuario.id)
        .query('SELECT perfil_id, nombre, email FROM usuarios WHERE id = @usuarioId');

      if (userResult.recordset.length === 0) {
        console.log('❌ Usuario no encontrado en BD');
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const perfilId = userResult.recordset[0].perfil_id;
      console.log(`📝 Perfil ID: ${perfilId}`);

      // Verificar si el perfil es Administrador (acceso total)
      const perfilResult = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .query('SELECT nombre FROM perfiles WHERE id = @perfilId');

      if (perfilResult.recordset.length > 0) {
        const perfilNombre = perfilResult.recordset[0].nombre;
        console.log(`👔 Perfil: ${perfilNombre}`);

        if (perfilNombre.toLowerCase() === 'administrador') {
          console.log('✅ Administrador - Acceso total concedido');
          return next();
        }
      }

      // Para solicitudes específicas a sucursales, verificar permiso granular
      const sucursalId = req.body?.sucursal_id || req.query?.sucursal_id || req.params?.sucursal_id;

      if (sucursalId) {
        console.log(`🏢 Verificando sucursal ID: ${sucursalId}`);

        // Verificar permiso específico para esta sucursal
        const permisoResult = await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloNombre', sql.VarChar, moduloNombre)
          .input('sucursalId', sql.Int, sucursalId)
          .query(`
            SELECT
              pms.puede_leer,
              pms.puede_escribir,
              pms.puede_exportar,
              s.nombre as sucursal_nombre
            FROM perfil_modulo_sucursal pms
              INNER JOIN modulos m ON m.id = pms.modulo_id
              INNER JOIN sucursales s ON s.id = pms.sucursal_id
            WHERE pms.perfil_id = @perfilId
              AND m.nombre = @moduloNombre
              AND pms.sucursal_id = @sucursalId
          `);

        if (permisoResult.recordset.length === 0) {
          console.log('❌ Sin permisos para esta sucursal en este módulo');
          return res.status(403).json({
            success: false,
            message: `No tiene permisos para acceder a la sucursal solicitada en el módulo ${moduloNombre}`
          });
        }

        const permiso = permisoResult.recordset[0];
        console.log(`🔍 Permisos encontrados:`, {
          leer: permiso.puede_leer,
          escribir: permiso.puede_escribir,
          exportar: permiso.puede_exportar
        });

        // Verificar el tipo de permiso solicitado
        let tienePermiso = false;
        switch (tipoPermiso.toLowerCase()) {
          case 'leer':
            tienePermiso = permiso.puede_leer === true || permiso.puede_leer === 1;
            break;
          case 'escribir':
            tienePermiso = permiso.puede_escribir === true || permiso.puede_escribir === 1;
            break;
          case 'exportar':
            tienePermiso = permiso.puede_exportar === true || permiso.puede_exportar === 1;
            break;
          default:
            tienePermiso = false;
        }

        if (!tienePermiso) {
          console.log(`❌ Sin permiso de ${tipoPermiso} para esta sucursal`);
          return res.status(403).json({
            success: false,
            message: `No tiene permiso de ${tipoPermiso} en esta sucursal`
          });
        }

        console.log(`✅ Permiso de ${tipoPermiso} verificado para sucursal: ${permiso.sucursal_nombre}`);

        // Añadir información de permisos al request para uso posterior
        req.permisos = {
          modulo: moduloNombre,
          sucursal_id: sucursalId,
          sucursal_nombre: permiso.sucursal_nombre,
          puede_leer: permiso.puede_leer,
          puede_escribir: permiso.puede_escribir,
          puede_exportar: permiso.puede_exportar
        };

        return next();
      } else {
        // Si no se especifica sucursal, verificar que el usuario tenga acceso al módulo
        console.log('📋 Verificando acceso general al módulo (sin sucursal específica)');

        const tieneAccesoModulo = await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloNombre', sql.VarChar, moduloNombre)
          .query(`
            SELECT COUNT(*) as total
            FROM perfil_modulo_sucursal pms
              INNER JOIN modulos m ON m.id = pms.modulo_id
            WHERE pms.perfil_id = @perfilId
              AND m.nombre = @moduloNombre
          `);

        if (tieneAccesoModulo.recordset[0].total === 0) {
          console.log('❌ Sin acceso al módulo');
          return res.status(403).json({
            success: false,
            message: `No tiene acceso al módulo ${moduloNombre}`
          });
        }

        console.log('✅ Acceso general al módulo verificado');

        // Obtener lista de sucursales permitidas para este módulo
        const sucursalesPermitidas = await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloNombre', sql.VarChar, moduloNombre)
          .query(`
            SELECT DISTINCT s.id, s.nombre
            FROM perfil_modulo_sucursal pms
              INNER JOIN modulos m ON m.id = pms.modulo_id
              INNER JOIN sucursales s ON s.id = pms.sucursal_id
            WHERE pms.perfil_id = @perfilId
              AND m.nombre = @moduloNombre
              AND pms.puede_leer = 1
            ORDER BY s.nombre
          `);

        // Añadir sucursales permitidas al request
        req.sucursalesPermitidas = sucursalesPermitidas.recordset;
        console.log(`📋 Sucursales permitidas: ${req.sucursalesPermitidas.length}`);

        return next();
      }

    } catch (error) {
      console.error('❌ Error verificando permisos modulares:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando permisos',
        error: error.message
      });
    }
  };
};

/**
 * Middleware simplificado para verificar solo acceso al módulo (sin sucursal específica)
 */
const checkModuleAccess = (moduloNombre) => {
  return async (req, res, next) => {
    try {
      const usuario = req.user;
      if (!usuario || !usuario.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const pool = await poolPromise;

      // Obtener perfil del usuario
      const userResult = await pool.request()
        .input('usuarioId', sql.Int, usuario.id)
        .query('SELECT perfil_id FROM usuarios WHERE id = @usuarioId');

      if (userResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const perfilId = userResult.recordset[0].perfil_id;

      // Verificar si el perfil es Administrador
      const perfilResult = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .query('SELECT nombre FROM perfiles WHERE id = @perfilId');

      if (perfilResult.recordset.length > 0 &&
          perfilResult.recordset[0].nombre.toLowerCase() === 'administrador') {
        return next();
      }

      // Verificar acceso al módulo
      const tieneAcceso = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloNombre', sql.VarChar, moduloNombre)
        .query(`
          SELECT COUNT(*) as total
          FROM perfil_modulo pm
            INNER JOIN modulos m ON m.id = pm.modulo_id
          WHERE pm.perfil_id = @perfilId
            AND m.nombre = @moduloNombre
        `);

      if (tieneAcceso.recordset[0].total === 0) {
        return res.status(403).json({
          success: false,
          message: `No tiene acceso al módulo ${moduloNombre}`
        });
      }

      next();

    } catch (error) {
      console.error('Error verificando acceso al módulo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando acceso',
        error: error.message
      });
    }
  };
};

module.exports = {
  checkModulePermissions,
  checkModuleAccess
};
