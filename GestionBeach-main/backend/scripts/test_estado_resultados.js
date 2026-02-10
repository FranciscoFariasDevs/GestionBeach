// Test directo de queries del Estado de Resultados
const { poolPromise, sql } = require('../config/db');

async function testEndpoints() {
  const pool = await poolPromise;

  console.log('='.repeat(80));
  console.log('TEST DIRECTO DE QUERIES - SUCURSAL ENRIQUE MOLINA (ID: 5) - NOV 2025');
  console.log('='.repeat(80));

  const sucursal_id = 5;
  const anio = 2025;
  const mes = 11;
  const fecha_desde = '2025-11-01';
  const fecha_hasta = '2025-11-30';

  // 1. Test VENTAS (Query del Dashboard)
  console.log('\n📊 1. VENTAS (simulando Dashboard)...');
  try {
    const sucursalResult = await pool.request()
      .input('sucursal_id', sql.Int, sucursal_id)
      .query('SELECT * FROM sucursales WHERE id = @sucursal_id');

    if (sucursalResult.recordset.length > 0) {
      const suc = sucursalResult.recordset[0];
      console.log('   Sucursal:', suc.nombre);
      console.log('   Tipo:', suc.tipo_sucursal);
      console.log('   IP:', suc.ip || 'NO CONFIGURADA');
      console.log('   Base datos:', suc.base_datos || 'NO CONFIGURADA');

      if (!suc.ip || !suc.base_datos) {
        console.log('   ⚠️ SIN CONEXIÓN REMOTA - No puede obtener ventas');
      }
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 2. Test COMPRAS
  console.log('\n📦 2. COMPRAS...');
  try {
    const comprasResult = await pool.request()
      .input('fecha_desde', sql.Date, new Date(fecha_desde))
      .input('fecha_hasta', sql.Date, new Date(fecha_hasta))
      .input('sucursal_id', sql.Int, sucursal_id)
      .query(`
        SELECT COUNT(*) as total_facturas, SUM(MONTO_TOTAL) as total_monto
        FROM TB_FACTURA_ENCABEZADO
        WHERE FECHA_EMISION BETWEEN @fecha_desde AND @fecha_hasta
          AND estado = 'PROCESADA'
          AND MONTO_TOTAL > 0
          AND id_sucursal = @sucursal_id
      `);

    const r = comprasResult.recordset[0];
    console.log('   Total facturas:', r.total_facturas);
    console.log('   Total monto:', r.total_monto || 0);
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 3. Test REMUNERACIONES - Query exacta del estadoResultadosController
  console.log('\n👥 3. REMUNERACIONES CON FILTRO es.id_sucursal = @sucursal_id...');
  try {
    const remuResult = await pool.request()
      .input('anio', sql.Int, anio)
      .input('mes', sql.Int, mes)
      .input('sucursal_id', sql.Int, sucursal_id)
      .query(`
        SELECT
          dr.rut_empleado,
          dr.nombre_empleado,
          dr.liquido_pagar,
          e.id as id_empleado,
          es.id_sucursal,
          s.nombre as sucursal_nombre
        FROM datos_remuneraciones AS dr
        INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
        INNER JOIN empleados AS e ON
          REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
        LEFT JOIN sucursales s ON es.id_sucursal = s.id
        WHERE pr.anio = @anio
          AND pr.mes = @mes
          AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
          AND es.id_sucursal = @sucursal_id
      `);

    console.log('   Registros encontrados:', remuResult.recordset.length);
    remuResult.recordset.forEach(r => {
      console.log('   -', r.nombre_empleado, '| Sucursal:', r.sucursal_nombre, '| Líquido:', r.liquido_pagar);
    });
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 4. Test REMUNERACIONES SIN el filtro en WHERE
  console.log('\n👥 4. REMUNERACIONES SIN FILTRO es.id_sucursal en WHERE...');
  try {
    const remuSinFiltro = await pool.request()
      .input('anio', sql.Int, anio)
      .input('mes', sql.Int, mes)
      .input('sucursal_id', sql.Int, sucursal_id)
      .query(`
        SELECT
          dr.rut_empleado,
          dr.nombre_empleado,
          dr.liquido_pagar,
          e.id as id_empleado,
          es.id_sucursal,
          s.nombre as sucursal_nombre
        FROM datos_remuneraciones AS dr
        INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
        INNER JOIN empleados AS e ON
          REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
        LEFT JOIN sucursales s ON es.id_sucursal = s.id
        WHERE pr.anio = @anio
          AND pr.mes = @mes
          AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
      `);

    console.log('   Registros encontrados:', remuSinFiltro.recordset.length);
    remuSinFiltro.recordset.forEach(r => {
      const asignado = r.sucursal_nombre ? '✅' : '❌';
      console.log(`   ${asignado} ${r.nombre_empleado} | Sucursal: ${r.sucursal_nombre || 'NO ASIGNADA A ESTA SUCURSAL'} | Líquido: ${r.liquido_pagar}`);
    });
  } catch (e) {
    console.log('   Error:', e.message);
  }

  // 5. Verificar asociaciones de empleados
  console.log('\n🔗 5. EMPLEADOS Y SUS SUCURSALES ASIGNADAS...');
  try {
    const empSuc = await pool.request().query(`
      SELECT e.id, e.rut, e.nombre, e.apellido, es.id_sucursal, s.nombre as sucursal_nombre
      FROM empleados e
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      LEFT JOIN sucursales s ON es.id_sucursal = s.id
      WHERE e.rut IN ('123792386', '183610708')
      ORDER BY e.id, es.id_sucursal
    `);

    let currentEmp = null;
    empSuc.recordset.forEach(r => {
      if (currentEmp !== r.id) {
        console.log(`\n   Empleado: ${r.nombre} ${r.apellido} (RUT: ${r.rut})`);
        currentEmp = r.id;
      }
      console.log(`      - Sucursal ID ${r.id_sucursal}: ${r.sucursal_nombre}`);
    });
  } catch (e) {
    console.log('   Error:', e.message);
  }

  console.log('\n' + '='.repeat(80));
  process.exit(0);
}

testEndpoints().catch(e => { console.error(e); process.exit(1); });
