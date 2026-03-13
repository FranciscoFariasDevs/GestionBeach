/**
 * pbiAutoDescarga.js
 * Job automático: descarga facturas PBI cada lunes a las 07:30
 * y las procesa igual que si las hubiera subido manualmente.
 */

const cron                = require('node-cron');
const path                = require('path');
const fs                  = require('fs');
const { descargarFacturasPBI } = require('../services/pbiService');
const { poolPromise, sql } = require('../config/db');

// Reutilizamos la lógica de uploadFacturasPBI directamente
const ctrl = require('../controllers/planificacionController');

/**
 * Simula el req/res para llamar al controller sin HTTP.
 */
async function procesarArchivoDescargado(filePath) {
  return new Promise((resolve) => {
    const req = {
      file: { path: filePath, originalname: path.basename(filePath) },
      user: { id: 0, nombre: 'Sistema Automático' },
    };
    const res = {
      status: (code) => ({
        json: (data) => resolve({ code, ...data }),
      }),
      json: (data) => resolve({ code: 200, ...data }),
    };
    ctrl.uploadFacturasPBI(req, res);
  });
}

async function ejecutarDescargaYProceso() {
  console.log('[PBI-JOB] Iniciando descarga automática de facturas PBI...');

  const resultado = await descargarFacturasPBI((msg) => {
    console.log('[PBI-JOB]', msg);
  });

  if (!resultado.success) {
    console.error('[PBI-JOB] Error en descarga:', resultado.mensaje);
    return;
  }

  console.log('[PBI-JOB] Procesando archivo:', resultado.filePath);
  const procResult = await procesarArchivoDescargado(resultado.filePath);

  if (procResult.success) {
    console.log('[PBI-JOB] ✓ Proceso completado:', procResult.message);
    // Limpiar archivo temporal
    try { fs.unlinkSync(resultado.filePath); } catch {}
  } else {
    console.error('[PBI-JOB] Error al procesar:', procResult.message);
  }
}

function iniciarJobPBI() {
  // Cada lunes a las 07:30 (hora del servidor)
  cron.schedule('30 7 * * 1', async () => {
    console.log('[PBI-JOB] 🕐 Ejecutando job semanal de facturas PBI...');
    await ejecutarDescargaYProceso();
  }, {
    timezone: 'America/Santiago'
  });

  console.log('📅 Job PBI automático iniciado — se ejecutará cada lunes a las 07:30 (Santiago)');
}

module.exports = { iniciarJobPBI, ejecutarDescargaYProceso };
