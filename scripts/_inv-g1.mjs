import fs from 'node:fs';
import path from 'node:path';

const PROD = 'src/content/productos';
const sources = [
  'victron-smartsolar-mppt',
  'generic-mcb-ac',
  'goodwe-sdt',
  'hoymiles-hms.jpg',
  'reflector led solar 200W',
];

function field(raw, key) {
  const m = raw.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
  return m ? m[1].trim() : '';
}

const out = {};
for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(PROD, f), 'utf8');
  const orig = field(raw, 'imageOriginal');
  const img = field(raw, 'image');
  const title = field(raw, 'title');
  const cat = field(raw, 'category');
  const brand = field(raw, 'brand');
  const model = field(raw, 'model');
  const power = field(raw, 'power');
  const draft = /^draft:\s*true/m.test(raw);
  const blob = `${orig} ${img}`;
  for (const s of sources) {
    if (blob.toLowerCase().includes(s.toLowerCase())) {
      (out[s] = out[s] || []).push({
        slug: f.replace(/\.md$/, ''),
        title,
        cat,
        brand,
        model,
        power,
        draft,
        orig,
      });
    }
  }
}

for (const [k, v] of Object.entries(out)) {
  console.log(`\n## ${k} (${v.length})`);
  const byCat = {};
  for (const r of v) {
    byCat[r.cat] = (byCat[r.cat] || 0) + 1;
    console.log(
      `${r.draft ? '[D] ' : ''}${r.slug} | ${r.cat} | ${r.brand} | ${r.model} | ${r.power} | ${r.title.slice(0, 70)}`
    );
  }
  console.log('cats:', JSON.stringify(byCat));
}
