import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'images', 'productos-tienda', 'paneles-solares');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function download(url, dest, referer) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*,*/*', Referer: referer },
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error('small ' + buf.length);
  if (/<!DOCTYPE|<html/i.test(buf.slice(0, 120).toString('utf8'))) throw new Error('html');
  fs.writeFileSync(dest, buf);
  console.log('OK', path.basename(dest), buf.length, url);
  return buf.length;
}

const jaUrl =
  'https://aegmarket.com/11101-large_default/ja-solar-625w-solar-panel-n-type-bifacial-double-glass-module-mb-revamping-2278x1134x30.jpg';
const jaPath = path.join(dir, 'ja-solar-625w-bifacial.jpg');
await download(jaUrl, jaPath, 'https://aegmarket.com/');
fs.copyFileSync(jaPath, path.join(dir, 'ja-solar-715w-bifacial.jpg'));
fs.copyFileSync(jaPath, path.join(dir, 'ja-solar-720w-bifacial.jpg'));
// also overwrite png placeholders with jpg refs later

const mustUrl = 'https://www.zonsolar.es/258-large_default/panel-solar-must-200w-12v-monocristalino.jpg';
await download(mustUrl, path.join(dir, 'must-panel-mono.jpg'), 'https://www.zonsolar.es/');

const shopify =
  'https://cdn.shopify.com/s/files/1/0494/2577/6801/files/ja_solar_module.jpg';
try {
  await download(shopify, path.join(dir, 'ja-solar-module-rocksolar.jpg'), 'https://rocksolar.io/');
} catch (e) {
  console.warn('shopify fail', e.message);
}
