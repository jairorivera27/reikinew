import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'content', 'productos');

const map = {
  'panel-solar-bifacial-n-type-tensite-620w-1002141':
    '/images/productos-tienda/paneles-solares/tensite-620w-bifacial.jpg',
  'panel-solar-bifacial-n-type-tensite-710w-1002138':
    '/images/productos-tienda/paneles-solares/tensite-710w-bifacial.jpg',
  'panel-solar-monocristalino-tensite-240w-1002223':
    '/images/productos-tienda/paneles-solares/tensite-240w-mono.jpg',
  'panel-solar-bifacial-n-type-ja-solar-625w-1002139':
    '/images/productos-tienda/paneles-solares/ja-solar-625w-bifacial.jpg',
  'panel-solar-bifacial-n-type-ja-solar-715w-1002140':
    '/images/productos-tienda/paneles-solares/ja-solar-715w-bifacial.jpg',
  'panel-solar-bifacial-n-type-ja-solar-720w-1002142':
    '/images/productos-tienda/paneles-solares/ja-solar-720w-bifacial.jpg',
  'panel-solar-monocristalino-trina-670w-tsm-670deg21c-20':
    '/images/productos-tienda/paneles-solares/trina-670w-deg21c.png',
  'panel-solar-monocristalino-victron-scc900300000':
    '/images/productos-tienda/paneles-solares/victron-bluesolar-mono.jpg',
  'panel-solar-monocristalino-must-2000w-leyu':
    '/images/productos-tienda/paneles-solares/must-panel-mono.jpg',
};

let updated = 0;
for (const [slug, image] of Object.entries(map)) {
  const file = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.warn('missing', slug);
    continue;
  }
  let text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---')) continue;
  const end = text.indexOf('\n---', 3);
  if (end < 0) continue;
  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  if (/^image:/m.test(fm)) {
    fm = fm.replace(/^image:\s*".*?"/m, `image: "${image}"`);
  } else {
    fm = fm.replace(/\n---\s*$/, `\nimage: "${image}"\n---`);
  }
  // Clear pending flag when we have a real photo
  if (/imagenPendiente:\s*true/.test(fm)) {
    fm = fm.replace(/imagenPendiente:\s*true\s*\n?/, '');
  }
  fs.writeFileSync(file, fm + body);
  updated++;
  console.log('updated', slug);
}
console.log('done', updated);
