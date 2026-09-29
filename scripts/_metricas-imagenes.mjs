/**
 * Recalcula métricas del catálogo activo.
 * Uso: node scripts/_metricas-imagenes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD = 'src/content/productos';
function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[mm[1]] = v;
  }
  return out;
}

let definitiva = 0,
  provisional = 0,
  sin = 0;
const samples = { definitiva: [], provisional: [], sin: [] };
for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
  const fm = parseFm(fs.readFileSync(path.join(PROD, f), 'utf8'));
  if (String(fm.draft) === 'true') continue;
  const img = fm.image || '';
  const prov = String(fm.imagen_provisional) === 'true';
  const pending = String(fm.imagenPendiente) === 'true';
  const slug = f.replace(/\.md$/, '');
  if (!img || /placeholders\//i.test(img) || pending) {
    sin++;
    if (samples.sin.length < 5) samples.sin.push(slug);
  } else if (prov) {
    provisional++;
    if (samples.provisional.length < 3) samples.provisional.push(slug);
  } else if (/productos-estudio\//i.test(img)) {
    definitiva++;
    if (samples.definitiva.length < 3) samples.definitiva.push(slug);
  } else {
    provisional++;
  }
}
const total = definitiva + provisional + sin;
const pct = (n) => ((n / total) * 100).toFixed(1);

const md = `# Métricas de imágenes de producto

Actualizado: ${new Date().toISOString()}

## Estado actual (tras Fases A + B + C seeds)

| Estado | SKUs | % |
|---|---:|---:|
| Foto **definitiva** (estudio, no provisional) | ${definitiva} | ${pct(definitiva)}% |
| **Provisional** (\`imagen_provisional: true\`) | ${provisional} | ${pct(provisional)}% |
| **Sin imagen** usable (placeholder/logo) | ${sin} | ${pct(sin)}% |
| **Total activos** | ${total} | 100% |

## Por fase

### Fase A — Uniformidad provisional
- Miniaturas 600×600 estilo estudio para fuentes descartadas **solo por resolución**.
- Excluidos: pedestal Inti, gráfico Hoymiles HMS marketing, placeholders.
- Contact sheet: \`docs/contact-sheet-provisionales.html\`
- Tras A: ~29.7% definitiva / ~69.9% provisional / ~0.3% sin (ver run log).

### Fase B — Compartidas
- \`docs/imagenes-compartidas.md\`
- Fuentes compartidas y marcas **REVISAR** cuando potencia/modelo/celdas difieren.

### Fase C — Proveedores (seeds, sin publicar)
Reemplazos con match **exacto** marca+modelo (pendiente autorización de uso):

| SKU | Modelo | Proveedor | Archivo |
|---|---|---|---|
| cat-mayorista-d99eecbc0d48 | HMT-2000-4T-208 | Solaire NFMI0004 | hoymiles-hmt-2000-4t-208.webp |
| cat-mayorista-595127324da8 | HMS-800-2T | Solaire NFMI0009 | hoymiles-hms-800-2t.webp |
| cat-mayorista-dbd01c55a288 | HMS-2000-4T | Solaire | hoymiles-hms-2000-4t.webp |
| controlador-…-scc110050210 | SmartSolar MPPT 100/50 | Autosolar | victron-smartsolar-mppt-100-50.webp |

- Manifest: \`docs/fuentes-imagenes.csv\`
- PDFs: \`docs/fichas/\`
- Contact sheet: \`docs/contact-sheet-proveedores.html\`
- Sin coincidencia (barrido automático): reanudar con \`node scripts/fase-c-proveedores.mjs --limit 15 --max-attempts 40\` tras confirmar permisos.

### Ajuste menor
- Victron BlueSolar recomprimido a **149.7 KB** (\`victron-bluesolar-mono-scc900300000.webp\`).

## Notas
- **No publicar en producción** hasta confirmar autorización de uso de fotos Solaire/Autosolar.
- El barrido masivo a proveedores quedó acotado a seeds exactos para evitar falsos positivos (ej. 100A ≠ 100/50).
`;

fs.writeFileSync('docs/metricas-imagenes.md', md);
console.log(JSON.stringify({ total, definitiva, provisional, sin, pctDef: pct(definitiva), pctProv: pct(provisional), pctSin: pct(sin), samples }, null, 2));
