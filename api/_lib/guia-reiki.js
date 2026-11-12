/**
 * "Guía de despacho" de Reiki (PDF) para adjuntar al correo de despacho, junto al rótulo de la transportadora.
 * Mismo formato que las guías GD-… hechas a mano: remitente Reiki, destinatario, origen/destino, contenido,
 * unidades y peso, transportadora y número de guía. No nombra al proveedor (la bodega va con su nombre público).
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const MORADO = '#5b1f73';
const GRIS = '#555555';

function leerEmpresa() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'empresa.json'), 'utf8'));
  } catch {
    return {};
  }
}

function logo() {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'data', 'logo-reiki-morado.png'));
  } catch {
    return null;
  }
}

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
const fechaCorta = (iso) => {
  const d = String(iso || '').slice(0, 10) || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  return d.replace(/-/g, '/');
};

/** Número GD-ddmmaa-nnn tomado de la cotización (CT-271026-006 → GD-271026-006); si no, de la venta. */
export function numeroGuiaReiki(exp, idx = 0) {
  const cot = String(exp.cotizacion?.numero || '');
  const m = cot.match(/(\d{6})\s*-?\s*(\d{3})/);
  const base = m ? `GD-${m[1]}-${m[2]}` : `GD-${String(exp.id || '').replace(/^[A-Z]-/, '')}`;
  return idx ? `${base}-${idx + 1}` : base;
}

/**
 * @param exp expediente
 * @param despacho { guia, transportadora, bodegaPublica, ciudadOrigen, items:[idx], fecha, paquetes:[{peso,cantidad}] }
 * @returns Promise<Buffer>
 */
export function pdfGuiaReiki(exp, despacho = {}, idx = 0) {
  const em = leerEmpresa();
  const cl = exp.cliente || {};
  const items = (exp.items || []).filter((it, i) => (despacho.items && despacho.items.length ? despacho.items.includes(i) : true) && it.compra?.estado !== 'no_aplica' && !/env[ií]o/i.test(it.nombre) && it.sku !== 'ENVIO');
  const unidades = items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0);
  const contenido = items.map((it) => `${it.cantidad} × ${it.nombre}`).join('; ').slice(0, 400) || 'Equipos solares';
  const declarado = items.reduce((a, it) => a + (Number(it.precioUnit) || 0) * (Number(it.cantidad) || 0), 0) || exp.total || 0;
  const recibe = String(cl.contacto || '').replace(/^Recibe:\s*/i, '');
  const numero = numeroGuiaReiki(exp, idx);
  const origen = despacho.bodegaPublica ? `${despacho.bodegaPublica}${despacho.ciudadOrigen ? ' · ' + despacho.ciudadOrigen : ''}` : despacho.ciudadOrigen || '';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [792, 440], margin: 28 });
    const out = [];
    doc.on('data', (b) => out.push(b));
    doc.on('end', () => resolve(Buffer.concat(out)));
    doc.on('error', reject);
    const W = doc.page.width - 56;
    const x0 = 28;
    let y = 28;

    // Encabezado
    const lg = logo();
    if (lg) doc.image(lg, x0, y, { width: 150 });
    doc.fillColor('#222').font('Helvetica-Bold').fontSize(11).text(`${(em.razon_social || 'Reiki Energía Solar SAS').toUpperCase()} · NIT ${em.nit || '901942389'}`, x0 + 190, y + 4, { width: 330, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRIS)
      .text(`Tel. / WhatsApp ${em.telefono || '+57 300 405 2638'} · ${em.correo || 'info@reikisolar.com.co'}`, x0 + 190, y + 20, { width: 330, align: 'center' })
      .text(`www.${em.web || 'reikisolar.com.co'}`, x0 + 190, y + 32, { width: 330, align: 'center' });
    doc.fillColor('#222').font('Helvetica-Bold').fontSize(11).text('Guía de despacho No.', x0 + W - 200, y, { width: 200, align: 'right' });
    doc.fontSize(13).text(numero, x0 + W - 200, y + 14, { width: 200, align: 'right' });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRIS)
      .text('Despacho de equipos', x0 + W - 200, y + 32, { width: 200, align: 'right' })
      .text(`Pedido ${exp.cotizacion?.numero || exp.id}${exp.factura?.numero ? ' · Factura ' + exp.factura.numero : ''}`, x0 + W - 200, y + 43, { width: 200, align: 'right' });
    y += 70;

    const caja = (x, yy, w, h) => doc.roundedRect(x, yy, w, h, 6).lineWidth(0.8).strokeColor('#bbbbbb').stroke();
    const campo = (x, yy, w, etiqueta, valor, h = 34) => {
      caja(x, yy, w, h);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#222').text(etiqueta, x + 8, yy + 6, { width: w - 16 });
      doc.font('Helvetica').fontSize(9).fillColor('#333').text(String(valor || '—'), x + 8, yy + 17, { width: w - 16, height: h - 19, ellipsis: true });
    };
    const c1 = W * 0.34, c2 = W * 0.38, c3 = W - c1 - c2 - 16;
    const xa = x0, xb = x0 + c1 + 8, xc = xb + c2 + 8;

    campo(xa, y, c1, 'REMITENTE · NIT', `${em.razon_social || 'Reiki Energía Solar SAS'} · ${em.nit || '901942389'}`);
    campo(xb, y, c2, 'ORIGEN', origen || 'Bodega Reiki');
    campo(xc, y, c3, 'VALOR DECLARADO', fmt(declarado));
    y += 42;
    campo(xa, y, c1, 'DESTINATARIO · NIT/CC', `${cl.nombre || ''}${cl.documento ? ' · ' + cl.documento : ''}`, 44);
    campo(xb, y, c2, 'DIRECCIÓN · CELULAR DESTINATARIO', `${cl.direccion || ''}${cl.ciudad ? ', ' + cl.ciudad : ''} · ${cl.celular || ''}${recibe ? '\nRecibe: ' + recibe : ''}`, 44);
    campo(xc, y, c3, 'TRANSPORTADORA · GUÍA', `${despacho.transportadora || ''}${despacho.guia ? ' · ' + despacho.guia : ''}`, 44);
    y += 52;
    campo(xa, y, c1, 'FECHA DE DESPACHO', fechaCorta(despacho.fecha));
    campo(xb, y, c2 / 2 - 4, 'CIUDAD ORIGEN', despacho.ciudadOrigen || '');
    campo(xb + c2 / 2 + 4, y, c2 / 2 - 4, 'CIUDAD DESTINO', String(cl.ciudad || '').split(',')[0]);
    // sello DESPACHADO
    doc.roundedRect(xc, y, c3, 34, 6).fillAndStroke('#e8f6ec', '#2e9e57');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#2e7d46').text('DESPACHADO', xc, y + 11, { width: c3, align: 'center' });
    y += 42;
    campo(xb, y, c2 + 8 + c3, 'DICE CONTENER', contenido, 48);
    campo(xa, y, c1 / 2 - 4, 'UNIDADES', unidades || '—', 48);
    campo(xa + c1 / 2 + 4, y, c1 / 2 - 4, 'KG / PESO', despacho.peso ? `${despacho.peso} kg` : '—', 48);
    y += 60;

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#222').text(`OBSERVACIONES: Pedido despachado${origen ? ' desde ' + origen : ''} hacia ${String(cl.ciudad || '').split(',')[0] || 'el destino'}.`, x0, y, { width: W });
    y += 16;
    doc.font('Helvetica').fontSize(9).fillColor('#333').text('La transportadora se comunicará con usted cuando el pedido esté enrutado para entregárselo.', x0, y, { width: W });
    y += 34;
    const fw = (W - 32) / 3;
    ['FIRMA Y SELLO DEL REMITENTE', 'FIRMA, NOMBRE Y CÉDULA DE QUIEN RECIBE', `FACTURA REMITENTE: ${exp.factura?.numero || '—'}`].forEach((t, i) => {
      const fx = x0 + i * (fw + 16);
      doc.moveTo(fx, y).lineTo(fx + fw, y).lineWidth(0.8).strokeColor('#888').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#222').text(t, fx, y + 4, { width: fw });
    });
    y += 26;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#222').text('IMPORTANTE: ', x0, y, { continued: true, width: W })
      .font('Helvetica').fillColor(GRIS)
      .text(`Señor destinatario: revise las cajas frente al conductor antes de firmar. Si hay golpes, humedad o faltantes, anótelo en la guía de la transportadora y escríbanos el mismo día al WhatsApp ${em.telefono || '+57 300 405 2638'}. Firmada la guía sin observaciones, se entiende recibida la mercancía en buen estado.`);
    doc.rect(0, doc.page.height - 10, doc.page.width * 0.7, 10).fill(MORADO);
    doc.rect(doc.page.width * 0.7, doc.page.height - 10, doc.page.width * 0.3, 10).fill('#f2b705');
    doc.end();
  });
}
