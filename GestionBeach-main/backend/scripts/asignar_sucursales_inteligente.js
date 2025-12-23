// backend/scripts/asignar_sucursales_inteligente.js
// Script con mapeo inteligente para asignar sucursales automáticamente

const { sql, poolPromise } = require('../config/db');

// Mapeo manual de establecimientos a sucursales
const MAPEO_ESTABLECIMIENTOS = {
  // Supermercados
  'SUPER COLELEMU': 'TRES ESQUINAS S/N, COELEMU SU',
  'SUPER COLEMU': 'TRES ESQUINAS S/N, COELEMU SU',
  'SUPERMERCADO COELEMU': 'TRES ESQUINAS S/N, COELEMU SU',

  'SUPER E.MOLINA': 'ENRIQUE MOLINA 596, TOME',
  'SUPERMERCADOENRIQUEMOLINA': 'ENRIQUE MOLINA 596, TOME',
  'SUPEREMERCADO ENRIQUE MOLINA 596': 'ENRIQUE MOLINA 596, TOME',

  'SUPER LORCOCHRANE': 'LORD COCHRANE 1127,TOME',
  'SUPERMERCADO LORD COCHRANE': 'LORD COCHRANE 1127,TOME',
  'SUPERMERCADO LORD': 'LORD COCHRANE 1127,TOME',
  'SUPER LORD COHRANE': 'LORD COCHRANE 1127,TOME',
  'OFICINA LORD COCHRANE': 'LORD COCHRANE 1127,TOME',
  'LORD COCHRANE 1127,TOME': 'LORD COCHRANE 1127,TOME',

  'SUPER DICHATO': 'DANIEL VERA 890, DICHATO',
  'SUPERMERCADO DICHATO': 'DANIEL VERA 890, DICHATO',
  'SUPERMERCADO Y PAPADERIA DICHATO': 'DANIEL VERA 890, DICHATO',
  'MINIMARLET DICHATO': 'DANIEL VERA 890, DICHATO',
  'DANIEL VERA 890, DICHATO': 'DANIEL VERA 890, DICHATO',
  'RESTAURANTE DICHATO': 'DANIEL VERA 890, DICHATO',

  // Ferreterías
  'FERRETERIA V.PALACIOS': 'VICENTE PALACIOS 2908, TOME',
  'FERRETERIA VICENTE PALACIOS': 'VICENTE PALACIOS 2908, TOME',
  'VICENTE PALACIOS 2807': 'VICENTE PALACIOS 2908, TOME',

  'FERRETERIA LAS CAMELIAS': 'LAS CAMELIAS 39, TOME',
  'LAS CAMELIAS 39, TOME': 'LAS CAMELIAS 39, TOME',

  'FERRETERIA BEACH QUIRIHUE': 'RUTA EL CONQUISTADOR 1002, QUIRIHUE',
  'RUTA EL CONQUISTADOR 1002, QUIRIHUE': 'RUTA EL CONQUISTADOR 1002, QUIRIHUE',

  'SALA DE CAMARAS COELEMU': 'TRES ESQUINAS S/N, COELEMU FE',

  'FERRETERIA TOME': 'LORD COCHRANE 1127,TOME',
  'FERETERIA': 'LAS CAMELIAS 39, TOME',

  'TRANSPORTES EN CHILLAN': 'RIO VIEJO 999, CHILLAN',

  // Genéricos - asignar a sucursal principal
  'SUPERMERCADO': 'LORD COCHRANE 1127,TOME',
  'SUPERMERCADO BEACH': 'LORD COCHRANE 1127,TOME',
  'CENTRO COMERCIAL': 'LORD COCHRANE 1127,TOME',

  // Administrativos y operaciones - asignar a oficina principal
  'OBRAS EN CONSTRUCCION': 'LORD COCHRANE 1127,TOME',
  'OBRAS EN CONTRUCCION': 'LORD COCHRANE 1127,TOME',
  'ADMINISTRACION': 'LORD COCHRANE 1127,TOME',
  'GESTION ADM.': 'LORD COCHRANE 1127,TOME',
  'GERENCIAL': 'LORD COCHRANE 1127,TOME',
  'MANTENCION ELECTRICA': 'LORD COCHRANE 1127,TOME',
  'VARIOS LOCALES': 'LORD COCHRANE 1127,TOME',
  'TODOS LOS LOCALES BEACH': 'LORD COCHRANE 1127,TOME',

  // Múltiples ubicaciones - asignar a principal
  'NOGUEIRA 1150, V.PALACIOS 2807, AV.COLIU': 'LORD COCHRANE 1127,TOME',
  'NOGUEIRA 1150, COLIUMO CALETA GRANDE, V.': 'LORD COCHRANE 1127,TOME'
};

async function asignarSucursalesInteligente() {
  console.log('🤖 === ASIGNACIÓN INTELIGENTE DE SUCURSALES ===\n');

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    // 1. Obtener empleados sin sucursal
    const empleadosSinSucursal = await pool.request().query(`
      SELECT DISTINCT
        e.id,
        e.rut,
        e.nombre,
        e.apellido,
        e.establecimiento,
        e.id_razon_social
      FROM empleados e
      LEFT JOIN empleados_sucursales es ON e.id = es.id_empleado AND es.activo = 1
      WHERE es.id IS NULL
        AND e.activo = 1
        AND e.establecimiento IS NOT NULL
        AND e.establecimiento != ''
    `);

    console.log(`📋 Empleados a procesar: ${empleadosSinSucursal.recordset.length}\n`);

    if (empleadosSinSucursal.recordset.length === 0) {
      console.log('✅ No hay empleados que requieran asignación');
      await transaction.commit();
      return;
    }

    // 2. Obtener todas las sucursales
    const sucursalesResult = await pool.request().query(`
      SELECT id, nombre FROM sucursales
    `);

    const sucursalesMap = new Map();
    sucursalesResult.recordset.forEach(s => {
      sucursalesMap.set(s.nombre.toUpperCase(), s.id);
    });

    let asignados = 0;
    let noEncontrados = [];

    // 3. Procesar cada empleado
    for (const empleado of empleadosSinSucursal.recordset) {
      const establecimientoOriginal = empleado.establecimiento || '';
      const establecimientoNormalizado = establecimientoOriginal.toUpperCase().trim();

      console.log(`Procesando: ${empleado.nombre} ${empleado.apellido || ''}`);
      console.log(`   Establecimiento: "${establecimientoOriginal}"`);

      let sucursalNombre = null;

      // Buscar en el mapeo manual
      if (MAPEO_ESTABLECIMIENTOS[establecimientoNormalizado]) {
        sucursalNombre = MAPEO_ESTABLECIMIENTOS[establecimientoNormalizado];
        console.log(`   ✓ Encontrado en mapeo: ${sucursalNombre}`);
      } else {
        // Buscar coincidencia parcial en el mapeo
        for (const [key, value] of Object.entries(MAPEO_ESTABLECIMIENTOS)) {
          if (establecimientoNormalizado.includes(key) || key.includes(establecimientoNormalizado)) {
            sucursalNombre = value;
            console.log(`   ✓ Coincidencia parcial en mapeo: ${sucursalNombre}`);
            break;
          }
        }
      }

      if (!sucursalNombre) {
        console.log(`   ❌ No se encontró mapeo\n`);
        noEncontrados.push(empleado);
        continue;
      }

      // Obtener ID de sucursal
      const sucursalId = sucursalesMap.get(sucursalNombre.toUpperCase());

      if (!sucursalId) {
        console.log(`   ❌ Sucursal "${sucursalNombre}" no existe en BD\n`);
        noEncontrados.push(empleado);
        continue;
      }

      // Verificar si ya existe la relación
      const existe = await transaction.request()
        .input('id_empleado', sql.Int, empleado.id)
        .input('id_sucursal', sql.Int, sucursalId)
        .query(`
          SELECT COUNT(*) as count
          FROM empleados_sucursales
          WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
        `);

      if (existe.recordset[0].count > 0) {
        // Reactivar
        await transaction.request()
          .input('id_empleado', sql.Int, empleado.id)
          .input('id_sucursal', sql.Int, sucursalId)
          .query(`
            UPDATE empleados_sucursales
            SET activo = 1
            WHERE id_empleado = @id_empleado AND id_sucursal = @id_sucursal
          `);
        console.log(`   ✅ Reactivado → ${sucursalNombre}\n`);
      } else {
        // Insertar nuevo
        await transaction.request()
          .input('id_empleado', sql.Int, empleado.id)
          .input('id_sucursal', sql.Int, sucursalId)
          .query(`
            INSERT INTO empleados_sucursales (id_empleado, id_sucursal, activo, created_at)
            VALUES (@id_empleado, @id_sucursal, 1, GETDATE())
          `);
        console.log(`   ✅ Asignado → ${sucursalNombre}\n`);
      }

      asignados++;
    }

    await transaction.commit();

    // 4. Resumen
    console.log('\n═'.repeat(80));
    console.log('📊 RESUMEN:');
    console.log('═'.repeat(80));
    console.log(`Total procesados: ${empleadosSinSucursal.recordset.length}`);
    console.log(`Asignados exitosamente: ${asignados}`);
    console.log(`No encontrados: ${noEncontrados.length}\n`);

    if (noEncontrados.length > 0) {
      console.log('⚠️ EMPLEADOS SIN MAPEO:');
      noEncontrados.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.nombre} ${emp.apellido || ''} - "${emp.establecimiento}"`);
      });
      console.log('\n💡 Estos empleados requieren asignación manual o agregar su establecimiento al mapeo.\n');
    }

    console.log('✅ Asignación completada\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Detalles:', error.message);
    try {
      await transaction.rollback();
      console.log('⚠️ Cambios revertidos');
    } catch (e) {
      console.error('Error al revertir:', e);
    }
  }

  process.exit(0);
}

// Ejecutar
asignarSucursalesInteligente();
