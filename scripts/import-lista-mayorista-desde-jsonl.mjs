/**
 * Una sola vez: extrae blob "MARCA DESCRIPCION LISTA DE PRECIOS ..." desde un transcript .jsonl
 * y guarda data/lista-precios-mayorista.txt (UTF-8).
 *
 * Uso:
 *   node scripts/import-lista-mayorista-desde-jsonl.mjs [ruta/agent-transcripts/....jsonl]
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.join(import.meta.dirname, '..');
const DEST = path.join(ROOT, 'data', 'lista-precios-mayorista.txt');

const FALLBACK_JSONL =
  path.join(
    os.homedir(),
    '.cursor',
    'projects',
    'c-Users-reiki-OneDrive-Documentos-reikinew-main-reikinew-main',
    'agent-transcripts',
    '7b7f3146-c551-41de-be8d-8b5934b083f0',
    '7b7f3146-c551-41de-be8d-8b5934b083f0.jsonl',
  );

const INPUT = path.resolve(process.argv[2] || FALLBACK_JSONL);

if (!fs.existsSync(INPUT)) {
  console.error('No se encontró transcript:', INPUT);
  process.exit(1);
}

for (const line of fs.readFileSync(INPUT, 'utf8').split('\n')) {
  if (!line.includes('"role":"user"') || !line.includes('MARCA DESCRIPCION LISTA DE PRECIOS')) continue;

  /** JSONL debe ser objeto JSON por línea */
  try {
    const o = JSON.parse(line);
    const t = String(o.message?.content?.[0]?.text ?? '');
    const i = t.indexOf('MARCA DESCRIPCION LISTA DE PRECIOS');
    const j = t.indexOf('</user_query>');
    if (i < 0 || j < 0 || j <= i) {
      console.error('No se encontró bloque esperado dentro del mensaje de usuario.');
      process.exit(1);
    }
    const blob = t.slice(i, j).trim();

    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    fs.writeFileSync(DEST, `${blob}\n`, 'utf8');
    console.log('Escrito:', DEST, '|', blob.length, 'chars');
    process.exit(0);
  } catch (e) {
    console.warn('Saltando línea (JSON inválido):', line.slice(0, 120));
  }
}

console.error('No se encontró mensaje usuario con MARCA DESCRIPCION LISTA DE PRECIOS');
process.exit(1);
