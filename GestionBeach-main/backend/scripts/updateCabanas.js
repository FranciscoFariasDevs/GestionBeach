// Script para actualizar la información de cabañas en la base de datos
const { sql, poolPromise } = require('../config/db');

async function updateCabanas() {
  try {
    console.log('🔄 Iniciando actualización de información de cabañas...');

    const pool = await poolPromise;

    // ============================================
    // CABAÑA 1
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña familiar grande con terraza propia. Capacidad: 10 personas. Dormitorios: 4 (2 Camas de Dos Plazas y 6 Camas de Plaza y Media). Baños: 2. Incluye: Terraza Propia.',
          capacidad_personas = 10,
          numero_habitaciones = 4,
          numero_banos = 2,
          amenidades = '["Terraza Propia", "2 Camas de Dos Plazas", "6 Camas de Plaza y Media", "Total 8 camas"]',
          ubicacion = 'Con terraza propia'
      WHERE numero = 1
    `);
    console.log('✅ Cabaña 1 actualizada');

    // ============================================
    // CABAÑA 2
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña acogedora con quincho. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho.',
          capacidad_personas = 4,
          numero_habitaciones = 3,
          numero_banos = 2,
          amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media"]',
          ubicacion = 'Con quincho'
      WHERE numero = 2
    `);
    console.log('✅ Cabaña 2 actualizada');

    // ============================================
    // CABAÑA 3
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña con quincho frente a terraza grande. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho. Ubicación especial: Frente a terraza grande.',
          capacidad_personas = 4,
          numero_habitaciones = 3,
          numero_banos = 2,
          amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media", "Vista a Terraza Grande"]',
          ubicacion = 'Frente a la terraza grande, con quincho'
      WHERE numero = 3
    `);
    console.log('✅ Cabaña 3 actualizada');

    // ============================================
    // CABAÑA 4
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña confortable con quincho. Capacidad: 4 personas. Dormitorios: 3 (1 Matrimonial y 2 de Plaza y Media). Baños: 2. Incluye: Quincho.',
          capacidad_personas = 4,
          numero_habitaciones = 3,
          numero_banos = 2,
          amenidades = '["Quincho", "1 Cama Matrimonial", "2 Camas de Plaza y Media"]',
          ubicacion = 'Con quincho'
      WHERE numero = 4
    `);
    console.log('✅ Cabaña 4 actualizada');

    // ============================================
    // CABAÑA 5 (PARTICULAR)
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña particular con literas y quincho. Capacidad: 6 personas. Dormitorios: 2 (1 Matrimonial y 4 de Plaza y Media, incluye literas). Baños: 1. Incluye: Quincho.',
          capacidad_personas = 6,
          numero_habitaciones = 2,
          numero_banos = 1,
          amenidades = '["Quincho", "1 Cama Matrimonial", "4 Camas de Plaza y Media (incluye literas)", "Cabaña Particular"]',
          ubicacion = 'Cabaña particular con literas'
      WHERE numero = 5
    `);
    console.log('✅ Cabaña 5 actualizada');

    // ============================================
    // CABAÑA 6 (TIPO RÚSTICA)
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña rústica con estacionamiento propio y quincho. Capacidad: 7 personas. Dormitorios: 2 (2 Matrimoniales y 3 de Plaza y Media). Baños: 1. Incluye: Estacionamiento Propio, Quincho.',
          capacidad_personas = 7,
          numero_habitaciones = 2,
          numero_banos = 1,
          amenidades = '["Tipo Rústica", "Estacionamiento Propio", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
          ubicacion = 'Tipo Rústica con estacionamiento'
      WHERE numero = 6
    `);
    console.log('✅ Cabaña 6 actualizada');

    // ============================================
    // CABAÑA 7
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña ubicada en altura con quincho. Capacidad: 7 personas. Dormitorios: 3 (2 Matrimoniales y 3 de Plaza y Media). Baños: 2. Incluye: Quincho, Ubicada en Altura.',
          capacidad_personas = 7,
          numero_habitaciones = 3,
          numero_banos = 2,
          amenidades = '["Ubicada en Altura", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
          ubicacion = 'Ubicada en altura con quincho'
      WHERE numero = 7
    `);
    console.log('✅ Cabaña 7 actualizada');

    // ============================================
    // CABAÑA 8
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          descripcion = 'Cabaña ubicada en altura con quincho. Capacidad: 7 personas. Dormitorios: 3 (2 Matrimoniales y 3 de Plaza y Media). Baños: 2. Incluye: Quincho, Ubicada en Altura.',
          capacidad_personas = 7,
          numero_habitaciones = 3,
          numero_banos = 2,
          amenidades = '["Ubicada en Altura", "Quincho", "2 Camas Matrimoniales", "3 Camas de Plaza y Media"]',
          ubicacion = 'Ubicada en altura con quincho'
      WHERE numero = 8
    `);
    console.log('✅ Cabaña 8 actualizada');

    // ============================================
    // DEPARTAMENTO A (CABAÑA 9)
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          nombre = 'Departamento A',
          descripcion = 'Departamento romántico exclusivo para parejas con comodidades premium. Capacidad: Solo Pareja (2 personas). Dormitorios: 1 (1 Cama Matrimonial). Comodidades: Jacuzzi (incluye espuma), Calefactores, Calienta cama, Estufa eléctrica.',
          capacidad_personas = 2,
          numero_habitaciones = 1,
          numero_banos = 1,
          amenidades = '["Solo para Pareja", "Jacuzzi (incluye espuma)", "Calefactores", "Calienta cama", "Estufa eléctrica", "1 Cama Matrimonial"]',
          ubicacion = 'Departamento romántico premium'
      WHERE numero = 9
    `);
    console.log('✅ Departamento A (cabaña 9) actualizado');

    // ============================================
    // DEPARTAMENTO B (CABAÑA 10)
    // ============================================
    await pool.request().query(`
      UPDATE dbo.cabanas
      SET
          nombre = 'Departamento B',
          descripcion = 'Departamento romántico exclusivo para parejas con comodidades premium. Capacidad: Solo Pareja (2 personas). Dormitorios: 1 (1 Cama Matrimonial). Comodidades: Jacuzzi (incluye espuma), Calefactores, Calienta cama, Estufa eléctrica.',
          capacidad_personas = 2,
          numero_habitaciones = 1,
          numero_banos = 1,
          amenidades = '["Solo para Pareja", "Jacuzzi (incluye espuma)", "Calefactores", "Calienta cama", "Estufa eléctrica", "1 Cama Matrimonial"]',
          ubicacion = 'Departamento romántico premium'
      WHERE numero = 10
    `);
    console.log('✅ Departamento B (cabaña 10) actualizado');

    // Verificar las actualizaciones
    const result = await pool.request().query(`
      SELECT
          numero,
          nombre,
          capacidad_personas,
          numero_habitaciones,
          numero_banos,
          precio_noche,
          precio_fin_semana,
          ubicacion
      FROM dbo.cabanas
      ORDER BY numero
    `);

    console.log('\n📋 RESUMEN DE CABAÑAS ACTUALIZADAS:');
    console.log('=====================================');
    result.recordset.forEach(cabana => {
      console.log(`\n🏡 ${cabana.nombre || `Cabaña ${cabana.numero}`}:`);
      console.log(`   - Capacidad: ${cabana.capacidad_personas} personas`);
      console.log(`   - Dormitorios: ${cabana.numero_habitaciones}`);
      console.log(`   - Baños: ${cabana.numero_banos}`);
      console.log(`   - Precio noche: $${cabana.precio_noche}`);
      console.log(`   - Precio fin de semana: $${cabana.precio_fin_semana}`);
      console.log(`   - Ubicación: ${cabana.ubicacion}`);
    });

    console.log('\n✅ Información de cabañas actualizada correctamente');
    console.log('📋 Resumen:');
    console.log('  - Cabaña 1: 10 personas, 4 dormitorios, 2 baños, Terraza Propia');
    console.log('  - Cabañas 2-4: 4 personas, 3 dormitorios, 2 baños, Quincho');
    console.log('  - Cabaña 3: Frente a terraza grande');
    console.log('  - Cabaña 5: 6 personas, 2 dormitorios, 1 baño, con literas');
    console.log('  - Cabaña 6: 7 personas, Rústica, Estacionamiento propio');
    console.log('  - Cabañas 7-8: 7 personas, 3 dormitorios, En altura');
    console.log('  - Departamentos A y B: Solo parejas, Jacuzzi premium');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error actualizando cabañas:', error);
    process.exit(1);
  }
}

// Ejecutar el script
updateCabanas();
