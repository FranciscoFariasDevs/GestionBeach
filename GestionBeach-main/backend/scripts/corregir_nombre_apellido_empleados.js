const sql = require('mssql');

const config = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Función para parsear nombre completo formato chileno
// Formato: "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2" (2 apellidos + nombres)
function parsearNombreChileno(nombreCompleto) {
  if (!nombreCompleto) return { nombre: 'Sin Nombre', apellido: 'Sin Apellido' };

  // Si tiene coma, usar formato "Apellido1 Apellido2, Nombre1 Nombre2"
  if (nombreCompleto.includes(',')) {
    const partes = nombreCompleto.split(',');
    return {
      apellido: partes[0].trim() || 'Sin Apellido',
      nombre: partes[1]?.trim() || 'Sin Nombre'
    };
  }

  // Sin coma: asumir formato chileno "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
  const partes = nombreCompleto.trim().split(' ').filter(p => p.length > 0);

  if (partes.length <= 2) {
    // Solo 1-2 partes: primer elemento nombre, resto apellido
    return {
      nombre: partes[0] || 'Sin Nombre',
      apellido: partes.slice(1).join(' ') || 'Sin Apellido'
    };
  }

  // 3+ partes: los 2 primeros son apellidos, el resto son nombres
  return {
    apellido: partes.slice(0, 2).join(' '),
    nombre: partes.slice(2).join(' ')
  };
}

async function corregirNombreApellido() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // 1. Obtener nombre_empleado original de datos_remuneraciones
    console.log('=== OBTENIENDO NOMBRES ORIGINALES DE REMUNERACIONES ===');
    const remuneracionesResult = await pool.request()
      .query(`
        SELECT DISTINCT dr.rut_empleado, dr.nombre_empleado
        FROM datos_remuneraciones dr
        WHERE dr.rut_empleado IS NOT NULL
      `);

    console.log(`Encontrados ${remuneracionesResult.recordset.length} empleados en remuneraciones\n`);

    // 2. Ver estado actual de empleados
    console.log('=== ESTADO ACTUAL DE EMPLEADOS ===');
    const empleadosActuales = await pool.request()
      .query('SELECT id, rut, nombre, apellido FROM empleados');

    empleadosActuales.recordset.forEach(e => {
      console.log(`ID ${e.id}: RUT=${e.rut} | Nombre="${e.nombre}" | Apellido="${e.apellido}"`);
    });

    // 3. Corregir cada empleado usando el nombre original
    console.log('\n=== CORRIGIENDO EMPLEADOS ===');

    let actualizados = 0;
    for (const remun of remuneracionesResult.recordset) {
      const rutLimpio = remun.rut_empleado?.replace(/\./g, '').replace(/-/g, '').replace(/ /g, '').toUpperCase();
      const nombreOriginal = remun.nombre_empleado;

      if (!rutLimpio || !nombreOriginal) continue;

      // Parsear el nombre correctamente
      const { nombre, apellido } = parsearNombreChileno(nombreOriginal);

      console.log(`\nOriginal: "${nombreOriginal}"`);
      console.log(`  -> Nombre: "${nombre}" | Apellido: "${apellido}"`);

      // Actualizar en la BD
      const updateResult = await pool.request()
        .input('nombre', sql.VarChar, nombre)
        .input('apellido', sql.VarChar, apellido)
        .input('rut', sql.VarChar, rutLimpio)
        .query(`
          UPDATE empleados
          SET nombre = @nombre, apellido = @apellido, updated_at = GETDATE()
          WHERE REPLACE(REPLACE(REPLACE(UPPER(rut), '.', ''), '-', ''), ' ', '') = @rut
        `);

      if (updateResult.rowsAffected[0] > 0) {
        actualizados++;
        console.log(`  ✅ Actualizado`);
      }
    }

    // 4. Ver resultado final
    console.log('\n=== RESULTADO FINAL ===');
    const empleadosFinales = await pool.request()
      .query('SELECT id, rut, nombre, apellido FROM empleados');

    empleadosFinales.recordset.forEach(e => {
      console.log(`ID ${e.id}: Nombre="${e.nombre}" | Apellido="${e.apellido}"`);
    });

    console.log(`\n✅ Total empleados actualizados: ${actualizados}`);
    console.log('\n=== PROCESO COMPLETADO ===');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

corregirNombreApellido();
