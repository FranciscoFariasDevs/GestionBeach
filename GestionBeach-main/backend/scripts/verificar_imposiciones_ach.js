const { poolPromise, sql } = require('../config/db');

async function verificarImposiciones() {
  try {
    const pool = await poolPromise;

    console.log('🔍 Verificando campo imposiciones y ACH...\n');

    // Buscar un período reciente
    const periodoResult = await pool.request().query(`
      SELECT TOP 1 id_periodo, descripcion, mes, anio
      FROM periodos_remuneracion
      ORDER BY anio DESC, mes DESC
    `);

    if (periodoResult.recordset.length === 0) {
      console.log('❌ No hay períodos registrados');
      process.exit(0);
    }

    const periodo = periodoResult.recordset[0];
    console.log(`📅 Período más reciente: ${periodo.descripcion} (ID: ${periodo.id_periodo})`);
    console.log('');

    // Verificar datos
    const result = await pool.request()
      .input('id_periodo', sql.Int, periodo.id_periodo)
      .query(`
        SELECT TOP 10
          nombre_empleado,
          sueldo_base,
          total_imponibles,
          imposiciones,
          descuento_prevision,
          seguro_cesantia,
          CASE
            WHEN imposiciones IS NULL THEN 'NULL'
            WHEN imposiciones = 0 THEN 'CERO'
            ELSE 'TIENE VALOR'
          END as estado_imposiciones
        FROM datos_remuneraciones
        WHERE id_periodo = @id_periodo
        ORDER BY nombre_empleado
      `);

    console.log('📊 Muestra de 10 empleados:\n');
    console.log('Nombre                        | Imponibles  | Imposiciones | Estado');
    console.log('-'.repeat(80));

    let conValor = 0;
    let enCero = 0;
    let nulos = 0;

    result.recordset.forEach(emp => {
      const nombre = (emp.nombre_empleado || '').substring(0, 28).padEnd(28);
      const imponible = (emp.total_imponibles || 0).toLocaleString('es-CL').padStart(11);
      const imposiciones = (emp.imposiciones || 0).toLocaleString('es-CL').padStart(12);
      const estado = emp.estado_imposiciones.padEnd(11);

      console.log(`${nombre} | ${imponible} | ${imposiciones} | ${estado}`);

      if (emp.estado_imposiciones === 'TIENE VALOR') conValor++;
      else if (emp.estado_imposiciones === 'CERO') enCero++;
      else nulos++;
    });

    console.log('\n📈 RESUMEN MUESTRA:');
    console.log(`   ✅ Con valor: ${conValor}`);
    console.log(`   ⚠️  En cero: ${enCero}`);
    console.log(`   ❌ NULL: ${nulos}`);
    console.log('');

    // Verificar totales
    const totalesResult = await pool.request()
      .input('id_periodo', sql.Int, periodo.id_periodo)
      .query(`
        SELECT
          COUNT(*) as total_empleados,
          SUM(CASE WHEN imposiciones IS NULL THEN 1 ELSE 0 END) as imposiciones_null,
          SUM(CASE WHEN imposiciones = 0 THEN 1 ELSE 0 END) as imposiciones_cero,
          SUM(CASE WHEN imposiciones > 0 THEN 1 ELSE 0 END) as imposiciones_con_valor,
          ISNULL(AVG(imposiciones), 0) as promedio_imposiciones
        FROM datos_remuneraciones
        WHERE id_periodo = @id_periodo
      `);

    const totales = totalesResult.recordset[0];
    console.log('📊 TOTALES DEL PERÍODO:');
    console.log(`   Total empleados: ${totales.total_empleados}`);
    console.log(`   NULL: ${totales.imposiciones_null}`);
    console.log(`   CERO: ${totales.imposiciones_cero}`);
    console.log(`   CON VALOR: ${totales.imposiciones_con_valor}`);
    console.log(`   Promedio imposiciones: $${totales.promedio_imposiciones.toLocaleString('es-CL')}`);
    console.log('');

    if (totales.imposiciones_cero > 0 || totales.imposiciones_null > 0) {
      console.log('🔥 PROBLEMA DETECTADO:');
      console.log('   El campo "imposiciones" está en CERO o NULL en la tabla datos_remuneraciones.');
      console.log('   Esto causa que ACH = 0 porque ACH se calcula sobre imposiciones.');
      console.log('');
    }

    // Verificar porcentajes configurados
    console.log('🔍 Verificando porcentajes configurados...\n');
    const porcentajesResult = await pool.request()
      .input('id_periodo', sql.Int, periodo.id_periodo)
      .query(`
        SELECT
          ppp.id_razon_social,
          rs.nombre_razon,
          ppp.caja_compen,
          ppp.afc,
          ppp.sis,
          ppp.ach,
          ppp.imposiciones
        FROM porcentajes_por_periodo ppp
        LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
        WHERE ppp.id_periodo = @id_periodo
        AND ppp.activo = 1
      `);

    if (porcentajesResult.recordset.length > 0) {
      console.log('📊 PORCENTAJES CONFIGURADOS:');
      porcentajesResult.recordset.forEach(p => {
        console.log(`   ${p.nombre_razon || 'Sin nombre'}:`);
        console.log(`      Caja Compensación: ${p.caja_compen}%`);
        console.log(`      AFC: ${p.afc}%`);
        console.log(`      SIS: ${p.sis}%`);
        console.log(`      ACH: ${p.ach}% ${p.ach === 0 ? '← ⚠️ ESTÁ EN CERO!' : '← OK'}`);
        console.log(`      Imposiciones Patronales: ${p.imposiciones}%`);
        console.log('');
      });
    } else {
      console.log('⚠️ NO HAY PORCENTAJES CONFIGURADOS PARA ESTE PERÍODO');
    }

    console.log('\n💡 DIAGNÓSTICO:');
    console.log('   ACH se calcula así: imposiciones × porcentaje_ach / 100');
    console.log('   Si ACH = 0 en estados de resultados, puede ser porque:');
    console.log('   1. El campo "imposiciones" en datos_remuneraciones está en 0 o NULL');
    console.log('   2. El porcentaje ACH no está configurado (está en 0)');
    console.log('   3. Ambos problemas');

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verificarImposiciones();
