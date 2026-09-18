/**
 * Bot comercial consultivo Reiki — asesorar primero, luego cerrar a tienda/proyecto/humano.
 * Conocimiento ampliable en whatsapp-solar-kb.js
 */
import { getWhatsAppConfig, sendText, sendButtons, sendList, notifyOwner } from './whatsapp.js';
import { CONSULTANT_INTRO, SOLAR_TIPS, matchSolarTip } from './whatsapp-solar-kb.js';

/** @type {Map<string, { step: string, data: Record<string, string>, humanUntil?: number }>} */
const sessions = globalThis.__reikiWaSessions || new Map();
globalThis.__reikiWaSessions = sessions;

const HUMAN_MS = 12 * 60 * 60 * 1000;

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

async function sendMainMenu(from, cfg) {
  await sendList({
    to: from,
    body: CONSULTANT_INTRO,
    buttonText: 'Ver opciones',
    sections: [
      {
        title: 'Asesoría y venta',
        rows: [
          { id: 'obj_ahorro', title: 'Quiero ahorrar en luz', description: 'Bajar la factura con solar' },
          { id: 'obj_respaldo', title: 'Respaldo / cortes', description: 'No quedarme sin energía' },
          { id: 'obj_finca', title: 'Finca / sin red', description: 'Sistema aislado u off-grid' },
          { id: 'menu_proyecto', title: 'Cotizar proyecto', description: 'Diseño e instalación' },
          { id: 'menu_tienda', title: 'Comprar equipos', description: 'Tienda con precios' },
          { id: 'menu_aprender', title: 'Explicame opciones', description: 'Guía rápida solar' },
          { id: 'menu_asesor', title: 'Hablar con asesor', description: 'Persona real Reiki' },
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
    .replace(/Catálogo: \//, `Catálogo: ${site}/`);
  await sendText({ to: from, body: `*${tip.title}*\n\n${body}`, cfg });
  if (tip.cta === 'tienda') {
    await sendButtons({
      to: from,
      body: 'Siguiente paso recomendado:',
      buttons: [
        { id: 'menu_tienda', title: 'Ir a tienda' },
        { id: 'menu_proyecto', title: 'Cotizar proyecto' },
        { id: 'menu_asesor', title: 'Hablar asesor' },
      ],
      cfg,
    });
  } else if (tip.cta === 'asesor') {
    await sendButtons({
      to: from,
      body: '¿Te paso con un asesor?',
      buttons: [
        { id: 'menu_asesor', title: 'Sí, asesor' },
        { id: 'menu_proyecto', title: 'Cotizar primero' },
        { id: 'menu_root', title: 'Menú' },
      ],
      cfg,
    });
  } else {
    await sendButtons({
      to: from,
      body: 'Para darte un número real necesitamos tus datos. ¿Cotizamos?',
      buttons: [
        { id: 'menu_proyecto', title: 'Sí, cotizar' },
        { id: 'menu_aprender', title: 'Más info' },
        { id: 'menu_asesor', title: 'Hablar asesor' },
      ],
      cfg,
    });
  }
}

async function startDiscovery(from, objetivo, cfg) {
  const s = session(from);
  s.step = 'disc_nombre';
  s.data = { objetivo };
  const blurb =
    objetivo === 'ahorro'
      ? 'Perfecto: vamos a enfocarnos en *reducir tu factura* con un diseño serio (no “kit genérico”).'
      : objetivo === 'respaldo'
        ? 'Perfecto: priorizaremos *qué cargas proteger* y cuántas horas de autonomía necesitas.'
        : 'Perfecto: en finca/sin red el dimensionamiento de *batería y consumo* es crítico.';

  await sendText({
    to: from,
    body:
      `${blurb}\n\n` +
      'Te haré *5 preguntas cortas* para que un asesor te cotice con precisión (y no pierdas plata en equipos de más o de menos).\n\n' +
      '1️⃣ ¿Cuál es tu *nombre*?',
    cfg,
  });
}

async function finishDiscovery(from, cfg) {
  const s = session(from);
  const d = s.data;
  const summary =
    `☀️ *LEAD COMERCIAL — Bot asesor*\n\n` +
    `Objetivo: ${d.objetivo || '—'}\n` +
    `Nombre: ${d.nombre || '—'}\n` +
    `WhatsApp: +${from}\n` +
    `Ciudad: ${d.ciudad || '—'}\n` +
    `Tipo: ${d.tipo || '—'}\n` +
    `Factura/consumo: ${d.consumo || '—'}\n` +
    `Urgencia: ${d.urgencia || '—'}\n\n` +
    `_Prioridad: asesoramiento → cotización personalizada._`;

  await notifyOwner(summary, cfg);
  markHuman(from);

  const tip =
    d.objetivo === 'respaldo'
      ? 'Con cortes, suele evaluarse *híbrido + batería* según cargas críticas.'
      : d.objetivo === 'finca'
        ? 'En off-grid validaremos consumo diario y autonomía antes de comprar equipos.'
        : 'Para ahorro de factura, el diseño on-grid se ajusta a tu consumo y techo.';

  await sendText({
    to: from,
    body:
      `Gracias, *${d.nombre || 'listo'}*. Ya tengo lo esencial.\n\n` +
      `${tip}\n\n` +
      'Un *asesor Reiki* te escribirá por este chat con la orientación y cotización.\n\n' +
      'Mientras tanto puedes revisar equipos con precio publicado:\n' +
      `${cfg.siteUrl}/tienda\n\n` +
      '_Escribe *menu* si quieres volver al asistente._',
    cfg,
  });
  s.step = 'human';
}

async function sendLearnMenu(from, cfg) {
  await sendList({
    to: from,
    body:
      'Elige el tema y te lo explico en lenguaje claro (sin humo técnico innecesario):',
    buttonText: 'Temas',
    sections: [
      {
        title: 'Aprende y decide',
        rows: [
          { id: 'tip_ahorro_factura', title: 'Ahorrar en la factura', description: 'On-grid y dimensionamiento' },
          { id: 'tip_backup', title: 'Cortes de luz', description: 'Híbrido y baterías' },
          { id: 'tip_offgrid', title: 'Finca / sin red', description: 'Off-grid bien hecho' },
          { id: 'tip_paneles', title: 'Paneles', description: 'Qué mirar al comprar' },
          { id: 'tip_inversores', title: 'Inversores', description: 'On-grid vs híbrido' },
          { id: 'tip_baterias', title: 'Baterías', description: 'Litio y autonomía' },
          { id: 'tip_precios', title: 'Cómo se cotiza', description: 'Tienda vs proyecto' },
        ],
      },
    ],
    cfg,
  });
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

  if (n === 'menu' || n === 'hola' || n === 'inicio' || n === 'bot' || id === 'menu_root') {
    const s = session(from);
    s.step = 'idle';
    delete s.humanUntil;
    await sendMainMenu(from, cfg);
    return;
  }

  if (isHuman(from) && n !== 'menu' && id !== 'menu_root') {
    return;
  }

  // Objetivos de descubrimiento comercial
  if (id === 'obj_ahorro' || n.includes('ahorrar') || n === 'ahorro') {
    await startDiscovery(from, 'ahorro', cfg);
    return;
  }
  if (id === 'obj_respaldo' || n.includes('respaldo') || n.includes('corte')) {
    await startDiscovery(from, 'respaldo', cfg);
    return;
  }
  if (id === 'obj_finca' || n.includes('finca') || n.includes('offgrid') || n.includes('off grid')) {
    await startDiscovery(from, 'finca', cfg);
    return;
  }

  if (id === 'menu_aprender' || n === 'aprender' || n === 'guia' || n === 'guía') {
    await sendLearnMenu(from, cfg);
    return;
  }

  if (id.startsWith('tip_')) {
    const tipId = id.slice(4);
    const found = SOLAR_TIPS.find((t) => t.id === tipId);
    if (found) {
      await sendTip(from, found, cfg);
      return;
    }
  }

  if (id === 'menu_tienda' || n === 'tienda' || n === '1' || n === 'comprar') {
    await sendText({
      to: from,
      body:
        'Si ya tienes instalador o sabes exactamente qué equipo necesitas, la *tienda* es el camino más rápido: precios publicados y envío nacional.\n\n' +
        `👉 ${cfg.siteUrl}/tienda\n\n` +
        'Si aún no tienes claro el *tipo de sistema* (ahorro vs respaldo vs finca), te recomiendo cotizar proyecto: evita comprar de más o incompatible.',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Seguro de lo que necesitas?',
      buttons: [
        { id: 'menu_tienda', title: 'Abrir tienda' },
        { id: 'menu_proyecto', title: 'Mejor cotizar' },
        { id: 'menu_aprender', title: 'Explicame' },
      ],
      cfg,
    });
    // Abrir tienda = segundo toque; primer toque ya explicó
    return;
  }

  if (id === 'menu_proyecto' || n === 'proyecto' || n === 'cotizar' || n === '2') {
    const s = session(from);
    const obj = s.data.objetivo || 'ahorro';
    await startDiscovery(from, obj, cfg);
    return;
  }

  if (id === 'menu_asesor' || n === 'asesor' || n === 'humano' || n === 'persona' || n === '4') {
    markHuman(from);
    await notifyOwner(
      `👤 *Cliente pide asesor*\nWhatsApp: +${from}\nMensaje: ${text || '(tocó Hablar con asesor)'}`,
      cfg
    );
    await sendText({
      to: from,
      body:
        'Listo. Un *asesor humano de Reiki* te atenderá en este chat.\n\n' +
        'Horario orientativo: Lun–Sáb 8:00–18:00 (Medellín).\n' +
        'Si puedes, deja en un mensaje: *ciudad + qué necesitas* (ahorro, respaldo o equipos).\n\n' +
        '_Escribe *menu* para volver al asistente._',
      cfg,
    });
    return;
  }

  // Flujo descubrimiento (5 pasos)
  const s = session(from);

  if (s.step === 'disc_nombre') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me compartes tu nombre, por favor?', cfg });
      return;
    }
    s.data.nombre = text.slice(0, 80);
    s.step = 'disc_ciudad';
    await sendText({
      to: from,
      body: `Gracias, *${s.data.nombre}*.\n\n2️⃣ ¿En qué *ciudad* está el proyecto?`,
      cfg,
    });
    return;
  }

  if (s.step === 'disc_ciudad') {
    if (text.length < 2) {
      await sendText({ to: from, body: 'Indica la ciudad (ej. Medellín, Bogotá, Cali…).', cfg });
      return;
    }
    s.data.ciudad = text.slice(0, 80);
    s.step = 'disc_tipo';
    await sendButtons({
      to: from,
      body: '3️⃣ ¿Qué tipo de instalación es?',
      buttons: [
        { id: 'tipo_hogar', title: 'Hogar' },
        { id: 'tipo_comercio', title: 'Comercio' },
        { id: 'tipo_industria', title: 'Industria/finca' },
      ],
      cfg,
    });
    return;
  }

  if (s.step === 'disc_tipo') {
    if (id === 'tipo_hogar') s.data.tipo = 'Hogar';
    else if (id === 'tipo_comercio') s.data.tipo = 'Comercio';
    else if (id === 'tipo_industria') s.data.tipo = 'Industria/finca';
    else if (text) s.data.tipo = text.slice(0, 40);
    else {
      await sendText({ to: from, body: 'Elige Hogar, Comercio o Industria/finca.', cfg });
      return;
    }
    s.step = 'disc_consumo';
    await sendText({
      to: from,
      body:
        '4️⃣ ¿Cuál es tu *factura de luz aprox.* o el *consumo mensual (kWh)*?\n\n' +
        'Ejemplos: `$350.000` o `420 kWh`\n' +
        '_Si no lo sabes, escribe “no sé” y lo estimamos contigo._',
      cfg,
    });
    return;
  }

  if (s.step === 'disc_consumo') {
    if (text.length < 1) {
      await sendText({ to: from, body: 'Cuéntame factura o kWh (aunque sea aproximado).', cfg });
      return;
    }
    s.data.consumo = text.slice(0, 80);
    s.step = 'disc_urgencia';
    await sendButtons({
      to: from,
      body: '5️⃣ ¿Con qué urgencia quieres avanzar?',
      buttons: [
        { id: 'urg_ya', title: 'Esta semana' },
        { id: 'urg_mes', title: 'Este mes' },
        { id: 'urg_explorar', title: 'Solo explorando' },
      ],
      cfg,
    });
    return;
  }

  if (s.step === 'disc_urgencia' || id.startsWith('urg_')) {
    if (id === 'urg_ya') s.data.urgencia = 'Esta semana';
    else if (id === 'urg_mes') s.data.urgencia = 'Este mes';
    else if (id === 'urg_explorar') s.data.urgencia = 'Explorando';
    else if (text) s.data.urgencia = text.slice(0, 40);
    else {
      await sendText({ to: from, body: 'Elige la urgencia con los botones.', cfg });
      return;
    }
    await finishDiscovery(from, cfg);
    return;
  }

  // Compat: old proyecto_* steps if any warm session
  if (s.step?.startsWith('proyecto_')) {
    s.step = 'idle';
    s.data = {};
  }

  // Intento de expertise por texto libre
  if (text && !id) {
    const tip = matchSolarTip(n);
    if (tip) {
      console.log('[whatsapp-bot] tip matched', tip.id, 'from', from);
      await sendTip(from, tip, cfg);
      return;
    }
    console.log('[whatsapp-bot] unmatched intent', n.slice(0, 80), 'from', from);
  }

  if (!text && !id) return;
  await sendMainMenu(from, cfg);
}

/**
 * Extrae mensajes útiles del webhook Meta.
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
