/**
 * E2E ligero Fase 5: crea cotización, verifica formatPhone, simula "lo quiero" classify,
 * y envía por WA un resumen + PDF al dueño (si hay token).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPhoneCO } from '../api/_lib/phone.js';
import { createCotizacion, updateCotizacionEstado, isCotizacionVencida } from '../api/_lib/cotizacion-store.js';
import { classifyWhatsAppIntent } from '../api/_lib/whatsapp-intent.js';
import { renderCotizacionPdfBuffer } from '../api/_lib/cotizacion-pdf.js';
import { uploadWhatsAppMedia, sendDocument, sendText, getWhatsAppConfig } from '../api/_lib/whatsapp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function main() {
  process.env.COTIZACION_PDF_LOCAL = '1';
  console.log('formatPhoneCO', formatPhoneCO('573245737413'));
  console.assert(formatPhoneCO('573245737413') === '+57 324 573 7413');

  console.log('compra+cart', classifyWhatsAppIntent('lo quiero', { hasCartOrQuote: true }));
  console.log('compra-sin', classifyWhatsAppIntent('lo quiero', { hasCartOrQuote: false }));

  const ejemplo = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs', 'plantilla-cotizacion', 'cotizacion-ejemplo.json'), 'utf8')
  );
  for (const it of ejemplo.items) {
    if (it.imagen?.startsWith('assets/')) it.imagen = path.basename(it.imagen);
  }

  const doc = await createCotizacion({
    origen: 'whatsapp',
    siteUrl: 'https://reikisolar.com.co',
    cliente: {
      nombre: 'Prueba Fase 5',
      ciudad: 'Medellín',
      celular: '3245737413',
    },
    items: ejemplo.items.map((it) => ({
      sku: it.sku,
      nombre: it.nombre,
      marca: it.marca,
      cantidad: it.cantidad,
      precio_unit: it.precio_unit,
      imagen: `https://reikisolar.com.co/cotizacion/${path.basename(String(it.imagen))}`,
      url: it.url,
      specs: it.specs,
      potencia_w: it.potencia_w,
    })),
  });

  console.log('cot', doc.numero, 'celular PDF:', doc.cliente.celular, 'link', doc.link_compra);
  console.assert(doc.cliente.celular === '+57 324 573 7413');
  console.assert(!isCotizacionVencida(doc));

  await updateCotizacionEstado(doc.id, 'quiere_comprar');
  console.log('estado', 'quiere_comprar');

  const cfg = getWhatsAppConfig();
  if (cfg.token && cfg.phoneNumberId) {
    const to = String(process.env.PERSONAL_PHONE_NUMBER || cfg.personalPhone || '').replace(/\D/g, '');
    const localItems = ejemplo.items.map((it) => ({
      ...it,
      imagen: path.basename(String(it.imagen).replace(/^assets\//, '')),
    }));
    const pdfBuf = await renderCotizacionPdfBuffer(
      {
        empresa: doc.empresa,
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
    const mediaId = await uploadWhatsAppMedia(pdfBuf, filename, cfg);
    await sendDocument({
      to,
      mediaId,
      filename,
      caption: `Fase 5 OK · ${doc.numero} · celular ${doc.cliente.celular} · link ${doc.link_compra}`,
      cfg,
    });
    await sendText({
      to,
      body:
        `✅ Fase 5 lista.\n` +
        `• Celular en PDF: ${doc.cliente.celular}\n` +
        `• Link compra: ${doc.link_compra}\n` +
        `• Intención "lo quiero"+carrito → compra\n` +
        `Prueba web: abre el link de compra y/o /carrito#pdf`,
      cfg,
    });
    console.log('Enviado a WhatsApp', to);
  } else {
    console.log('Sin WHATSAPP token — skip envío WA');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
