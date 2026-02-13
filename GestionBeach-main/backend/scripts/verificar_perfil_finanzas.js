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

// Módulos correctos para el perfil Finanzas (sin Cabañas)
const modulosFinanzas = [
  'Dashboard',
  'Estado Resultado',
  'Ventas',
  'Remuneraciones',
  'Inventario',
  'Centros de Costos',
  'Facturas XML',
  'Compras'
];

async function verificarYCorregirFinanzas() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // 1. Buscar el usuario DREYES
    console.log('=== BUSCANDO USUARIO DREYES ===');
    const usuarioResult = await pool.request()
      .query(`
        SELECT u.id, u.username, u.nombre_completo, u.perfil_id, p.nombre as perfil_nombre
        FROM usuarios u
        LEFT JOIN perfiles p ON u.perfil_id = p.id
        WHERE u.username = 'DREYES'
      `);

    if (usuarioResult.recordset.length > 0) {
      const usuario = usuarioResult.recordset[0];
      console.log(`Usuario: ${usuario.username}`);
      console.log(`Nombre: ${usuario.nombre_completo}`);
      console.log(`Perfil ID: ${usuario.perfil_id}`);
      console.log(`Perfil Nombre: ${usuario.perfil_nombre}`);
    } else {
      console.log('Usuario DREYES no encontrado');
    }

    // 2. Listar todos los perfiles
    console.log('\n=== TODOS LOS PERFILES ===');
    const perfilesResult = await pool.request()
      .query('SELECT id, nombre, descripcion FROM perfiles ORDER BY id');

    perfilesResult.recordset.forEach(p => {
      console.log(`ID: ${p.id} - ${p.nombre}`);
    });

    // 3. Buscar perfil Finanzas
    console.log('\n=== PERFIL FINANZAS ===');
    const finanzasResult = await pool.request()
      .query(`SELECT id, nombre FROM perfiles WHERE nombre LIKE '%Finanzas%' OR nombre LIKE '%finanzas%'`);

    if (finanzasResult.recordset.length === 0) {
      console.log('No se encontró perfil Finanzas');
      return;
    }

    const perfilFinanzas = finanzasResult.recordset[0];
    console.log(`Perfil Finanzas encontrado: ID ${perfilFinanzas.id}`);

    // 4. Ver módulos actuales del perfil Finanzas
    console.log('\n=== MÓDULOS ACTUALES DEL PERFIL FINANZAS ===');
    const modulosActualesResult = await pool.request()
      .input('perfilId', sql.Int, perfilFinanzas.id)
      .query(`
        SELECT m.id, m.nombre
        FROM perfil_modulo pm
        INNER JOIN modulos m ON pm.modulo_id = m.id
        WHERE pm.perfil_id = @perfilId
        ORDER BY m.nombre
      `);

    console.log('Módulos asignados actualmente:');
    modulosActualesResult.recordset.forEach(m => {
      const esIncorrecto = m.nombre === 'Cabañas' ? ' ❌ (NO DEBERÍA ESTAR)' : '';
      console.log(`  - ${m.nombre}${esIncorrecto}`);
    });

    // 5. Verificar si Cabañas está asignado
    const tieneCabanas = modulosActualesResult.recordset.some(m => m.nombre === 'Cabañas');

    if (tieneCabanas) {
      console.log('\n⚠️  El perfil Finanzas tiene el módulo Cabañas asignado incorrectamente');
      console.log('\n=== CORRIGIENDO... ===');

      // Obtener ID del módulo Cabañas
      const cabanasResult = await pool.request()
        .query(`SELECT id FROM modulos WHERE nombre = 'Cabañas'`);

      if (cabanasResult.recordset.length > 0) {
        const cabanasId = cabanasResult.recordset[0].id;

        // Eliminar Cabañas del perfil Finanzas
        await pool.request()
          .input('perfilId', sql.Int, perfilFinanzas.id)
          .input('moduloId', sql.Int, cabanasId)
          .query(`DELETE FROM perfil_modulo WHERE perfil_id = @perfilId AND modulo_id = @moduloId`);

        console.log('✅ Módulo Cabañas eliminado del perfil Finanzas');
      }
    } else {
      console.log('\n✅ El perfil Finanzas NO tiene el módulo Cabañas (está correcto)');
    }

    // 6. Verificar módulos después de la corrección
    console.log('\n=== MÓDULOS FINALES DEL PERFIL FINANZAS ===');
    const modulosFinalesResult = await pool.request()
      .input('perfilId', sql.Int, perfilFinanzas.id)
      .query(`
        SELECT m.id, m.nombre
        FROM perfil_modulo pm
        INNER JOIN modulos m ON pm.modulo_id = m.id
        WHERE pm.perfil_id = @perfilId
        ORDER BY m.nombre
      `);

    modulosFinalesResult.recordset.forEach(m => {
      console.log(`  - ${m.nombre}`);
    });

    // 7. También verificar permisos individuales del usuario DREYES
    if (usuarioResult.recordset.length > 0) {
      const userId = usuarioResult.recordset[0].id;
      console.log('\n=== PERMISOS INDIVIDUALES DE DREYES ===');
      const permisosIndResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT m.id, m.nombre
          FROM permisos_usuario pu
          INNER JOIN modulos m ON pu.modulo_id = m.id
          WHERE pu.usuario_id = @userId
          ORDER BY m.nombre
        `);

      if (permisosIndResult.recordset.length > 0) {
        permisosIndResult.recordset.forEach(m => {
          const esIncorrecto = m.nombre === 'Cabañas' ? ' ❌ (NO DEBERÍA ESTAR)' : '';
          console.log(`  - ${m.nombre}${esIncorrecto}`);
        });

        // Verificar si tiene Cabañas en permisos individuales
        const tieneCabanasIndiv = permisosIndResult.recordset.some(m => m.nombre === 'Cabañas');
        if (tieneCabanasIndiv) {
          console.log('\n⚠️  DREYES tiene Cabañas en permisos individuales, eliminando...');

          const cabanasResult = await pool.request()
            .query(`SELECT id FROM modulos WHERE nombre = 'Cabañas'`);

          if (cabanasResult.recordset.length > 0) {
            await pool.request()
              .input('userId', sql.Int, userId)
              .input('moduloId', sql.Int, cabanasResult.recordset[0].id)
              .query(`DELETE FROM permisos_usuario WHERE usuario_id = @userId AND modulo_id = @moduloId`);

            console.log('✅ Módulo Cabañas eliminado de permisos individuales de DREYES');
          }
        }
      } else {
        console.log('  (Sin permisos individuales adicionales)');
      }
    }

    console.log('\n=== PROCESO COMPLETADO ===');
    console.log('El usuario DREYES debe cerrar sesión y volver a iniciar para ver los cambios.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

verificarYCorregirFinanzas();
