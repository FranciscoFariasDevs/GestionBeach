// Script para verificar y diagnosticar ACH en noviembre 2025
const { sql, poolPromise } = require('../config/db');

async function verificarACHNoviembre() {
  try {
    const pool = await poolPromise;
    console.log('🔍 === DIAGNÓSTICO ACH NOVIEMBRE 2025 ===\n');

    // 1. Verificar período de noviembre 2025
    console.log('1️⃣ Buscando período noviembre 2025...');
    const periodoResult = await pool.request()
      .query(`
        SELECT id_periodo, mes, anio
        FROM periodos_remuneracion
        WHERE anio = 2025 AND mes = 11
      `);

    if (periodoResult.recordset.length === 0) {
      console.log('❌ No existe período de noviembre 2025');
      return;
    }

    const idPeriodo = periodoResult.recordset[0].id_periodo;
    console.log(`✅ Período encontrado: ID = ${idPeriodo}\n`);

    // 2. Verificar porcentajes ACH para ese período
    console.log('2️⃣ Verificando porcentajes ACH para noviembre 2025...');
    const porcentajesResult = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT
          pp.id,
          pp.id_periodo,
          pp.id_razon_social,
          rs.nombre_razon,
          pp.caja_compen,
          pp.afc,
          pp.sis,
          pp.ach,
          pp.imposiciones,
          pp.activo
        FROM porcentajes_por_periodo pp
        LEFT JOIN razones_sociales rs ON pp.id_razon_social = rs.id
        WHERE pp.id_periodo = @id_periodo
      `);

    console.log(`📊 Porcentajes encontrados: ${porcentajesResult.recordset.length} registros`);
    porcentajesResult.recordset.forEach(p => {
      console.log(`   - ${p.nombre_razon || 'Sin razón'}: ACH = ${p.ach}%, activo = ${p.activo}`);
    });
    console.log('');

    // 3. Verificar datos de remuneraciones con total_imponibles
    console.log('3️⃣ Verificando datos de remuneraciones noviembre 2025...');
    const remuneracionesResult = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT TOP 10
          dr.rut_empleado,
          dr.nombre_empleado,
          dr.total_imponibles,
          dr.imposiciones,
          dr.liquido_pagar
        FROM datos_remuneraciones dr
        WHERE dr.id_periodo = @id_periodo
        ORDER BY dr.total_imponibles DESC
      `);

    console.log(`📊 Muestra de remuneraciones (top 10 por imponibles):`);
    remuneracionesResult.recordset.forEach(r => {
      console.log(`   - ${r.nombre_empleado}: total_imponibles = $${(r.total_imponibles || 0).toLocaleString()}, imposiciones = $${(r.imposiciones || 0).toLocaleString()}`);
    });
    console.log('');

    // 4. Verificar si hay registros con total_imponibles NULL o 0
    console.log('4️⃣ Verificando registros con total_imponibles NULL o 0...');
    const nullImponiblesResult = await pool.request()
      .input('id_periodo', sql.Int, idPeriodo)
      .query(`
        SELECT COUNT(*) as total_null_cero
        FROM datos_remuneraciones
        WHERE id_periodo = @id_periodo
        AND (total_imponibles IS NULL OR total_imponibles = 0)
      `);

    const totalNullCero = nullImponiblesResult.recordset[0].total_null_cero;
    console.log(`   Registros con total_imponibles NULL o 0: ${totalNullCero}\n`);

    // 5. Calcular lo que debería ser el ACH
    console.log('5️⃣ Calculando ACH esperado para una sucursal de ejemplo...');

    // Buscar sucursales con "Enrique Molina" o "Beach"
    const sucursalesResult = await pool.request()
      .query(`
        SELECT id, nombre
        FROM sucursales
        WHERE nombre LIKE '%ENRIQUE MOLINA%' OR nombre LIKE '%BEACH%'
      `);

    console.log(`📊 Sucursales encontradas:`);
    sucursalesResult.recordset.forEach(s => {
      console.log(`   - ID ${s.id}: ${s.nombre}`);
    });
    console.log('');

    // 6. Para cada sucursal, calcular el ACH esperado
    for (const sucursal of sucursalesResult.recordset.slice(0, 3)) {
      console.log(`\n📍 Calculando ACH para: ${sucursal.nombre} (ID: ${sucursal.id})`);

      const empleadosSucursal = await pool.request()
        .input('id_periodo', sql.Int, idPeriodo)
        .input('sucursal_id', sql.Int, sucursal.id)
        .query(`
          SELECT
            dr.rut_empleado,
            dr.nombre_empleado,
            dr.total_imponibles,
            e.id_razon_social,
            COALESCE(ems.num_sucursales, 1) as num_sucursales,
            CASE
              WHEN COALESCE(ems.num_sucursales, 1) > 1 THEN 'ADMIN'
              ELSE 'VENTAS'
            END as tipo
          FROM datos_remuneraciones dr
          INNER JOIN empleados e ON
            REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
            REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
          INNER JOIN empleados_sucursales es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
          LEFT JOIN (
            SELECT id_empleado, COUNT(*) as num_sucursales
            FROM empleados_sucursales WHERE activo = 1
            GROUP BY id_empleado
          ) ems ON ems.id_empleado = e.id
          WHERE dr.id_periodo = @id_periodo
        `);

      let totalACHEsperado = 0;

      for (const emp of empleadosSucursal.recordset) {
        // Obtener porcentaje ACH para la razón social del empleado
        const porcResult = await pool.request()
          .input('id_periodo', sql.Int, idPeriodo)
          .input('id_razon_social', sql.Int, emp.id_razon_social)
          .query(`
            SELECT ach FROM porcentajes_por_periodo
            WHERE id_periodo = @id_periodo AND id_razon_social = @id_razon_social AND activo = 1
          `);

        const porcentajeACH = porcResult.recordset.length > 0 ? parseFloat(porcResult.recordset[0].ach || 0) : 0;
        const imponibleAsignado = emp.tipo === 'ADMIN'
          ? (emp.total_imponibles || 0) / emp.num_sucursales
          : (emp.total_imponibles || 0);

        const achEmpleado = (imponibleAsignado * porcentajeACH) / 100;
        totalACHEsperado += achEmpleado;

        console.log(`   ${emp.nombre_empleado} (${emp.tipo}): imponible_asignado=$${imponibleAsignado.toLocaleString()}, ACH%=${porcentajeACH}, ACH=$${Math.round(achEmpleado).toLocaleString()}`);
      }

      console.log(`   💰 TOTAL ACH ESPERADO: $${Math.round(totalACHEsperado).toLocaleString()}`);
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verificarACHNoviembre();
