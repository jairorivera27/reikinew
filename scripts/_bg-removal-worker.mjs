/**
 * Worker aislado: @imgly/background-removal-node (puede segfault en Windows).
 * Uso: node scripts/_bg-removal-worker.mjs <inputAbs> <outputAbs>
 */
import fs from 'node:fs';
import { removeBackground } from '@imgly/background-removal-node';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: node _bg-removal-worker.mjs <in> <out>');
  process.exit(2);
}

const buf = fs.readFileSync(input);
const mime = input.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
const blob = new Blob([buf], { type: mime });
const out = await removeBackground(blob, {
  model: 'medium',
  output: { format: 'image/png', quality: 0.9 },
});
fs.writeFileSync(output, Buffer.from(await out.arrayBuffer()));
console.log('ok', output);
