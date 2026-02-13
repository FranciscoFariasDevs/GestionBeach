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

// GET /api/resumen-valorizado/datos?fecha=2025-01-15
exports.getDatos = async (req, res) => {
  try {
    const fecha = req.query.fecha;
    if (!fecha) return res.status(400).json({ message: 'Se requiere fecha' });

    const pool = await getPoolGestion();
    const t0 = Date.now();

    const query = `
      SELECT SUCURSAL AS sucursal, CONVERT(NUMERIC, VALORIZADO) AS valorizado, FECHA AS fecha
      FROM (
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Rio Viejo 999, Chillan' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Tres Esquinas S/N Multitienda, Coelemu' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Vicente Palacios 2908, Tome' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Las Camelias 39, Tome' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Ruta el conquistador 1002, Quirihue' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Tres Esquinas S/N Ferreteria, Coelemu' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
        UNION ALL
        SELECT TOP 1 SUCURSAL, VALORIZADO, FECHA FROM TB_VALORIZADO_STOCK WHERE SUCURSAL = 'Vicente Palacios 3088, Tome' AND FORMAT(fecha, 'dd/MM/yyyy') = @fecha ORDER BY fecha DESC
      ) T
    `;

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
