/**
 * Alegra (facturación electrónica) desde el panel: prefactura en BORRADOR (sin emitir a la DIAN).
 * El usuario la revisa y la emite en Alegra; luego el panel lee el número RK, cierra la etapa de factura
 * y registra el pago en Alegra.
 *
 * Env (Vercel): ALEGRA_EMAIL, ALEGRA_TOKEN (Alegra → Configuración → API - Integraciones).
 * Opcionales: ALEGRA_NUMERACION (15 = RK electrónica), ALEGRA_BANCO (3 = Banco 1),
 *             ALEGRA_IVA19 (4), ALEGRA_IVA_EXCLUIDO (2), ALEGRA_APP_URL.
 */
const API = 'https://api.alegra.com/api/v1';
const cfg = () => ({
  email: String(process.env.ALEGRA_EMAIL || '').trim(),
  token: String(process.env.ALEGRA_TOKEN || '').trim(),
  numeracion: String(process.env.ALEGRA_NUMERACION || '15'),
  banco: String(process.env.ALEGRA_BANCO || '3'),
  iva19: String(process.env.ALEGRA_IVA19 || '4'),
  excluido: String(process.env.ALEGRA_IVA_EXCLUIDO || '2'),
  app: String(process.env.ALEGRA_APP_URL || 'https://app.alegra.com').replace(/\/$/, ''),
  plantilla: String(process.env.ALEGRA_PLANTILLA || '8'), // 8 = Clásico FE (factura electrónica)
});

export function alegraConfigurado() {
  const c = cfg();
  return Boolean(c.email && c.token);
}

export function urlFactura(id) {
  return `${cfg().app}/invoice/view/id/${encodeURIComponent(id)}`;
}

async function alegra(method, path, body) {
  const c = cfg();
  if (!c.email || !c.token) throw new Error('Falta conectar Alegra: agrega ALEGRA_EMAIL y ALEGRA_TOKEN en Vercel.');
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${c.email}:${c.token}`).toString('base64'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let j = null;
  try {
    j = txt ? JSON.parse(txt) : null;
  } catch {
    j = { message: txt.slice(0, 200) };
  }
  if (!r.ok) {
    const msg = (j && (j.message || j.error || (j.errors && JSON.stringify(j.errors)))) || `HTTP ${r.status}`;
    const e = new Error(`Alegra ${r.status}: ${String(msg).slice(0, 300)}`);
    e.status = r.status;
    throw e;
  }
  return j;
}

/* ---------------- IVA por ítem (reglas de Reiki) ---------------- */
const EXCLUIDOS = /(panel|m[oó]dulo fotovolt|inversor|microinversor|reflector|luminaria|l[aá]mpara solar|bomba solar|bombeo|controlador de bomba|variador.*bomba)/i;
const GRAVADOS = /(bater[ií]a|medidor|\btc\b|transformador de corriente|breaker|interruptor|dps|supresor|protecci|cable|conector|mc4|estructura|riel|tablero|caja|fusible|wifi|wi-fi|dongle|accesorio|env[ií]o|flete|transporte|mano de obra|instalaci|retie|legalizaci|ingenier)/i;

export function ivaDeItem(it, modo = 'tienda') {
  if (it.iva === 0 || it.iva === 19) return it.iva;
  if (modo === 'todo') return 19;
  const n = `${it.nombre || ''} ${it.categoria || ''}`;
  if (EXCLUIDOS.test(n) && !/estructura|riel|cable|breaker|dps|supresor/i.test(n)) return 0;
  if (GRAVADOS.test(n)) return 19;
  return 19;
}

/** Elige el modo de IVA ('tienda' o 'todo') que reproduce el total del expediente. */
export function lineasFactura(exp) {
  const items = exp.items || [];
  const calc = (modo) => {
    const lineas = items.map((it) => {
      const iva = ivaDeItem(it, modo);
      return { ...it, iva, base: it.precioUnit * it.cantidad, impuesto: Math.round(it.precioUnit * it.cantidad * (iva / 100)) };
    });
    const total = lineas.reduce((a, l) => a + l.base + l.impuesto, 0);
    return { modo, lineas, total };
  };
  const objetivo = Number(exp.total) || 0;
  const a = calc('tienda');
  const b = calc('todo');
  const elegido = !objetivo || Math.abs(a.total - objetivo) <= Math.abs(b.total - objetivo) ? a : b;
  return { ...elegido, objetivo, diferencia: objetivo ? elegido.total - objetivo : 0 };
}

/* ---------------- contacto ---------------- */
function partirCiudad(c) {
  const [city, dep] = String(c || '').split(',').map((s) => s.trim());
  return { city: city || '', department: dep || '' };
}

async function contactoDe(exp) {
  const cl = exp.cliente || {};
  const doc = String(cl.documento || '').replace(/[^\dkK-]/g, '');
  if (!doc) throw new Error('El cliente no tiene cédula o NIT en el expediente.');
  const num = doc.split('-')[0].replace(/\D/g, '');
  const encontrados = await alegra('GET', `/contacts?identification=${encodeURIComponent(num)}&limit=10`);
  const lista = Array.isArray(encontrados) ? encontrados : encontrados?.data || [];
  if (lista.length) {
    // el más reciente con correo
    lista.sort((x, y) => String(y.created_at || y.id).localeCompare(String(x.created_at || x.id)));
    return { contacto: lista.find((x) => x.email) || lista[0], creado: false };
  }
  // Alegra exige dirección, ciudad y departamento para crear el cliente
  const faltan = [];
  if (!String(cl.direccion || '').trim()) faltan.push('la dirección');
  if (!partirCiudad(cl.ciudad).department) faltan.push('la ciudad como "Ciudad, Departamento"');
  if (faltan.length) throw new Error(`Para crear el cliente en Alegra falta ${faltan.join(' y ')} en los datos de la venta.`);
  const esNit = (cl.tipoDoc || '').toUpperCase() === 'NIT' || num.length === 9 || /s\.?a\.?s|ltda|s\.?a\.|e\.?s\.?p|bic|asociaci|comunidad|cooperativa|fundaci|\but\b/i.test(cl.nombre || '');
  const { city, department } = partirCiudad(cl.ciudad);
  const cuerpo = {
    name: cl.nombre,
    identificationObject: esNit ? { type: 'NIT', number: num, dv: doc.includes('-') ? doc.split('-')[1] : undefined } : { type: 'CC', number: num },
    kindOfPerson: esNit ? 'LEGAL_ENTITY' : 'PERSON_ENTITY',
    regime: esNit ? 'COMMON_REGIME' : 'SIMPLIFIED_REGIME',
    email: cl.correo || undefined,
    mobile: String(cl.celular || '').replace(/\D/g, '').slice(-10) || undefined,
    address: { address: cl.direccion || '', city, department, country: 'Colombia' },
    type: ['client'],
  };
  if (!esNit) {
    const p = String(cl.nombre || '').trim().split(/\s+/);
    cuerpo.nameObject = p.length >= 4 ? { firstName: p[0], secondName: p[1], lastName: p[2], secondLastName: p.slice(3).join(' ') } : p.length === 3 ? { firstName: p[0], lastName: p[1], secondLastName: p[2] } : { firstName: p[0] || '', lastName: p.slice(1).join(' ') };
  }
  const c = await alegra('POST', '/contacts', cuerpo);
  return { contacto: c, creado: true };
}

/* ---------------- ítems ---------------- */
async function itemDe(linea) {
  const c = cfg();
  const ref = String(linea.sku || '').slice(0, 90);
  const tax = linea.iva === 0 ? c.excluido : c.iva19;
  if (ref) {
    try {
      const r = await alegra('GET', `/items?reference=${encodeURIComponent(ref)}&limit=5`);
      const lista = Array.isArray(r) ? r : r?.data || [];
      const hit = lista.find((x) => String(x.reference || '').trim() === ref && x.status !== 'inactive');
      if (hit) return hit.id;
    } catch {
      /* se crea */
    }
  }
  const nuevo = await alegra('POST', '/items', {
    name: String(linea.nombre).slice(0, 150),
    reference: ref || undefined,
    price: linea.precioUnit,
    tax: [{ id: Number(tax) }],
    description: '',
  });
  return nuevo.id;
}

/* ---------------- prefactura (borrador) ---------------- */
export async function crearBorrador(exp) {
  const c = cfg();
  const L = lineasFactura(exp);
  if (!L.lineas.length) throw new Error('La venta no tiene ítems para facturar.');
  const { contacto, creado } = await contactoDe(exp);
  const items = [];
  for (const l of L.lineas) {
    const id = await itemDe(l);
    items.push({
      id: Number(id),
      price: l.precioUnit,
      quantity: l.cantidad,
      reference: l.sku || undefined,
      description: '',
      tax: [{ id: Number(l.iva === 0 ? c.excluido : c.iva19) }],
    });
  }
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const pagos = (exp.pagos || []).filter((p) => p.estado === 'verificado');
  const medio = pagos.length ? String(pagos[pagos.length - 1].medio || '').toLowerCase() : '';
  const ref = exp.cotizacion?.numero ? `Cotización ${exp.cotizacion.numero}` : '';
  const inv = await alegra('POST', '/invoices', {
    status: 'draft',
    date: hoy,
    dueDate: hoy,
    client: { id: Number(contacto.id) },
    numberTemplate: { id: Number(c.numeracion) },
    printingTemplate: { id: Number(c.plantilla) },
    paymentForm: 'CASH',
    paymentMethod: /consign|dep[oó]sito/.test(medio) ? 'BANK_DEPOSIT' : /efectivo/.test(medio) ? 'CASH' : 'DEBIT_TRANSFER',
    items,
    anotation: [ref, `Venta ${exp.id}`].filter(Boolean).join(' · ').slice(0, 300),
  });
  return {
    alegraId: String(inv.id),
    url: urlFactura(inv.id),
    total: Number(inv.total) || L.total,
    totalPanel: L.objetivo,
    diferencia: (Number(inv.total) || L.total) - L.objetivo,
    modoIva: L.modo,
    contacto: { id: String(contacto.id), nombre: contacto.name, creado },
    lineas: L.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, base: l.base, iva: l.iva })),
  };
}

/** Lee la factura en Alegra: ¿sigue en borrador o ya se emitió? */
export async function leerFactura(alegraId) {
  const f = await alegra('GET', `/invoices/${encodeURIComponent(alegraId)}`);
  const emitida = f.status !== 'draft' && Boolean(f.numberTemplate && (f.numberTemplate.fullNumber || f.numberTemplate.number));
  return {
    alegraId: String(f.id),
    estado: f.status,
    emitida,
    numero: f.numberTemplate?.fullNumber || (f.numberTemplate?.number ? `${f.numberTemplate.prefix || ''}${f.numberTemplate.number}` : ''),
    fecha: f.date,
    total: Number(f.total) || 0,
    saldo: Number(f.balance) || 0,
    dian: f.stamp?.legalStatus || '',
    clienteId: f.client?.id ? String(f.client.id) : '',
  };
}

/** Registra en Alegra el pago de la factura (cuando el panel ya lo tiene verificado). */
export async function registrarPago(factura, exp) {
  const c = cfg();
  if (!factura.saldo) return null;
  const pagos = (exp.pagos || []).filter((p) => p.estado === 'verificado');
  const fecha = pagos.length ? String(pagos[pagos.length - 1].fecha || '').slice(0, 10) : '';
  const medio = pagos.length ? String(pagos[pagos.length - 1].medio || '').toLowerCase() : '';
  const p = await alegra('POST', '/payments', {
    date: fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
    bankAccount: { id: Number(c.banco) },
    paymentMethod: /efectivo/.test(medio) ? 'cash' : /consign|dep[oó]sito/.test(medio) ? 'deposit' : 'transfer',
    type: 'in',
    client: { id: Number(factura.clienteId) },
    invoices: [{ id: Number(factura.alegraId), amount: factura.saldo }],
    observations: `Pago de la venta ${exp.id}${exp.cotizacion?.numero ? ' · ' + exp.cotizacion.numero : ''}`,
  });
  return { id: String(p.id), monto: factura.saldo };
}
