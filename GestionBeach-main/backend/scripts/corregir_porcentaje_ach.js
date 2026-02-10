const { poolPromise, sql } = require('../config/db');

async function corregirPorcentajeACH() {
  try {
    const pool = await poolPromise;

    console.log('🔧 Corrigiendo porcentaje ACH...\n');

    // Mostrar configuración actual
    const actualResult = await pool.request().query(`
      SELECT
        ppp.id,
        ppp.id_periodo,
        pr.descripcion as periodo_desc,
        ppp.id_razon_social,
        rs.nombre_razon,
        ppp.caja_compen,
        ppp.afc,
        ppp.sis,
        ppp.ach,
        ppp.imposiciones
      FROM porcentajes_por_periodo ppp
      LEFT JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
      LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
      WHERE ppp.activo = 1
      ORDER BY pr.anio DESC, pr.mes DESC
    `);

    if (actualResult.recordset.length === 0) {
      console.log('⚠️ No hay porcentajes configurados');
      await pool.close();
      process.exit(0);
    }

    console.log('📊 CONFIGURACIÓN ACTUAL:\n');
    actualResult.recordset.forEach((p, index) => {
      console.log(`${index + 1}. ${p.periodo_desc} - ${p.nombre_razon || 'Sin nombre'}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Caja Comp: ${p.caja_compen}%`);
      console.log(`   AFC: ${p.afc}%`);
      console.log(`   SIS: ${p.sis}%`);
      console.log(`   ACH: ${p.ach}% ${p.ach === 0 ? '← ⚠️ CERO!' : ''}`);
      console.log(`   Imposiciones: ${p.imposiciones}%`);
      console.log('');
    });

    // Preguntar qué porcentaje usar
    console.log('💡 RECOMENDACIÓN:');
    console.log('   El ACH (Asociación Chilena de Seguridad) típicamente es 0.95%');
    console.log('   Similar al SIS (Seguro de Invalidez y Sobrevivencia)');
    console.log('');
    console.log('🔧 Actualizando TODOS los registros donde ACH = 0 a ACH = 0.95%...');
    console.log('');

    // Actualizar todos los que tienen ACH en 0
    const updateResult = await pool.request()
      .input('nuevo_ach', sql.Decimal(5,2), 0.95)
      .query(`
        UPDATE porcentajes_por_periodo
        SET ach = @nuevo_ach,
            updated_at = GETDATE()
        WHERE ach = 0
        AND activo = 1
      `);

    console.log(`✅ ${updateResult.rowsAffected[0]} registro(s) actualizado(s)`);
    console.log('');

    // Mostrar configuración actualizada
    const nuevaResult = await pool.request().query(`
      SELECT
        ppp.id,
        pr.descripcion as periodo_desc,
        rs.nombre_razon,
        ppp.caja_compen,
        ppp.afc,
        ppp.sis,
        ppp.ach,
        ppp.imposiciones
      FROM porcentajes_por_periodo ppp
      LEFT JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
      LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
      WHERE ppp.activo = 1
      ORDER BY pr.anio DESC, pr.mes DESC
    `);

    console.log('📊 CONFIGURACIÓN ACTUALIZADA:\n');
    nuevaResult.recordset.forEach((p, index) => {
      console.log(`${index + 1}. ${p.periodo_desc} - ${p.nombre_razon || 'Sin nombre'}`);
      console.log(`   Caja Comp: ${p.caja_compen}%`);
      console.log(`   AFC: ${p.afc}%`);
      console.log(`   SIS: ${p.sis}%`);
      console.log(`   ACH: ${p.ach}% ✅`);
      console.log(`   Imposiciones: ${p.imposiciones}%`);
      console.log('');
    });

    console.log('✅ CORRECCIÓN COMPLETADA');
    console.log('');
    console.log('📝 NOTA IMPORTANTE:');
    console.log('   - Verifica en tu interfaz de remuneraciones que el ACH ahora sea 0.95%');
    console.log('   - Los estados de resultados ahora mostrarán ACH correctamente');
    console.log('   - Si 0.95% no es el porcentaje correcto para tu empresa, modifícalo manualmente');

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

corregirPorcentajeACH();
