/**
 * Corrige sobre-ocultación G2: Growatt MOD/ARK y GoodWe Lynx son misma familia visual.
 * Restaura desde git y agrega imagenSerieRef.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PROD = 'src/content/productos';

const RESTORE = [
  // Growatt on growatt-mod.jpg — todas son inversores Growatt de la familia MOD/TL/KTL
  { slug: 'inversor-solar-off-grid-growatt-3000w-3004250', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-10000w-3004285', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-10kw-10ktl3-xl2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-15000w-3004290', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-15kw-15ktl3-xl2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-20000w-3004291', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-20kw-20ktl3-xl2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-25000w-3004292', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-36000w-3004294', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-3600w-3600tl-x2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-36kw-36ktl3-xl2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-4200w-3205063', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-50000w-3004295', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-6000w-6000tl-x2', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-75000w-3004296', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-8000w-3205064', serie: 'Growatt MOD' },
  { slug: 'inversor-solar-on-grid-growatt-8000w-8000tl-x2', serie: 'Growatt MOD' },
  // microinversor growatt ≠ MOD → NO restaurar
  { slug: 'bateria-solar-litio-goodwe-51-2vdc-280ah-gw14', serie: 'GoodWe Lynx' },
  { slug: 'bateria-solar-litio-goodwe-51-2vdc-5-0kwh-ip65', serie: 'GoodWe Lynx' },
  { slug: 'bateria-solar-litio-growatt-380vdc-5-0kwh-ip66', serie: 'Growatt ARK' },
  { slug: 'bateria-solar-litio-growatt-51-2v-5-0kwh-ip21', serie: 'Growatt ARK' },
];

function set(text, key, val) {
  if (val === null) {
    return text
      .split(/\r?\n/)
      .filter((l) => !new RegExp(`^${key}:`).test(l))
      .join('\n');
  }
  const line =
    typeof val === 'boolean' ? `${key}: ${val}` : `${key}: "${String(val).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  return re.test(text) ? text.replace(re, line) : `${text}\n${line}`;
}

for (const { slug, serie } of RESTORE) {
  const rel = path.join(PROD, `${slug}.md`).replace(/\\/g, '/');
  try {
    execSync(`git checkout HEAD -- "${rel}"`, { stdio: 'pipe' });
  } catch (e) {
    console.warn('no git restore', slug, e.message);
    continue;
  }
  const mdPath = path.join(PROD, `${slug}.md`);
  let raw = fs.readFileSync(mdPath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  let fm = m[1];
  fm = set(fm, 'draft', null);
  fm = set(fm, 'imagenPendiente', null);
  fm = set(fm, 'imagenSerieRef', serie);
  raw = `---\n${fm}\n---${raw.slice(m[0].length)}`;
  fs.writeFileSync(mdPath, raw);
  console.log('restored+caption', slug, serie);
}

// Update G2 doc counts
const g2 = fs.readFileSync('docs/grupo2-serie.md', 'utf8');
let lines = g2.split(/\r?\n/);
for (const { slug, serie } of RESTORE) {
  lines = lines.map((l) =>
    l.startsWith(`| ${slug} |`)
      ? `| ${slug} | ${serie} | caption_serie |`
      : l
  );
}
const captions = lines.filter((l) => l.includes('| caption_serie |')).length;
const ocultos = lines.filter((l) => l.includes('| oculto_no_misma_serie |')).length;
lines = lines.map((l) => {
  if (l.startsWith('- Con caption:')) return `- Con caption: **${captions}**`;
  if (l.startsWith('- Ocultos')) return `- Ocultos (no misma serie): **${ocultos}**`;
  return l;
});
fs.writeFileSync('docs/grupo2-serie.md', lines.join('\n'));
console.log('G2 updated captions', captions, 'ocultos', ocultos);
