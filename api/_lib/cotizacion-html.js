/**
 * Plantilla HTML de cotización (port de docs/plantilla-cotizacion/plantilla-cotizacion.html).
 * Assets estáticos: /cotizacion/* (logo, fuentes, Wompi/Addi, qr-breb.png).
 * Fotos de producto: URL absoluta https del catálogo.
 */
import { calcTotalesConIvaIncluido, formatCopPdf, isExcluidoIva } from './iva.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nitFmt(n) {
  const digits = String(n || '').replace(/\D/g, '');
  if (!digits) return String(n || '');
  return Number(digits).toLocaleString('es-CO').replace(/\s/g, '.');
}

function assetUrl(base, name) {
  const root = String(base || '').replace(/\/$/, '');
  if (!root || root === '.') return name; // relativo (HTML en public/cotizacion/)
  return `${root}/cotizacion/${name}`;
}

/** Estimación orientativa solo si hay paneles con potencia_w */
export function buildEstimacion(items, cot = {}) {
  const paneles = (items || []).filter((i) => Number(i.potencia_w) > 0);
  if (!paneles.length) return null;
  const wp = paneles.reduce((s, i) => s + Number(i.potencia_w) * Number(i.cantidad || 1), 0);
  const hsp = Number(cot.hsp_ciudad ?? 4.5);
  const pr = Number(cot.pr ?? 0.78);
  const dia = (wp / 1000) * hsp * pr;
  let bat = 0;
  for (const i of items || []) {
    const m = String(i.nombre || '').match(/([\d.,]+)\s*kWh/i);
    if (m) bat += parseFloat(m[1].replace(',', '.')) * Number(i.cantidad || 1);
  }
  const fmt = (n, d = 2) =>
    n.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return {
    kwp: fmt(wp / 1000, 2),
    paneles: paneles.reduce((s, i) => s + Number(i.cantidad || 1), 0),
    dia: fmt(dia, 1),
    mes: Math.round(dia * 30)
      .toLocaleString('es-CO')
      .replace(/\s/g, '.'),
    bat: bat ? fmt(bat, 2) : null,
    hsp: String(hsp).replace('.', ','),
    pr: Math.round(pr * 100),
  };
}

/**
 * @param {object} datos - { empresa, cotizacion, cliente, items, envio?, qrCompraDataUrl?, assetBase? }
 */
export function renderCotizacionHtml(datos) {
  const e = { ...(datos.empresa || {}) };
  e.nit_fmt = nitFmt(e.nit);
  e.atencion = e.atencion || {
    telefono: '+57 324 573 7413',
    whatsapp_url: 'https://wa.me/573245737413',
  };
  e.banco = e.banco || {
    nombre: 'Bancolombia',
    tipo: 'ahorros',
    numero: '36600008477',
    llave_breb: '0089262235',
  };

  const c = datos.cotizacion || {};
  const cl = datos.cliente || {};
  const assetBase = datos.assetBase || 'https://reikisolar.com.co';
  const logo = assetUrl(assetBase, 'logo-reiki-blanco.png');
  const wompi = assetUrl(assetBase, 'wompi.png');
  const addi = assetUrl(assetBase, 'addi.png');
  const qrBreb = assetUrl(assetBase, 'qr-breb.png');
  const fontReg = assetUrl(assetBase, 'Montserrat-Regular.ttf');
  const fontBold = assetUrl(assetBase, 'Montserrat-Bold.ttf');

  const rawItems = datos.items || [];
  const items = rawItems.map((it) => {
    const qty = Number(it.cantidad || 1);
    const unit = Number(it.precio_unit ?? it.precio_unitario ?? it.precioNum ?? 0);
    const sub = unit * qty;
    const excluido = isExcluidoIva(it);
    return {
      ...it,
      cantidad: qty,
      precio_unit: unit,
      precio_fmt: formatCopPdf(unit),
      subtotal_fmt: formatCopPdf(sub),
      sub,
      imagen: it.imagen || '',
      specs: Array.isArray(it.specs) ? it.specs : [],
      excluidoIva: excluido,
    };
  });

  const envio = datos.envio == null ? null : Number(datos.envio) || 0;
  const calc = calcTotalesConIvaIncluido(
    items.map((it) => ({
      price: it.precio_unit,
      quantity: it.cantidad,
      excluidoIva: it.excluidoIva,
      categoria: it.categoria || it.category,
      nombre: it.nombre,
    })),
    { envio }
  );

  const t = {
    excluido: formatCopPdf(calc.excluido),
    base: formatCopPdf(calc.baseGravada),
    iva: formatCopPdf(calc.iva),
    total: formatCopPdf(calc.total),
    envio: envio != null ? formatCopPdf(envio) : 'Por cotizar',
    envio_pend: envio == null,
  };

  const est = buildEstimacion(items, c);
  const qr = datos.qrCompraDataUrl || '';

  const itemsRows = items
    .map(
      (it) => `
      <tr>
        <td><img class="thumb" src="${esc(it.imagen)}" alt=""></td>
        <td>${esc(it.sku)}</td>
        <td class="desc"><b>${esc(it.nombre)}</b><small>${esc(it.marca || '')}</small>${
          it.excluidoIva ? '<span class="tag-ex">Excluido IVA</span>' : ''
        }</td>
        <td class="c">${esc(it.cantidad)}</td>
        <td class="num">${esc(it.precio_fmt)}</td>
        <td class="num"><b>${esc(it.subtotal_fmt)}</b></td>
      </tr>`
    )
    .join('');

  const prodDetail = items
    .map(
      (it) => `
  <div class="prod">
    <img src="${esc(it.imagen)}" alt="">
    <div>
      <h5>${esc(it.cantidad)} ud. · ${esc(it.nombre)}</h5>
      <ul>${(it.specs || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="links"><a href="${esc(it.url)}">Ver producto en la tienda ›</a> · Código ${esc(it.sku)}</div>
    </div>
  </div>`
    )
    .join('');

  const estBox = est
    ? `
    <div class="box est">
      <h3>Estimación orientativa del sistema</h3>
      <ul>
        <li>Potencia solar: <b>${esc(est.kwp)} kWp</b> (${esc(est.paneles)} paneles)</li>
        <li>Producción media: <b>≈ ${esc(est.dia)} kWh/día</b> · ≈ ${esc(est.mes)} kWh/mes</li>
        ${est.bat ? `<li>Almacenamiento: <b>${esc(est.bat)} kWh</b> en baterías</li>` : ''}
      </ul>
      <p class="aviso">Con ${esc(est.hsp)} horas de sol pico y rendimiento del ${esc(est.pr)} %. Es una referencia: la producción real depende del sitio, la orientación y las sombras.</p>
    </div>`
    : '';

  const correoCli = cl.correo ? `<p>${esc(cl.correo)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Cotización ${esc(c.numero)} · Reiki Energía Solar</title>
<style>
  @font-face { font-family: 'Montserrat'; src: url('${fontReg}'); font-weight: 400; }
  @font-face { font-family: 'Montserrat'; src: url('${fontBold}'); font-weight: 700; }
  :root {
    --morado: #6b2181;
    --morado-2: #8b2a9b;
    --morado-osc: #4a1a5c;
    --amarillo: #facb03;
    --lila: #f4eef7;
    --gris: #5f6368;
    --linea: #e3dbe8;
    --texto: #1f1a24;
  }
  @page { size: Letter; margin: 12mm 0 16mm 0; }
  @page :first { margin-top: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Montserrat', sans-serif; font-size: 8.6pt; color: var(--texto); line-height: 1.45; }
  a { color: var(--morado); text-decoration: none; }
  .wrap { padding: 0 14mm; }
  .head { background: linear-gradient(120deg, var(--morado-osc) 0%, var(--morado) 55%, var(--morado-2) 100%);
          color: #fff; padding: 7mm 14mm 6.5mm; display: flex; justify-content: space-between; align-items: center; position: relative; }
  .head::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2.2mm; background: var(--amarillo); }
  .head img { height: 17mm; }
  .head .doc { text-align: right; }
  .head .doc small { display: block; font-weight: 700; letter-spacing: .22em; color: var(--amarillo); font-size: 8.5pt; }
  .head .doc b { font-size: 20pt; letter-spacing: .01em; }
  .partes { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin: 5mm 0 3mm; }
  .partes h4 { margin: 0 0 1.5mm; font-size: 7pt; letter-spacing: .16em; color: var(--morado); text-transform: uppercase; }
  .partes p { margin: 0; }
  .partes .nombre { font-weight: 700; font-size: 10pt; color: var(--morado-osc); }
  .partes .cli { background: var(--lila); border-radius: 2mm; padding: 3.5mm 4.5mm; }
  .meta { display: grid; grid-template-columns: repeat(5, auto); border-top: .3mm solid var(--linea); border-bottom: .3mm solid var(--linea); padding: 2mm 0; margin-bottom: 4mm; column-gap: 6mm; }
  .meta span { display: block; font-size: 6.8pt; color: var(--gris); text-transform: uppercase; letter-spacing: .08em; }
  .meta b { font-size: 8.6pt; }
  table { width: 100%; border-collapse: collapse; }
  .items th { background: var(--morado-osc); color: #fff; font-size: 7.4pt; text-align: left; padding: 2.4mm 2.4mm; font-weight: 700; }
  .items th.num, .items td.num { text-align: right; white-space: nowrap; }
  .items th.c, .items td.c { text-align: center; }
  .items td { padding: 1.6mm 2.4mm; border-bottom: .3mm solid var(--linea); vertical-align: middle; }
  .items tr:nth-child(even) td { background: #fbf9fc; }
  .items .thumb { width: 10mm; height: 10mm; object-fit: contain; background: #fff; border: .3mm solid var(--linea); border-radius: 1.2mm; display: block; }
  .items .desc b { display: block; }
  .items .desc small { color: var(--gris); }
  .totales { display: grid; grid-template-columns: 1fr 1fr 1fr 0.9fr 1.15fr; margin-top: 4mm; border-radius: 2mm; overflow: hidden; }
  .totales div { background: var(--lila); padding: 2.2mm 2.4mm; }
  .totales span { display: block; font-size: 5.8pt; color: var(--gris); text-transform: uppercase; letter-spacing: .06em; }
  .totales b { font-size: 8.8pt; }
  .totales .total { background: var(--amarillo); }
  .totales .total span { color: var(--morado-osc); font-weight: 700; }
  .totales .total b { font-size: 11.5pt; color: var(--morado-osc); }
  .nota-iva { font-size: 6.4pt; color: var(--gris); margin-top: 1.5mm; line-height: 1.35; }
  .tag-ex { display: inline-block; margin-top: 0.6mm; font-size: 5.8pt; font-weight: 700; color: var(--morado); background: #efe6f4; border-radius: 0.8mm; padding: 0.3mm 1.2mm; letter-spacing: .04em; text-transform: uppercase; }
  .cta { break-inside: avoid; display: flex; align-items: center; gap: 5mm; margin: 4mm 0 4mm; border-radius: 3mm; overflow: hidden;
         background: linear-gradient(100deg, var(--amarillo) 0%, #ffe46b 52%, var(--morado) 52.2%, var(--morado-osc) 100%); }
  .cta .l { flex: 1; padding: 3.5mm 6mm; color: var(--morado-osc); }
  .cta .l small { display: block; font-weight: 700; font-size: 7.4pt; letter-spacing: .1em; text-transform: uppercase; }
  .cta .l b { font-size: 13pt; line-height: 1.2; }
  .cta .ctaw { margin: 1.2mm 0 0; font-size: 7.4pt; }
  .cta .ctaw a { color: var(--morado-osc); white-space: nowrap; }
  .cta .ctaw b { font-size: inherit; }
  .cta .r { flex: 0.95; padding: 4mm 5mm; display: flex; align-items: center; justify-content: flex-end; gap: 4mm; color: #fff; }
  .cta .btn { background: var(--amarillo); color: var(--morado-osc); font-weight: 700; font-size: 9.5pt; padding: 2.6mm 4.5mm; border-radius: 10mm; white-space: nowrap; }
  .cta .qr { background: #fff; padding: 1.2mm; border-radius: 1.5mm; width: 18mm; height: 18mm; }
  .cta .wa { font-size: 7.2pt; line-height: 1.35; max-width: 34mm; }
  .grid2 { display: grid; grid-template-columns: 1.15fr 1fr; gap: 5mm; }
  .box { break-inside: avoid; border: .3mm solid var(--linea); border-radius: 2.5mm; padding: 3.6mm 4.5mm; }
  .box h3 { margin: 0 0 2mm; font-size: 8.6pt; color: var(--morado-osc); }
  .pago { display: flex; align-items: center; gap: 3mm; margin-bottom: 1.3mm; }
  .pago img { height: 6mm; width: 17mm; object-fit: contain; }
  .pago .t { font-size: 7.6pt; }
  .pago .ph { width: 17mm; height: 6mm; border-radius: 1mm; background: var(--lila); color: var(--morado); font-weight: 700; font-size: 6.4pt; display: flex; align-items: center; justify-content: center; }
  .est ul { margin: 0; padding-left: 4mm; }
  .est li { margin-bottom: .6mm; }
  .est .aviso { font-size: 6.8pt; color: var(--gris); margin-top: 1.5mm; }
  .pagos { display: grid; grid-template-columns: 1fr 72mm; gap: 4mm; margin-bottom: 4mm; padding: 3mm 4mm; }
  .pagos .comp { font-size: 7pt; color: var(--gris); margin: 1.5mm 0 0; }
  .breb { display: flex; gap: 3.5mm; align-items: center; background: var(--lila); border-radius: 2mm; padding: 3mm; }
  .breb .qrb { width: 27mm; height: 27mm; background: #fff; padding: 1mm; border-radius: 1.5mm; }
  .breb p { margin: 1mm 0; font-size: 7.2pt; }
  .breb .breb-t { font-size: 10pt; color: var(--morado-osc); }
  .breb .llave { font-weight: 700; font-size: 11.5pt; letter-spacing: .04em; background: #fff; border: .3mm solid var(--linea); border-radius: 1.5mm; padding: 1mm 2.5mm; display: inline-block; color: var(--morado-osc); }
  .breb .mini { font-size: 6.3pt; color: var(--gris); }
  .grid2 .ing { margin-top: 0; }
  .ing { break-inside: avoid; margin-top: 5mm; background: var(--lila); border-left: 1.6mm solid var(--amarillo); border-radius: 2mm; padding: 3.6mm 5mm; }
  .ing b { color: var(--morado-osc); }
  h2 { font-size: 11pt; color: var(--morado-osc); margin: 6mm 0 2mm; padding-bottom: 1.5mm; border-bottom: .6mm solid var(--amarillo); display: inline-block; }
  .prod { display: grid; grid-template-columns: 19mm 1fr; gap: 4.5mm; padding: 2.6mm 0; border-bottom: .3mm solid var(--linea); break-inside: avoid; }
  .prod img { width: 19mm; height: 19mm; object-fit: contain; border: .3mm solid var(--linea); border-radius: 2mm; background: #fff; }
  .prod h5 { margin: 0 0 1mm; font-size: 9pt; }
  .prod ul { margin: 0 0 1mm; padding-left: 4mm; }
  .prod .links { font-size: 7.4pt; }
  .prod .links a { font-weight: 700; }
  .cond { break-inside: avoid; }
  .cond ol { margin: 0; padding-left: 4.5mm; }
  .cond li { margin-bottom: .8mm; font-size: 8pt; }
  .pend { background: #fff3c4; padding: 0 1mm; border-radius: .8mm; }
</style>
</head>
<body>

<div class="head">
  <img src="${esc(logo)}" alt="Reiki Energía Solar">
  <div class="doc"><small>COTIZACIÓN</small><b>N.º ${esc(c.numero)}</b></div>
</div>

<div class="wrap">
  <div class="partes">
    <div>
      <h4>De</h4>
      <p class="nombre">${esc(e.razon_social)}</p>
      <p>NIT ${esc(e.nit_fmt)}</p>
      <p>${esc(e.direccion)}</p>
      <p>${esc(e.ciudad)}</p>
      <p>${esc(e.telefono)} · ${esc(e.correo)}</p>
      <p><a href="https://${esc(e.web)}">${esc(e.web)}</a></p>
    </div>
    <div class="cli">
      <h4>Para</h4>
      <p class="nombre">${esc(cl.nombre)}</p>
      <p>${esc(cl.ciudad)}</p>
      <p>${esc(cl.celular)}</p>
      ${correoCli}
    </div>
  </div>

  <div class="meta">
    <div><span>Documento</span><b>Cotización de equipos</b></div>
    <div><span>Número</span><b>${esc(c.numero)}</b></div>
    <div><span>Fecha</span><b>${esc(c.fecha)}</b></div>
    <div><span>Atendido por</span><b>${esc(c.asesor)} · ${esc(c.canal)}</b></div>
    <div><span>Validez de la oferta</span><b>${esc(c.validez)}</b></div>
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:13mm"></th><th style="width:17mm">Código</th><th>Descripción</th>
      <th class="c" style="width:14mm">Cant.</th><th class="num" style="width:25mm">Precio ud.</th><th class="num" style="width:27mm">Subtotal</th>
    </tr></thead>
    <tbody>
    ${itemsRows}
    </tbody>
  </table>

  <div class="totales">
    <div><span>Excluido de IVA</span><b>${esc(t.excluido)}</b></div>
    <div><span>Subtotal gravado (base)</span><b>${esc(t.base)}</b></div>
    <div><span>IVA 19 %</span><b>${esc(t.iva)}</b></div>
    <div><span>Envío</span><b>${esc(t.envio)}</b></div>
    <div class="total"><span>Total</span><b>${esc(t.total)}</b></div>
  </div>
  <p class="nota-iva">Paneles e inversores excluidos de IVA (Ley 1715 de 2014). Los demás productos incluyen IVA del 19 %.${t.envio_pend ? ' El envío nacional se cotiza según el destino.' : ''}</p>

  <div class="cta">
    <div class="l"><small>¿Listo para continuar?</small><b>Completa tu compra en línea en minutos</b><p class="ctaw">¿Dudas? Atención personalizada por WhatsApp: <a href="${esc(e.atencion.whatsapp_url)}"><b>${esc(e.atencion.telefono)}</b></a></p></div>
    <div class="r">
      <a class="btn" href="${esc(c.link_compra)}">COMPRAR EN LÍNEA ›</a>
      ${qr ? `<img class="qr" src="${qr}" alt="QR de compra">` : ''}
    </div>
  </div>

  <div class="box pagos">
    <div class="metodos">
      <h3>Formas de pago</h3>
      <div class="pago"><img src="${esc(wompi)}" alt="Wompi"><div class="t"><b>Wompi (en línea):</b> tarjeta débito/crédito, PSE, Nequi y botón Bancolombia.</div></div>
      <div class="pago"><img src="${esc(addi)}" alt="Addi"><div class="t"><b>Addi:</b> compra ahora y paga a cuotas.</div></div>
      <div class="pago"><div class="ph">BANCO</div><div class="t"><b>Transferencia:</b> ${esc(e.banco.nombre)} · Cuenta de ${esc(e.banco.tipo)} <b>N.º ${esc(e.banco.numero)}</b> a nombre de ${esc(e.razon_social)}.</div></div>
      <p class="comp">Si pagas por transferencia o Bre-B, envía el comprobante con el n.º <b>${esc(c.numero)}</b> al WhatsApp <a href="${esc(e.atencion.whatsapp_url)}"><b>${esc(e.atencion.telefono)}</b></a>.</p>
    </div>
    <div class="breb">
      <img class="qrb" src="${esc(qrBreb)}" alt="QR Bre-B Reiki Energía Solar">
      <div>
        <div class="breb-t">Paga con <b>Bre-B</b></div>
        <p>Escanea el QR desde la app de tu banco, o usa la llave:</p>
        <div class="llave">${esc(e.banco.llave_breb)}</div>
        <p class="mini">A nombre de REIKI ENERGIA SOLAR · Pago inmediato entre bancos</p>
      </div>
    </div>
  </div>

  <div class="grid2">
    ${estBox}
    <div class="ing">
      <b>¿Quieres el sistema instalado?</b><br>Nuestro ingeniero experto en diseño fotovoltaico revisa la compatibilidad de los equipos y te asesora sin costo. Escríbele por WhatsApp al <a href="${esc(e.atencion.whatsapp_url)}"><b>${esc(e.atencion.telefono)}</b></a>.
    </div>
  </div>

  <h2>Detalle de los equipos</h2>
  ${prodDetail}

  <div class="cond">
  <h2>Condiciones comerciales</h2>
    <ol>
      <li>Oferta válida por ${esc(c.validez)}. Los precios pueden cambiar por variaciones de la TRM o del proveedor.</li>
      <li>Paneles e inversores excluidos de IVA (Ley 1715 de 2014); los demás productos incluyen IVA del 19 %. Productos sujetos a disponibilidad de inventario al momento del pago.</li>
      <li>El envío nacional no está incluido salvo que aparezca en esta cotización; se cotiza según el destino. También puedes recoger en nuestra sede en Medellín.</li>
      <li>Los equipos cuentan con la garantía directa del fabricante; Reiki Energía Solar te acompaña en el trámite ante defectos de fábrica. La garantía no cubre mala manipulación, instalación por personal no certificado ni daños por falta de protecciones DC/AC exigidas por el RETIE.</li>
      <li>Antes de comprar verifica tensión, capacidad y compatibilidad entre equipos; nuestro ingeniero te ayuda sin costo en el WhatsApp ${esc(e.atencion.telefono)}.</li>
      <li>Derecho de retracto: 5 días hábiles desde la entrega (Ley 1480 de 2011), con el producto sin uso y en su empaque original.</li>
      <li>Esta cotización no incluye instalación, estructura, cableado ni trámites, salvo que se indique.</li>
    </ol>
  </div>
</div>
</body>
</html>`;
}

export { nitFmt };
