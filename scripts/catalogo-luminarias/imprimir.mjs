// Imprime el HTML del catálogo a PDF (1920×1080 por página) y, opcionalmente, capturas PNG.
// Uso: node scripts/catalogo-luminarias/imprimir.mjs <entrada.html> <salida.pdf> [dir_capturas]
import { chromium } from 'playwright';

const [, , entrada, salida, capturas] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + entrada, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: salida, width: '1920px', height: '1080px', printBackground: true, pageRanges: '' });
if (capturas) {
  const n = await page.locator('.page').count();
  for (let i = 0; i < n; i++) {
    await page.locator('.page').nth(i).screenshot({ path: `${capturas}/pag-${String(i + 1).padStart(2, '0')}.png` });
  }
}
await browser.close();
console.log('PDF:', salida);
