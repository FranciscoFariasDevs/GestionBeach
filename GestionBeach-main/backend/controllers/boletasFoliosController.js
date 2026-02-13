// backend/controllers/boletasFoliosController.js - Boletas y Folios por Sucursal
const { sql, poolPromise } = require('../config/db');

// Helper para crear conexión a sucursal
const conectarSucursal = async (sucursal) => {
  const config = {
    user: sucursal.usuario,
    password: sucursal.contrasena || '',
    server: sucursal.ip,
    port: sucursal.puerto || 1433,
    database: sucursal.base_datos,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 15000,
      connectionTimeout: 10000
    },
    pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }
  };

  return await Promise.race([
    new sql.ConnectionPool(config).connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión')), 10000))
  ]);
};

// Obtener boletas y folios de TODAS las sucursales para un mes/año
exports.getBoletasFolios = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    console.log('Boletas y Folios:', { year, month });

    const pool = await poolPromise;

    const sucursalesResult = await pool.request()
      .query(`
        SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto
        FROM sucursales
        WHERE tipo_sucursal IN ('FERRETERIA', 'MULTITIENDA')
        ORDER BY id
      `);

    const sucursales = sucursalesResult.recordset;
    console.log(`Procesando ${sucursales.length} sucursales para boletas`);

    const resultados = [];

    for (const sucursal of sucursales) {
      try {
        if (!sucursal.ip || !sucursal.base_datos || !sucursal.usuario) {
          resultados.push({
            sucursal_id: sucursal.id,
            nombre: sucursal.nombre,
            tipo_sucursal: sucursal.tipo_sucursal,
            error: 'Sin datos de conexión',
            boletas: [],
            resumen: { total_sistema: 0, cantidad_boletas: 0, folio_min: 0, folio_max: 0 }
          });
          continue;
        }

        let poolSucursal;
        try {
          poolSucursal = await conectarSucursal(sucursal);
        } catch (connectionError) {
          resultados.push({
            sucursal_id: sucursal.id,
            nombre: sucursal.nombre,
            tipo_sucursal: sucursal.tipo_sucursal,
            error: connectionError.message,
            boletas: [],
            resumen: { total_sistema: 0, cantidad_boletas: 0, folio_min: 0, folio_max: 0 }
          });
          continue;
        }

        try {
          // Agrupar por día: MIN folio, MAX folio, SUM total
          const result = await poolSucursal.request()
            .input('year', sql.Int, year)
            .input('month', sql.Int, month)
            .query(`
              SELECT
                DAY(RBO_FECHA_INGRESO) AS dia,
                MIN(RBO_NUMERO_BOLETA) AS folio_min,
                MAX(RBO_NUMERO_BOLETA) AS folio_max,
                SUM(RBO_TOTAL) AS total,
                COUNT(*) AS cantidad
              FROM ERP_FACT_RES_BOLETAS
              WHERE YEAR(RBO_FECHA_INGRESO) = @year
                AND MONTH(RBO_FECHA_INGRESO) = @month
              GROUP BY DAY(RBO_FECHA_INGRESO)
              ORDER BY DAY(RBO_FECHA_INGRESO) ASC
            `);

          // Detectar saltos de CAF: si un día tiene folios muy lejanos al día anterior,
          // significa que hubo cambio de talonario. Separar solo esos casos.
          const rangosBase = result.recordset.map(row => ({
            dia: row.dia,
            folio_desde: row.folio_min,
            folio_hasta: row.folio_max,
            total: row.total,
            cantidad: row.cantidad
          }));

          // Detectar si dentro de un día hay salto de CAF (>10000 folios entre min y max
          // comparado con la cantidad de boletas). Si max-min >> cantidad, hay salto.
          // Para esos casos, hacer query detallada.
          const rangos = [];
          for (const r of rangosBase) {
            const rango = r.folio_hasta - r.folio_desde;
            // Si el rango de folios es >10000 más que la cantidad, hay salto de CAF
            if (rango > r.cantidad + 10000) {
              // Query detallada para separar los rangos de CAF de este día
              const detalle = await poolSucursal.request()
                .input('year2', sql.Int, year)
                .input('month2', sql.Int, month)
                .input('dia', sql.Int, r.dia)
                .query(`
                  SELECT RBO_NUMERO_BOLETA AS folio, RBO_TOTAL AS total
                  FROM ERP_FACT_RES_BOLETAS
                  WHERE YEAR(RBO_FECHA_INGRESO) = @year2
                    AND MONTH(RBO_FECHA_INGRESO) = @month2
                    AND DAY(RBO_FECHA_INGRESO) = @dia
                  ORDER BY RBO_NUMERO_BOLETA ASC
                `);

              let subRango = null;
              for (const row of detalle.recordset) {
                if (!subRango || row.folio > subRango.folio_hasta + 10000) {
                  if (subRango) rangos.push(subRango);
                  subRango = { dia: r.dia, folio_desde: row.folio, folio_hasta: row.folio, total: row.total, cantidad: 1 };
                } else {
                  if (row.folio > subRango.folio_hasta) subRango.folio_hasta = row.folio;
                  subRango.total += row.total;
                  subRango.cantidad++;
                }
              }
              if (subRango) rangos.push(subRango);
            } else {
              rangos.push(r);
            }
          }

          const totalSistema = rangos.reduce((sum, b) => sum + (b.total || 0), 0);
          const cantidadTotal = rangos.reduce((sum, b) => sum + (b.cantidad || 0), 0);
          const folioMin = rangos.length > 0 ? Math.min(...rangos.map(b => b.folio_desde)) : 0;
          const folioMax = rangos.length > 0 ? Math.max(...rangos.map(b => b.folio_hasta)) : 0;

          resultados.push({
            sucursal_id: sucursal.id,
            nombre: sucursal.nombre,
            tipo_sucursal: sucursal.tipo_sucursal,
            boletas: rangos,
            resumen: {
              total_sistema: totalSistema,
              cantidad_boletas: cantidadTotal,
              folio_min: folioMin,
              folio_max: folioMax,
              dias_con_venta: [...new Set(rangos.map(b => b.dia))].length
            }
          });

          console.log(`${sucursal.nombre}: ${rangos.length} rangos, total $${totalSistema.toLocaleString()}`);
        } finally {
          try { await poolSucursal.close(); } catch {}
        }
      } catch (error) {
        console.error(`Error procesando ${sucursal.nombre}:`, error.message);
        resultados.push({
          sucursal_id: sucursal.id,
          nombre: sucursal.nombre,
          tipo_sucursal: sucursal.tipo_sucursal,
          error: error.message,
          boletas: [],
          resumen: { total_sistema: 0, cantidad_boletas: 0, folio_min: 0, folio_max: 0 }
        });
      }
    }

    res.json({ year, month, sucursales: resultados });

  } catch (error) {
    console.error('Error en getBoletasFolios:', error);
    res.status(500).json({ message: 'Error al obtener boletas y folios', error: error.message });
  }
};

// Reintentar una sucursal específica (mismo formato que el endpoint general)
exports.getBoletasDetalle = async (req, res) => {
  try {
    const { sucursalId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

    const pool = await poolPromise;

    const sucursalResult = await pool.request()
      .input('sucursal_id', sql.Int, sucursalId)
      .query('SELECT id, nombre, ip, base_datos, usuario, contrasena, tipo_sucursal, puerto FROM sucursales WHERE id = @sucursal_id');

    if (sucursalResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    const sucursal = sucursalResult.recordset[0];

    let poolSucursal;
    try {
      poolSucursal = await conectarSucursal(sucursal);
    } catch (connectionError) {
      return res.json({
        sucursal_id: sucursal.id,
        nombre: sucursal.nombre,
        tipo_sucursal: sucursal.tipo_sucursal,
        error: connectionError.message,
        boletas: [],
        resumen: { total_sistema: 0, cantidad_boletas: 0, folio_min: 0, folio_max: 0, dias_con_venta: 0 }
      });
    }

    try {
      // Agrupar por día: MIN folio, MAX folio, SUM total
      const result = await poolSucursal.request()
        .input('year', sql.Int, year)
        .input('month', sql.Int, month)
        .query(`
          SELECT
            DAY(RBO_FECHA_INGRESO) AS dia,
            MIN(RBO_NUMERO_BOLETA) AS folio_min,
            MAX(RBO_NUMERO_BOLETA) AS folio_max,
            SUM(RBO_TOTAL) AS total,
            COUNT(*) AS cantidad
          FROM ERP_FACT_RES_BOLETAS
          WHERE YEAR(RBO_FECHA_INGRESO) = @year
            AND MONTH(RBO_FECHA_INGRESO) = @month
          GROUP BY DAY(RBO_FECHA_INGRESO)
          ORDER BY DAY(RBO_FECHA_INGRESO) ASC
        `);

      const rangosBase = result.recordset.map(row => ({
        dia: row.dia,
        folio_desde: row.folio_min,
        folio_hasta: row.folio_max,
        total: row.total,
        cantidad: row.cantidad
      }));

      const rangos = [];
      for (const r of rangosBase) {
        const rango = r.folio_hasta - r.folio_desde;
        if (rango > r.cantidad + 10000) {
          const detalle = await poolSucursal.request()
            .input('year2', sql.Int, year)
            .input('month2', sql.Int, month)
            .input('dia', sql.Int, r.dia)
            .query(`
              SELECT RBO_NUMERO_BOLETA AS folio, RBO_TOTAL AS total
              FROM ERP_FACT_RES_BOLETAS
              WHERE YEAR(RBO_FECHA_INGRESO) = @year2
                AND MONTH(RBO_FECHA_INGRESO) = @month2
                AND DAY(RBO_FECHA_INGRESO) = @dia
              ORDER BY RBO_NUMERO_BOLETA ASC
            `);

          let subRango = null;
          for (const row of detalle.recordset) {
            if (!subRango || row.folio > subRango.folio_hasta + 10000) {
              if (subRango) rangos.push(subRango);
              subRango = { dia: r.dia, folio_desde: row.folio, folio_hasta: row.folio, total: row.total, cantidad: 1 };
            } else {
              if (row.folio > subRango.folio_hasta) subRango.folio_hasta = row.folio;
              subRango.total += row.total;
              subRango.cantidad++;
            }
          }
          if (subRango) rangos.push(subRango);
        } else {
          rangos.push(r);
        }
      }

      const totalSistema = rangos.reduce((sum, b) => sum + (b.total || 0), 0);
      const cantidadTotal = rangos.reduce((sum, b) => sum + (b.cantidad || 0), 0);
      const folioMin = rangos.length > 0 ? Math.min(...rangos.map(b => b.folio_desde)) : 0;
      const folioMax = rangos.length > 0 ? Math.max(...rangos.map(b => b.folio_hasta)) : 0;

      res.json({
        sucursal_id: sucursal.id,
        nombre: sucursal.nombre,
        tipo_sucursal: sucursal.tipo_sucursal,
        boletas: rangos,
        resumen: {
          total_sistema: totalSistema,
          cantidad_boletas: cantidadTotal,
          folio_min: folioMin,
          folio_max: folioMax,
          dias_con_venta: [...new Set(rangos.map(b => b.dia))].length
        }
      });
    } finally {
      try { await poolSucursal.close(); } catch {}
    }

  } catch (error) {
    console.error('Error en getBoletasDetalle:', error);
    res.status(500).json({ message: 'Error al reintentar sucursal', error: error.message });
  }
};
