const { poolPromise, sql } = require('../config/db');

async function actualizarACH() {
  try {
    const pool = await poolPromise;
    
    console.log('🔧 Actualizando ACH de Diciembre 2025 a 0.93%...\n');
    
    // Actualizar Diciembre 2025 (ID = 6)
    const updateResult = await pool.request()
      .input('nuevo_ach', sql.Decimal(5,2), 0.93)
      .query(`
        UPDATE porcentajes_por_periodo
        SET ach = @nuevo_ach,
            updated_at = GETDATE()
        WHERE id = 6
      `);
    
    console.log(`✅ ${updateResult.rowsAffected[0]} registro actualizado`);
    
    // Verificar
    const verifyResult = await pool.request()
      .query(`
        SELECT 
          pr.descripcion,
          rs.nombre_razon,
          ppp.caja_compen,
          ppp.afc,
          ppp.sis,
          ppp.ach,
          ppp.imposiciones
        FROM porcentajes_por_periodo ppp
        LEFT JOIN periodos_remuneracion pr ON ppp.id_periodo = pr.id_periodo
        LEFT JOIN razones_sociales rs ON ppp.id_razon_social = rs.id
        WHERE ppp.id = 6
      `);
    
    const p = verifyResult.recordset[0];
    console.log('\n📊 CONFIGURACIÓN ACTUALIZADA:');
    console.log(`   Período: ${p.descripcion}`);
    console.log(`   Razón Social: ${p.nombre_razon}`);
    console.log(`   Caja Compensación: ${p.caja_compen}%`);
    console.log(`   AFC: ${p.afc}%`);
    console.log(`   SIS: ${p.sis}%`);
    console.log(`   ACH: ${p.ach}% ✅`);
    console.log(`   Imposiciones: ${p.imposiciones}%`);
    
    console.log('\n✅ ACH actualizado correctamente');
    
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

actualizarACH();
