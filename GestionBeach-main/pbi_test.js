require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');
const SCREENSHOTS = path.join(__dirname, 'backend/uploads/pbi_screenshots');
const DOWNLOADS   = path.join(__dirname, 'backend/uploads/pbi_downloads');
[SCREENSHOTS, DOWNLOADS].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

async function login(page) {
  await page.goto(process.env.PBI_REPORT_URL, { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForTimeout(3000);
  if (await page.$('#email')) {
    await page.fill('#email', process.env.PBI_USER);
    await page.click('#submitBtn');
    await page.waitForTimeout(5000);
  }
  if (await page.$('input[name="loginfmt"]')) {
    await page.fill('input[name="loginfmt"]', process.env.PBI_USER);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(4000);
  }
  if (await page.$('input[type="password"]')) {
    await page.fill('input[type="password"]', process.env.PBI_PASS);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(5000);
  }
  try { await page.click('#idBtn_Back', {timeout:4000}); } catch {}
  await page.waitForTimeout(14000);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const context = await browser.newContext({ acceptDownloads:true, viewport:{width:1440,height:900} });
  const page = await context.newPage();

  await login(page);
  console.log('Login OK');

  // ─── Estrategia: hover en la zona de la tabla, esperar botón, clic ───
  // El botón "More options" del visual aparece en hover dentro del visual
  // Coordenadas del visual de tabla (lado derecho, approx 810-1440 x 100-620)
  // Centramos en 1100, 400

  // Primero mover el mouse al centro del visual de tabla
  await page.mouse.move(1100, 400);
  await page.waitForTimeout(1000);

  // Buscar TODOS los botones "More options" ahora visibles
  const moreOptionsBtns = await page.$$('button[aria-label="More options"]');
  console.log('Botones More options encontrados:', moreOptionsBtns.length);

  if (moreOptionsBtns.length === 0) {
    // Intentar con locator que espera
    try {
      await page.locator('button[aria-label="More options"]').last().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      console.log('No apareció More options con hover en 1100,400. Probando 1300,300...');
      await page.mouse.move(1300, 300);
      await page.waitForTimeout(1000);
    }
  }

  // Encontrar el "More options" del visual (no el del toolbar que está en y=48)
  const allMoreBtns = await page.$$('button[aria-label="More options"]');
  console.log('Total More options:', allMoreBtns.length);

  // El del visual está en y > 100 (el del toolbar está en y=48)
  let visualMoreBtn = null;
  for (const btn of allMoreBtns) {
    const box = await btn.boundingBox();
    console.log('  More options en:', box);
    if (box && box.y > 100) {
      visualMoreBtn = btn;
    }
  }

  if (!visualMoreBtn) {
    // Fallback: usar el último "More options"
    if (allMoreBtns.length > 0) visualMoreBtn = allMoreBtns[allMoreBtns.length - 1];
  }

  if (!visualMoreBtn) {
    console.log('ERROR: No se encontró el botón More options del visual');
    await page.screenshot({ path: path.join(SCREENSHOTS, 'error_no_more_btn.png') });
    process.exit(1);
  }

  // Click en el More Options del visual
  await visualMoreBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'menu_open.png') });

  // Listar items del menú
  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"]'))
      .filter(el => el.offsetParent !== null)
      .map(el => el.textContent.trim().slice(0,50))
  );
  console.log('Items del menú:', items);

  // Click en Export data
  const exportItem = page.locator('[role="menuitem"]').filter({ hasText: /export data/i });
  const countExport = await exportItem.count();
  console.log('Opciones "export data":', countExport);
  if (countExport === 0) {
    console.log('No se encontró Export data. Items del menú arriba ^^');
    process.exit(1);
  }

  await exportItem.first().click();
  console.log('Click en Export data hecho');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'dialog.png') });
  console.log('Screenshot del diálogo guardado');

  // Ahora el diálogo está abierto. Click en botón "Export"
  const downloadPromise = context.waitForEvent('download', { timeout: 60000 });

  // Encontrar el botón "Export" dentro del diálogo (no el del toolbar)
  const exportBtns = await page.$$('button');
  let dialogExportBtn = null;
  for (const btn of exportBtns) {
    const txt = await btn.textContent();
    const box = await btn.boundingBox();
    if (txt && txt.trim() === 'Export' && box && box.y > 600) {
      dialogExportBtn = btn;
      console.log('Botón Export del diálogo en:', box);
      break;
    }
  }

  if (dialogExportBtn) {
    await dialogExportBtn.click();
  } else {
    // Click por coordenada conocida del botón Export (~864, 676)
    console.log('Usando coordenada del botón Export: 864, 676');
    await page.mouse.click(864, 676);
  }

  let download;
  try {
    download = await downloadPromise;
    console.log('Descarga iniciada:', download.suggestedFilename());
  } catch (e) {
    console.log('Timeout en descarga:', e.message);
    process.exit(1);
  }

  const ext  = (path.extname(download.suggestedFilename()) || '.xlsx').replace(/[^.a-z0-9]/gi, '');
  const dest = path.join(DOWNLOADS, `facturas_pbi_${Date.now()}.${ext || 'xlsx'}`);
  await download.saveAs(dest);
  const size = fs.statSync(dest).size;
  console.log(`¡Descarga exitosa! ${path.basename(dest)} (${(size/1024).toFixed(1)} KB)`);

  await browser.close();
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
