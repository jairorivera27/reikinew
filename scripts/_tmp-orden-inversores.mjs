import fs from 'node:fs';

const { items, total } = JSON.parse(fs.readFileSync('dist/tienda/indice/inversores.json', 'utf8'));
console.log(`Total inversores: ${total}\n`);

const grupos = { 0: 'On-Grid/Micro', 1: 'Off-Grid', 2: 'Híbrido', 9: 'Sin tipo' };
let tipoActual = -1;
let contados = { 0: 0, 1: 0, 2: 0, 9: 0 };

console.log('=== ORDEN COMPLETO (primeros 20 + saltos de tipo) ===');
for (let i = 0; i < items.length; i++) {
  const p = items[i];
  const t = p.ordenTipo ?? 9;
  contados[t] = (contados[t] || 0) + 1;
  if (t !== tipoActual) {
    tipoActual = t;
    console.log(`\n## ${grupos[t] ?? t}`);
  }
  if (i < 25 || t !== items[i - 1]?.ordenTipo) {
    const w = p.potenciaW != null ? `${(p.potenciaW / 1000).toFixed(p.potenciaW >= 1000 ? 1 : 0)} kW`.replace('.0', '') : '—';
    console.log(`  ${String(i + 1).padStart(3)}. [${grupos[t]}] ${String(w).padStart(10)}  ${p.tipoPotencia}`);
  }
}

console.log('\n=== CONTEO POR TIPO ===');
for (const [k, v] of Object.entries(contados)) console.log(`  ${grupos[k]}: ${v}`);

// Verificar monotonía de potencia dentro de cada tipo
let ok = true;
for (let i = 1; i < items.length; i++) {
  const a = items[i - 1];
  const b = items[i];
  if ((a.ordenTipo ?? 9) < (b.ordenTipo ?? 9)) continue;
  if ((a.ordenTipo ?? 9) > (b.ordenTipo ?? 9)) {
    console.log('ERROR: tipo fuera de orden', a.tipoPotencia, '→', b.tipoPotencia);
    ok = false;
  }
  if ((a.ordenTipo ?? 9) === (b.ordenTipo ?? 9)) {
    const pa = a.potenciaW ?? Infinity;
    const pb = b.potenciaW ?? Infinity;
    if (pa > pb) {
      console.log('ERROR: potencia no ascendente', a.tipoPotencia, pa, '→', b.tipoPotencia, pb);
      ok = false;
    }
  }
}
console.log(ok ? '\nOrden OK' : '\nHay errores de orden');
console.log('Solis restantes:', items.filter((p) => /solis/i.test(p.brand + p.title)).length);
