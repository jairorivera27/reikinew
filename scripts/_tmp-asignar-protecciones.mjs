import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prodDir = path.join(root, 'src', 'content', 'productos');
const base = '/images/productos-tienda/protecciones';

function exists(rel) {
  return fs.existsSync(path.join(root, 'public', rel.replace(/^\//, '')));
}

function pick(rel, fallback) {
  if (exists(rel)) return rel;
  if (fallback && exists(fallback)) return fallback;
  return rel;
}

function pickProteccionImage(brand, model, title, sku) {
  const t = `${brand} ${model} ${title} ${sku}`.toUpperCase();
  const b = (brand || '').toUpperCase();

  // Victron BatteryProtect
  if (/BATTERY\s*PROTECT|BATTERYPROTECT|VICTRON/.test(t) && /PROTECT|BP-/.test(t)) {
    return pick(`${base}/victron-batteryprotect.jpg`);
  }
  if (/VICTRON/.test(b) && /PROTECT/.test(t)) return pick(`${base}/victron-batteryprotect.jpg`);

  // Growatt WIFI
  if (/GROWATT/.test(b) || /GROWATT/.test(t)) {
    if (/WIFI|SHINE|DONGLE|STICK/.test(t)) {
      return pick(`${base}/growatt-wifi.jpg`, `${base}/suntree-scb8-ac.jpg`);
    }
  }

  // Citel
  if (/CITEL/.test(b) || /CITEL/.test(t)) return pick(`${base}/citel-spd.jpg`, `${base}/suntree-spd-dc.jpg`);

  // Leader
  if (/LEADER/.test(b)) {
    if (/DPS|SPD|SUPRESOR|SOBRETEN/.test(t)) return pick(`${base}/leader-dps.jpg`, `${base}/suntree-spd-dc.jpg`);
    return pick(`${base}/leader-breaker.jpg`, `${base}/suntree-sl7n-dc.jpg`);
  }

  // ABB / Schneider legacy named files
  if (/ABB|SCHNEIDER/.test(b) || /PROTECCION-BREAKER|PROTECCION-FUSIBLE/.test(t) || /PROTECCION-BREAKER|PROTECCION-FUSIBLE/.test(title?.toUpperCase?.() || '')) {
    if (/FUSIBLE|FUSE/.test(t)) {
      if (/200/.test(t)) return pick(`${base}/abb-fuseholder-100a.png`);
      return pick(`${base}/abb-fuseholder-100a.png`);
    }
    if (/100\s*A|100A/.test(t)) return pick(`${base}/abb-breaker-dc-100a.png`);
    if (/63\s*A|63A/.test(t)) return pick(`${base}/abb-breaker-dc-63a.png`);
    if (/32\s*A|32A/.test(t)) return pick(`${base}/abb-breaker-dc-32a.png`);
    return pick(`${base}/abb-breaker-dc-63a.png`);
  }

  // Fuses / holders
  if (/FUSIBLE|PORTAFUSIBLE|FUSE\b|GPV|10X38/.test(t)) {
    return pick(`${base}/generic-pv-fuse.jpg`, `${base}/abb-fuseholder-100a.png`);
  }

  // DPS / SPD
  if (/\bDPS\b|SPD|SUPRESOR|SOBRETEN|SUP2|SUP1|SHLX/.test(t)) {
    if (/\bAC\b|VAC|SUP1H|275V|385V/.test(t) && !/DC|VDC|PV/.test(t)) {
      return pick(`${base}/suntree-spd-ac.jpg`, `${base}/suntree-spd-dc.jpg`);
    }
    return pick(`${base}/suntree-spd-dc.jpg`);
  }

  // Isolators / switches
  if (/SISO|SECCIONADOR|ISOLATOR|DISCONNECT/.test(t)) {
    return pick(`${base}/suntree-siso-dc.jpg`, `${base}/suntree-sl7n-dc.jpg`);
  }
  if (/SQ8|SWITCH|ROTATIVO|CONMUTADOR|SGL8/.test(t) && !/BREAKER|SL7|SCB/.test(t)) {
    return pick(`${base}/suntree-sq8-switch.jpg`, `${base}/suntree-scb8-ac.jpg`);
  }

  // MCCB / high amp HU / HPV
  if (/\bHU\b|\bHPV\b|MCCB|MOLDEADA|250A|320A|400A|630A|800A/.test(t) && /BREAKER|INTERRUPTOR/.test(t + ' BREAKER')) {
    return pick(`${base}/generic-mccb.jpg`, `${base}/abb-breaker-dc-100a.png`);
  }
  if (/\b(250|320|400|630|800)(A|HU|HPV)\b/.test(t) || /250HU|320HU|400HU|630HU|800HU|250HPV/.test(t)) {
    return pick(`${base}/generic-mccb.jpg`, `${base}/abb-breaker-dc-100a.png`);
  }

  // Suntree DC MCB families
  if (/SL7N|SL7-|55041|55042|SUNTREE/.test(t) || /SUNTREE/.test(b)) {
    if (/SCB8|SCB8LE/.test(t) || (/\bAC\b/.test(t) && /BREAKER|SCB/.test(t))) {
      return pick(`${base}/suntree-scb8-ac.jpg`, `${base}/generic-mcb-ac.jpg`);
    }
    if (/SQ8|SISO|SGL8/.test(t)) {
      if (/SISO/.test(t)) return pick(`${base}/suntree-siso-dc.jpg`, `${base}/suntree-sl7n-dc.jpg`);
      return pick(`${base}/suntree-sq8-switch.jpg`, `${base}/suntree-scb8-ac.jpg`);
    }
    if (/SUP|DPS|SPD|SHLX/.test(t)) return pick(`${base}/suntree-spd-dc.jpg`);
    // default Suntree DC breaker
    if (/\bAC\b/.test(t) && !/\bDC\b|VDC/.test(t)) {
      return pick(`${base}/suntree-scb8-ac.jpg`, `${base}/generic-mcb-ac.jpg`);
    }
    return pick(`${base}/suntree-sl7n-dc.jpg`);
  }

  // Generic AC MCB (unbranded small breakers)
  if (/BREAKER|INTERRUPTOR|MAGNETOTERM/.test(t)) {
    if (/\bDC\b|VDC|HPV/.test(t)) return pick(`${base}/suntree-sl7n-dc.jpg`);
    return pick(`${base}/generic-mcb-ac.jpg`, `${base}/suntree-scb8-ac.jpg`);
  }

  // Schletter clamp etc. — keep generic breaker look better than placeholder
  if (/SCHLETTER|ABRAZADERA|TIERRA|EARTH/.test(t)) {
    return pick(`${base}/generic-mcb-ac.jpg`, `${base}/suntree-scb8-ac.jpg`);
  }

  // Default for remaining "protecciones" (meters/loggers wrongly categorized): use AC MCB visual as least-wrong DIN device
  return pick(`${base}/generic-mcb-ac.jpg`, `${base}/suntree-scb8-ac.jpg`);
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
    console.warn('missing', path.basename(file), image);
    return false;
  }
  if (/^image:/m.test(fm)) fm = fm.replace(/^image:\s*".*?"/m, `image: "${image}"`);
  else fm = fm.replace(/\n---\s*$/, `\nimage: "${image}"\n---`);
  fm = fm.replace(/imagenPendiente:\s*true\s*\n?/g, '');
  fs.writeFileSync(file, fm + body);
  return true;
}

let n = 0;
let skipped = 0;
const byImage = {};
for (const f of fs.readdirSync(prodDir).filter((x) => x.endsWith('.md'))) {
  const file = path.join(prodDir, f);
  const text = fs.readFileSync(file, 'utf8');
  // Also update draft products so images are ready if republished
  const cat = (text.match(/^category:\s*"?([a-z]+)/m) || [])[1];
  if (cat !== 'protecciones') continue;
  const brand = (text.match(/^brand:\s*"([^"]*)"/m) || [])[1] || '';
  const model = (text.match(/^model:\s*"([^"]*)"/m) || [])[1] || '';
  const title = (text.match(/^title:\s*"([^"]*)"/m) || [])[1] || '';
  const sku = (text.match(/^sku:\s*"([^"]*)"/m) || [])[1] || '';
  const image = pickProteccionImage(brand, model, title, sku);
  if (updateMd(file, image)) {
    n++;
    byImage[image] = (byImage[image] || 0) + 1;
  } else skipped++;
}

console.log({ actualizados: n, skipped, byImage });
