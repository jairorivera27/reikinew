/**
 * Genera docs/revisar-decisiones-resumen.md agrupado por fuente (las 30 REVISAR).
 * Uso: node scripts/_revisar-resumen.mjs
 */
import fs from 'node:fs';

const shared = fs.readFileSync('docs/imagenes-compartidas.md', 'utf8');
const sections = shared.split(/\n## `/).slice(1);
const rows = [];

for (const sec of sections) {
  if (!/\*\*REVISAR\*\*/.test(sec)) continue;
  const src = '`' + sec.split('\n')[0].replace(/`.*$/, '') + '`';
  const why = (sec.match(/\*\*REVISAR\*\* — ([^\n]+)/) || [])[1] || '';
  const skus = [...sec.matchAll(/^\| ([a-z0-9-]+) \|/gm)].map((m) => m[1]);
  // ¿Algún SKU tiene imageOriginal único?
  let propias = 0;
  let compartidas = 0;
  for (const slug of skus) {
    const p = `src/content/productos/${slug}.md`;
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    const img = (raw.match(/^image:\s*"?([^"\n]+)"?/m) || [])[1] || '';
    const orig = (raw.match(/^imageOriginal:\s*"?([^"\n]+)"?/m) || [])[1] || '';
    // contar usuarios de orig
    let n = 0;
    if (orig) {
      for (const f of fs.readdirSync('src/content/productos').filter((x) => x.endsWith('.md'))) {
        const t = fs.readFileSync(`src/content/productos/${f}`, 'utf8');
        if (t.includes(`imageOriginal: "${orig}"`) || t.includes(`imageOriginal: ${orig}`)) n++;
      }
    }
    if (orig && n === 1) propias++;
    else compartidas++;
  }
  const decision =
    propias === skus.length
      ? 'Todas con provisional/foto propia'
      : propias > 0
        ? `${propias} propias · ${compartidas} se quedan compartidas → no-sirven ALTA`
        : `Sin foto propia · se mantiene compartida → no-sirven ALTA (${skus.length} SKUs)`;
  rows.push({ src, why, skus: skus.length, decision, ejemplos: skus.slice(0, 3).join(', ') });
}

const md = [
  '# Resumen decisiones REVISAR (por fuente compartida)',
  '',
  `Fuentes REVISAR: **${rows.length}**`,
  '',
  '| # | Fuente | SKUs | Motivo | Decisión |',
  '|---|---|---:|---|---|',
  ...rows.map(
    (r, i) =>
      `| ${i + 1} | ${r.src} | ${r.skus} | ${r.why} | ${r.decision} |`
  ),
  '',
  'Detalle por SKU: `docs/revisar-decisiones.md`',
  'Lista prioridad alta: `docs/imagenes-no-sirven.md` § Prioridad alta',
  '',
];
fs.writeFileSync('docs/revisar-decisiones-resumen.md', md.join('\n'));
console.log(md.join('\n'));
