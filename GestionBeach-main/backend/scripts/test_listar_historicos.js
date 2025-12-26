const { poolPromise, sql } = require('../config/db');

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('PROBANDO ENDPOINT DE LISTAR ESTADOS DE RESULTADOS');
    console.log('='.repeat(80));

    const pool = await poolPromise;

    // Parámetros de prueba
    const sucursal_id = 75;
    const mes = 11;
    const anio = 2025;
    const estado = 'enviado';

    console.log('\n📋 Parámetros de búsqueda:');
    console.log(`   Año: ${anio}`);
    console.log(`   Mes: ${mes}`);
    console.log(`   Sucursal ID: ${sucursal_id}`);
    console.log(`   Estado: ${estado}`);

    // Query igual que en el controlador
    let query = `
      SELECT
        id, sucursal_id, sucursal_nombre, razon_social_id, razon_social_nombre,
        periodo, mes, anio,
        ventas, total_ingresos, total_costos,
        utilidad_bruta, utilidad_operativa, utilidad_neta,
        total_gastos_operativos,
        estado, creado_por, fecha_creacion, modificado_por, fecha_modificacion,
        enviado_por, fecha_envio,
        numero_facturas, numero_ventas, numero_empleados,
        empleados_admin, empleados_ventas
      FROM estados_resultados
      WHERE 1=1
    `;

    const request = pool.request();

    if (sucursal_id) {
      query += ' AND sucursal_id = @sucursal_id';
      request.input('sucursal_id', sql.Int, sucursal_id);
    }

    if (mes) {
      query += ' AND mes = @mes';
      request.input('mes', sql.Int, mes);
    }

    if (anio) {
      query += ' AND anio = @anio';
      request.input('anio', sql.Int, anio);
    }

    if (estado) {
      query += ' AND estado = @estado';
      request.input('estado', sql.NVarChar, estado);
    }

    query += `
      ORDER BY anio DESC, mes DESC, fecha_creacion DESC
    `;

    console.log('\n🔍 Ejecutando query...');
    console.log(query);

    const result = await request.query(query);

    console.log('\n✅ Query ejecutado exitosamente');
    console.log(`📊 Resultados encontrados: ${result.recordset.length}`);

    if (result.recordset.length > 0) {
      console.log('\n📋 Primer resultado:');
      const first = result.recordset[0];
      console.log(`   ID: ${first.id}`);
      console.log(`   Período: ${first.periodo}`);
      console.log(`   Sucursal: ${first.sucursal_nombre}`);
      console.log(`   Razón Social: ${first.razon_social_nombre}`);
      console.log(`   Ventas: $${(first.ventas || 0).toLocaleString('es-CL')}`);
      console.log(`   Estado: ${first.estado}`);
      console.log(`   Creado por: ${first.creado_por}`);
      console.log(`   Fecha creación: ${first.fecha_creacion}`);
    } else {
      console.log('\n⚠️ No se encontraron resultados con los filtros especificados');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROCESO COMPLETADO');
    console.log('='.repeat(80));

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
