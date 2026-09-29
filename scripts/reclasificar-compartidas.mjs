/**
 * Reclasificación REVISAR → Grupos 1 / 2 / 3.
 * node scripts/reclasificar-compartidas.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD = 'src/content/productos';
const OUT_G1 = 'docs/grupo1-correcciones.md';
const OUT_G2 = 'docs/grupo2-serie.md';

const G1_ORIG = {
  victron: '/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg',
  mcb: '/images/productos-tienda/protecciones/generic-mcb-ac.jpg',
  goodwe: '/images/productos-tienda/inversores/goodwe-sdt.jpg',
  hoymiles: '/images/productos-tienda/inversores/hoymiles-hms.jpg',
  reflector: '/images/Productos tienda/Luminarias/reflector led solar 200W.jpeg',
};

const G2 = [
  { orig: '/images/productos-tienda/inversores/victron-multiplus.png', serie: 'Victron MultiPlus', ok: (p) => /multiplus/i.test(blob(p)) },
  { orig: '/images/productos-tienda/inversores/victron-phoenix.png', serie: 'Victron Phoenix', ok: (p) => /phoenix/i.test(blob(p)) },
  { orig: '/images/productos-tienda/inversores/victron-quattro.png', serie: 'Victron Quattro', ok: (p) => /quattro/i.test(blob(p)) },
  { orig: '/images/productos-tienda/inversores/huawei-sun2000.png', serie: 'Huawei SUN2000', ok: (p) => /sun2000/i.test(blob(p)) },
  // Growatt MOD fuente: inversores Growatt (no microinversores)
  { orig: '/images/productos-tienda/inversores/growatt-mod.jpg', serie: 'Growatt MOD', ok: (p) => /growatt/i.test(p.brand || '') && p.category === 'inversores' && !/microinversor/i.test(blob(p)) },
  { orig: '/images/productos-tienda/inversores/apsystems-ds3.png', serie: 'APsystems DS3', ok: (p) => /ds3/i.test(blob(p)) },
  { orig: '/images/productos-tienda/baterias/felicity-fla24.jpg', serie: 'Felicity FLA24', ok: (p) => /felicity/i.test(p.brand || '') && /24/i.test(blob(p) + ' ' + (p.power || '')) },
  { orig: '/images/productos-tienda/baterias/felicity-fla48.jpg', serie: 'Felicity FLA48', ok: (p) => /felicity/i.test(p.brand || '') && /48/i.test(blob(p) + ' ' + (p.power || '')) },
  { orig: '/images/productos-tienda/inversores/felicity-hybrid.png', serie: 'Felicity Hybrid', ok: (p) => /felicity/i.test(p.brand || '') && p.category === 'inversores' },
  { orig: '/images/productos-tienda/inversores/deye-hybrid.png', serie: 'Deye Hybrid', ok: (p) => /deye/i.test(p.brand || '') },
  { orig: '/images/productos-tienda/inversores/goodwe-es.jpg', serie: 'GoodWe ES', ok: (p) => /\bES\b|-ES|ES\b/i.test(blob(p)) },
  { orig: '/images/productos-tienda/baterias/huawei-luna.png', serie: 'Huawei LUNA', ok: (p) => /luna/i.test(blob(p)) },
  { orig: '/images/productos-tienda/baterias/pylontech-uf5000.png', serie: 'Pylontech UF', ok: (p) => /pylontech/i.test(p.brand || '') },
  { orig: '/images/productos-tienda/baterias/pytes-battery.png', serie: 'Pytes', ok: (p) => /pytes/i.test(p.brand || '') },
  { orig: '/images/productos-tienda/baterias/goodwe-lynxl.png', serie: 'GoodWe Lynx', ok: (p) => /goodwe/i.test(p.brand || '') && p.category === 'baterias' },
  { orig: '/images/productos-tienda/baterias/growatt-ark.png', serie: 'Growatt ARK', ok: (p) => /growatt/i.test(p.brand || '') && p.category === 'baterias' },
  { orig: '/images/productos-tienda/monitoreo/goodwe-ezlogger.jpg', serie: 'GoodWe EzLogger', ok: (p) => /ezlogger|sec1000|smartlogger/i.test(blob(p)) || /goodwe/i.test(p.brand || '') },
  { orig: '/images/productos-tienda/inversores/must-pv.png', serie: 'Must PV', ok: (p) => /must/i.test(p.brand || '') },
  { orig: '/images/productos-tienda/bombeo/kolos-pool.jpg', serie: 'Kolos Pool', ok: (p) => /pool|kolos/i.test(blob(p)) },
];

const G3_ORIG = [
  '/images/productos-tienda/protecciones/suntree-spd-ac.jpg',
  '/images/productos-tienda/baterias/pylontech-us.png',
  '/images/productos-tienda/baterias/pylontech-3kwh-medellin.png',
  '/images/productos-tienda/bombeo/kolos3-sumergible.jpg',
  '/images/productos-tienda/bombeo/kolos4-sumergible.jpg',
  '/images/productos-tienda/baterias/felicity-12v.jpg',
];

function blob(p) {
  return `${p.title || ''} ${p.model || ''} ${p.sku || ''} ${p.power || ''}`;
}

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { fm: {}, body: raw, rawFm: '' };
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return { fm: out, body: raw.slice(m[0].length), rawFm: m[1] };
}

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

function writeMd(mdPath, rawFm, body) {
  fs.writeFileSync(mdPath, `---\n${rawFm}\n---${body}`, 'utf8');
}

function load(slug) {
  const mdPath = path.join(PROD, `${slug}.md`);
  const raw = fs.readFileSync(mdPath, 'utf8');
  return { slug, mdPath, ...parseFm(raw) };
}

function byOriginal(origExact) {
  const out = [];
  for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
    const p = load(f.replace(/\.md$/, ''));
    if ((p.fm.imageOriginal || '') === origExact) out.push(p);
  }
  return out;
}

function hide(p, placeholder, reason, bag) {
  let fm = set(p.rawFm, 'draft', true);
  fm = set(fm, 'imagenPendiente', true);
  fm = set(fm, 'imagen_provisional', null);
  fm = set(fm, 'imagenSerieRef', null);
  fm = set(fm, 'image', placeholder);
  fm = set(fm, 'imageThumb', null);
  fm = set(fm, 'imageOriginal', null);
  writeMd(p.mdPath, fm, p.body);
  bag.hidden.push({ slug: p.slug, title: p.fm.title, reason });
}

function keep(p, reason, bag) {
  bag.kept.push({ slug: p.slug, title: p.fm.title, reason });
}

function parseKw(p) {
  const s = `${p.fm.power || ''} ${p.fm.title || ''} ${p.fm.model || ''}`;
  const m = s.match(/(\d+[.,]?\d*)\s*kW/i);
  if (m) return parseFloat(m[1].replace(',', '.'));
  const w = s.match(/(\d+[.,]?\d*)\s*W\b/i);
  if (w) return parseFloat(w[1].replace(',', '.')) / 1000;
  return null;
}

const g1 = { corrected: [], hidden: [], kept: [] };

// ——— #1 Victron SmartSolar MPPT ———
{
  const list = byOriginal(G1_ORIG.victron);
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    const t = blob(p.fm).toLowerCase();
    const isScreenOrMod =
      p.fm.category === 'accesorios' ||
      /pantalla|modulo|módulo|dongle|gx touch|color control|cerbo/i.test(t);
    const isPwm = /pwm/i.test(t);
    const isMppt =
      p.fm.category === 'controladores' && /mppt/i.test(t) && !isPwm;

    if (isScreenOrMod) {
      hide(p, '/images/placeholders/accesorios.svg', 'foto SmartSolar MPPT en pantalla/módulo', g1);
      continue;
    }
    if (isPwm) {
      hide(p, '/images/placeholders/controladores.svg', 'foto SmartSolar MPPT en controlador PWM (otro tipo)', g1);
      continue;
    }
    if (isMppt) {
      const candidates = fs
        .readdirSync('public/images/productos-estudio')
        .filter(
          (f) =>
            /victron.*100.?50|scc110050210/i.test(f) &&
            f.endsWith('.webp') &&
            !f.includes('thumb')
        );
      if (
        (/scc110050210/i.test(p.slug) || /SCC110050210/i.test(p.fm.model || '')) &&
        candidates.length
      ) {
        let fm = set(p.rawFm, 'image', `/images/productos-estudio/${candidates[0]}`);
        const thumb = candidates[0].replace(/\.webp$/, '-thumb.webp');
        if (fs.existsSync(path.join('public/images/productos-estudio', thumb))) {
          fm = set(fm, 'imageThumb', `/images/productos-estudio/${thumb}`);
        }
        fm = set(fm, 'imagen_provisional', false);
        writeMd(p.mdPath, fm, p.body);
        g1.corrected.push({ slug: p.slug, title: p.fm.title, reason: 'foto propia seed 100/50' });
        continue;
      }
      keep(p, 'controlador MPPT Victron — tipo coherente con la foto', g1);
      continue;
    }
    hide(p, '/images/placeholders/controladores.svg', 'foto SmartSolar MPPT no corresponde al producto', g1);
  }
}

// ——— #2 generic MCB AC ———
{
  const list = byOriginal(G1_ORIG.mcb);
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    const t = blob(p.fm).toLowerCase();
    const isBreaker =
      p.fm.category === 'protecciones' &&
      /breaker|interruptor termomagn|mcb|mccb|disyuntor/i.test(t) &&
      !/abrazadera|fusible|spd|dps|supresor|cable|conector|meter|medidor|dongle|logger|sensor|clamp|cts|trunk|end cap|unlock|bracket|shunt|remote|wifi|gprs|optimiz/i.test(
        t
      );
    if (isBreaker) {
      keep(p, 'breaker/MCB — tipo coherente', g1);
      continue;
    }
    hide(p, '/images/placeholders/protecciones.svg', 'foto MCB genérico en producto que no es breaker', g1);
  }
}

// ——— #3 GoodWe SDT ———
{
  const list = byOriginal(G1_ORIG.goodwe);
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    const model = `${p.fm.model || ''} ${p.fm.title || ''} ${p.fm.sku || ''}`;
    const kw = parseKw(p);
    const isSdt = /SDT/i.test(model);
    const isDt = /\bDT\b|-DT-/i.test(model);
    const isWrongSeries =
      /\b(SMT|HT|HTH|UT|MT|GT|EO|MIS|MS|AFCI)\b/i.test(model) ||
      /smt|hth|-ht\b|-ut\b|-mt\b|-gt\b|-eo\b|-mis|-ms-/i.test(model) ||
      /CT90|microinversor/i.test(model);
    const highKw = kw != null && kw >= 50;

    if (p.fm.category !== 'inversores' || !/goodwe/i.test(p.fm.brand || '')) {
      hide(p, '/images/placeholders/inversores.svg', 'no es inversor GoodWe', g1);
      continue;
    }
    if (isWrongSeries || highKw) {
      hide(
        p,
        '/images/placeholders/inversores.svg',
        `serie distinta de SDT/DT o ≥50 kW (kw=${kw ?? '?'})`,
        g1
      );
      continue;
    }
    if (isSdt || isDt) {
      keep(p, `serie SDT/DT rango similar (kw=${kw ?? '?'})`, g1);
      continue;
    }
    hide(p, '/images/placeholders/inversores.svg', 'GoodWe sin serie SDT/DT clara', g1);
  }
}

// ——— #17 Hoymiles HMS genérico ———
{
  const list = byOriginal(G1_ORIG.hoymiles);
  const seedMap = [
    { re: /HMS-800-2T|hms-800-2t/i, img: 'hoymiles-hms-800-2t.webp', orig: 'proveedores/solaire/NFMI0009.png' },
    { re: /HMS-2000-4T|hms-2000-4t/i, img: 'hoymiles-hms-2000-4t.webp', orig: 'proveedores/solaire/NFMI0008.png' },
    { re: /HMT-2000-4T-208|hmt-2000/i, img: 'hoymiles-hmt-2000-4t-208.webp', orig: null },
  ];
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    const model = blob(p.fm);
    let done = false;
    for (const s of seedMap) {
      if (!s.re.test(model)) continue;
      const imgPath = path.join('public/images/productos-estudio', s.img);
      if (!fs.existsSync(imgPath)) continue;
      let fm = set(p.rawFm, 'image', `/images/productos-estudio/${s.img}`);
      const thumb = s.img.replace(/\.webp$/, '-thumb.webp');
      if (fs.existsSync(path.join('public/images/productos-estudio', thumb))) {
        fm = set(fm, 'imageThumb', `/images/productos-estudio/${thumb}`);
      }
      fm = set(fm, 'imagen_provisional', false);
      if (s.orig) fm = set(fm, 'imageOriginal', s.orig);
      writeMd(p.mdPath, fm, p.body);
      g1.corrected.push({ slug: p.slug, title: p.fm.title, reason: `foto seed ${s.img}` });
      done = true;
      break;
    }
    if (done) continue;
    hide(
      p,
      '/images/placeholders/inversores.svg',
      'gráfico marketing Hoymiles HMS genérico ≠ modelo de ficha',
      g1
    );
  }
}

// ——— #24 Reflector 200W ———
{
  const list = byOriginal(G1_ORIG.reflector);
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    const ok =
      p.fm.category === 'reflectores' && /200\s*W/i.test(blob(p.fm) + ' ' + (p.fm.power || ''));
    if (ok) keep(p, 'reflector LED 200W — tipo coherente', g1);
    else hide(p, '/images/placeholders/reflectores.svg', 'foto reflector 200W en producto distinto', g1);
  }
}

fs.writeFileSync(
  OUT_G1,
  [
    '# Grupo 1 — correcciones de categoría',
    '',
    `Actualizado: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `- Corregidos (foto propia reasignada): **${g1.corrected.length}**`,
    `- Ocultos (\`draft: true\`): **${g1.hidden.length}**`,
    `- Mantenidos (foto coherente con el tipo): **${g1.kept.length}**`,
    '',
    '## Ocultos',
    '',
    '| Slug | Motivo |',
    '|---|---|',
    ...g1.hidden.map((r) => `| ${r.slug} | ${r.reason} |`),
    '',
    '## Corregidos',
    '',
    '| Slug | Motivo |',
    '|---|---|',
    ...(g1.corrected.length
      ? g1.corrected.map((r) => `| ${r.slug} | ${r.reason} |`)
      : ['| — | — |']),
    '',
    '## Mantenidos',
    '',
    '| Slug | Motivo |',
    '|---|---|',
    ...g1.kept.map((r) => `| ${r.slug} | ${r.reason} |`),
    '',
  ].join('\n')
);

console.log(
  JSON.stringify(
    { corrected: g1.corrected.length, hidden: g1.hidden.length, kept: g1.kept.length },
    null,
    2
  )
);

// ——— Grupo 2 ———
const g2clean = [];
for (const g of G2) {
  const list = byOriginal(g.orig);
  for (const p of list) {
    if (String(p.fm.draft) === 'true') continue;
    if (!g.ok(p.fm)) {
      let fm = set(p.rawFm, 'draft', true);
      fm = set(fm, 'imagenPendiente', true);
      fm = set(fm, 'image', '/images/placeholders/inversores.svg');
      fm = set(fm, 'imageOriginal', null);
      fm = set(fm, 'imageThumb', null);
      fm = set(fm, 'imagen_provisional', null);
      fm = set(fm, 'imagenSerieRef', null);
      writeMd(p.mdPath, fm, p.body);
      g2clean.push({ slug: p.slug, serie: g.serie, action: 'oculto_no_misma_serie' });
      continue;
    }
    let fm = set(p.rawFm, 'imagenSerieRef', g.serie);
    writeMd(p.mdPath, fm, p.body);
    g2clean.push({ slug: p.slug, serie: g.serie, action: 'caption_serie' });
  }
}

fs.writeFileSync(
  OUT_G2,
  [
    '# Grupo 2 — misma serie, caption de referencia',
    '',
    `Caption: «Imagen de referencia de la serie [SERIE]»`,
    '',
    `- Con caption: **${g2clean.filter((r) => r.action === 'caption_serie').length}**`,
    `- Ocultos (no misma serie): **${g2clean.filter((r) => r.action === 'oculto_no_misma_serie').length}**`,
    '',
    '| Slug | Serie | Acción |',
    '|---|---|---|',
    ...g2clean.map((r) => `| ${r.slug} | ${r.serie} | ${r.action} |`),
    '',
  ].join('\n')
);
console.log(
  'G2 caption',
  g2clean.filter((r) => r.action === 'caption_serie').length,
  'hidden',
  g2clean.filter((r) => r.action === 'oculto_no_misma_serie').length
);

// ——— Grupo 3: quitar de ALTA ———
let nosirve = fs.readFileSync('docs/imagenes-no-sirven.md', 'utf8');
const lines = nosirve.split(/\r?\n/);
const filtered = lines.filter((l) => {
  if (!/^\|\s*ALTA\s*\|/i.test(l)) return true;
  return !G3_ORIG.some((o) => {
    const base = path.basename(o).replace(/\.[^.]+$/, '');
    return l.toLowerCase().includes(base.toLowerCase());
  });
});
let text = filtered.join('\n');
if (!text.includes('## Grupo 3 — aspecto idéntico')) {
  text += [
    '',
    '## Grupo 3 — aspecto idéntico (baja prioridad)',
    '',
    'Foto compartida OK (aspecto idéntico): `suntree-spd-ac`, `pylontech-us`, `pylontech-3kwh`, `kolos3`/`kolos4` sumergibles, `felicity-12v`. **Quitados de prioridad ALTA.**',
    '',
  ].join('\n');
}
fs.writeFileSync('docs/imagenes-no-sirven.md', text);
console.log('G3: bajados de ALTA');
console.log('OK');
