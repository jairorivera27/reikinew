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

/** Token propio del asistente Claude (revisión programada y carga de cotizaciones aprobadas). */
export function getAgentToken() {
  const t = String(process.env.CLAUDE_AGENT_TOKEN || '').trim();
  return t.length >= 24 ? t : '';
}

function bearerOf(req) {
  const h = String(req.headers.authorization || req.headers.Authorization || '').trim();
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

/** Quién hace el cambio: 'claude' si usa el token del asistente; si no, el usuario del panel. */
export function adminActor(req) {
  const agent = getAgentToken();
  if (agent && bearerOf(req) === agent) return 'claude';
  return String(req.headers['x-admin-user'] || '').trim() || getAdminUser();
}

export function adminAuthOk(req) {
  const agent = getAgentToken();
  if (agent && bearerOf(req) === agent) return true;
  const secret = getAdminSecret();
  if (!secret) return false;
  if (bearerOf(req) !== secret) return false;
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
