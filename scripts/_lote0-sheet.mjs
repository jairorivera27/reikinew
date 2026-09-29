import fs from 'node:fs';

const seeds = [
  ['HMT-2000-4T-208', 'cat-mayorista-d99eecbc0d48', 'hoymiles-hmt-2000-4t-208'],
  ['HMS-800-2T', 'cat-mayorista-595127324da8', 'hoymiles-hms-800-2t'],
  ['HMS-2000-4T', 'cat-mayorista-dbd01c55a288', 'hoymiles-hms-2000-4t'],
  ['Victron 100/50', 'controlador-de-carga-solar-mppt-victron-scc110050210', 'victron-smartsolar-mppt-100-50'],
];

const cards = seeds
  .map(([label, slug, seo]) => {
    const md = fs.readFileSync(`src/content/productos/${slug}.md`, 'utf8');
    const pdf = (md.match(/^fichaPdf:\s*"?([^"\n]+)/m) || [])[1] || '—';
    const img = (md.match(/^image:\s*"?([^"\n]+)/m) || [])[1];
    const prov = /imagen_provisional:\s*true/.test(md);
    return `<article class="card"><h3>${label}</h3>
      <p class="meta">${slug}<br/>PDF: ${pdf}<br/>provisional: ${prov ? 'SÍ (error)' : 'no'}</p>
      <img src="piloto-preview/${seo}.png" alt="" onerror="this.src='../public${img}'"/></article>`;
  })
  .join('\n');

fs.writeFileSync(
  'docs/contact-sheet-lote-0.html',
  `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Lote 0 — seeds autorizados</title>
<style>body{font-family:Segoe UI,sans-serif;background:#f4f5f7;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e4e7eb;border-radius:10px;padding:10px}
img{width:100%;aspect-ratio:1;object-fit:contain;background:#eef0f3}
.meta{font-size:.75rem;color:#666}</style></head>
<body><h1>Lote 0 — seeds Solaire/Autosolar</h1>
<p>Autorizados 2026-09-28. Listos en repo. <strong>Esperando tu OK</strong> antes del lote 1 (home/descuento ×20).</p>
<div class="grid">${cards}</div></body></html>`
);

const slugAstro = fs.readFileSync('src/pages/tienda/[slug].astro', 'utf8');
console.log(
  'badge texto público:',
  slugAstro.includes('Imagen provisional') ? 'AÚN PRESENTE' : 'quitado OK'
);
console.log('lote-0 OK');
console.log('CSV:\n' + fs.readFileSync('docs/fuentes-imagenes.csv', 'utf8'));
