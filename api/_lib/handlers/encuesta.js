/**
 * Encuesta de satisfacción pública (sin sesión): /api/encuesta?id=<venta>&t=<firma>
 *   GET  → datos mínimos para mostrar la encuesta (nombre, referencia, aspectos, si ya respondió)
 *   POST → guarda la respuesta
 */
import { firmaValida, ASPECTOS } from '../encuestas.js';
import { getExpediente, guardarEncuesta } from '../seguimiento.js';
import { readJsonBody } from '../admin-auth.js';

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function encuesta(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  let body = {};
  if (req.method === 'POST') body = (await readJsonBody(req).catch(() => ({}))) || {};
  const id = String(body.id || url.searchParams.get('id') || '').slice(0, 60);
  const t = String(body.t || url.searchParams.get('t') || '').slice(0, 60);
  if (!id || !firmaValida(id, t)) return send(res, 403, { ok: false, error: 'Enlace no válido. Escríbenos por WhatsApp y te enviamos uno nuevo.' });
  const exp = await getExpediente(id);
  if (!exp) return send(res, 404, { ok: false, error: 'No encontramos tu pedido.' });
  if (req.method === 'GET') {
    const emp = /\b(s\.?a\.?s|ltda|consorcio|corporaci|fundaci|inversiones)\b/i.test(exp.cliente?.nombre || '');
    return send(res, 200, {
      ok: true,
      nombre: emp ? '' : String(exp.cliente?.nombre || '').split(' ')[0],
      referencia: exp.cotizacion?.numero || exp.titulo || exp.id,
      tipo: exp.tipo,
      aspectos: ASPECTOS[exp.tipo === 'proyecto' ? 'proyecto' : 'tienda'],
      respondida: !!exp.encuesta?.respuesta,
    });
  }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Método no permitido.' });
  try {
    await guardarEncuesta(id, body);
    return send(res, 200, { ok: true });
  } catch (err) {
    return send(res, 400, { ok: false, error: String(err?.message || err) });
  }
}
