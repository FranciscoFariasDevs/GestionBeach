/**
 * pbiService.js
 * Descarga automática del informe de facturas desde Power BI (Chilemat)
 * usando Playwright (navegador headless).
 */

require('dotenv').config();
const { chromium }  = require('playwright');
const path          = require('path');
const fs            = require('fs');

const PBI_USER      = process.env.PBI_USER;
const PBI_PASS      = process.env.PBI_PASS;
const PBI_URL       = process.env.PBI_REPORT_URL;
const DOWNLOAD_DIR  = path.join(__dirname, '../uploads/pbi_downloads');
const SCREENSHOT_DIR = path.join(__dirname, '../uploads/pbi_screenshots');

// Estado global para saber si hay una descarga en curso
let _enCurso = false;

function asegurarDirs() {
  [DOWNLOAD_DIR, SCREENSHOT_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

/**
 * Espera a que aparezca un selector, con timeout suave (no lanza excepción).
 */
async function esperarSelector(page, selector, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Hace clic en el botón de submit — Power BI usa <button>, Microsoft usa <input type="submit">
 */
async function clickSubmit(page) {
  // Intentar en orden de prioridad
  const opciones = [
    'input[type="submit"]',
    'button[type="submit"]',
    'button:has-text("Enviar")',
    'button:has-text("Send")',
    'button:has-text("Next")',
    'button:has-text("Siguiente")',
    'button:has-text("Sign in")',
    'button:has-text("Iniciar sesión")',
  ];
  for (const sel of opciones) {
    try {
      await page.click(sel, { timeout: 2000 });
      return true;
    } catch { /* probar siguiente */ }
  }
  // Fallback: Enter
  await page.keyboard.press('Enter');
  return true;
}

/**
 * Hace login en Microsoft / Power BI.
 * Devuelve true si tuvo éxito, false si falló.
 *
 * Flujo real observado:
 *   1. app.powerbi.com/singleSignOn → #email (type=text) + #submitBtn
 *   2. Redirige a login.microsoftonline.com → input[name="loginfmt"] + input[type="submit"]
 *   3. Contraseña → input[type="password"] + input[type="submit"]
 *   4. Prompt "mantener sesión" → #idBtn_Back (No)
 */
async function hacerLogin(page, log) {
  log('Esperando pantalla SSO de Power BI...');

  // ─ Paso 1: Pantalla SSO propia de Power BI (input#email type=text) ─
  const campoEmailPBI = await esperarSelector(page, '#email', 15000);
  if (campoEmailPBI) {
    log('Pantalla SSO Power BI encontrada. Ingresando email...');
    await page.fill('#email', PBI_USER);
    await page.waitForTimeout(300);
    try {
      await page.click('#submitBtn', { timeout: 3000 });
    } catch {
      await page.keyboard.press('Enter');
    }
    log('Email enviado, esperando redirección a Microsoft...');
    await page.waitForTimeout(5000);
  } else {
    log('No apareció SSO Power BI, verificando si ya está autenticado...');
    if (page.url().includes('powerbi.com/groups')) return true;
  }

  // ─ Paso 2: Pantalla Microsoft — campo loginfmt (usuario) ─
  const campoUser = await esperarSelector(page, 'input[name="loginfmt"]', 8000);
  if (campoUser) {
    log('Pantalla Microsoft encontrada. Ingresando usuario...');
    await page.fill('input[name="loginfmt"]', PBI_USER);
    await page.waitForTimeout(300);
    await clickSubmit(page);
    await page.waitForTimeout(4000);
  }

  // ─ Paso 3: Contraseña ─
  const campoPass = await esperarSelector(page, 'input[type="password"]', 12000);
  if (!campoPass) {
    const url = page.url();
    log(`No apareció campo de contraseña. URL actual: ${url}`);
    return url.includes('powerbi.com/groups') || url.includes('app.powerbi.com/report');
  }

  log('Ingresando contraseña...');
  await page.fill('input[type="password"]', PBI_PASS);
  await page.waitForTimeout(300);
  await clickSubmit(page);
  log('Contraseña enviada, esperando autenticación...');
  await page.waitForTimeout(5000);

  // ─ Paso 4: "¿Mantener sesión iniciada?" → No ─
  try {
    const noBtn = await page.$('#idBtn_Back');
    if (noBtn) { await noBtn.click(); log('Prompt "mantener sesión" descartado'); await page.waitForTimeout(2000); }
  } catch { /* no apareció */ }

  const urlFinal = page.url();
  log(`URL final tras login: ${urlFinal}`);
  const ok = urlFinal.includes('powerbi.com');
  if (!ok) log(`ADVERTENCIA: URL inesperada: ${urlFinal}`);
  return ok;
}

/**
 * Espera a que el reporte cargue completamente.
 */
async function esperarCargaReporte(page, log) {
  log('Esperando carga del reporte...');
  try {
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('.bodyCells .cell, [class*="tableEx"] .cell, td');
      return cells.length > 3;
    }, { timeout: 45000 });
  } catch { /* fallback con timeout fijo */ }
  await page.waitForTimeout(6000);
  log('Reporte cargado');
}

/**
 * Estrategia 0: usa el botón de descarga/Export de la barra principal del reporte.
 * En Power BI el toolbar tiene un ícono de flecha hacia abajo o un botón "Export".
 */
async function exportarPorBarraPrincipal(page, context, log) {
  log('Intentando exportar desde barra principal (ícono descarga)...');

  // Tomar screenshot para diagnóstico antes de intentar
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `toolbar_${Date.now()}.png`) });

  // Selectores del ícono de descarga / export en la barra de herramientas de PBI
  const toolbarSelectors = [
    'button[aria-label="Export"]',
    'button[title="Export"]',
    'button[aria-label*="export" i]',
    'button[title*="export" i]',
    // ícono flecha abajo en el toolbar del reporte
    'button[aria-label*="download" i]',
    'button[title*="download" i]',
    // En PBI online el botón export está en el toolbar report
    '[data-automation-id*="export" i]',
  ];

  let btnExportToolbar = null;
  for (const sel of toolbarSelectors) {
    const btns = await page.$$(sel);
    // Buscar sólo en la barra superior (y < 150)
    for (const btn of btns) {
      const box = await btn.boundingBox();
      if (box && box.y < 150) {
        btnExportToolbar = btn;
        log(`Botón export en barra principal encontrado (${sel}) en y=${Math.round(box.y)}`);
        break;
      }
    }
    if (btnExportToolbar) break;
  }

  if (!btnExportToolbar) {
    log('No se encontró botón export en barra principal');
    return null;
  }

  // Clic en el botón de la barra → puede abrir un submenú
  await btnExportToolbar.click();
  await page.waitForTimeout(1500);

  // Si aparece un submenú, buscar opción Excel (excluir disabled)
  const excelOption = page.locator('[role="menuitem"]:not([disabled]):not([aria-disabled="true"]), [role="option"]:not([disabled])').filter({ hasText: /excel|xlsx/i });
  const excelCount = await excelOption.count();
  if (excelCount > 0) {
    log('Submenú con opción Excel encontrado');
    try {
      const destFile = path.join(DOWNLOAD_DIR, `facturas_pbi_${Date.now()}.xlsx`);
      const [download] = await Promise.all([
        context.waitForEvent('download', { timeout: 120000 }),
        excelOption.first().click(),
      ]);
      log(`Descarga iniciada desde barra: ${download.suggestedFilename()}`);
      await download.saveAs(destFile);
      log(`Archivo guardado: ${destFile}`);
      return destFile;
    } catch (e) {
      log(`Error descargando desde barra: ${e.message}`);
    }
  }

  // Si no hay submenú, puede que se abra el diálogo de exportación directamente
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `toolbar_dialog_${Date.now()}.png`) });

  // Buscar botón "Export" en el diálogo
  const allBtns = await page.$$('button');
  let dialogExportBtn = null;
  for (const btn of allBtns) {
    const txt = await btn.textContent();
    const box = await btn.boundingBox();
    if (txt && txt.trim() === 'Export' && box && box.y > 500) {
      dialogExportBtn = btn;
      log(`Botón Export del diálogo (barra) en y=${Math.round(box.y)}`);
      break;
    }
  }

  if (dialogExportBtn) {
    try {
      const destFile = path.join(DOWNLOAD_DIR, `facturas_pbi_${Date.now()}.xlsx`);
      const [download] = await Promise.all([
        context.waitForEvent('download', { timeout: 120000 }),
        dialogExportBtn.click(),
      ]);
      log(`Descarga iniciada: ${download.suggestedFilename()}`);
      await download.saveAs(destFile);
      log(`Archivo guardado: ${destFile}`);
      return destFile;
    } catch (e) {
      log(`Error en diálogo barra: ${e.message}`);
    }
  }

  return null;
}

/**
 * Intenta exportar los datos de un visual de tabla en Power BI.
 * Flujo real: hover → "More options" (...) → "Export data" → diálogo → "Export"
 *
 * Power BI usa una Blob URL para el download (no dispara el evento nativo del browser).
 * Por eso interceptamos directamente la respuesta HTTP que contiene el Excel.
 */
async function exportarDatosVisual(page, context, log) {
  log('Buscando visual de tabla para exportar...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `report_${Date.now()}.png`) });

  // Posiciones donde puede estar la tabla según el screenshot (viewport 1440x900)
  const hoverPositions = [
    { x: 1080, y: 300 },
    { x: 1080, y: 400 },
    { x: 1080, y: 250 },
    { x: 900,  y: 350 },
    { x: 1150, y: 350 },
  ];

  // Power BI en español usa "Más opciones", en inglés "More options"
  const moreBtnSelectors = [
    'button[aria-label="Más opciones"]',
    'button[aria-label="More options"]',
    'button[title="Más opciones"]',
    'button[title="More options"]',
  ];

  let btnOpciones = null;

  for (const pos of hoverPositions) {
    await page.mouse.move(pos.x, pos.y);
    await page.waitForTimeout(1200);

    for (const sel of moreBtnSelectors) {
      const btns = await page.$$(sel);
      for (const btn of btns) {
        const box = await btn.boundingBox();
        if (box && box.y > 100) {
          btnOpciones = btn;
          log(`Botón "Más opciones" encontrado (${sel}) en pos hover x=${pos.x},y=${pos.y}`);
          break;
        }
      }
      if (btnOpciones) break;
    }
    if (btnOpciones) break;
  }

  if (!btnOpciones) {
    // Último intento: buscar cualquier botón "..." visible dentro del visual
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const box = await btn.boundingBox();
      if (!box || box.y < 100) continue;
      const txt = (await btn.textContent() || '').trim();
      const lbl = (await btn.getAttribute('aria-label') || '').toLowerCase();
      if (txt === '...' || lbl.includes('opciones') || lbl.includes('options')) {
        btnOpciones = btn;
        log(`Botón "..." encontrado por texto/label: "${lbl || txt}"`);
        break;
      }
    }
  }

  if (!btnOpciones) {
    log('No se encontró botón de opciones del visual');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `no_options_btn_${Date.now()}.png`) });
    return null;
  }

  await btnOpciones.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `context_menu_${Date.now()}.png`) });

  // Buscar "Exportar datos" o "Export data" en el menú contextual
  const exportItem = page.locator('[role="menuitem"]').filter({ hasText: /exportar datos|export data/i });
  const exportCount = await exportItem.count();
  log(`Opciones "Exportar datos" en menú: ${exportCount}`);

  if (exportCount === 0) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `menu_error_${Date.now()}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return null;
  }

  await exportItem.first().click();
  log('Click en "Exportar datos", esperando diálogo...');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `dialog_${Date.now()}.png`) });

  // Buscar botón "Exportar" o "Export" en el diálogo (parte inferior)
  let dialogExportBtn = null;
  for (const btn of await page.$$('button')) {
    const txt = (await btn.textContent() || '').trim();
    const box = await btn.boundingBox();
    if (box && box.y > 400 && /^(exportar|export)$/i.test(txt)) {
      dialogExportBtn = btn;
      log(`Botón "${txt}" del diálogo en y=${Math.round(box.y)}`);
      break;
    }
  }

  if (!dialogExportBtn) {
    log('No se encontró el botón Export en el diálogo');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `dialog_error_${Date.now()}.png`) });
    return null;
  }

  const destFile = path.join(DOWNLOAD_DIR, `facturas_pbi_${Date.now()}.xlsx`);

  // Interceptar respuesta HTTP con el Excel (Power BI lo entrega como blob)
  const excelCapturado = new Promise((resolve, reject) => {
    const handler = async (resp) => {
      const ct = resp.headers()['content-type'] || '';
      const url = resp.url();
      if (ct.includes('spreadsheetml') || (url.includes('export') && ct.includes('openxmlformats'))) {
        try {
          const buf = await resp.body();
          if (buf && buf.length > 500) {
            page.off('response', handler);
            resolve(buf);
          }
        } catch (e) { log(`Error leyendo body: ${e.message}`); }
      }
    };
    page.on('response', handler);
    setTimeout(() => { page.off('response', handler); reject(new Error('Timeout 90s esperando Excel')); }, 90000);
  });

  const downloadNativo = context.waitForEvent('download', { timeout: 90000 }).catch(() => null);

  await dialogExportBtn.click();
  log('Click en Exportar — interceptando respuesta...');

  let result;
  try {
    result = await Promise.race([
      excelCapturado.then(buf => ({ tipo: 'buffer', buf })),
      downloadNativo.then(dl => dl ? { tipo: 'download', dl } : new Promise(() => {})),
    ]);
  } catch (e) {
    log(`Error esperando Excel: ${e.message}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `export_error_${Date.now()}.png`) });
    return null;
  }

  if (result.tipo === 'buffer') {
    fs.writeFileSync(destFile, result.buf);
    log(`Excel capturado de red: ${destFile} (${(result.buf.length / 1024).toFixed(1)} KB)`);
    return destFile;
  } else if (result.tipo === 'download') {
    await result.dl.saveAs(destFile);
    log(`Excel descargado vía browser: ${destFile}`);
    return destFile;
  }

  log('No se pudo obtener el Excel');
  return null;
}

/**
 * Alternativa: exportar desde menú Archivo → Exportar
 */
async function exportarPorMenuArchivo(page, context, log) {
  log('Intentando exportar desde botón Exportar de la barra...');
  try {
    // Cerrar cualquier menú/overlay abierto antes de intentar
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    try {
      await page.waitForSelector('.cdk-overlay-backdrop', { state: 'detached', timeout: 3000 });
    } catch { /* no había backdrop */ }
    await page.waitForTimeout(300);

    // Botón "Exportar" propio de la barra de PBI (NO el menú Archivo)
    const exportBtnSelectors = [
      '#exportMenuBtn',
      '[data-testid="appbar-export-options-btn"]',
      'button[title="Exportar"]:not([disabled])',
      'button[title="Export"]:not([disabled])',
    ];

    let clicked = false;
    for (const sel of exportBtnSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        log(`Botón Exportar clickeado: ${sel}`);
        clicked = true;
        break;
      } catch { /* probar siguiente */ }
    }

    if (!clicked) {
      log('No se encontró el botón Exportar en la barra');
      return null;
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `export_menu_${Date.now()}.png`) });

    // Buscar opción Excel en el submenú (excluir los disabled)
    const excelItems = page.locator('[role="menuitem"]:not([disabled]):not([aria-disabled="true"])').filter({ hasText: /excel|xlsx/i });
    const count = await excelItems.count();
    log(`Opciones Excel habilitadas en submenú: ${count}`);

    if (count === 0) {
      // Intentar con cualquier item que diga "Exportar" o "Export data"
      const exportDataItem = page.locator('[role="menuitem"]:not([aria-disabled="true"])').filter({ hasText: /exportar datos|export data/i });
      if (await exportDataItem.count() > 0) {
        await exportDataItem.first().click();
        log('Click en "Exportar datos"');
        await page.waitForTimeout(1500);
        // Buscar botón Export del diálogo
        for (const btn of await page.$$('button')) {
          const txt = await btn.textContent();
          const box = await btn.boundingBox();
          if (txt && /^export$/i.test(txt.trim()) && box && box.y > 400) {
            const destFile = path.join(DOWNLOAD_DIR, `facturas_pbi_${Date.now()}.xlsx`);
            const [download] = await Promise.all([
              context.waitForEvent('download', { timeout: 60000 }),
              btn.click(),
            ]);
            await download.saveAs(destFile);
            log(`Archivo guardado: ${destFile}`);
            return destFile;
          }
        }
      }
      log('No se encontraron opciones Excel habilitadas');
      return null;
    }

    const destFile = path.join(DOWNLOAD_DIR, `facturas_pbi_${Date.now()}.xlsx`);
    const [download] = await Promise.all([
      context.waitForEvent('download', { timeout: 60000 }),
      excelItems.first().click(),
    ]);
    await download.saveAs(destFile);
    log(`Archivo descargado vía botón Exportar: ${destFile}`);
    return destFile;
  } catch (e) {
    log(`Error botón Exportar: ${e.message}`);
    return null;
  }
}

/**
 * Función principal exportada.
 * Retorna: { success, filePath, mensaje, screenshot }
 */
async function descargarFacturasPBI(onLog) {
  if (_enCurso) {
    return { success: false, mensaje: 'Ya hay una descarga en curso, espera que termine' };
  }
  _enCurso = true;
  const logs = [];
  const log = (msg) => {
    const line = `[${new Date().toLocaleTimeString('es-CL')}] ${msg}`;
    console.log('[PBI]', line);
    logs.push(line);
    if (onLog) onLog(line);
  };

  asegurarDirs();
  let browser;

  try {
    log('Iniciando navegador...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 900 },
      locale: 'es-CL',
    });
    const page = await context.newPage();

    log(`Navegando a Power BI: ${PBI_URL}`);
    await page.goto(PBI_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Login si es necesario
    const loginOk = await hacerLogin(page, log);
    if (!loginOk) {
      const ss = path.join(SCREENSHOT_DIR, `login_error_${Date.now()}.png`);
      await page.screenshot({ path: ss });
      return { success: false, mensaje: 'Error en login. Verifica usuario/contraseña en .env', logs, screenshot: ss };
    }

    // Si después del login no estamos en el reporte, navegar nuevamente
    if (!page.url().includes('912e5c46')) {
      log('Navegando al reporte tras login...');
      await page.goto(PBI_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    await esperarCargaReporte(page, log);

    // Exportar — estrategia principal: "Más opciones" del visual de tabla
    // (El menú "Exportar" de la barra solo tiene PDF/PowerPoint, no Excel de datos)
    let filePath = await exportarDatosVisual(page, context, log);

    if (!filePath) {
      const ss = path.join(SCREENSHOT_DIR, `export_error_${Date.now()}.png`);
      await page.screenshot({ path: ss });
      return {
        success: false,
        mensaje: 'No se pudo exportar automáticamente. Ver screenshot para diagnóstico.',
        logs,
        screenshot: ss,
      };
    }

    log('¡Descarga completada!');
    return { success: true, filePath, mensaje: 'Descarga exitosa', logs };

  } catch (err) {
    log(`Error inesperado: ${err.message}`);
    return { success: false, mensaje: err.message, logs };
  } finally {
    if (browser) await browser.close();
    _enCurso = false;
  }
}

module.exports = { descargarFacturasPBI };
