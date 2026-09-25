/**
 * Genera un PDF de cotización (mismo pipeline del bot) y lo envía por WhatsApp Cloud API.
 * Uso: node --env-file=.env scripts/enviar-cotizacion-pdf-whatsapp.mjs [telefono]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCotizacionPdfBuffer } from '../api/_lib/cotizacion-pdf.js';
import { createCotizacion, loadEmpresa } from '../api/_lib/cotizacion-store.js';
import { uploadWhatsAppMedia, sendDocument, sendText, getWhatsAppConfig } from '../api/_lib/whatsapp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function main() {
  process.env.COTIZACION_PDF_LOCAL = '1';
  const to =
    String(process.argv[2] || process.env.PERSONAL_PHONE_NUMBER || process.env.WHATSAPP_OWNER_PHONE || '')
      .replace(/\D/g, '') || '';
  if (!to) {
    console.error('Falta teléfono destino (argv o PERSONAL_PHONE_NUMBER)');
    process.exit(1);
  }

  const cfg = getWhatsAppConfig();
  if (!cfg.token || !cfg.phoneNumberId) {
    console.error('Faltan WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID');
    process.exit(1);
  }

  const ejemplo = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs', 'plantilla-cotizacion', 'cotizacion-ejemplo.json'), 'utf8')
  );
  for (const it of ejemplo.items) {
    if (it.imagen?.startsWith('assets/')) it.imagen = path.basename(it.imagen);
  }

  // Crear cotización como el bot (precios congelados + token)
  const doc = await createCotizacion({
    origen: 'whatsapp',
    siteUrl: cfg.siteUrl,
    cliente: {
      nombre: 'Revisión Fase 4',
      ciudad: 'Medellín',
      celular: `+${to}`,
      whatsappId: to,
    },
    items: ejemplo.items.map((it) => ({
      sku: it.sku,
      nombre: it.nombre,
      marca: it.marca,
      cantidad: it.cantidad,
      precio_unit: it.precio_unit,
      imagen: `https://reikisolar.com.co/cotizacion/${path.basename(String(it.imagen).replace(/^assets\//, ''))}`,
      url: it.url,
      specs: it.specs,
      potencia_w: it.potencia_w,
    })),
    envio: null,
  });

  console.log('Cotización', doc.numero, doc.id, doc.pdfUrl);

  // PDF con assets locales (idéntico al pipeline del bot)
  const localItems = ejemplo.items.map((it) => ({
    ...it,
    imagen: path.basename(String(it.imagen).replace(/^assets\//, '')),
  }));
  const pdfBuf = await renderCotizacionPdfBuffer(
    {
      empresa: loadEmpresa(),
      cotizacion: {
        numero: doc.numero,
        fecha: doc.fecha,
        validez: doc.validez,
        canal: 'WhatsApp',
        asesor: doc.asesor,
        link_compra: doc.link_compra,
        hsp_ciudad: 4.5,
        pr: 0.78,
      },
      cliente: doc.cliente,
      items: localItems,
      envio: null,
    },
    { assetBase: '.' }
  );

  const filename = `Cotizacion-Reiki-${doc.numero}.pdf`;
  const outPath = path.join(ROOT, 'docs', 'plantilla-cotizacion', '_prueba-fase4', filename);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pdfBuf);
  console.log('PDF', outPath, pdfBuf.length);

  const mediaId = await uploadWhatsAppMedia(pdfBuf, filename, cfg);
  console.log('mediaId', mediaId);

  await sendDocument({
    to,
    mediaId,
    filename,
    caption: `Cotización ${doc.numero} · Total ${doc.totalFmt} (prueba Fase 4)`,
    cfg,
  });

  await sendText({
    to,
    body:
      `Listo ✅ Cotización *${doc.numero}* generada con el pipeline del bot.\n` +
      `Link (cuando esté en prod): ${doc.pdfUrl}\n` +
      `Si quieres, ¿te gustaría avanzar con la compra?`,
    cfg,
  });

  console.log('Enviado a', to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
