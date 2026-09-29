// Ficha técnica resumen Reiki (PDF A4) para productos sin hoja de datos pública del fabricante.
// Usa solo los datos ya publicados en la ficha del producto (especificaciones, descripción, FAQ).
// La hoja del fabricante se sigue ofreciendo por WhatsApp.
//
// Uso: node scripts/fichas-reiki/generar.mjs            → productos visibles sin fichaPdf
//      node scripts/fichas-reiki/generar.mjs --regenerar → rehace las fichas Reiki existentes
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PROD = path.join(ROOT, 'src/content/productos');
const OUT = path.join(ROOT, 'public/fichas/reiki');
const ASSETS = path.join(ROOT, 'scripts/catalogo-luminarias/assets');
const REGENERAR = process.argv.includes('--regenerar');
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p) => fs.readFileSync(p).toString('base64');
const fuentes = ['Regular:400', 'Medium:500', 'SemiBold:600', 'Bold:700']
  .map((x) => x.split(':'))
  .map(([n, w]) => `@font-face{font-family:Poppins;font-weight:${w};src:url(data:font/ttf;base64,${b64(path.join(ASSETS, 'fonts/Poppins-' + n + '.ttf'))})}`)
  .join('');
const logo = `data:image/png;base64,${b64(path.join(ROOT, 'scripts/fichas-reiki/logo-blanco-360.png'))}`;
const qrWa = `data:image/png;base64,${b64(path.join(ASSETS, 'qr-whatsapp.png'))}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CATEGORIAS = { paneles: 'Paneles solares', inversores: 'Inversores', baterias: 'Baterías', controladores: 'Controladores de carga',
  protecciones: 'Protecciones eléctricas', bombeo: 'Bombeo solar', accesorios: 'Accesorios y monitoreo', reflectores: 'Iluminación solar' };

function imagenDataUri(rel) {
  if (!rel) return null;
  const p = path.join(ROOT, 'public', decodeURI(rel));
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${b64(p)}`;
}

function html(d, slug) {
  const specs = (d.specifications || []).filter((s) => s.includes(':') && !/^Fuente|especificación no disponible/i.test(s));
  const filas = [
    ['Marca', d.brand], ['Modelo / referencia', d.model || d.sku], ['Código Reiki', d.sku], ['Categoría', CATEGORIAS[d.category] || d.category],
    ...specs.map((s) => [s.split(':')[0].trim(), s.split(':').slice(1).join(':').trim()]),
  ].filter(([, v]) => v && !/^(N\/A|Accesorio\/Monitor)$/i.test(v));
  const desc = String(d.description || '').replace(/\s*(Descarga la ficha técnica[^.]*\.|Si necesitas la hoja de datos completa[^.]*\.)/g, '').trim();
  const faqs = (d.faqs || []).slice(0, 3);
  const img = imagenDataUri(d.imageThumb) || imagenDataUri(d.image);
  const hoy = new Date().toISOString().slice(0, 10);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${fuentes}
  @page{size:A4;margin:0} *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Poppins,sans-serif;color:#231a2b;width:210mm;height:297mm;position:relative;font-size:9.5pt;line-height:1.45}
  header{background:linear-gradient(120deg,#3a0b47,#6b2181);color:#fff;padding:12mm 14mm 9mm;display:flex;justify-content:space-between;align-items:flex-start}
  header img{height:15mm} header .tag{font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#ffc20e;font-weight:600;text-align:right}
  header .tag span{display:block;color:#fff;letter-spacing:0;text-transform:none;font-weight:400;margin-top:1mm}
  .titulo{padding:8mm 14mm 4mm} .titulo .marca{color:#6b2181;font-weight:600;font-size:9pt;letter-spacing:.12em;text-transform:uppercase}
  .titulo h1{font-size:18pt;line-height:1.2;font-weight:700;margin-top:1mm}
  .cuerpo{display:grid;grid-template-columns:62mm 1fr;gap:8mm;padding:2mm 14mm}
  .foto{background:radial-gradient(circle,#fff,#eef0f3);border-radius:4mm;height:62mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .foto img{max-width:88%;max-height:88%;object-fit:contain} .foto .sin{color:#9a8aa3;font-size:8pt}
  table{width:100%;border-collapse:collapse} td{padding:1.6mm 2mm;border-bottom:.3mm solid #ece6f0;vertical-align:top}
  td:first-child{color:#6a5a73;width:42%;font-weight:500} td:last-child{font-weight:600}
  h2{font-size:10.5pt;color:#3a0b47;margin:6mm 0 2mm;padding-left:3mm;border-left:1.2mm solid #ffc20e}
  .sec{padding:0 14mm} .faq b{display:block;font-weight:600;margin-top:2mm} .faq p{color:#4a3d52}
  footer{position:absolute;bottom:0;left:0;right:0;background:#f6f1f8;padding:6mm 14mm;display:flex;gap:6mm;align-items:center;font-size:8pt;color:#4a3d52}
  footer img{height:20mm} footer strong{color:#3a0b47}
  .nota{font-size:7.5pt;color:#6a5a73;margin-top:1.5mm}
  </style></head><body>
  <header><img src="${logo}" alt="Reiki Energía Solar"><div class="tag">Ficha técnica<span>${esc(CATEGORIAS[d.category] || '')}</span></div></header>
  <div class="titulo"><div class="marca">${esc(d.brand || '')}</div><h1>${esc(d.title)}</h1></div>
  <div class="cuerpo"><div class="foto">${img ? `<img src="${img}">` : '<span class="sin">Imagen no disponible</span>'}</div>
  <table>${filas.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table></div>
  ${desc ? `<div class="sec"><h2>Descripción</h2><p>${esc(desc)}</p></div>` : ''}
  ${faqs.length ? `<div class="sec faq"><h2>Preguntas frecuentes</h2>${faqs.map((f) => `<b>${esc(f.pregunta)}</b><p>${esc(f.respuesta)}</p>`).join('')}</div>` : ''}
  <footer><img src="${qrWa}" alt="WhatsApp"><div><strong>Reiki Energía Solar</strong> · WhatsApp +57 300 405 2638 · info@reikisolar.com.co · reikisolar.com.co/tienda/${esc(slug)}<br>
  Carrera 80 #39-167 Local 105, Medellín.
  <div class="nota">Ficha resumen elaborada por Reiki con los datos del proveedor (${hoy}). Si necesitas la hoja de datos original del fabricante, pídela por WhatsApp y te la enviamos. Verifica compatibilidad con tu sistema antes de instalar.</div></div></footer>
  </body></html>`;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const page = await browser.newPage();
let n = 0;
for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md')).sort()) {
  const texto = fs.readFileSync(path.join(PROD, f), 'utf8');
  const m = texto.match(/^---\n([\s\S]*?)\n---/);
  const d = yaml.load(m[1]);
  if (d.draft === true) continue;
  const slug = f.slice(0, -3);
  const destino = `/fichas/reiki/${slug}.pdf`;
  const esReiki = d.fichaPdf === destino;
  if (d.fichaPdf && !(REGENERAR && esReiki)) continue;
  await page.setContent(html(d, slug), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, slug + '.pdf'), format: 'A4', printBackground: true });
  if (!d.fichaPdf) {
    fs.writeFileSync(path.join(PROD, f), texto.replace(/^(---\n[\s\S]*?)\n---/, `$1\nfichaPdf: ${JSON.stringify(destino)}\n---`));
  }
  n++;
}
await browser.close();
console.log('Fichas Reiki generadas:', n);
