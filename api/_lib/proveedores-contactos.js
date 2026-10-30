/**
 * WhatsApp de los asesores de cada proveedor (para preguntar disponibilidad desde "Por comprar").
 * Se guardan en Redis, no en el repositorio (es público).
 */
import { getRedis, waKey } from './whatsapp-redis.js';

const KEY = waKey('proveedores', 'contactos');
let mem = globalThis.__reikiProvContactos || {};
globalThis.__reikiProvContactos = mem;

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

export async function leerContactos() {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(KEY);
      if (raw) mem = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn('[proveedores-contactos] get', err?.message || err);
    }
  }
  return mem || {};
}

/** contactos: { "Autosolar": { nombre: "Laura Bulla", celular: "573204433276" }, … } — reemplaza o agrega por proveedor. */
export async function guardarContactos(contactos = {}) {
  const actual = await leerContactos();
  const out = { ...actual };
  for (const [prov, c] of Object.entries(contactos || {})) {
    const p = String(prov || '').trim().slice(0, 80);
    if (!p) continue;
    let cel = String((c && c.celular) || '').replace(/\D/g, '');
    if (cel.length === 10) cel = '57' + cel;
    if (!c || (!cel && !c.nombre)) {
      delete out[p];
      continue;
    }
    out[p] = { nombre: String(c.nombre || '').trim().slice(0, 60), celular: cel };
  }
  mem = out;
  const redis = getRedis();
  if (redis) await redis.set(KEY, out);
  return out;
}

/** Busca el contacto de un proveedor tolerando mayúsculas/tildes ("E&M" = "e&m"). */
export function contactoDe(contactos, proveedor) {
  if (!proveedor) return null;
  if (contactos[proveedor]) return contactos[proveedor];
  const n = norm(proveedor);
  const k = Object.keys(contactos).find((x) => norm(x) === n);
  return k ? contactos[k] : null;
}
