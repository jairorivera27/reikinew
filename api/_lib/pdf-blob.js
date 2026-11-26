/**
 * PDFs de cotizaciones en Vercel Blob (almacén privado "reiki-cotizaciones-pdf").
 * Redis solo guarda los metadatos de la cotización; el archivo vive aquí.
 * Env: BLOB_READ_WRITE_TOKEN (la crea Vercel al conectar el almacén al proyecto).
 */
import { put, get, del } from '@vercel/blob';

export function blobConfigurado() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const limpio = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || 'archivo';

/** Sube un archivo (Buffer o string) y devuelve { pathname, url, size }. */
export async function subirBlob(pathname, contenido, contentType = 'application/pdf', { fijo = false } = {}) {
  // fijo = ruta exacta que se puede sobrescribir (partes temporales); si no, sufijo aleatorio
  const r = await put(pathname, contenido, {
    access: 'private',
    contentType,
    addRandomSuffix: !fijo,
    allowOverwrite: fijo,
  });
  return { pathname: r.pathname, url: r.url, size: typeof contenido === 'string' ? Buffer.byteLength(contenido) : contenido.length };
}

/** Lee un blob privado completo como Buffer (null si no existe). */
export async function leerBlob(urlOrPathname) {
  const r = await get(urlOrPathname, { access: 'private' });
  if (!r || !r.stream) return null;
  const chunks = [];
  for await (const ch of r.stream) chunks.push(Buffer.from(ch));
  return Buffer.concat(chunks);
}

export async function borrarBlob(urlOrPathname) {
  if (!urlOrPathname || (Array.isArray(urlOrPathname) && !urlOrPathname.length)) return;
  try {
    await del(urlOrPathname);
  } catch (err) {
    console.warn('[pdf-blob] del', err?.message || err);
  }
}

export const rutaPdf = (id, nombre) => `cotizaciones/${limpio(id)}/${limpio(nombre || `${id}.pdf`)}`;
export const rutaParte = (id, parte) => `cotizaciones-tmp/${limpio(id)}/parte-${Number(parte) || 1}.b64`;
