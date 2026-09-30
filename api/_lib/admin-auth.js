/**
 * Auth simple para endpoints admin de pedidos.
 * Bearer = ADMIN_ORDERS_SECRET
 * Opcional: header X-Admin-User debe coincidir con ADMIN_ORDERS_USER (default admin).
 */
export function getAdminSecret() {
  return String(process.env.ADMIN_ORDERS_SECRET || '').trim();
}

export function getAdminUser() {
  return String(process.env.ADMIN_ORDERS_USER || 'admin').trim() || 'admin';
}

export function adminAuthOk(req) {
  const secret = getAdminSecret();
  if (!secret) return false;
  const h = String(req.headers.authorization || req.headers.Authorization || '').trim();
  if (!h.toLowerCase().startsWith('bearer ') || h.slice(7).trim() !== secret) return false;
  const expectedUser = getAdminUser();
  const userHdr = String(req.headers['x-admin-user'] || req.headers['X-Admin-User'] || '').trim();
  // Si no envían usuario, aceptar (compat). Si envían, validar.
  if (userHdr && userHdr !== expectedUser) return false;
  return true;
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body || '{}'));
      } catch {
        return resolve({});
      }
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
