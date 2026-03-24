// Script para asignar permisos del módulo Ajustes a los perfiles indicados
const sql = require('mssql');

const config = {
  user: 'sa',
  password: '*1beachmarket',
  server: '192.168.100.200',
  database: 'GestionBeach',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

const perfiles = [10, 11, 16, 30];
const sucursales = [18, 19, 20, 21, 22, 23, 24];

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Conectado a GestionBeach');

    // Obtener ID del módulo Ajustes
    const moduloResult = await pool.request()
      .input('nombre', sql.VarChar, 'Ajustes')
      .query('SELECT id FROM modulos WHERE nombre = @nombre');

    if (moduloResult.recordset.length === 0) {
      console.log('El módulo Ajustes no existe todavía en la BD.');
      console.log('Se sincronizará automáticamente al reiniciar el backend.');
      console.log('Ejecuta este script nuevamente después de reiniciar el backend.');
      return;
    }

    const moduloId = moduloResult.recordset[0].id;
    console.log(`Módulo Ajustes encontrado con ID: ${moduloId}`);

    let insertados = 0;
    let yaExistian = 0;

    for (const perfilId of perfiles) {
      for (const sucursalId of sucursales) {
        // Verificar si ya existe
        const existe = await pool.request()
          .input('perfil_id', sql.Int, perfilId)
          .input('modulo_id', sql.Int, moduloId)
          .input('sucursal_id', sql.Int, sucursalId)
          .query(`
            SELECT 1 FROM perfil_modulo_sucursal
            WHERE perfil_id = @perfil_id
              AND modulo_id = @modulo_id
              AND sucursal_id = @sucursal_id
          `);

        if (existe.recordset.length === 0) {
          await pool.request()
            .input('perfil_id', sql.Int, perfilId)
            .input('modulo_id', sql.Int, moduloId)
            .input('sucursal_id', sql.Int, sucursalId)
            .query(`
              INSERT INTO perfil_modulo_sucursal (perfil_id, modulo_id, sucursal_id)
              VALUES (@perfil_id, @modulo_id, @sucursal_id)
            `);
          insertados++;
          console.log(`  Insertado: perfil=${perfilId}, modulo=${moduloId}, sucursal=${sucursalId}`);
        } else {
          yaExistian++;
        }
      }
    }

    console.log(`\nResumen: ${insertados} registros insertados, ${yaExistian} ya existían.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

main();
