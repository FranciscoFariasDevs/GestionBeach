// Test con filtro de razón social
const { poolPromise, sql } = require('../config/db');

async function testConRazonSocial() {
  const pool = await poolPromise;

  console.log('='.repeat(80));
  console.log('TEST CON FILTRO DE RAZÓN SOCIAL');
  console.log('='.repeat(80));

  const sucursal_id = 5;
  const anio = 2025;
  const mes = 11;

  // Razones sociales a probar
  const razonesSociales = [
    { id: 3, nombre: 'ERIZ HERMANOS SPA' },
    { id: 4, nombre: 'GESTIÓN BEACH SPA' },
    { id: 'todos', nombre: 'TODAS' }
  ];

  for (const rs of razonesSociales) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RAZÓN SOCIAL: ${rs.nombre} (ID: ${rs.id})`);
    console.log('='.repeat(60));

    try {
      let query = `
        SELECT
          dr.rut_empleado,
          dr.nombre_empleado,
          dr.liquido_pagar,
          e.id_razon_social,
          rs.nombre_razon,
          es.id_sucursal
        FROM datos_remuneraciones AS dr
        INNER JOIN periodos_remuneracion AS pr ON pr.id_periodo = dr.id_periodo
        INNER JOIN empleados AS e ON
          REPLACE(REPLACE(REPLACE(UPPER(e.rut), '.', ''), '-', ''), ' ', '') =
          REPLACE(REPLACE(REPLACE(UPPER(dr.rut_empleado), '.', ''), '-', ''), ' ', '')
        LEFT JOIN empleados_sucursales AS es ON es.id_empleado = e.id AND es.activo = 1 AND es.id_sucursal = @sucursal_id
        LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
        WHERE pr.anio = @anio
          AND pr.mes = @mes
          AND (dr.liquido_pagar IS NOT NULL OR dr.seguro_cesantia IS NOT NULL)
          AND es.id_sucursal = @sucursal_id
      `;

      const request = pool.request()
        .input('anio', sql.Int, anio)
        .input('mes', sql.Int, mes)
        .input('sucursal_id', sql.Int, sucursal_id);

      if (rs.id !== 'todos') {
        query += ' AND e.id_razon_social = @razon_social_id';
        request.input('razon_social_id', sql.Int, rs.id);
      }

      const result = await request.query(query);

      console.log(`Registros encontrados: ${result.recordset.length}`);
      if (result.recordset.length === 0) {
        console.log('⚠️ NO SE ENCONTRARON EMPLEADOS CON ESTA RAZÓN SOCIAL');
      } else {
        result.recordset.forEach(r => {
          console.log(`   ✅ ${r.nombre_empleado} | Razón: ${r.nombre_razon} | Líquido: $${r.liquido_pagar}`);
        });
      }
    } catch (e) {
      console.log('   Error:', e.message);
    }
  }

  // Verificar razón social de los empleados con remuneración
  console.log('\n' + '='.repeat(60));
  console.log('RAZÓN SOCIAL DE EMPLEADOS CON REMUNERACIÓN NOV 2025');
  console.log('='.repeat(60));

  const empRs = await pool.request().query(`
    SELECT e.nombre, e.apellido, e.rut, e.id_razon_social, rs.nombre_razon
    FROM empleados e
    LEFT JOIN razones_sociales rs ON e.id_razon_social = rs.id
    WHERE e.rut IN ('123792386', '183610708')
  `);

  empRs.recordset.forEach(e => {
    console.log(`${e.nombre} ${e.apellido} (${e.rut}) -> Razón Social: ${e.nombre_razon} (ID: ${e.id_razon_social})`);
  });

  process.exit(0);
}

testConRazonSocial().catch(e => { console.error(e); process.exit(1); });
