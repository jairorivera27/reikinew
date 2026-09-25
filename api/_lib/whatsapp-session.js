/**
 * Sesión WhatsApp con persistencia best-effort en /tmp (misma instancia warm)
 * + validación nombre/ciudad para evitar cruces.
 */
import fs from 'node:fs';
import path from 'node:path';

const STORE = path.join('/tmp', 'reiki-wa-sessions.json');
const TTL_MS = 6 * 60 * 60 * 1000;

/** @type {Map<string, { step: string, data: Record<string, string>, humanUntil?: number, updatedAt: number }>} */
const mem = globalThis.__reikiWaSessionsV2 || new Map();
globalThis.__reikiWaSessionsV2 = mem;

const CITY_HINTS = new Set(
  [
    'medellin',
    'medellín',
    'bogota',
    'bogotá',
    'cali',
    'barranquilla',
    'cartagena',
    'bucaramanga',
    'pereira',
    'manizales',
    'armenia',
    'ibague',
    'ibagué',
    'neiva',
    'villavicencio',
    'cucuta',
    'cúcuta',
    'santa marta',
    'pasto',
    'monteria',
    'montería',
    'envigado',
    'itagui',
    'itagüí',
    'bello',
    'rionegro',
    'sabaneta',
    'la ceja',
    'chia',
    'soacha',
    'zipaquira',
    'zipaquirá',
  ].map((c) =>
    c
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
  )
);

function loadDisk() {
  try {
    if (!fs.existsSync(STORE)) return;
    const raw = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const now = Date.now();
    for (const [k, v] of Object.entries(raw || {})) {
      if (!v || now - (v.updatedAt || 0) > TTL_MS) continue;
      if (!mem.has(k)) mem.set(k, v);
    }
  } catch {
    /* ignore */
  }
}

function saveDisk() {
  try {
    const obj = Object.fromEntries(mem.entries());
    fs.writeFileSync(STORE, JSON.stringify(obj));
  } catch {
    /* ignore on read-only */
  }
}

loadDisk();

export function getSession(from) {
  const id = sessionKey(from);
  loadDisk();
  let s = mem.get(id);
  if (!s || Date.now() - (s.updatedAt || 0) > TTL_MS) {
    s = { step: 'idle', data: {}, updatedAt: Date.now() };
    mem.set(id, s);
  }
  return s;
}

export function saveSession(from, s) {
  const id = sessionKey(from);
  s.updatedAt = Date.now();
  mem.set(id, s);
  saveDisk();
}

export function resetSession(from) {
  const id = sessionKey(from);
  const s = { step: 'idle', data: {}, updatedAt: Date.now() };
  mem.set(id, s);
  saveDisk();
  return s;
}

/** Clave de sesión: teléfono o BSUID completo */
function sessionKey(from) {
  const raw = String(from || '').trim();
  if (/^[A-Z]{2}(\.ENT)?\.[A-Za-z0-9]+$/.test(raw)) return raw;
  return raw.replace(/\D/g, '') || raw;
}

export function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    // iOS/WhatsApp a veces mete BOM, zero-width, RTL marks
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .toLowerCase();
}

export function isLikelyCity(text) {
  const n = normalizeText(text);
  if (!n || n.length < 3) return false;
  if (CITY_HINTS.has(n)) return true;
  // "Medellín Colombia", "cerca a Medellín"
  for (const c of CITY_HINTS) {
    if (n === c || n.startsWith(c + ' ') || n.includes(' ' + c)) return true;
  }
  return false;
}

/** Nombre corto de persona (1-3 palabras), sin dígitos ni $ */
export function isLikelyPersonName(text) {
  const t = String(text || '').trim();
  if (!t || t.length > 60) return false;
  if (/[0-9$€]|kwh|factura|panel|inversor|bateria|batería/i.test(t)) return false;
  if (isLikelyCity(t)) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return false;
  // Evitar frases
  if (/^(me llamo|soy|mi nombre|hola|buenas)\b/i.test(t)) {
    const rest = t.replace(/^(me llamo|soy|mi nombre es|mi nombre)\s+/i, '').trim();
    return isLikelyPersonName(rest) || (rest.length >= 2 && rest.split(/\s+/).length <= 3);
  }
  return true;
}

export function extractPersonName(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(?:me llamo|soy|mi nombre es|mi nombre)\s+(.+)$/i);
  return (m ? m[1] : t).trim().slice(0, 80);
}
