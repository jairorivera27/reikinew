import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prodDir = path.join(root, 'src', 'content', 'productos');

function exists(rel) {
  return fs.existsSync(path.join(root, 'public', rel.replace(/^\//, '')));
}

function pick(...cands) {
  for (const c of cands) {
    if (c && exists(c)) return c;
  }
  return cands[0];
}

function isBadImage(img) {
  if (!img) return true;
  return /placeholders\/|logo-Victron|\/huawei\.png|\/growatt\.png|\/livoltek\.png|\/Must\.png|\/solis\.png$/i.test(
    img
  );
}

function pickImage(brand, title, sku, category, current) {
  const t = `${brand} ${title} ${sku}`.toUpperCase();
  const b = (brand || '').toUpperCase();
  const cat = category || '';

  // Only replace bad images (or missing)
  if (current && !isBadImage(current) && exists(current)) return current;

  // Victron controllers
  if (/VICTRON/.test(b) || /VICTRON/.test(t)) {
    if (/CERBO|EKRANO|GX\b|TOUCH|VENUS|DONGLE|COMMUNICATION|COMUNICACION|MONITOR|VE\.DIRECT|VE\.BUS/i.test(t)) {
      if (/TOUCH|EKRANO/.test(t))
        return pick(
          '/images/productos-tienda/monitoreo/victron-gx-touch.jpg',
          '/images/productos-tienda/monitoreo/victron-cerbo-gx.jpg'
        );
      return pick('/images/productos-tienda/monitoreo/victron-cerbo-gx.jpg');
    }
    if (/BLUE\s*SOLAR|BLUESOLAR/.test(t))
      return pick(
        '/images/productos-tienda/controladores/victron-bluesolar-mppt.jpg',
        '/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg'
      );
    return pick('/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg');
  }

  if (/STUDER/.test(b) && (cat === 'controladores' || /CONTROLADOR|MPPT|VS-/.test(t))) {
    return pick(
      '/images/productos-tienda/controladores/studer-vs.jpg',
      '/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg'
    );
  }

  if (/INTI/.test(b)) {
    return pick(
      '/images/productos-tienda/controladores/inti-mppt.jpg',
      '/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg'
    );
  }

  if (/KOLOS/.test(b) || cat === 'bombeo' || /BOMBA/.test(t)) {
    return pick('/images/productos-tienda/bombeo/kolos-bomba-solar.jpg');
  }

  if (/GOODWE/.test(b) && (/LOGGER|EZLOGGER|SEC1000|MONITOR|DATALOGGER/.test(t) || cat === 'monitoreo' || cat === 'accesorios')) {
    return pick('/images/productos-tienda/monitoreo/goodwe-ezlogger.jpg');
  }

  if (/GROWATT/.test(b) && (/SHINE|WIFI|DATALOGGER|MEDIDOR|MODULO|MONITOR/.test(t) || cat === 'monitoreo')) {
    return pick(
      '/images/productos-tienda/monitoreo/growatt-shine.jpg',
      '/images/productos-tienda/protecciones/growatt-wifi.jpg'
    );
  }

  if (/HOYMILES/.test(b) && (/DTU|MONITOR|LOGGER/.test(t) || cat === 'monitoreo')) {
    return pick('/images/productos-tienda/monitoreo/hoymiles-dtu.jpg');
  }

  if (/DEYE/.test(b) && (/LOGGER|WIFI|MONITOR|DATALOGGER/.test(t) || cat === 'monitoreo')) {
    return pick('/images/productos-tienda/monitoreo/deye-logger.jpg');
  }

  if (/APSYSTEMS|APS\b/.test(b) && (/ECU|MONITOR|COMUNICACION/.test(t) || cat === 'monitoreo')) {
    return pick('/images/productos-tienda/monitoreo/apsystems-ecu.jpg');
  }

  if (/SOLIS/.test(b) && (/DATA|WIFI|MONITOR|LOGGER|STICK/.test(t) || cat === 'monitoreo')) {
    return pick('/images/productos-tienda/monitoreo/solis-datamanager.jpg');
  }

  if (/HUAWEI/.test(b) && (/SMARTLOGGER|DONGLE|MONITOR|LOGGER/.test(t) || cat === 'accesorios' || cat === 'monitoreo')) {
    return pick('/images/productos-tienda/monitoreo/huawei-smartlogger.jpg');
  }

  if (/EASTRON/.test(b) || /SDM/.test(t)) {
    return pick('/images/productos-tienda/monitoreo/eastron-meter.jpg');
  }

  if (/MUST/.test(b) && /MEDIDOR|METER/.test(t)) {
    return pick(
      '/images/productos-tienda/monitoreo/eastron-meter.jpg',
      '/images/productos-tienda/monitoreo/growatt-shine.jpg'
    );
  }

  if (/LDSOLAR|LD\s*SOLAR/.test(b)) {
    return pick('/images/productos-tienda/monitoreo/growatt-shine.jpg');
  }

  // Keep current if somehow still set
  return current || null;
}

function updateMd(file, image) {
  if (!image || !exists(image)) return false;
  let text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return false;
  const end = text.indexOf('\n---', 3);
  if (end < 0) return false;
  let fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  if (/^image:/m.test(fm)) fm = fm.replace(/^image:\s*".*?"/m, `image: "${image}"`);
  else fm = fm.replace(/\n---\s*$/, `\nimage: "${image}"\n---`);
  fm = fm.replace(/imagenPendiente:\s*true\s*\n?/g, '');
  fs.writeFileSync(file, fm + body);
  return true;
}

let n = 0;
const byImage = {};
for (const f of fs.readdirSync(prodDir).filter((x) => x.endsWith('.md'))) {
  const file = path.join(prodDir, f);
  const text = fs.readFileSync(file, 'utf8');
  if (/^draft:\s*true/m.test(text)) continue;
  const brand = (text.match(/^brand:\s*"([^"]*)"/m) || [])[1] || '';
  const title = (text.match(/^title:\s*"([^"]*)"/m) || [])[1] || '';
  const sku = (text.match(/^sku:\s*"([^"]*)"/m) || [])[1] || '';
  const category = (text.match(/^category:\s*"?([a-z]+)/m) || [])[1] || '';
  const current = (text.match(/^image:\s*"([^"]*)"/m) || [])[1] || '';
  if (!isBadImage(current) && exists(current)) continue;
  const image = pickImage(brand, title, sku, category, current);
  if (image && image !== current && updateMd(file, image)) {
    n++;
    byImage[image] = (byImage[image] || 0) + 1;
  }
}
console.log({ actualizados: n, byImage });
