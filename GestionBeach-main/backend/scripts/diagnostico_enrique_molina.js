// Script de diagnóstico para Enrique Molina - Noviembre 2025
const { sql, poolPromise } = require('../config/db');

async function diagnosticar() {
  try {
    console.log('='.repeat(80));
    console.log('DIAGNÓSTICO: REMUNERACIÓN ENRIQUE MOLINA - NOVIEMBRE 2025');
    console.log('='.repeat(80));

    const pool = await poolPromise;

    // 1. Verificar período noviembre 2025
    console.log('\n📅 1. VERIFICANDO PERÍODO NOVIEMBRE 2025...');
    const periodoResult = await pool.request()
      .query(`SELECT * FROM periodos_remuneracion WHERE anio = 2025 AND mes = 11`);
    console.log('Períodos encontrados:', periodoResult.recordset.length);
    periodoResult.recordset.forEach(p => {
      console.log(`   - ID: ${p.id_periodo}, Descripción: ${p.descripcion}, Estado: ${p.estado}`);
    });

    // 2. Buscar empleado Enrique Molina
    console.log('\n👤 2. BUSCANDO EMPLEADO "ENRIQUE MOLINA"...');
    const empleadoResult = await pool.request()
      .query(`
        SELECT e.*, rs.nombre_razon
        FROM empleados e
        LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
        WHERE e.nombre LIKE '%ENRIQUE%' OR e.apellido LIKE '%MOLINA%'
           OR (e.nombre + ' ' + e.apellido) LIKE '%ENRIQUE%MOLINA%'
      `);
    console.log('Empleados encontrados:', empleadoResult.recordset.length);
    empleadoResult.recordset.forEach(e => {
      console.log(`   - ID: ${e.id}, RUT: ${e.rut}, Nombre: ${e.nombre} ${e.apellido}`);
      console.log(`     Razón Social ID: ${e.id_razon_social}, Nombre: ${e.nombre_razon}`);
    });

    // 3. Buscar razón social "Eriz Hermanos"
    console.log('\n🏢 3. BUSCANDO RAZÓN SOCIAL "ERIZ HERMANOS"...');
    const razonResult = await pool.request()
      .query(`SELECT * FROM razones_sociales WHERE nombre_razon LIKE '%ERIZ%'`);
    console.log('Razones sociales encontradas:', razonResult.recordset.length);
    razonResult.recordset.forEach(rs => {
      console.log(`   - ID: ${rs.id}, Nombre: ${rs.nombre_razon}, RUT: ${rs.rut}`);
    });

    // 4. Buscar sucursales de Eriz Hermanos
    console.log('\n🏪 4. BUSCANDO SUCURSALES DE ERIZ HERMANOS...');
    const sucursalesResult = await pool.request()
      .query(`
        SELECT s.*, rs.nombre_razon
        FROM sucursales s
        LEFT JOIN razones_sociales rs ON s.id_razon_social = rs.id
        WHERE rs.nombre_razon LIKE '%ERIZ%'
      `);
    console.log('Sucursales encontradas:', sucursalesResult.recordset.length);
    sucursalesResult.recordset.forEach(s => {
      console.log(`   - ID: ${s.id}, Nombre: ${s.nombre}, Tipo: ${s.tipo_sucursal}`);
    });

    // 5. Buscar remuneraciones en datos_remuneraciones para noviembre 2025
    console.log('\n💰 5. BUSCANDO REMUNERACIONES EN DATOS_REMUNERACIONES (NOV 2025)...');
    const remuResult = await pool.request()
      .query(`
        SELECT dr.*, pr.mes, pr.anio, pr.descripcion as periodo_desc
        FROM datos_remuneraciones dr
        JOIN periodos_remuneracion pr ON dr.id_periodo = pr.id_periodo
        WHERE pr.anio = 2025 AND pr.mes = 11
        AND (dr.nombre_empleado LIKE '%ENRIQUE%' OR dr.nombre_empleado LIKE '%MOLINA%')
      `);
    console.log('Remuneraciones encontradas para Enrique/Molina:', remuResult.recordset.length);
    remuResult.recordset.forEach(r => {
      console.log(`   - RUT: ${r.rut_empleado}, Nombre: ${r.nombre_empleado}`);
      console.log(`     Sueldo Base: $${r.sueldo_base}, Líquido: $${r.liquido_pagar}`);
      console.log(`     Período: ${r.periodo_desc}`);
    });

    // 6. Buscar TODAS las remuneraciones de noviembre 2025
    console.log('\n📊 6. TODAS LAS REMUNERACIONES DE NOVIEMBRE 2025...');
    const todasRemuResult = await pool.request()
      .query(`
        SELECT dr.rut_empleado, dr.nombre_empleado, dr.liquido_pagar, dr.sueldo_base
        FROM datos_remuneraciones dr
        JOIN periodos_remuneracion pr ON dr.id_periodo = pr.id_periodo
        WHERE pr.anio = 2025 AND pr.mes = 11
        ORDER BY dr.nombre_empleado
      `);
    console.log(`Total remuneraciones noviembre 2025: ${todasRemuResult.recordset.length}`);
    todasRemuResult.recordset.slice(0, 20).forEach(r => {
      console.log(`   - ${r.nombre_empleado} (${r.rut_empleado}) -> Líquido: $${r.liquido_pagar}`);
    });
    if (todasRemuResult.recordset.length > 20) {
      console.log(`   ... y ${todasRemuResult.recordset.length - 20} más`);
    }

    // 7. Verificar empleados_sucursales para Enrique Molina
    console.log('\n🔗 7. VERIFICANDO EMPLEADOS_SUCURSALES...');
    if (empleadoResult.recordset.length > 0) {
      for (const emp of empleadoResult.recordset) {
        const esResult = await pool.request()
          .input('id_empleado', sql.Int, emp.id)
          .query(`
            SELECT es.*, s.nombre as sucursal_nombre
            FROM empleados_sucursales es
            JOIN sucursales s ON es.id_sucursal = s.id
            WHERE es.id_empleado = @id_empleado
          `);
        console.log(`   Empleado ${emp.nombre} ${emp.apellido} (ID: ${emp.id}):`);
        if (esResult.recordset.length === 0) {
          console.log('     ⚠️ NO TIENE ASIGNACIÓN A NINGUNA SUCURSAL!');
        } else {
          esResult.recordset.forEach(es => {
            console.log(`     - Sucursal: ${es.sucursal_nombre} (ID: ${es.id_sucursal}), Activo: ${es.activo}`);
          });
        }
      }
    }

    // 8. Verificar si el problema es el JOIN en estadoResultadosController
    console.log('\n🔍 8. SIMULANDO QUERY DEL ESTADO DE RESULTADOS...');
    // Obtener una sucursal de Eriz
    if (sucursalesResult.recordset.length > 0) {
      const sucursalId = sucursalesResult.recordset[0].id;
      console.log(`   Usando sucursal ID: ${sucursalId} (${sucursalesResult.recordset[0].nombre})`);

      const queryTest = await pool.request()
        .input('anio', sql.Int, 2025)
        .input('mes', sql.Int, 11)
        .input('sucursal_id', sql.Int, sucursalId)
        .query(`
          SELECT
            dr.rut_empleado,
            dr.nombre_empleado,
            dr.liquido_pagar,
            e.id as id_empleado,
            e.nombre as emp_nombre,
            e.apellido as emp_apellido,
            es.id_sucursal,
            es.activo
          FROM datos_remuneraciones AS dr
          INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
          INNER JOIN empleados AS e ON
            REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
            REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
          LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
          WHERE pr.anio = @anio
            AND pr.mes = @mes
            AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
        `);

      console.log('\n   📋 Resultados SIN filtrar por es.id_sucursal en WHERE:');
      console.log(`   Total encontrados: ${queryTest.recordset.length}`);
      queryTest.recordset.slice(0, 15).forEach(r => {
        const asignado = r.id_sucursal ? '✅' : '❌';
        console.log(`   ${asignado} ${r.nombre_empleado} (${r.rut_empleado}) - Sucursal asignada: ${r.id_sucursal || 'NINGUNA'}`);
      });

      // Ahora con el WHERE que filtra
      const queryConFiltro = await pool.request()
        .input('anio', sql.Int, 2025)
        .input('mes', sql.Int, 11)
        .input('sucursal_id', sql.Int, sucursalId)
        .query(`
          SELECT
            dr.rut_empleado,
            dr.nombre_empleado,
            dr.liquido_pagar
          FROM datos_remuneraciones AS dr
          INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
          INNER JOIN empleados AS e ON
            REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
            REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
          LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
          WHERE pr.anio = @anio
            AND pr.mes = @mes
            AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
            AND es.id_sucursal = @sucursal_id
        `);

      console.log('\n   📋 Resultados CON filtro es.id_sucursal = @sucursal_id en WHERE:');
      console.log(`   Total encontrados: ${queryConFiltro.recordset.length}`);
      queryConFiltro.recordset.slice(0, 15).forEach(r => {
        console.log(`   - ${r.nombre_empleado} (${r.rut_empleado}) -> Líquido: $${r.liquido_pagar}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('FIN DEL DIAGNÓSTICO');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

diagnosticar();
