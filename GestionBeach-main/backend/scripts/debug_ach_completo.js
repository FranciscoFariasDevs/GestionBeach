// Debug completo del ACH - Noviembre 2025
const { sql, poolPromise } = require('../config/db');

async function debugACH() {
  try {
    const pool = await poolPromise;
    console.log('🔍 === DEBUG COMPLETO ACH NOVIEMBRE 2025 ===\n');

    // 1. Ver TODOS los datos de remuneraciones de noviembre 2025
    console.log('1️⃣ TODOS los datos de remuneraciones noviembre 2025:');
    const allRem = await pool.request().query(`
      SELECT
        dr.id,
        dr.id_periodo,
        dr.rut_empleado,
        dr.nombre_empleado,
        dr.total_imponibles,
        dr.imposiciones,
        dr.liquido_pagar,
        dr.total_haberes,
        pr.mes,
        pr.anio
      FROM datos_remuneraciones dr
      INNER JOIN periodos_remuneracion pr ON pr.id_periodo = dr.id_periodo
      WHERE pr.anio = 2025 AND pr.mes = 11
    `);

    console.log(`Total registros: ${allRem.recordset.length}`);
    allRem.recordset.forEach(r => {
      console.log(`  ID:${r.id} | ${r.nombre_empleado} | total_imponibles: ${r.total_imponibles} | imposiciones: ${r.imposiciones} | liquido: ${r.liquido_pagar}`);
    });

    // 2. Ver estructura de la tabla datos_remuneraciones
    console.log('\n2️⃣ Estructura de columnas de datos_remuneraciones:');
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'datos_remuneraciones'
      ORDER BY ORDINAL_POSITION
    `);
    columns.recordset.forEach(c => {
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}) - nullable: ${c.IS_NULLABLE}`);
    });

    // 3. Verificar si existe la columna total_imponibles
    console.log('\n3️⃣ Verificando columna total_imponibles específicamente:');
    const hasColumn = columns.recordset.find(c => c.COLUMN_NAME === 'total_imponibles');
    if (hasColumn) {
      console.log(`  ✅ Columna existe: ${hasColumn.COLUMN_NAME} (${hasColumn.DATA_TYPE})`);
    } else {
      console.log('  ❌ NO EXISTE la columna total_imponibles!');
    }

    // 4. Ver porcentajes por periodo para noviembre
    console.log('\n4️⃣ Porcentajes por período noviembre 2025:');
    const porc = await pool.request().query(`
      SELECT
        pp.*,
        rs.nombre_razon,
        pr.mes,
        pr.anio
      FROM porcentajes_por_periodo pp
      INNER JOIN periodos_remuneracion pr ON pr.id_periodo = pp.id_periodo
      LEFT JOIN razones_sociales rs ON rs.id = pp.id_razon_social
      WHERE pr.anio = 2025 AND pr.mes = 11
    `);
    porc.recordset.forEach(p => {
      console.log(`  Razón: ${p.nombre_razon} | ACH: ${p.ach}% | caja: ${p.caja_compen}% | afc: ${p.afc}% | sis: ${p.sis}%`);
    });

    // 5. Ver estados de resultados guardados para noviembre
    console.log('\n5️⃣ Estados de resultados guardados noviembre 2025:');
    const estados = await pool.request().query(`
      SELECT
        id,
        sucursal_nombre,
        razon_social_nombre,
        mes,
        anio,
        datos_originales_json
      FROM estados_resultados
      WHERE anio = 2025 AND mes = 11
    `);

    estados.recordset.forEach(e => {
      console.log(`\n  📊 ID:${e.id} | ${e.sucursal_nombre} | ${e.razon_social_nombre}`);
      if (e.datos_originales_json) {
        try {
          const datos = JSON.parse(e.datos_originales_json);
          if (datos.detalleRemuneraciones) {
            console.log(`     total_ach guardado: ${datos.detalleRemuneraciones.total_ach}`);
            console.log(`     total_imponibles guardado: ${datos.detalleRemuneraciones.total_imponibles || 'NO EXISTE'}`);
          }
        } catch (err) {
          console.log(`     Error parseando JSON: ${err.message}`);
        }
      }
    });

    // 6. Simular el cálculo exacto que hace el controller
    console.log('\n6️⃣ SIMULACIÓN del cálculo del controller para Enrique Molina (ID 5):');

    const sucursalId = 5;
    const anio = 2025;
    const mes = 11;

    // Obtener período
    const periodoRes = await pool.request()
      .input('anio', sql.Int, anio)
      .input('mes', sql.Int, mes)
      .query('SELECT id_periodo FROM periodos_remuneracion WHERE anio = @anio AND mes = @mes');

    const idPeriodo = periodoRes.recordset[0]?.id_periodo;
    console.log(`  Período ID: ${idPeriodo}`);

    // Ejecutar el MISMO query que usa el controller
    const remuneracionesQuery = `
      SELECT
        dr.liquido_pagar,
        dr.total_imponibles,
        dr.imposiciones,
        dr.rut_empleado,
        dr.nombre_empleado,
        pr.mes,
        pr.anio,
        COALESCE(es.id_sucursal, @sucursal_id) as id_sucursal,
        e.id AS id_empleado,
        e.id_razon_social,
        COALESCE(ems.num_sucursales, 1) as num_sucursales,
        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1 THEN 'ADMINISTRATIVO'
          ELSE 'VENTAS'
        END as tipo_empleado,
        CASE
          WHEN COALESCE(ems.num_sucursales, 1) > 1
          THEN CAST(dr.total_imponibles AS DECIMAL(18,2)) / CAST(ems.num_sucursales AS DECIMAL(18,2))
          ELSE CAST(dr.total_imponibles AS DECIMAL(18,2))
        END as total_imponibles_asignado
      FROM datos_remuneraciones AS dr
      INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
      INNER JOIN empleados AS e ON
        REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
        REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
      LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
      LEFT JOIN (
        SELECT id_empleado, COUNT(*) as num_sucursales
        FROM empleados_sucursales
        WHERE activo = 1
        GROUP BY id_empleado
      ) ems ON ems.id_empleado = e.id
      WHERE pr.anio = @anio
        AND pr.mes = @mes
        AND es.id_sucursal = @sucursal_id
    `;

    const remResult = await pool.request()
      .input('anio', sql.Int, anio)
      .input('mes', sql.Int, mes)
      .input('sucursal_id', sql.Int, sucursalId)
      .query(remuneracionesQuery);

    console.log(`  Empleados encontrados: ${remResult.recordset.length}`);

    let totalACH = 0;
    for (const rem of remResult.recordset) {
      const imponibleAsignado = parseFloat(rem.total_imponibles_asignado || 0);

      // Obtener porcentaje ACH
      const porcRes = await pool.request()
        .input('id_periodo', sql.Int, idPeriodo)
        .input('id_razon_social', sql.Int, rem.id_razon_social)
        .query(`
          SELECT ach FROM porcentajes_por_periodo
          WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social AND activo = 1
        `);

      const porcACH = porcRes.recordset.length > 0 ? parseFloat(porcRes.recordset[0].ach || 0) : 0;
      const achEmpleado = (imponibleAsignado * porcACH) / 100;
      totalACH += achEmpleado;

      console.log(`  👤 ${rem.nombre_empleado}:`);
      console.log(`     tipo: ${rem.tipo_empleado}, num_sucursales: ${rem.num_sucursales}`);
      console.log(`     total_imponibles (raw): ${rem.total_imponibles}`);
      console.log(`     total_imponibles_asignado: ${imponibleAsignado}`);
      console.log(`     porcentaje ACH: ${porcACH}%`);
      console.log(`     ACH calculado: $${Math.round(achEmpleado).toLocaleString()}`);
    }

    console.log(`\n  💰 TOTAL ACH CALCULADO: $${Math.round(totalACH).toLocaleString()}`);

    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugACH();
