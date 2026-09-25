/**
 * Genera PDF de prueba desde cotizacion-ejemplo.json.
 * Uso: node scripts/generar-cotizacion-pdf-prueba.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderCotizacionPdfBuffer } from '../api/_lib/cotizacion-pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PLANTILLA = path.join(ROOT, 'docs', 'plantilla-cotizacion');
const OUT_DIR = path.join(PLANTILLA, '_prueba-fase4');

async function main() {
  process.env.COTIZACION_PDF_LOCAL = '1';
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ejemplo = JSON.parse(
    fs.readFileSync(path.join(PLANTILLA, 'cotizacion-ejemplo.json'), 'utf8')
  );

  for (const it of ejemplo.items) {
    if (it.imagen && it.imagen.startsWith('assets/')) {
      it.imagen = path.basename(it.imagen);
    }
  }

  const pdfBuf = await renderCotizacionPdfBuffer(
    {
      empresa: ejemplo.empresa,
      cotizacion: ejemplo.cotizacion,
      cliente: ejemplo.cliente,
      items: ejemplo.items,
      envio: ejemplo.envio,
    },
    { assetBase: '.' }
  );

  const outPdf = path.join(OUT_DIR, `Cotizacion-Reiki-${ejemplo.cotizacion.numero}-generado.pdf`);
  fs.writeFileSync(outPdf, pdfBuf);
  console.log('PDF generado:', outPdf, pdfBuf.length, 'bytes');

  const samplePdf = path.join(PLANTILLA, 'Cotizacion-Reiki-CT-240926-001.pdf');
  const playwright = await import('playwright');
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const [label, pdfPath] of [
      ['muestra', samplePdf],
      ['generado', outPdf],
    ]) {
      const page = await browser.newPage({ viewport: { width: 900, height: 1160 } });
      await page.goto(pathToFileURL(pdfPath).href, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(2000);
      const shot = path.join(OUT_DIR, `comparar-${label}-p1.png`);
      await page.screenshot({ path: shot, fullPage: false });
      console.log('Screenshot:', shot);
      await page.close();
    }
  } catch (err) {
    console.warn('Screenshots PDF:', err?.message || err);
  } finally {
    await browser.close();
  }

  console.log('\nCompara:');
  console.log('  Muestra :', samplePdf);
  console.log('  Generado:', outPdf);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
