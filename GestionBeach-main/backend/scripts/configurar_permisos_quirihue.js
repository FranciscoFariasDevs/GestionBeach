// backend/scripts/configurar_permisos_quirihue.js
// Script de ejemplo para configurar permisos del Jefe de Local Quirihue

const { sql, poolPromise } = require('../config/db');

const configurarPermisosQuirihue = async () => {
  console.log('\n🔧 === CONFIGURANDO PERMISOS PARA JEFE DE LOCAL QUIRIHUE ===\n');

  try {
    const pool = await poolPromise;

    // 1. Buscar/Crear perfil "Jefe de Local Quirihue"
    console.log('📋 Paso 1: Verificando perfil...');

    let perfilResult = await pool.request()
      .input('nombrePerfil', sql.VarChar, 'Jefe de Local Quirihue')
      .query('SELECT id, nombre FROM perfiles WHERE nombre = @nombrePerfil');

    let perfilId;

    if (perfilResult.recordset.length === 0) {
      console.log('   Creando nuevo perfil...');
      const createResult = await pool.request()
        .input('nombrePerfil', sql.VarChar, 'Jefe de Local Quirihue')
        .input('descripcion', sql.VarChar, 'Acceso limitado a sucursal Quirihue')
        .query(`
          INSERT INTO perfiles (nombre, descripcion)
          VALUES (@nombrePerfil, @descripcion);
          SELECT SCOPE_IDENTITY() as id;
        `);
      perfilId = createResult.recordset[0].id;
      console.log(`   ✅ Perfil creado con ID: ${perfilId}`);
    } else {
      perfilId = perfilResult.recordset[0].id;
      console.log(`   ✅ Perfil encontrado con ID: ${perfilId}`);
    }

    // 2. Buscar sucursal Quirihue
    console.log('\n📋 Paso 2: Verificando sucursal Quirihue...');

    const sucursalResult = await pool.request()
      .input('nombreSucursal', sql.VarChar, '%QUIRIHUE%')
      .query(`
        SELECT id, nombre, tipo_sucursal
        FROM sucursales
        WHERE nombre LIKE @nombreSucursal
      `);

    if (sucursalResult.recordset.length === 0) {
      console.log('   ❌ No se encontró sucursal Quirihue');
      console.log('   Sucursales disponibles:');
      const todasSucursales = await pool.request().query('SELECT id, nombre FROM sucursales ORDER BY nombre');
      todasSucursales.recordset.forEach(s => console.log(`      ${s.id}. ${s.nombre}`));
      process.exit(1);
    }

    const sucursalQuirihue = sucursalResult.recordset[0];
    console.log(`   ✅ Sucursal encontrada: ${sucursalQuirihue.nombre} (ID: ${sucursalQuirihue.id})`);

    // 3. Buscar módulos importantes
    console.log('\n📋 Paso 3: Buscando módulos...');

    const modulosImportantes = ['Ventas', 'Dashboard', 'Inventario', 'Productos'];
    const modulosEncontrados = [];

    for (const nombreModulo of modulosImportantes) {
      const moduloResult = await pool.request()
        .input('nombreModulo', sql.VarChar, nombreModulo)
        .query('SELECT id, nombre FROM modulos WHERE nombre = @nombreModulo');

      if (moduloResult.recordset.length > 0) {
        modulosEncontrados.push(moduloResult.recordset[0]);
        console.log(`   ✅ Módulo encontrado: ${nombreModulo} (ID: ${moduloResult.recordset[0].id})`);
      } else {
        console.log(`   ⚠️ Módulo no encontrado: ${nombreModulo}`);
      }
    }

    if (modulosEncontrados.length === 0) {
      console.log('\n   ❌ No se encontraron módulos para configurar');
      process.exit(1);
    }

    // 4. Configurar permisos
    console.log('\n📋 Paso 4: Configurando permisos...');

    for (const modulo of modulosEncontrados) {
      console.log(`\n   Módulo: ${modulo.nombre}`);

      // Verificar si ya existe permiso
      const existePermiso = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, modulo.id)
        .input('sucursalId', sql.Int, sucursalQuirihue.id)
        .query(`
          SELECT id FROM perfil_modulo_sucursal
          WHERE perfil_id = @perfilId
            AND modulo_id = @moduloId
            AND sucursal_id = @sucursalId
        `);

      if (existePermiso.recordset.length > 0) {
        console.log(`      ⚠️ Ya existe permiso para este módulo/sucursal`);
        continue;
      }

      // Definir permisos según el módulo
      let puedeLeer = true;
      let puedeEscribir = false;
      let puedeExportar = false;

      if (modulo.nombre === 'Inventario' || modulo.nombre === 'Productos') {
        puedeEscribir = true; // Puede editar en inventario
      }

      if (modulo.nombre === 'Dashboard' || modulo.nombre === 'Ventas') {
        puedeExportar = true; // Puede exportar reportes
      }

      // Insertar permiso
      await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, modulo.id)
        .input('sucursalId', sql.Int, sucursalQuirihue.id)
        .input('puedeLeer', sql.Bit, puedeLeer)
        .input('puedeEscribir', sql.Bit, puedeEscribir)
        .input('puedeExportar', sql.Bit, puedeExportar)
        .query(`
          INSERT INTO perfil_modulo_sucursal
            (perfil_id, modulo_id, sucursal_id, puede_leer, puede_escribir, puede_exportar)
          VALUES
            (@perfilId, @moduloId, @sucursalId, @puedeLeer, @puedeEscribir, @puedeExportar)
        `);

      const permisos = [];
      if (puedeLeer) permisos.push('Leer');
      if (puedeEscribir) permisos.push('Escribir');
      if (puedeExportar) permisos.push('Exportar');

      console.log(`      ✅ Configurado con permisos: ${permisos.join(', ')}`);
    }

    // 5. También configurar perfil_modulo (acceso general al módulo)
    console.log('\n📋 Paso 5: Configurando acceso general a módulos...');

    for (const modulo of modulosEncontrados) {
      const existeAcceso = await pool.request()
        .input('perfilId', sql.Int, perfilId)
        .input('moduloId', sql.Int, modulo.id)
        .query(`
          SELECT id FROM perfil_modulo
          WHERE perfil_id = @perfilId AND modulo_id = @moduloId
        `);

      if (existeAcceso.recordset.length === 0) {
        await pool.request()
          .input('perfilId', sql.Int, perfilId)
          .input('moduloId', sql.Int, modulo.id)
          .query(`
            INSERT INTO perfil_modulo (perfil_id, modulo_id)
            VALUES (@perfilId, @moduloId)
          `);
        console.log(`   ✅ Acceso al módulo ${modulo.nombre} configurado`);
      }
    }

    // 6. Resumen final
    console.log('\n📊 === RESUMEN DE CONFIGURACIÓN ===\n');

    const resumenResult = await pool.request()
      .input('perfilId', sql.Int, perfilId)
      .query(`
        SELECT
          m.nombre as modulo,
          s.nombre as sucursal,
          pms.puede_leer,
          pms.puede_escribir,
          pms.puede_exportar
        FROM perfil_modulo_sucursal pms
          INNER JOIN modulos m ON m.id = pms.modulo_id
          INNER JOIN sucursales s ON s.id = pms.sucursal_id
        WHERE pms.perfil_id = @perfilId
        ORDER BY m.nombre
      `);

    console.log(`Perfil: Jefe de Local Quirihue (ID: ${perfilId})`);
    console.log(`Total de permisos configurados: ${resumenResult.recordset.length}\n`);

    resumenResult.recordset.forEach(permiso => {
      const permisos = [];
      if (permiso.puede_leer) permisos.push('✓ Leer');
      if (permiso.puede_escribir) permisos.push('✓ Escribir');
      if (permiso.puede_exportar) permisos.push('✓ Exportar');

      console.log(`• ${permiso.modulo} → ${permiso.sucursal}`);
      console.log(`  ${permisos.join(', ')}\n`);
    });

    console.log('✅ === CONFIGURACIÓN COMPLETADA ===\n');
    console.log('Siguiente paso:');
    console.log('1. Asignar este perfil a un usuario:');
    console.log(`   UPDATE usuarios SET perfil_id = ${perfilId} WHERE id = <usuario_id>`);
    console.log('\n2. O crear un nuevo usuario con este perfil desde el frontend\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
};

configurarPermisosQuirihue();
