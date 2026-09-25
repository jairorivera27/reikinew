/**
 * Genera PDF de cotización con playwright-core + @sparticuz/chromium (Vercel)
 * o Chromium local de playwright en desarrollo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderCotizacionHtml } from './cotizacion-html.js';
import { loadEmpresa, toRenderPayload } from './cotizacion-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function makeQrDataUrl(text) {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(String(text || ''), {
      margin: 1,
      width: 180,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('[cotizacion-pdf] qrcode', err?.message || err);
    return '';
  }
}

async function launchBrowser() {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const playwright = await import('playwright-core');
    const executablePath = await chromium.executablePath();
    return playwright.chromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }
  try {
    const playwright = await import('playwright');
    return playwright.chromium.launch({ headless: true });
  } catch {
    const playwright = await import('playwright-core');
    return playwright.chromium.launch({ headless: true, channel: 'chrome' });
  }
}

/**
 * @param {object} datos - payload render o cotización guardada
 * @param {{ assetBase?: string }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function renderCotizacionPdfBuffer(datos, opts = {}) {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const siteDefault = String(
    process.env.WHATSAPP_SITE_URL || process.env.ADDI_SITE_URL || 'https://reikisolar.com.co'
  ).replace(/\/$/, '');

  let assetBase = opts.assetBase || datos.assetBase || siteDefault;
  const forceLocal = process.env.COTIZACION_PDF_LOCAL === '1' || assetBase === '.';
  const useLocalFiles = forceLocal || (!isVercel && !String(assetBase).startsWith('http'));
  if (useLocalFiles) assetBase = '.';

  let payload = datos;
  if (datos?.numero && datos?.items && !datos?.cotizacion) {
    payload = toRenderPayload(datos, siteDefault);
  }
  payload.assetBase = useLocalFiles ? '.' : assetBase || siteDefault;
  if (!payload.empresa) payload.empresa = loadEmpresa();

  const link = payload.cotizacion?.link_compra || '';
  payload.qrCompraDataUrl = await makeQrDataUrl(link);

  const html = renderCotizacionHtml(payload);
  const empresa = payload.empresa;
  const nitFmt = (() => {
    const digits = String(empresa.nit || '').replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('es-CO').replace(/\s/g, '.') : empresa.nit;
  })();
  const numero = payload.cotizacion?.numero || '';

  const footer = `<div style="width:100%;font-family:Helvetica,Arial;font-size:6.5pt;color:#6b6475;padding:0 14mm;display:flex;justify-content:space-between;">
<span>${empresa.razon_social} · NIT ${nitFmt} · ${empresa.telefono} · ${empresa.web}</span>
<span style="white-space:nowrap">${numero} · Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

  const t0 = Date.now();
  let browser;
  let tmpHtml = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    if (useLocalFiles) {
      const dir = path.join(process.cwd(), 'public', 'cotizacion');
      fs.mkdirSync(dir, { recursive: true });
      tmpHtml = path.join(dir, `.render-${process.pid}-${Date.now()}.html`);
      fs.writeFileSync(tmpHtml, html, 'utf8');
      await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: 'networkidle', timeout: 45_000 });
    } else {
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 45_000 });
    }

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footer,
      margin: { bottom: '16mm' },
    });
    const ms = Date.now() - t0;
    console.log('[cotizacion-pdf] ok', { bytes: pdf.length, ms, numero });
    if (ms > 50_000) {
      console.warn('[cotizacion-pdf] LENTO >50s — avisar antes de cambiar librería');
    }
    return Buffer.from(pdf);
  } finally {
    if (tmpHtml) {
      try {
        fs.unlinkSync(tmpHtml);
      } catch {
        /* ignore */
      }
    }
    if (browser) await browser.close().catch(() => {});
  }
}

export function localAssetBaseFileUrl() {
  return '.';
}
