/**
 * Importa las luminarias Hardy Solar (data/luminarias-hardy.json) a la tienda.
 *
 * - Precio de venta = precio distribuidor (IVA incluido) × margen (1,25).
 * - Foto: recorte de la ficha/catálogo del fabricante, fusionado en modo multiply
 *   sobre el fondo de estudio (misma receta que scripts/procesar-imagenes.mjs).
 * - Ficha técnica: public/fichas/hardy-<id>-ficha-tecnica.pdf (enlazada en fichaPdf).
 * - Descripción y preguntas frecuentes construidas SOLO con datos de la ficha.
 *
 * Uso: node scripts/importar-luminarias-hardy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'luminarias-hardy.json'), 'utf8'));
const SRC = path.join(ROOT, 'imagenes-proveedores', 'hardy');
const OUT = path.join(ROOT, 'public', 'images', 'productos-estudio');
const PROD = path.join(ROOT, 'src', 'content', 'productos');
const HOY = '2026-09-28';

const cop = (n) => `$${Math.round(n).toLocaleString('es-CO').replace(/,/g, '.')}`;

// ---------- imagen estilo estudio ----------
async function radialBackground(size) {
  const buf = Buffer.alloc(size * size * 3);
  const cx = (size - 1) / 2, cy = size * 0.46, maxR = size * 0.72;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const t = Math.min(1, Math.hypot(x - cx, y - cy) / maxR);
    const s = t * t * (3 - 2 * t);
    const i = (y * size + x) * 3;
    buf[i] = Math.round(255 + (0xee - 255) * s);
    buf[i + 1] = Math.round(255 + (0xf0 - 255) * s);
    buf[i + 2] = Math.round(255 + (0xf3 - 255) * s);
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function softShadow(size, w, bottom) {
  const ew = Math.round(w * 0.7), eh = Math.max(Math.round(size / 72), Math.round(w * 0.045));
  const cy = Math.min(size - 8, bottom + Math.round(eh * 0.15));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><ellipse cx="${size / 2}" cy="${cy}" rx="${ew / 2}" ry="${eh / 2}" fill="rgba(18,22,30,0.22)"/></svg>`;
  return sharp(Buffer.from(svg)).blur(Math.max(4, size / 100)).png().toBuffer();
}

/** Lleva el fondo claro de la ficha (gris/blanco) a blanco puro para fusionarlo en multiply. */
async function normalizeToWhite(file) {
  const img = sharp(file).flatten({ background: '#ffffff' }).removeAlpha();
  const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const pts = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]];
  const bg = [0, 1, 2].map((c) => Math.max(...pts.map(([x, y]) => data[(y * w + x) * 3 + c])));
  const k = bg.map((v) => 255 / Math.max(200, v));
  return img.linear(k, [0, 0, 0]).png().toBuffer();
}

async function compose(file, canvas, fit = 0.8, maxUp = 1.3) {
  const norm = await normalizeToWhite(file);
  const trimmed = await sharp(norm).trim({ threshold: 12 }).png().toBuffer({ resolveWithObject: true });
  const { width: tw, height: th } = trimmed.info;
  let scale = Math.min((canvas * fit) / Math.max(tw, th), maxUp);
  const pw = Math.round(tw * scale), ph = Math.round(th * scale);
  const prod = await sharp(trimmed.data).resize(pw, ph, { kernel: 'lanczos3' })
    .linear(1.05, -(128 * 0.05)).sharpen({ sigma: 0.6 }).png().toBuffer();
  const left = Math.round((canvas - pw) / 2), top = Math.round((canvas - ph) / 2 - canvas * 0.015);
  const composed = await sharp(await radialBackground(canvas))
    .composite([{ input: await softShadow(canvas, pw, top + ph), left: 0, top: 0 }, { input: prod, left, top, blend: 'multiply' }])
    .png().toBuffer();
  return { composed, fuente: Math.max(tw, th) };
}

// ---------- texto ----------
function titulo(p) {
  const base = p.linea === 'Reflectores' ? 'Reflector Solar' : p.id === 'sirius' ? 'Lámpara Solar Colgante' : 'Luminaria Solar';
  const pot = p.potencia ? ` ${p.potencia} reales` : '';
  const lm = p.flujo ? ` · ${p.flujo}` : '';
  return `${base} Hardy ${p.nombre}${pot ? ' –' + pot : ''}${lm}`;
}

function retilapTexto(p) {
  if (p.retilap === 'certificado') return `Producto certificado RETILAP (${p.retilapNota}).`;
  if (p.retilap === 'en-evaluacion' || p.retilap === 'en-proceso') return `${p.retilapNota}.`;
  return null;
}

function descripcion(p) {
  const partes = [];
  partes.push(`${p.tipo} Hardy ${p.nombre}${p.potencia ? ` de ${p.potencia} reales` : ''}${p.flujo ? ` y ${p.flujo}` : ''}${p.eficacia ? ` (${p.eficacia})` : ''}.`);
  if (p.equivalente) partes.push(`Se comercializa como "${p.equivalente} equivalente"; la potencia real medida es ${p.potencia}.`);
  const energia = [p.bateria && `batería ${p.bateria}`, p.panel && `panel ${p.panel}`].filter(Boolean).join(' y ');
  if (energia) partes.push(`Funciona 100 % con energía solar: ${energia}${p.autonomia ? `, con autonomía de ${p.autonomia}` : ''}.`);
  const inst = [p.altura && `se instala a ${p.altura} de altura`, p.cobertura && `ilumina ${p.cobertura}`].filter(Boolean).join(' y ');
  if (inst) partes.push(`${inst.charAt(0).toUpperCase() + inst.slice(1)}.`);
  const prot = [p.ip, p.ik].filter(Boolean).join(' / ');
  if (prot) partes.push(`Protección ${prot} para exterior.`);
  const r = retilapTexto(p);
  if (r) partes.push(r);
  if (p.notaDatos) partes.push(p.notaDatos);
  return partes.join(' ');
}

function especificaciones(p) {
  const s = [];
  const add = (k, v) => v && s.push(`${k}: ${v}`);
  add('Tipo', p.tipo);
  add('Potencia real', p.potencia);
  add('Potencia equivalente (comercial)', p.equivalente);
  add('Flujo luminoso', p.flujo);
  add('Eficacia luminosa', p.eficacia);
  add('Temperatura de color', p.cct);
  add('CRI', p.cri);
  add('LED', p.led);
  add('Ángulo de apertura', p.angulo);
  add('Vida útil LED', p.vidaLed);
  add('Batería', p.bateria);
  add('Panel solar', p.panel);
  add('Tiempo de carga', p.carga);
  add('Autonomía', p.autonomia);
  add('Controlador de carga', p.controlador);
  add('Modos de operación', p.modos);
  add('Grado de protección', [p.ip, p.ik].filter(Boolean).join(' / '));
  add('Temperatura de operación', p.temperatura);
  add('Material', p.material);
  add('Dimensiones', p.dimensiones);
  add('Peso', p.peso);
  add('Altura de instalación recomendada', p.altura);
  add('Distancia entre postes', p.distancia);
  add('Área de cobertura', p.cobertura);
  add('Garantía', p.garantia);
  add('RETILAP', p.retilap ? retilapTexto(p).replace(/\.$/, '') : null);
  return s;
}

function faqs(p) {
  const f = [];
  const q = (pregunta, respuesta) => respuesta && f.push({ pregunta, respuesta });
  q(`¿Cuántos vatios reales tiene la ${p.nombre}?`,
    p.potencia && `${p.potencia} reales${p.equivalente ? ` (el "${p.equivalente}" es una potencia equivalente comercial, no el consumo real)` : ''}, con un flujo de ${p.flujo || 'según ficha'}. Para comparar luminarias solares, fíjate en los lúmenes y en los vatios reales, no en el número del modelo.`);
  q(`¿Cuántas horas alumbra y cuánto tarda en cargar?`,
    (p.autonomia || p.carga) && [p.autonomia && `Autonomía: ${p.autonomia}.`, p.carga && `Carga completa en ${p.carga}.`, 'En días nublados la carga es menor; por eso la batería LiFePO4 guarda reserva para más de una noche en los modelos que lo indican.'].filter(Boolean).join(' '));
  q(`¿A qué altura se instala y cuánto espacio ilumina?`,
    (p.altura || p.cobertura || p.distancia) && [p.altura && `Altura recomendada: ${p.altura}.`, p.distancia && `Distancia entre postes: ${p.distancia}.`, p.cobertura && `Cobertura: ${p.cobertura}.`].filter(Boolean).join(' '));
  q(`¿Necesita cableado o conexión a la red eléctrica?`,
    `No. ${p.panel && /separado/i.test(p.panel) ? 'El panel solar va separado de la lámpara y se conecta con su cable; se orienta hacia el sol.' : 'Panel, batería y controlador vienen integrados en el mismo cuerpo.'} Solo se fija en el poste, muro o soporte y enciende automáticamente al anochecer.`);
  const lista = (xs) => xs.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(', ');
  q(`¿Qué incluye?`, p.incluye && `${lista(p.incluye)}. El poste no está incluido.`);
  q(`¿Tiene certificación RETILAP?`, retilapTexto(p) || (p.sinFicha ? 'El fabricante no ha entregado aún la ficha técnica de este modelo; consúltanos antes de usarlo en proyectos de alumbrado público.' : null));
  q(`¿Qué garantía tiene?`, p.garantia && `${p.garantia} de garantía del fabricante (Hardy Solar Energy). Reiki Energía Solar te acompaña en el trámite.`);
  q(`¿Dónde se recomienda usar?`, p.aplicaciones && `${lista(p.aplicaciones)}.`);
  return f.slice(0, 8);
}

// ---------- main ----------
fs.mkdirSync(OUT, { recursive: true });
const resumen = [];
let order = 30;
for (const p of DATA.productos) {
  const precio = p.precioDistribuidor * DATA._margen;
  const src = path.join(SRC, p.foto);
  const seo = `hardy-${p.id}`;
  const { composed: big, fuente } = await compose(src, 1600);
  const provisional = fuente < 500;
  const { composed: small } = await compose(src, 600, 0.8, 1.6);
  await sharp(big).webp({ quality: 87, effort: 5 }).toFile(path.join(OUT, `${seo}.webp`));
  await sharp(small).webp({ quality: 84 }).toFile(path.join(OUT, `${seo}-thumb.webp`));

  const ficha = p.fichaFuente ? `/fichas/hardy-${p.id}-ficha-tecnica.pdf` : null;
  const fm = {
    title: titulo(p),
    description: descripcion(p),
    image: `/images/productos-estudio/${seo}.webp`,
    imageThumb: `/images/productos-estudio/${seo}-thumb.webp`,
    imageAlt: `${titulo(p)} – Reiki Energía Solar`,
    category: 'reflectores',
    price: cop(precio),
    specifications: especificaciones(p),
    brand: 'Hardy Solar',
    model: p.modelo || p.nombre,
    sku: `HARDY-${p.id.toUpperCase()}`,
    power: p.potencia || undefined,
    stock: 'disponible',
    order: order++,
    updatedAt: HOY,
    imagen_provisional: provisional,
    ...(p.fotoSerie ? { imagenSerieRef: p.fotoSerie } : {}),
    ...(ficha ? { fichaPdf: ficha } : {}),
    seoKeywords: [
      'luminaria solar', `hardy ${p.nombre.toLowerCase()}`, ...(p.nombreLista ? [p.nombreLista.toLowerCase()] : []), p.linea === 'Reflectores' ? 'reflector solar led' : 'lámpara solar para calle',
      'alumbrado público solar', 'luminaria solar retilap', 'luminaria solar colombia', 'comprar luminaria solar medellín',
    ],
    faqs: faqs(p),
  };
  const yaml = Object.entries(fm).filter(([, v]) => v !== undefined).map(([k, v]) => {
    if (Array.isArray(v)) {
      if (!v.length) return null;
      if (typeof v[0] === 'object') return `${k}:\n${v.map((o) => `  - pregunta: ${JSON.stringify(o.pregunta)}\n    respuesta: ${JSON.stringify(o.respuesta)}`).join('\n')}`;
      return `${k}:\n${v.map((x) => `  - ${JSON.stringify(x)}`).join('\n')}`;
    }
    return `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`;
  }).filter(Boolean).join('\n');
  const body = `**${fm.title}**\n\n${fm.description}\n\nFicha técnica del fabricante: Hardy Solar Energy. Precio con IVA incluido.\n`;
  fs.writeFileSync(path.join(PROD, `luminaria-solar-hardy-${p.id}.md`), `---\n${yaml}\n---\n\n${body}`);
  resumen.push({ id: p.id, titulo: fm.title, distribuidor: p.precioDistribuidor, venta: Math.round(precio), provisional, ficha: !!ficha });
  console.log(`${p.id.padEnd(14)} ${cop(p.precioDistribuidor).padStart(10)} → ${fm.price.padStart(10)}  foto ${fuente}px${provisional ? ' (provisional)' : ''}  ${ficha ? 'PDF' : 'sin PDF'}`);
}
fs.writeFileSync(path.join(ROOT, 'docs', 'luminarias-hardy-import.json'), JSON.stringify(resumen, null, 1));
