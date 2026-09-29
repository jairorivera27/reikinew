import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public', 'images', 'productos-tienda');
const dist = path.join(root, 'dist', 'images', 'productos-tienda');

function copyAsPng(srcJpg, destPng) {
  if (!fs.existsSync(srcJpg)) return;
  fs.copyFileSync(srcJpg, destPng);
  console.log('png', path.basename(destPng));
}

copyAsPng(
  path.join(pub, 'baterias', 'soluna-battery.jpg'),
  path.join(pub, 'baterias', 'soluna-battery.png')
);
copyAsPng(
  path.join(pub, 'baterias', 'huawei-luna.jpg'),
  path.join(pub, 'baterias', 'huawei-luna.png')
);
copyAsPng(
  path.join(pub, 'inversores', 'felicity-hybrid.jpg'),
  path.join(pub, 'inversores', 'felicity-hybrid.png')
);

// Patch assigner preferences to .png when present
const assigner = path.join(root, 'scripts', '_tmp-asignar-inv-bat.mjs');
let s = fs.readFileSync(assigner, 'utf8');
s = s.replace(
  /if \(\/FELICITY\/\.test\(b\)\) return '\/images\/productos-tienda\/inversores\/felicity-hybrid\.jpg';/,
  `if (/FELICITY/.test(b)) return fs.existsSync(path.join(root, 'public/images/productos-tienda/inversores/felicity-hybrid.png'))
      ? '/images/productos-tienda/inversores/felicity-hybrid.png'
      : '/images/productos-tienda/inversores/felicity-hybrid.jpg';`
);
s = s.replace(
  /if \(\/SOLUNA\/\.test\(b\) \|\| \/SOLUNA\/\.test\(t\)\)\s*return fs\.existsSync\([\s\S]*?huawei-luna\.jpg'\);/,
  `if (/SOLUNA/.test(b) || /SOLUNA/.test(t))
    return fs.existsSync(path.join(root, 'public/images/productos-tienda/baterias/soluna-battery.png'))
      ? '/images/productos-tienda/baterias/soluna-battery.png'
      : '/images/productos-tienda/baterias/soluna-battery.jpg';
  if (/HUAWEI/.test(b) || /LUNA2000|\\bLUNA-|\\bLUNA\\s*2000/.test(t))
    return fs.existsSync(path.join(root, 'public/images/productos-tienda/baterias/huawei-luna.png'))
      ? '/images/productos-tienda/baterias/huawei-luna.png'
      : '/images/productos-tienda/baterias/huawei-luna.jpg';`
);
fs.writeFileSync(assigner, s);
console.log('assigner updated');

// Sync selected assets to dist
for (const sub of ['inversores', 'baterias']) {
  fs.mkdirSync(path.join(dist, sub), { recursive: true });
}
const files = [
  ['inversores', 'tensite-inverter.jpg'],
  ['inversores', 'studer-xtender.jpg'],
  ['inversores', 'felicity-hybrid.jpg'],
  ['inversores', 'felicity-hybrid.png'],
  ['baterias', 'huawei-luna.jpg'],
  ['baterias', 'huawei-luna.png'],
  ['baterias', 'soluna-battery.jpg'],
  ['baterias', 'soluna-battery.png'],
];
for (const [sub, name] of files) {
  const src = path.join(pub, sub, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, sub, name));
    console.log('dist', sub, name);
  }
}
