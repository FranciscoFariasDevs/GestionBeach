// comparar_semanas.js — Compara datos reales DB vs referencia imagen
require('dotenv').config({ path: './backend/.env' });
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 120000 },
};

// ─── Datos de referencia (imagen "comportamiento semanas.jpeg") ───────────────
const REFERENCIA = {
  1:  { enc: 66237168,  noEnc: 12999029 },
  2:  { enc: 161806517, noEnc: 23523058 },
  3:  { enc: 111811424, noEnc: 39635121 },
  4:  { enc: 145597703, noEnc: 5593990  },
  5:  { enc: 150856304, noEnc: 23404451 },
  6:  { enc: 96113686,  noEnc: 27945489 },
  7:  { enc: 105154061, noEnc: 21044198 },
  8:  { enc: 112087010, noEnc: 24148719 },
  9:  { enc: 124147536, noEnc: 36353051 },
  10: { enc: 60976912,  noEnc: 20040564 },
  11: { enc: 93917661,  noEnc: 26984897 },
  12: { enc: 161416499, noEnc: 31289908 },
  13: { enc: 99305431,  noEnc: 30032426 },
  14: { enc: 112340182, noEnc: 21737986 },
  15: { enc: 78490074,  noEnc: 31804780 },
  16: { enc: 56070658,  noEnc: 23159765 },
  17: { enc: 35840812,  noEnc: 0        },
  18: { enc: 99915675,  noEnc: 1800000  },
  19: { enc: 61609741,  noEnc: 7116875  },
  20: { enc: 23496452,  noEnc: 743702   },
  21: { enc: 7683091,   noEnc: 1322823  },
  22: { enc: 20619159,  noEnc: 0        },
  23: { enc: 13575347,  noEnc: 0        },
  24: { enc: 16004057,  noEnc: 0        },
  25: { enc: 4808986,   noEnc: 0        },
  26: { enc: 8992377,   noEnc: 0        },
};

const MES = {
  1:'ENERO', 2:'ENERO', 3:'ENERO', 4:'ENERO', 5:'ENERO',
  6:'FEBRERO', 7:'FEBRERO', 8:'FEBRERO', 9:'FEBRERO',
  10:'MARZO', 11:'MARZO', 12:'MARZO', 13:'MARZO',
  14:'ABRIL', 15:'ABRIL', 16:'ABRIL', 17:'ABRIL', 18:'ABRIL',
  19:'MAYO', 20:'MAYO', 21:'MAYO', 22:'MAYO',
  23:'JUNIO', 24:'JUNIO', 25:'JUNIO', 26:'JUNIO',
};

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL');
const pct = (real, ref) => ref === 0 ? (real === 0 ? '✅' : '⚠️ +inf') : ((real / ref * 100 - 100).toFixed(1) + '%');

async function main() {
  const pool = await new sql.ConnectionPool(config).connect();
  console.log('✅ Conectado a BD\n');

  // Query igual a getControlSemanal
  const result = await pool.request().input('año', sql.Int, 2026).query(`
    WITH dedup AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY
            CASE
              WHEN LEN(ISNULL(numero_orden,'')) > 0 AND tipo_proveedor = 'Encadenado'
              THEN numero_orden + '_PL' + ISNULL(CAST(plazo_dias AS NVARCHAR(10)),'X') + '_' + ISNULL(sucursal,'')
              ELSE CAST(id AS NVARCHAR(20))
            END
          ORDER BY id DESC
        ) AS _rn
      FROM panificacion_compras
      WHERE (
        (tipo_proveedor = 'Encadenado'    AND YEAR(fecha_vencimiento) = @año)
        OR
        (tipo_proveedor = 'No Encadenado' AND año = @año)
      ) AND ISNULL(es_madre, 0) = 0
    )
    SELECT semana_vencimiento,
      SUM(CASE WHEN tipo_proveedor='Encadenado'    THEN monto_con_iva ELSE 0 END) AS enc,
      SUM(CASE WHEN tipo_proveedor='No Encadenado' THEN monto_con_iva ELSE 0 END) AS noEnc
    FROM dedup
    WHERE _rn = 1 AND semana_vencimiento BETWEEN 1 AND 26
    GROUP BY semana_vencimiento
    ORDER BY semana_vencimiento
  `);

  const dbData = {};
  result.recordset.forEach(r => {
    dbData[r.semana_vencimiento] = { enc: parseFloat(r.enc)||0, noEnc: parseFloat(r.noEnc)||0 };
  });

  console.log('═'.repeat(100));
  console.log('COMPARACIÓN DB vs REFERENCIA (imagen comportamiento semanas.jpeg) — AÑO 2026');
  console.log('═'.repeat(100));

  let mesActual = '';
  let totalRefEnc = 0, totalRefNoEnc = 0;
  let totalDbEnc  = 0, totalDbNoEnc  = 0;
  let semanasOk = 0, semanasOff = 0;

  for (let s = 1; s <= 26; s++) {
    const ref = REFERENCIA[s] || { enc: 0, noEnc: 0 };
    const db  = dbData[s]    || { enc: 0, noEnc: 0 };

    if (MES[s] !== mesActual) {
      mesActual = MES[s];
      console.log(`\n  ── ${mesActual} ──`);
      console.log(`  ${'S#'.padEnd(4)} ${'REFERENCIA Enc'.padStart(18)} ${'DB Enc'.padStart(18)} ${'Dif Enc'.padStart(10)} │ ${'REF NoEnc'.padStart(16)} ${'DB NoEnc'.padStart(16)} ${'Dif NoEnc'.padStart(10)}`);
    }

    const difEnc   = db.enc   - ref.enc;
    const difNoEnc = db.noEnc - ref.noEnc;
    const okEnc   = Math.abs(difEnc)   < ref.enc   * 0.02 || (ref.enc   === 0 && db.enc   === 0);
    const okNoEnc = Math.abs(difNoEnc) < ref.noEnc * 0.02 || (ref.noEnc === 0 && db.noEnc === 0);
    const icono = okEnc && okNoEnc ? '✅' : '❌';
    if (okEnc && okNoEnc) semanasOk++; else semanasOff++;

    console.log(
      `  ${icono} S${String(s).padEnd(3)}` +
      ` ${fmt(ref.enc).padStart(18)} ${fmt(db.enc).padStart(18)} ${(difEnc >= 0 ? '+' : '') + fmt(difEnc).padStart(9)} │` +
      ` ${fmt(ref.noEnc).padStart(16)} ${fmt(db.noEnc).padStart(16)} ${(difNoEnc >= 0 ? '+' : '') + fmt(difNoEnc).padStart(9)}`
    );

    totalRefEnc  += ref.enc;   totalRefNoEnc  += ref.noEnc;
    totalDbEnc   += db.enc;    totalDbNoEnc   += db.noEnc;
  }

  console.log('\n' + '═'.repeat(100));
  console.log('TOTALES S1–S26');
  console.log(`  Encadenados  → REF: ${fmt(totalRefEnc).padStart(20)}  DB: ${fmt(totalDbEnc).padStart(20)}  Dif: ${fmt(totalDbEnc - totalRefEnc)}`);
  console.log(`  No Encadenados → REF: ${fmt(totalRefNoEnc).padStart(18)}  DB: ${fmt(totalDbNoEnc).padStart(18)}  Dif: ${fmt(totalDbNoEnc - totalRefNoEnc)}`);
  console.log(`\n  Semanas exactas (±2%): ${semanasOk}/26   Con discrepancia: ${semanasOff}/26`);
  console.log('═'.repeat(100));

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
