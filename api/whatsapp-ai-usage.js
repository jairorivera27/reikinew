/**
 * GET /api/whatsapp-ai-usage?key=ADMIN_KEY
 * Reporte de gasto mensual Claude (Redis).
 */
import { getAiUsageReport } from './_lib/whatsapp-ai-budget.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'GET only' }));
  }

  const adminKey = String(process.env.ADMIN_KEY || '').trim();
  const q = new URL(req.url || '/', 'http://localhost').searchParams;
  const key = String(q.get('key') || req.headers['x-admin-key'] || '').trim();

  if (!adminKey || key !== adminKey) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  try {
    const report = await getAiUsageReport();
    res.statusCode = 200;
    return res.end(JSON.stringify(report));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  }
}
