/**
 * Actualiza docs/metricas-imagenes.md tras reclasificación G1/G2/G3.
 */
import fs from 'node:fs';
import path from 'node:path';

const PROD = 'src/content/productos';
let def = 0,
  prov = 0,
  sin = 0,
  draft = 0,
  serieRef = 0,
  pendiente = 0;

for (const f of fs.readdirSync(PROD).filter((x) => x.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(PROD, f), 'utf8');
  const isDraft = /^draft:\s*true/m.test(raw);
  if (isDraft) {
    draft++;
    if (/imagenPendiente:\s*true/.test(raw)) pendiente++;
    continue;
  }
  if (/imagenSerieRef:/.test(raw)) serieRef++;
  if (/imagen_provisional:\s*true/.test(raw)) prov++;
  else if (/placeholders\//.test(raw.match(/^image:\s*"?([^\n"]+)/m)?.[1] || '')) sin++;
  else def++;
}

const active = def + prov + sin;
const pct = (n) => (active ? ((n / active) * 100).toFixed(1) : '0.0');

const g1 = fs.existsSync('docs/grupo1-correcciones.md')
  ? fs.readFileSync('docs/grupo1-correcciones.md', 'utf8')
  : '';
const g1c = (g1.match(/Corregidos[^\n]*\*\*(\d+)\*\*/) || [])[1] || '?';
const g1h = (g1.match(/Ocultos[^\n]*\*\*(\d+)\*\*/) || [])[1] || '?';
const g1k = (g1.match(/Mantenidos[^\n]*\*\*(\d+)\*\*/) || [])[1] || '?';

const g2 = fs.existsSync('docs/grupo2-serie.md')
  ? fs.readFileSync('docs/grupo2-serie.md', 'utf8')
  : '';
const g2c = (g2.match(/Con caption:\s*\*\*(\d+)\*\*/) || [])[1] || String(serieRef);
const g2h = (g2.match(/Ocultos[^:]*:\s*\*\*(\d+)\*\*/) || [])[1] || '?';

const md = `# Métricas de imágenes de producto

Actualizado: ${new Date().toISOString()}

## Estado actual (tras reclasificación REVISAR G1/G2/G3)

| Estado | SKUs | % |
|---|---:|---:|
| Foto **definitiva** (estudio, no provisional) | ${def} | ${pct(def)}% |
| **Provisional** (\`imagen_provisional: true\`) | ${prov} | ${pct(prov)}% |
| **Sin imagen** usable (placeholder/logo) | ${sin} | ${pct(sin)}% |
| **Total activos** | ${active} | 100% |

| Extra | SKUs |
|---|---:|
| Ocultos (\`draft: true\`) | ${draft} |
| Ocultos con \`imagenPendiente\` (G1/G2) | ${pendiente} |
| Con caption de serie (\`imagenSerieRef\`) | ${serieRef} |

## Reclasificación REVISAR

### Grupo 1 — error de categoría
- Corregidos: **${g1c}**
- Ocultos: **${g1h}**
- Mantenidos (tipo coherente): **${g1k}**
- Detalle: \`docs/grupo1-correcciones.md\`

### Grupo 2 — misma serie, distinto tamaño
- Caption «Imagen de referencia de la serie …»: **${g2c}**
- Ocultos (no misma serie): **${g2h}**
- Detalle: \`docs/grupo2-serie.md\`
- Prioridad proveedores: Victron/Growatt/Pylontech → Autosolar; Huawei/Hoymiles/APsystems/Pytes → Solaire

### Grupo 3 — aspecto idéntico
- \`suntree-spd-ac\`, \`pylontech-us\`, \`pylontech-3kwh\`, kolos3/kolos4 sumergibles, \`felicity-12v\`
- **Quitados de prioridad ALTA** en \`docs/imagenes-no-sirven.md\`

## Fase C / descarga proveedores
- Autorización Solaire + Autosolar: **confirmada**
- Descarga-only (sin procesar/publicar): \`imagenes-proveedores/\` + \`manifest.csv\`
- Lote 1 (procesar ×20) **pendiente** de OK tras inventario descargado

## Notas
- No se toca \`public/\` ni se procesa en el barrido de descarga.
- Flag \`imagen_provisional\` es interno (sin badge público).
`;

fs.writeFileSync('docs/metricas-imagenes.md', md);
console.log(md);
