import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prodDir = path.join(root, 'src', 'content', 'productos');

function pickInvImage(brand, model, title, sku) {
  const t = `${brand} ${model} ${title} ${sku}`.toUpperCase();
  const b = (brand || '').toUpperCase();

  if (/VICTRON/.test(b) || /VICTRON/.test(t)) {
    if (/PHOENIX|\bPIN/.test(t)) return '/images/productos-tienda/inversores/victron-phoenix.png';
    if (/QUATTRO|\bQUA/.test(t)) return '/images/productos-tienda/inversores/victron-quattro.png';
    return '/images/productos-tienda/inversores/victron-multiplus.png';
  }
  if (/HUAWEI/.test(b) || /SUN2000/.test(t)) return '/images/productos-tienda/inversores/huawei-sun2000.png';
  if (/DEYE/.test(b) || /SUN-\d+K-SG/.test(t)) return '/images/productos-tienda/inversores/deye-hybrid.png';
  if (/HOYMILES/.test(b) || /HMS-|HMT-/.test(t))
    return '/images/productos-tienda/inversores/hoymiles-hms.jpg';
  if (/MUST/.test(b) || /\bPV\d{2}/.test(t)) return '/images/productos-tienda/inversores/must-pv.png';
  if (/APSYSTEMS|\bAPS\b/.test(b) || /DS3|QT2/.test(t)) {
    if (/QT2/.test(t)) return '/images/productos-tienda/inversores/apsystems-qt2.png';
    return '/images/productos-tienda/inversores/apsystems-ds3.png';
  }
  if (/GOODWE/.test(b)) {
    if (/\bES\b|HYBRID/.test(t)) return '/images/productos-tienda/inversores/goodwe-es.jpg';
    return '/images/productos-tienda/inversores/goodwe-sdt.jpg';
  }
  if (/GROWATT/.test(b)) {
    if (/\bMIN\b/.test(t)) return '/images/productos-tienda/inversores/growatt-min.jpg';
    return '/images/productos-tienda/inversores/growatt-mod.jpg';
  }
  if (/FELICITY/.test(b)) return fs.existsSync(path.join(root, 'public/images/productos-tienda/inversores/felicity-hybrid.png'))
      ? '/images/productos-tienda/inversores/felicity-hybrid.png'
      : '/images/productos-tienda/inversores/felicity-hybrid.jpg';
  if (/FRONIUS/.test(b)) return '/images/productos-tienda/inversores/fronius-primo.jpg';
  if (/STUDER|XTENDER/.test(t) || /STUDER/.test(b))
    return '/images/productos-tienda/inversores/studer-xtender.jpg';
  if (/TENSITE/.test(b)) return '/images/productos-tienda/inversores/tensite-inverter.jpg';
  if (/EPEVER|IPT/.test(t)) return '/images/productos-tienda/inversores/epever-ipt.png';
  return '/images/productos-tienda/inversores/huawei-sun2000.png';
}

function pickBatImage(brand, model, title, sku, power) {
  const t = `${brand} ${model} ${title} ${sku} ${power}`.toUpperCase();
  const b = (brand || '').toUpperCase();

  if (/FELICITY/.test(b) || /FLA/.test(t)) {
    if (/FLA48|48\s*V|14,?3|16\s*KWH|11,?8|8,?75|5\.12/.test(t) && /48/.test(t))
      return '/images/productos-tienda/baterias/felicity-fla48.jpg';
    if (/FLA24|24\s*V/.test(t)) return '/images/productos-tienda/baterias/felicity-fla24.jpg';
    if (/12\s*V/.test(t)) return '/images/productos-tienda/baterias/felicity-12v.jpg';
    return '/images/productos-tienda/baterias/felicity-fla48.jpg';
  }
  if (/PYLONTECH/.test(b)) {
    if (/UF5000|10\s*KWH|STACK|15/.test(t))
      return '/images/productos-tienda/baterias/pylontech-uf5000.png';
    if (/20\s*KWH/.test(t)) return '/images/productos-tienda/baterias/pylontech-20kwh-medellin.png';
    if (/3\s*KWH|2\.4/.test(t)) return '/images/productos-tienda/baterias/pylontech-3kwh-medellin.png';
    return '/images/productos-tienda/baterias/pylontech-us.png';
  }
  if (/DYNESS/.test(b) || /BX51100/.test(t))
    return '/images/productos-tienda/baterias/dyness-bx51100.png';
  if (/BSLBATT/.test(b)) return '/images/productos-tienda/baterias/bslbatt-5-12.png';
  if (/GOODWE/.test(b)) return '/images/productos-tienda/baterias/goodwe-lynxl.png';
  if (/GROWATT/.test(b)) return '/images/productos-tienda/baterias/growatt-ark.png';
  if (/SOLUNA/.test(b) || /SOLUNA/.test(t))
    return fs.existsSync(path.join(root, 'public/images/productos-tienda/baterias/soluna-battery.png'))
      ? '/images/productos-tienda/baterias/soluna-battery.png'
      : '/images/productos-tienda/baterias/soluna-battery.jpg';
  if (/HUAWEI/.test(b) || /LUNA2000|\bLUNA-|\bLUNA\s*2000/.test(t))
    return fs.existsSync(path.join(root, 'public/images/productos-tienda/baterias/huawei-luna.png'))
      ? '/images/productos-tienda/baterias/huawei-luna.png'
      : '/images/productos-tienda/baterias/huawei-luna.jpg';
  if (/BYD/.test(b)) return '/images/productos-tienda/baterias/byd-battery.png';
  if (/PYTES/.test(b)) return '/images/productos-tienda/baterias/pytes-battery.png';
  return '/images/productos-tienda/baterias/pylontech-us.png';
}

function updateMd(file, image) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return false;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return false;
  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  const abs = path.join(root, 'public', image.replace(/^\//, ''));
  if (!fs.existsSync(abs)) {
    console.warn('missing file for', path.basename(file), image);
    return false;
  }
  if (/^image:/m.test(fm)) fm = fm.replace(/^image:\s*".*?"/m, `image: "${image}"`);
  else fm = fm.replace(/\n---\s*$/, `\nimage: "${image}"\n---`);
  fm = fm.replace(/imagenPendiente:\s*true\s*\n?/g, '');
  fs.writeFileSync(file, fm + body);
  return true;
}

let inv = 0;
let bat = 0;
for (const f of fs.readdirSync(prodDir).filter((x) => x.endsWith('.md'))) {
  const file = path.join(prodDir, f);
  const text = fs.readFileSync(file, 'utf8');
  if (/^draft:\s*true/m.test(text)) continue;
  const cat = (text.match(/^category:\s*"?([a-z]+)/m) || [])[1];
  if (cat !== 'inversores' && cat !== 'baterias') continue;
  const brand = (text.match(/^brand:\s*"([^"]*)"/m) || [])[1] || '';
  const model = (text.match(/^model:\s*"([^"]*)"/m) || [])[1] || '';
  const title = (text.match(/^title:\s*"([^"]*)"/m) || [])[1] || '';
  const sku = (text.match(/^sku:\s*"([^"]*)"/m) || [])[1] || '';
  const power = (text.match(/^power:\s*"([^"]*)"/m) || [])[1] || '';
  const image =
    cat === 'inversores'
      ? pickInvImage(brand, model, title, sku)
      : pickBatImage(brand, model, title, sku, power);
  if (updateMd(file, image)) {
    if (cat === 'inversores') inv++;
    else bat++;
  }
}

console.log({ inversoresActualizados: inv, bateriasActualizadas: bat });
