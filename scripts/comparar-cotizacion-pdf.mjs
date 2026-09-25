/**
 * Captura página 1 de PDFs muestra vs generado (pdf.js en Chromium).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'plantilla-cotizacion', '_prueba-fase4');

async function renderPdfPagePng(pdfPath, outPng) {
  const pdfB64 = fs.readFileSync(pdfPath).toString('base64');
  const browser = await chromium.launch({ headless: true });
  const tab = await browser.newPage();
  await tab.setContent('<html><body style="margin:0"></body></html>');

  const ops = await tab.evaluate(async ({ pdfB64, scale }) => {
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    const raw = Uint8Array.from(atob(pdfB64), (c) => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: raw }).promise;
    const page1 = await pdf.getPage(1);
    const vp = page1.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    document.body.appendChild(canvas);
    await page1.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return { w: canvas.width, h: canvas.height };
  }, { pdfB64, scale: 1.5 });

  const clipH = Math.min(ops.h, 1300);
  await tab.setViewportSize({ width: ops.w, height: clipH });
  await tab.screenshot({
    path: outPng,
    clip: { x: 0, y: 0, width: ops.w, height: clipH },
  });
  await browser.close();
  console.log('saved', outPng, ops.w, 'x', clipH);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await renderPdfPagePng(
    path.join(ROOT, 'docs', 'plantilla-cotizacion', 'Cotizacion-Reiki-CT-240926-001.pdf'),
    path.join(OUT, 'comparar-muestra-p1.png')
  );
  await renderPdfPagePng(
    path.join(OUT, 'Cotizacion-Reiki-CT-240926-001-generado.pdf'),
    path.join(OUT, 'comparar-generado-p1.png')
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
