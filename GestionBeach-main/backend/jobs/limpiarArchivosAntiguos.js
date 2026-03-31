/**
 * limpiarArchivosAntiguos.js
 * Elimina archivos temporales/procesados que no se han usado en más de 30 días.
 *
 * Directorios limpiados:
 *   - pbi_downloads/     → Excel descargados de Power BI (procesados, no se vuelven a usar)
 *   - pbi_screenshots/   → Capturas de pantalla de Power BI
 *   - planificacion/     → Excel de compras subidos manualmente
 *   - panificacion/      → Excel de panificación subidos manualmente
 *   - tickets/           → PDFs/imágenes de tickets procesados
 *   - concurso-piscinas/ → Fotos del concurso de piscinas
 *
 * Directorios EXCLUIDOS (datos activos del sistema):
 *   - perfiles/   → Fotos de perfil de usuarios (se eliminan solo si se borra el usuario)
 *   - organigrama/ → Fotos del personal en el organigrama
 *   - chat/        → Tiene su propio job de limpieza (3 días)
 *
 * Frecuencia: cada domingo a las 03:00 AM
 */

const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');

const DIAS_LIMITE    = 30;
const MS_EN_30_DIAS  = DIAS_LIMITE * 24 * 60 * 60 * 1000;

// Directorio raíz de uploads (relativo al CWD del servidor = raíz del proyecto)
const BASE_UPLOADS = path.join(__dirname, '..', 'uploads');

// Carpetas a limpiar
const CARPETAS_A_LIMPIAR = [
  'pbi_downloads',
  'pbi_screenshots',
  'planificacion',
  'panificacion',
  'tickets',
  'concurso-piscinas',
];

/**
 * Elimina archivos de una carpeta que tengan más de 30 días de antigüedad.
 * @returns {{ eliminados: number, errores: number, bytesLiberados: number }}
 */
function limpiarCarpeta(carpeta) {
  const dirPath = path.join(BASE_UPLOADS, carpeta);
  let eliminados = 0;
  let errores    = 0;
  let bytesLiberados = 0;

  if (!fs.existsSync(dirPath)) return { eliminados, errores, bytesLiberados };

  const ahora = Date.now();
  let archivos;

  try {
    archivos = fs.readdirSync(dirPath);
  } catch {
    return { eliminados, errores: 1, bytesLiberados };
  }

  for (const archivo of archivos) {
    const rutaArchivo = path.join(dirPath, archivo);

    try {
      const stat = fs.statSync(rutaArchivo);

      // Solo eliminar archivos (no subdirectorios)
      if (!stat.isFile()) continue;

      const edadMs = ahora - stat.mtimeMs;

      if (edadMs > MS_EN_30_DIAS) {
        bytesLiberados += stat.size;
        fs.unlinkSync(rutaArchivo);
        eliminados++;
      }
    } catch (err) {
      console.error(`  ⚠️  No se pudo procesar ${archivo}:`, err.message);
      errores++;
    }
  }

  return { eliminados, errores, bytesLiberados };
}

/**
 * Formatea bytes en KB, MB o GB legibles.
 */
function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Función principal de limpieza. Se puede llamar directamente para pruebas.
 */
async function limpiarArchivosAntiguos() {
  const inicio = new Date();
  console.log(`\n🧹 [${inicio.toLocaleString('es-CL')}] Iniciando limpieza de archivos antiguos (>${DIAS_LIMITE} días)...`);

  let totalEliminados   = 0;
  let totalErrores      = 0;
  let totalBytesLibres  = 0;

  for (const carpeta of CARPETAS_A_LIMPIAR) {
    const { eliminados, errores, bytesLiberados } = limpiarCarpeta(carpeta);

    if (eliminados > 0) {
      console.log(`  ✅ ${carpeta}/: ${eliminados} archivo(s) eliminado(s) (${formatBytes(bytesLiberados)})`);
    } else {
      console.log(`  ✓  ${carpeta}/: sin archivos para eliminar`);
    }

    totalEliminados  += eliminados;
    totalErrores     += errores;
    totalBytesLibres += bytesLiberados;
  }

  const duracionMs = Date.now() - inicio.getTime();
  console.log(`\n📊 Limpieza completada en ${duracionMs}ms:`);
  console.log(`   • Archivos eliminados : ${totalEliminados}`);
  console.log(`   • Espacio liberado    : ${formatBytes(totalBytesLibres)}`);
  if (totalErrores > 0) {
    console.log(`   • Errores            : ${totalErrores}`);
  }
  console.log('');
}

/**
 * Registra el cron y arranca el job.
 */
function iniciarJobLimpiezaArchivos() {
  console.log('🚀 Job de limpieza de archivos antiguos iniciado');
  console.log(`📅 Se ejecutará cada domingo a las 03:00 AM (archivos >${DIAS_LIMITE} días)`);

  // Cada domingo a las 03:00 AM (hora Chile)
  cron.schedule('0 3 * * 0', () => {
    limpiarArchivosAntiguos();
  }, { timezone: 'America/Santiago' });
}

module.exports = {
  iniciarJobLimpiezaArchivos,
  limpiarArchivosAntiguos, // exportada para poder probarla desde una ruta /admin si se necesita
};
