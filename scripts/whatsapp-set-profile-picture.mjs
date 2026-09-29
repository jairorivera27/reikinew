/**
 * Actualiza la foto de perfil de WhatsApp Cloud API.
 *
 * Flujo Meta:
 *  1) POST /{APP_ID}/uploads → session
 *  2) POST /{session} (binary) → profile_picture_handle
 *  3) POST /{PHONE_NUMBER_ID}/whatsapp_business_profile { profile_picture_handle }
 *
 * Uso:
 *   node scripts/whatsapp-set-profile-picture.mjs
 *   node scripts/whatsapp-set-profile-picture.mjs path/to/foto.jpg
 *
 * Env (.env): WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Opcional: WHATSAPP_APP_ID (default app Reiki)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_IMG = path.join(ROOT, 'public', 'images', 'logo.png');
const APP_ID = String(process.env.WHATSAPP_APP_ID || '1614756736721128').trim();
const GRAPH = 'https://graph.facebook.com/v21.0';

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    const v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!token || !phoneId) throw new Error('Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID');

  const imgPath = path.resolve(process.argv[2] || DEFAULT_IMG);
  if (!fs.existsSync(imgPath)) throw new Error(`No existe imagen: ${imgPath}`);

  const buf = fs.readFileSync(imgPath);
  const ext = path.extname(imgPath).toLowerCase();
  const fileType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  console.log('Imagen:', imgPath, `(${buf.length} bytes, ${fileType})`);
  console.log('Phone ID:', phoneId);

  const sessionRes = await fetch(
    `${GRAPH}/${APP_ID}/uploads?file_length=${buf.length}&file_type=${encodeURIComponent(fileType)}&access_token=${encodeURIComponent(token)}`,
    { method: 'POST' }
  );
  const session = await sessionRes.json();
  if (!sessionRes.ok || !session.id) {
    throw new Error(`Upload session: ${JSON.stringify(session)}`);
  }
  console.log('Session OK');

  const upRes = await fetch(`${GRAPH}/${session.id}`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      file_offset: '0',
      'Content-Type': 'application/octet-stream',
    },
    body: buf,
  });
  const up = await upRes.json();
  if (!upRes.ok || !up.h) throw new Error(`Upload binary: ${JSON.stringify(up)}`);
  console.log('Handle OK');

  const profRes = await fetch(`${GRAPH}/${phoneId}/whatsapp_business_profile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      profile_picture_handle: up.h,
    }),
  });
  const prof = await profRes.json();
  if (!profRes.ok || !prof.success) throw new Error(`Update profile: ${JSON.stringify(prof)}`);
  console.log('Perfil actualizado:', prof);

  const getRes = await fetch(
    `${GRAPH}/${phoneId}/whatsapp_business_profile?fields=profile_picture_url,about,description,vertical`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const current = await getRes.json();
  console.log(JSON.stringify(current, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
