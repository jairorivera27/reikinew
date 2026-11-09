/**
 * Usuarios del panel (/admin/pedidos): cada uno entra con su usuario y contraseña y queda firmado en el historial
 * de los expedientes. Las contraseñas se guardan en Redis con scrypt (nunca en el repositorio, que es público).
 * La sesión es un token firmado (HMAC) que el panel manda como Bearer, igual que la clave de administrador antigua.
 */
import crypto from 'node:crypto';
import { getRedis, waKey } from './whatsapp-redis.js';

const KEY = waKey('panel', 'usuarios');
const DIAS_SESION = 7;
let mem = globalThis.__reikiUsuarios || null;

function llaveFirma() {
  const k = String(process.env.ADMIN_ORDERS_SECRET || process.env.CLAUDE_AGENT_TOKEN || '').trim();
  return k ? crypto.createHash('sha256').update(`reiki-sesion-panel-v1:${k}`).digest() : null;
}

const norm = (u) =>
  String(u || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]/g, '');

export async function leerUsuarios() {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(KEY);
      if (raw) mem = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn('[usuarios]', err?.message || err);
    }
  }
  return mem || {};
}

/** usuarios: { comercial: { nombre: 'Comercial', clave: '…' }, logistica: null (borra) } */
export async function guardarUsuarios(input = {}) {
  const out = { ...(await leerUsuarios()) };
  for (const [u0, d] of Object.entries(input || {})) {
    const u = norm(u0);
    if (!u) continue;
    if (!d) {
      delete out[u];
      continue;
    }
    const prev = out[u] || {};
    const reg = { nombre: String(d.nombre || prev.nombre || u0).slice(0, 40), creado: prev.creado || new Date().toISOString() };
    if (d.clave) {
      const salt = crypto.randomBytes(16).toString('hex');
      reg.salt = salt;
      reg.hash = crypto.scryptSync(String(d.clave), salt, 64).toString('hex');
      reg.claveCambiada = new Date().toISOString();
    } else {
      reg.salt = prev.salt;
      reg.hash = prev.hash;
    }
    if (!reg.hash) continue;
    out[u] = reg;
  }
  mem = out;
  globalThis.__reikiUsuarios = out;
  const redis = getRedis();
  if (redis) await redis.set(KEY, out);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { nombre: v.nombre, creado: v.creado }]));
}

/** Máximo 10 intentos fallidos por IP cada 15 minutos. */
async function intentos(ip, sumar) {
  const redis = getRedis();
  if (!redis) return 0;
  const k = waKey('panel-login', String(ip || 'x').slice(0, 60));
  try {
    if (sumar) {
      const n = await redis.incr(k);
      if (n === 1) await redis.expire(k, 900);
      return n;
    }
    return Number(await redis.get(k)) || 0;
  } catch {
    return 0;
  }
}

export async function iniciarSesion(usuario, clave, ip) {
  if ((await intentos(ip, false)) >= 10) return { ok: false, status: 429, error: 'Demasiados intentos. Espera 15 minutos.' };
  const u = norm(usuario);
  const reg = (await leerUsuarios())[u];
  const firma = llaveFirma();
  let ok = false;
  if (reg && reg.hash && firma) {
    const h = crypto.scryptSync(String(clave || ''), reg.salt, 64);
    ok = crypto.timingSafeEqual(h, Buffer.from(reg.hash, 'hex'));
  }
  if (!ok) {
    await intentos(ip, true);
    return { ok: false, status: 401, error: 'Usuario o contraseña incorrectos.' };
  }
  const datos = Buffer.from(JSON.stringify({ u, n: reg.nombre, exp: Date.now() + DIAS_SESION * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', firma).update(datos).digest('base64url');
  return { ok: true, token: `ses_${datos}.${sig}`, usuario: u, nombre: reg.nombre };
}

/** Valida un token de sesión (sin Redis): devuelve { u, n } o null. */
export function sesionDe(token) {
  const t = String(token || '');
  if (!t.startsWith('ses_')) return null;
  const firma = llaveFirma();
  if (!firma) return null;
  const [datos, sig] = t.slice(4).split('.');
  if (!datos || !sig) return null;
  const esperado = crypto.createHmac('sha256', firma).update(datos).digest('base64url');
  if (esperado.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(sig))) return null;
  try {
    const d = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'));
    return d.exp > Date.now() ? d : null;
  } catch {
    return null;
  }
}
