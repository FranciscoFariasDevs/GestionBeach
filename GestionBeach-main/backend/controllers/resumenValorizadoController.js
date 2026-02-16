// backend/controllers/resumenValorizadoController.js - Resumen Valorizado (migrado de Resumen Valorizado.vb)
const { sql, poolPromise } = require('../config/db');

// Conexión a BD Gestion (192.168.4.1) donde está TB_VALORIZADO_STOCK
let poolGestion = null;

const getPoolGestion = async () => {
  if (poolGestion && poolGestion.connected) return poolGestion;
  // Obtener datos de conexión desde sucursal RIO VIEJO (tiene IP 192.168.4.1)
  const pool = await poolPromise;
  const result = await pool.request()
    .query("SELECT ip, usuario, contrasena, puerto FROM sucursales WHERE nombre LIKE '%RIO VIEJO%' AND ip IS NOT NULL");
  const suc = result.recordset[0];
  if (!suc) throw new Error('No se encontró sucursal para BD Gestion');

  const config = {
    user: suc.usuario, password: suc.contrasena || '',
    server: suc.ip, port: suc.puerto || 1433, database: 'Gestion',
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 30000, connectionTimeout: 10000 },
    pool: { max: 3, min: 0, idleTimeoutMillis: 60000 }
  };
  poolGestion = await new sql.ConnectionPool(config).connect();
  return poolGestion;
};

// Mapeo de nombres de sucursales entre BD principal y TB_VALORIZADO_STOCK
const MAPEO_SUCURSALES = {
  'RIO VIEJO 999, CHILLAN': 'Rio Viejo 999, Chillan',
  'TRES ESQUINAS S/N, COELEMU MU': 'Tres Esquinas S/N Multitienda, Coelemu',
  'VICENTE PALACIOS 2908, TOME': 'Vicente Palacios 2908, Tome',
  'LAS CAMELIAS 39, TOME': 'Las Camelias 39, Tome',
  'RUTA EL CONQUISTADOR 1002, QUIRIHUE': 'Ruta el conquistador 1002, Quirihue',
  'TRES ESQUINAS S/N, COELEMU FE': 'Tres Esquinas S/N Ferreteria, Coelemu',
  'VICENTE PALACIOS 3088, TOME': 'Vicente Palacios 3088, Tome'
};

// GET /api/resumen-valorizado/datos?fecha=2025-01-15
exports.getDatos = async (req, res) => {
  try {
    const fecha = req.query.fecha;
    if (!fecha) return res.status(400).json({ message: 'Se requiere fecha' });

    const perfilId = req.user?.perfilId;

    console.log('🔍 [Resumen Valorizado] getDatos - usuario:', req.user);

    if (!perfilId) {
      console.log('❌ [Resumen Valorizado] Token sin perfilId - requiere re-login');
      return res.status(401).json({
        message: 'Sesión expirada - por favor inicie sesión nuevamente',
        requiresRelogin: true
      });
    }

    // Obtener ID del módulo "Resumen Valorizado"
    const poolMain = await poolPromise;
    const moduloResult = await poolMain.request()
      .input('nombre', sql.VarChar, 'Resumen Valorizado')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Módulo Resumen Valorizado no encontrado' });
    }

    const moduloId = moduloResult.recordset[0].id;

    // Obtener sucursales permitidas para este perfil y módulo
    const sucursalesPermitidas = await poolMain.request()
      .input('perfilId', sql.Int, perfilId)
      .input('moduloId', sql.Int, moduloId)
      .query(`
        SELECT DISTINCT s.nombre
        FROM sucursales s
        INNER JOIN perfil_modulo_sucursal pms ON pms.sucursal_id = s.id
        WHERE pms.perfil_id = @perfilId
          AND pms.modulo_id = @moduloId
        ORDER BY s.nombre
      `);

    const sucursalesNombres = sucursalesPermitidas.recordset.map(s => s.nombre.toUpperCase());

    console.log(`[Resumen Valorizado] Perfil ${perfilId} tiene acceso a ${sucursalesNombres.length} sucursales:`, sucursalesNombres);

    // Filtrar sucursales según permisos
    const sucursalesAConsultar = [];
    for (const [nombreBD, nombreValorizado] of Object.entries(MAPEO_SUCURSALES)) {
      if (sucursalesNombres.includes(nombreBD)) {
        sucursalesAConsultar.push(nombreValorizado);
      }
    }

    if (sucursalesAConsultar.length === 0) {
      console.log('⚠️ [Resumen Valorizado] Usuario sin sucursales permitidas');
      return res.json({ datos: [], total: 0, tiempo_ms: 0 });
    }

    console.log(`[Resumen Valorizado] Consultando ${sucursalesAConsultar.length} sucursales:`, sucursalesAConsultar);

    // Construir query dinámico con las sucursales permitidas
    const unionQueries = sucursalesAConsultar.map(sucursal =>
      `SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = '${sucursal}' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC`
    );

    const query = `
      SELECT SUCURSAL AS sucursal, CONVERT(NUMERIC, VALORIZADO) AS valorizado, FECHA AS fecha
      FROM (
        ${unionQueries.join('\n        UNION ALL\n        ')}
      ) T
    `;

    const pool = await getPoolGestion();
    const t0 = Date.now();

    const result = await pool.request()
      .input('fecha', sql.VarChar, fecha)
      .query(query);

    const datos = result.recordset;
    const totalValorizado = datos.reduce((s, d) => s + (d.valorizado || 0), 0);

    const ms = Date.now() - t0;
    console.log(`[Resumen Valorizado] ${datos.length} sucursales, total: ${totalValorizado} en ${ms}ms`);

    res.json({ datos, total: totalValorizado, tiempo_ms: ms });
  } catch (error) {
    console.error('Error en resumen valorizado:', error);
    res.status(500).json({ message: 'Error al consultar resumen valorizado', error: error.message });
  }
};
