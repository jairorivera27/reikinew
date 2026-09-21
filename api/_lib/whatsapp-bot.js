/**
 * Bot comercial Reiki — tono amable colombiano, flujo lineal sin ciclos.
 * Pasos de captura (nombre/ciudad/…) tienen prioridad sobre tips y menús.
 */
import { getWhatsAppConfig, sendText, sendButtons, sendList, notifyOwner } from './whatsapp.js';
import { CONSULTANT_INTRO, SOLAR_TIPS, matchSolarTip } from './whatsapp-solar-kb.js';

/** @type {Map<string, { step: string, data: Record<string, string>, humanUntil?: number }>} */
const sessions = globalThis.__reikiWaSessions || new Map();
globalThis.__reikiWaSessions = sessions;

const HUMAN_MS = 12 * 60 * 60 * 1000;
const DISC_STEPS = new Set([
  'disc_nombre',
  'disc_ciudad',
  'disc_tipo',
  'disc_consumo',
  'disc_urgencia',
  'asesor_nombre',
  'asesor_necesidad',
]);

function session(from) {
  if (!sessions.has(from)) sessions.set(from, { step: 'idle', data: {} });
  return sessions.get(from);
}

function markHuman(from) {
  const s = session(from);
  s.step = 'human';
  s.humanUntil = Date.now() + HUMAN_MS;
}

function isHuman(from) {
  const s = sessions.get(from);
  if (!s || s.step !== 'human') return false;
  if (s.humanUntil && Date.now() > s.humanUntil) {
    s.step = 'idle';
    delete s.humanUntil;
    return false;
  }
  return true;
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();
}

function firstName(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0];
  return n || '';
}

function isGreeting(n) {
  return /^(hola|buenas|buen[oa]s?\s*(dias|días|tardes|noches)?|hey|hi|holi|saludos|menu|inicio|bot)\b/.test(
    n
  );
}

function formatLeadSummary(from, data = {}, titulo = 'LEAD COMERCIAL — WhatsApp') {
  const d = data || {};
  return (
    `☀️ *${titulo}*\n\n` +
    `WhatsApp cliente: +${from}\n` +
    `Nombre: ${d.nombre || '—'}\n` +
    `Ciudad: ${d.ciudad || '—'}\n` +
    `Objetivo: ${d.objetivo || '—'}\n` +
    `Tipo: ${d.tipo || '—'}\n` +
    `Factura/consumo: ${d.consumo || '—'}\n` +
    `Urgencia: ${d.urgencia || '—'}\n` +
    `Necesidad: ${d.necesidad || '—'}\n` +
    `Último mensaje: ${d.ultimoMensaje || '—'}`
  );
}

async function handoffToHuman(from, cfg, opts = {}) {
  const s = session(from);
  if (opts.necesidad) s.data.necesidad = opts.necesidad;
  if (opts.ultimoMensaje) s.data.ultimoMensaje = opts.ultimoMensaje;

  await notifyOwner(formatLeadSummary(from, s.data, opts.titulo || 'Cliente pide asesor'), cfg);
  markHuman(from);

  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      (name ? `Listo, *${name}*. ` : 'Listo. ') +
      'Con mucho gusto: en breve un asesor de Reiki te escribe por este mismo chat para atenderte de forma personalizada.\n\n' +
      'Horario aproximado: lunes a sábado, 8:00 a 18:00 (hora de Medellín).\n\n' +
      'Si más adelante quieres volver con el asistente, escribe *hola*.',
    cfg,
  });
  s.step = 'human';
}

async function startAsesorCapture(from, cfg, ultimoMensaje) {
  const s = session(from);
  if (ultimoMensaje) s.data.ultimoMensaje = String(ultimoMensaje).slice(0, 120);

  if (!s.data.nombre) {
    s.step = 'asesor_nombre';
    await sendText({
      to: from,
      body:
        'Con gusto te paso con un asesor.\n\n' +
        'Para atenderte mejor, ¿me compartes tu *nombre*?',
      cfg,
    });
    return;
  }
  if (!s.data.ciudad && !s.data.necesidad) {
    s.step = 'asesor_necesidad';
    await sendText({
      to: from,
      body:
        (firstName(s.data.nombre) ? `Gracias, *${firstName(s.data.nombre)}*. ` : '') +
        '¿En qué *ciudad* estás y qué necesitas?\n\n' +
        'Por ejemplo: “Medellín, bajar la factura” o “Cali, paneles para finca”.',
      cfg,
    });
    return;
  }
  await handoffToHuman(from, cfg, { titulo: 'Cliente pide asesor' });
}

async function sendMainMenu(from, cfg) {
  await sendText({ to: from, body: CONSULTANT_INTRO, cfg });
  await sendButtons({
    to: from,
    body: 'Elige la opción que más se acerque a lo que buscas:',
    buttons: [
      { id: 'obj_ahorro', title: 'Bajar la factura' },
      { id: 'obj_respaldo', title: 'Respaldo / cortes' },
      { id: 'menu_mas', title: 'Otras opciones' },
    ],
    cfg,
  });
}

async function sendMoreOptions(from, cfg) {
  await sendList({
    to: from,
    body: 'Claro, aquí tienes más opciones. Escoge la que prefieras:',
    buttonText: 'Ver opciones',
    sections: [
      {
        title: '¿Qué necesitas?',
        rows: [
          { id: 'obj_finca', title: 'Finca / sin red', description: 'Sistema aislado' },
          { id: 'menu_proyecto', title: 'Cotizar instalación', description: 'Proyecto llave en mano' },
          { id: 'menu_tienda', title: 'Ver la tienda', description: 'Equipos con precio' },
          { id: 'menu_aprender', title: 'Quiero que me expliques', description: 'Orientación clara' },
          { id: 'menu_asesor', title: 'Hablar con un asesor', description: 'Atención personal' },
        ],
      },
    ],
    cfg,
  });
}

async function sendTip(from, tip, cfg) {
  const site = cfg.siteUrl;
  const body = tip.body
    .replace('/tienda/categoria/paneles-solares', `${site}/tienda/categoria/paneles-solares`)
    .replace(/Catálogo: \//, `Puedes verlos aquí: ${site}/`);
  await sendText({ to: from, body, cfg });

  await sendButtons({
    to: from,
    body: '¿Cómo te gustaría continuar?',
    buttons:
      tip.cta === 'tienda'
        ? [
            { id: 'menu_tienda', title: 'Ir a la tienda' },
            { id: 'menu_proyecto', title: 'Cotizar sistema' },
            { id: 'menu_asesor', title: 'Hablar con asesor' },
          ]
        : [
            { id: 'menu_proyecto', title: 'Sí, cotizar' },
            { id: 'menu_aprender', title: 'Más información' },
            { id: 'menu_asesor', title: 'Hablar con asesor' },
          ],
    cfg,
  });
}

/** Inicia o continúa captura sin borrar datos ya dados */
async function startDiscovery(from, objetivo, cfg) {
  const s = session(from);
  s.data = { ...(s.data || {}), objetivo: objetivo || s.data.objetivo || 'ahorro' };

  if (!s.data.nombre) {
    s.step = 'disc_nombre';
    const blurb =
      s.data.objetivo === 'ahorro'
        ? 'Perfecto. Vamos a trabajar en cómo *bajar esa factura* con un diseño serio y a tu medida.'
        : s.data.objetivo === 'respaldo'
          ? 'Perfecto. Vamos a mirar un respaldo confiable para cuando se vaya la luz.'
          : 'Perfecto. En finca o sin red hay que dimensionar bien para que el sistema te rinda.';

    await sendText({
      to: from,
      body:
        `${blurb}\n\n` +
        'Para cotizarte con precisión solo necesito unos datos cortos.\n\n' +
        '¿Cómo te llamas?',
      cfg,
    });
    return;
  }
  if (!s.data.ciudad) {
    s.step = 'disc_ciudad';
    await sendText({
      to: from,
      body: `Con gusto, *${firstName(s.data.nombre)}*. ¿En qué ciudad está el proyecto?`,
      cfg,
    });
    return;
  }
  if (!s.data.tipo) {
    s.step = 'disc_tipo';
    await sendButtons({
      to: from,
      body: `Quedó registrado: *${s.data.ciudad}*. ¿El proyecto es para casa, negocio o finca/industria?`,
      buttons: [
        { id: 'tipo_hogar', title: 'Casa / hogar' },
        { id: 'tipo_comercio', title: 'Negocio' },
        { id: 'tipo_industria', title: 'Finca / industria' },
      ],
      cfg,
    });
    return;
  }
  if (!s.data.consumo) {
    s.step = 'disc_consumo';
    await sendText({
      to: from,
      body:
        '¿Cuánto te llega aproximadamente de *luz al mes*?\n\n' +
        'Puede ser en pesos (ej. $350.000) o en kWh. Si no lo tienes a la mano, escribe *no sé* y lo estimamos juntos.',
      cfg,
    });
    return;
  }
  if (!s.data.urgencia) {
    s.step = 'disc_urgencia';
    await sendButtons({
      to: from,
      body: '¿Con qué prioridad te gustaría avanzar?',
      buttons: [
        { id: 'urg_ya', title: 'Lo antes posible' },
        { id: 'urg_mes', title: 'Este mes' },
        { id: 'urg_explorar', title: 'Estoy explorando' },
      ],
      cfg,
    });
    return;
  }
  await finishDiscovery(from, cfg);
}

async function finishDiscovery(from, cfg) {
  const s = session(from);
  const d = s.data;
  const name = firstName(d.nombre);

  await notifyOwner(formatLeadSummary(from, d, 'LEAD COTIZACIÓN — WhatsApp'), cfg);
  markHuman(from);

  const tip =
    d.objetivo === 'respaldo'
      ? 'Con lo que me contaste, lo más probable es revisar un *híbrido con batería* según lo que quieras mantener encendido.'
      : d.objetivo === 'finca'
        ? 'En tu caso validaremos consumo y autonomía antes de hablar de equipos sueltos.'
        : 'Con tu factura o consumo podemos estimar un sistema on-grid a tu medida.';

  await sendText({
    to: from,
    body:
      (name ? `Muchas gracias, *${name}*. ` : 'Muchas gracias. ') +
      `Ya tengo lo esencial.\n\n` +
      `${tip}\n\n` +
      'En un momento un *asesor de Reiki* te escribe por aquí con la orientación y la cotización.\n\n' +
      'Si quieres ir revisando equipos mientras tanto:\n' +
      `${cfg.siteUrl}/tienda\n\n` +
      'Cuando quieras volver con el asistente, escribe *hola*.',
    cfg,
  });
  s.step = 'human';
}

async function sendLearnMenu(from, cfg) {
  await sendList({
    to: from,
    body: 'Con gusto. Elige el tema y te lo explico de forma clara:',
    buttonText: 'Temas',
    sections: [
      {
        title: 'Orientación',
        rows: [
          { id: 'tip_ahorro_factura', title: 'Bajar la factura', description: 'Cómo funciona' },
          { id: 'tip_backup', title: 'Cuando hay cortes', description: 'Respaldo real' },
          { id: 'tip_offgrid', title: 'Finca / sin red', description: 'Sistema aislado' },
          { id: 'tip_paneles', title: 'Paneles', description: 'Qué tener en cuenta' },
          { id: 'tip_inversores', title: 'Inversores', description: 'Cuál te conviene' },
          { id: 'tip_baterias', title: 'Baterías', description: 'Litio y autonomía' },
          { id: 'tip_precios', title: 'Precios', description: 'Cómo cotizamos' },
        ],
      },
    ],
    cfg,
  });
}

/** @returns {Promise<boolean>} */
async function handleDiscoveryStep(from, text, id, cfg) {
  const s = session(from);
  if (!DISC_STEPS.has(s.step)) return false;

  if (s.step === 'asesor_nombre') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me compartes tu nombre, por favor?', cfg });
      return true;
    }
    s.data.nombre = text.slice(0, 80);
    s.step = 'asesor_necesidad';
    await sendText({
      to: from,
      body: `Gracias, *${firstName(s.data.nombre)}*. ¿En qué *ciudad* estás y qué necesitas?`,
      cfg,
    });
    return true;
  }

  if (s.step === 'asesor_necesidad') {
    if (text.length < 3) {
      await sendText({
        to: from,
        body: 'Cuéntame ciudad y necesidad, por favor. Ej.: “Bogotá, cotizar paneles para casa”.',
        cfg,
      });
      return true;
    }
    s.data.necesidad = text.slice(0, 200);
    if (!s.data.ciudad) {
      const m = text.match(/^([^,]+),/);
      if (m) s.data.ciudad = m[1].trim().slice(0, 80);
      else s.data.ciudad = text.slice(0, 80);
    }
    await handoffToHuman(from, cfg, { titulo: 'Cliente pide asesor', ultimoMensaje: text });
    return true;
  }

  if (s.step === 'disc_nombre') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me dices tu nombre para continuar?', cfg });
      return true;
    }
    s.data.nombre = text.slice(0, 80);
    s.step = 'disc_ciudad';
    await sendText({
      to: from,
      body: `Mucho gusto, *${firstName(s.data.nombre)}*.\n\n¿En qué ciudad está el proyecto?`,
      cfg,
    });
    return true;
  }

  if (s.step === 'disc_ciudad') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me indicas la ciudad? Por ejemplo: Medellín, Bogotá, Cali…', cfg });
      return true;
    }
    s.data.ciudad = text.slice(0, 80);
    s.step = 'disc_tipo';
    await sendButtons({
      to: from,
      body: `Perfecto, *${s.data.ciudad}*. ¿El proyecto es para casa, negocio o finca/industria?`,
      buttons: [
        { id: 'tipo_hogar', title: 'Casa / hogar' },
        { id: 'tipo_comercio', title: 'Negocio' },
        { id: 'tipo_industria', title: 'Finca / industria' },
      ],
      cfg,
    });
    return true;
  }

  if (s.step === 'disc_tipo') {
    if (id === 'tipo_hogar') s.data.tipo = 'Hogar';
    else if (id === 'tipo_comercio') s.data.tipo = 'Comercio';
    else if (id === 'tipo_industria') s.data.tipo = 'Industria/finca';
    else if (text) s.data.tipo = text.slice(0, 40);
    else {
      await sendText({ to: from, body: '¿Me ayudas eligiendo: casa, negocio o finca/industria?', cfg });
      return true;
    }
    s.step = 'disc_consumo';
    await sendText({
      to: from,
      body:
        '¿Cuánto te llega aproximadamente de *luz al mes*?\n\n' +
        'Puede ser en pesos (ej. $350.000) o en kWh. Si no lo sabes, escribe *no sé*.',
      cfg,
    });
    return true;
  }

  if (s.step === 'disc_consumo') {
    if (text.length < 1) {
      await sendText({
        to: from,
        body: '¿Me das un aproximado de la factura o del consumo? También puedes escribir *no sé*.',
        cfg,
      });
      return true;
    }
    s.data.consumo = text.slice(0, 80);
    s.step = 'disc_urgencia';
    await sendButtons({
      to: from,
      body: '¿Con qué prioridad te gustaría avanzar?',
      buttons: [
        { id: 'urg_ya', title: 'Lo antes posible' },
        { id: 'urg_mes', title: 'Este mes' },
        { id: 'urg_explorar', title: 'Estoy explorando' },
      ],
      cfg,
    });
    return true;
  }

  if (s.step === 'disc_urgencia') {
    if (id === 'urg_ya') s.data.urgencia = 'Lo antes posible';
    else if (id === 'urg_mes') s.data.urgencia = 'Este mes';
    else if (id === 'urg_explorar') s.data.urgencia = 'Explorando';
    else if (text) s.data.urgencia = text.slice(0, 40);
    else {
      await sendText({ to: from, body: '¿Me tocas una de las opciones de tiempo, por favor?', cfg });
      return true;
    }
    await finishDiscovery(from, cfg);
    return true;
  }

  return false;
}

/**
 * @param {{ from: string, text?: string, buttonId?: string, listId?: string }} msg
 */
export async function handleIncomingMessage(msg) {
  const cfg = getWhatsAppConfig();
  const from = String(msg.from || '').replace(/\D/g, '');
  if (!from) return;

  const text = String(msg.text || '').trim();
  const id = msg.buttonId || msg.listId || '';
  const n = normalize(text);
  const s = session(from);

  if (id === 'menu_root' || isGreeting(n) || n === 'menu') {
    s.step = 'idle';
    s.data = {};
    delete s.humanUntil;
    await sendMainMenu(from, cfg);
    return;
  }

  if (isHuman(from)) return;

  // PRIORIDAD: no interrumpir captura (evita el ciclo ciudad → tip → cotizar otra vez)
  if (await handleDiscoveryStep(from, text, id, cfg)) return;

  if (id.startsWith('urg_') || id.startsWith('tipo_')) {
    if (id.startsWith('tipo_')) s.step = 'disc_tipo';
    if (id.startsWith('urg_')) s.step = 'disc_urgencia';
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  if (id === 'menu_mas') {
    await sendMoreOptions(from, cfg);
    return;
  }
  if (id === 'obj_ahorro') {
    await startDiscovery(from, 'ahorro', cfg);
    return;
  }
  if (id === 'obj_respaldo') {
    await startDiscovery(from, 'respaldo', cfg);
    return;
  }
  if (id === 'obj_finca') {
    await startDiscovery(from, 'finca', cfg);
    return;
  }
  if (id === 'menu_aprender') {
    await sendLearnMenu(from, cfg);
    return;
  }
  if (id.startsWith('tip_')) {
    const found = SOLAR_TIPS.find((t) => t.id === id.slice(4));
    if (found) {
      await sendTip(from, found, cfg);
      return;
    }
  }

  if (id === 'menu_tienda' || n === 'tienda' || n === 'comprar') {
    await sendText({
      to: from,
      body:
        'Si ya sabes qué equipo necesitas, la tienda es el camino más rápido: precios claros y envío a todo el país.\n\n' +
        `Aquí la tienes: ${cfg.siteUrl}/tienda\n\n` +
        'Si todavía no tienes claro el tipo de sistema, con gusto te cotizamos para que no compres de más ni algo incompatible.',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Cómo deseas continuar?',
      buttons: [
        { id: 'menu_tienda', title: 'Abrir tienda' },
        { id: 'menu_proyecto', title: 'Mejor cotizar' },
        { id: 'menu_aprender', title: 'Explícame' },
      ],
      cfg,
    });
    return;
  }

  if (id === 'menu_proyecto' || n === 'proyecto' || n === 'cotizar') {
    await startDiscovery(from, s.data.objetivo || 'ahorro', cfg);
    return;
  }

  if (id === 'menu_asesor' || n === 'asesor' || n === 'humano' || n === 'persona') {
    await startAsesorCapture(from, cfg, text || '(pidió hablar con un asesor)');
    return;
  }

  if (text && !id && s.step === 'idle') {
    const tip = matchSolarTip(n);
    const shortBuy =
      n.length <= 48 &&
      /\b(quiero|necesito|me gustaria|me gustaría|cotiz|proyecto|ahorrar|respaldo|finca)\b/.test(n);

    if (/\b(finca|offgrid|off grid|sin red)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'finca', cfg);
      return;
    }
    if (/\b(respaldo|corte|cortes|apagon|apagón)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'respaldo', cfg);
      return;
    }
    if (/\b(ahorrar|ahorro|bajar (la )?factura)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'ahorro', cfg);
      return;
    }
    if (/\b(aprender|explic|guia|guía)\b/.test(n)) {
      await sendLearnMenu(from, cfg);
      return;
    }
    if (tip) {
      await sendTip(from, tip, cfg);
      return;
    }

    console.log('[whatsapp-bot] unmatched intent', n.slice(0, 80), 'from', from);
    await sendText({
      to: from,
      body:
        'Con gusto te ayudo 🙂 Cuéntame si quieres *bajar la factura*, *respaldo por cortes* o *comprar un equipo*.\n\n' +
        'También puedes elegir una opción:',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Por dónde empezamos?',
      buttons: [
        { id: 'obj_ahorro', title: 'Bajar la factura' },
        { id: 'obj_respaldo', title: 'Cortes de luz' },
        { id: 'menu_mas', title: 'Otras opciones' },
      ],
      cfg,
    });
    return;
  }

  if (!text && !id) return;
  await sendMainMenu(from, cfg);
}

/**
 * @param {any} body
 */
export function extractInboundMessages(body) {
  /** @type {{ from: string, text?: string, buttonId?: string, listId?: string }[]} */
  const out = [];
  const entries = body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const m of value.messages) {
        const from = m.from;
        if (m.type === 'text') {
          out.push({ from, text: m.text?.body || '' });
        } else if (m.type === 'interactive') {
          const btn = m.interactive?.button_reply;
          const list = m.interactive?.list_reply;
          out.push({
            from,
            text: btn?.title || list?.title || '',
            buttonId: btn?.id,
            listId: list?.id,
          });
        } else if (m.type === 'button') {
          out.push({ from, text: m.button?.text || '', buttonId: m.button?.payload });
        }
      }
    }
  }
  return out;
}
