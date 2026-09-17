/**
 * Conversación del bot Reiki (saludo, FAQ, captación de proyecto → humano).
 * Estado en memoria del proceso (suficiente para volumen bajo en Vercel warm).
 */
import { getWhatsAppConfig, sendText, sendButtons, sendList, notifyOwner } from './whatsapp.js';

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

async function sendMenu(from, cfg) {
  await sendList({
    to: from,
    body:
      'Hola, soy el asistente de *Reiki Energía Solar* ☀️\n\n' +
      'Puedo orientarte con la tienda o dejar listo tu caso para que un asesor te cotice el proyecto.\n\n' +
      'Elige una opción:',
    buttonText: 'Menú',
    sections: [
      {
        title: '¿Qué necesitas?',
        rows: [
          { id: 'menu_tienda', title: 'Tienda / equipos', description: 'Precios publicados y envío' },
          { id: 'menu_proyecto', title: 'Proyecto llave en mano', description: 'Diseño e instalación' },
          { id: 'menu_faq', title: 'Preguntas frecuentes', description: 'Zona, pagos, tiempos' },
          { id: 'menu_asesor', title: 'Hablar con asesor', description: 'Atención personalizada' },
        ],
      },
    ],
    cfg,
  });
}

async function sendFaqMenu(from, cfg) {
  await sendButtons({
    to: from,
    body: 'Preguntas frecuentes — elige una:',
    buttons: [
      { id: 'faq_zona', title: 'Cobertura' },
      { id: 'faq_pago', title: 'Pagos' },
      { id: 'faq_mas', title: 'Más dudas' },
    ],
    cfg,
  });
}

async function answerFaq(from, id, cfg) {
  const site = cfg.siteUrl;
  if (id === 'faq_zona') {
    await sendText({
      to: from,
      body:
        'Operamos desde *Medellín* con cobertura en *toda Colombia*.\n\n' +
        '• Equipos: envío nacional desde la tienda.\n' +
        '• Proyectos llave en mano: cotizamos según tu ciudad.\n\n' +
        `Más info: ${site}`,
      cfg,
    });
  } else if (id === 'faq_pago') {
    await sendText({
      to: from,
      body:
        'En la tienda online puedes pagar con *Wompi* (tarjetas, PSE, Nequi, Bancolombia) o *Addi* (cuotas).\n\n' +
        'Proyectos llave en mano se cotizan aparte con un asesor.',
      cfg,
    });
  } else {
    await sendText({
      to: from,
      body:
        'También puedes preguntarme por:\n' +
        '• *tienda* — equipos con precio publicado\n' +
        '• *proyecto* — instalación de punta a punta\n' +
        '• *asesor* — te atiende una persona\n\n' +
        `Tienda: ${site}/tienda\nContacto: ${site}/contacto`,
      cfg,
    });
  }
  await sendButtons({
    to: from,
    body: '¿Qué sigue?',
    buttons: [
      { id: 'menu_proyecto', title: 'Cotizar proyecto' },
      { id: 'menu_tienda', title: 'Ver tienda' },
      { id: 'menu_asesor', title: 'Hablar asesor' },
    ],
    cfg,
  });
}

async function startProject(from, cfg) {
  const s = session(from);
  s.step = 'proyecto_nombre';
  s.data = {};
  await sendText({
    to: from,
    body:
      'Perfecto. Para que un asesor te atienda bien, te haré *4 preguntas cortas*.\n\n' +
      '1️⃣ ¿Cuál es tu *nombre*?',
    cfg,
  });
}

async function finishProject(from, cfg) {
  const s = session(from);
  const d = s.data;
  const summary =
    `🔋 *LEAD PROYECTO — WhatsApp Bot*\n\n` +
    `Nombre: ${d.nombre || '—'}\n` +
    `WhatsApp cliente: +${from}\n` +
    `Ciudad: ${d.ciudad || '—'}\n` +
    `Tipo: ${d.tipo || '—'}\n` +
    `Consumo/factura: ${d.consumo || '—'}\n\n` +
    `_El cliente pidió atención personalizada._`;

  await notifyOwner(summary, cfg);
  markHuman(from);

  await sendText({
    to: from,
    body:
      `Gracias, *${d.nombre || 'listo'}*. Ya tengo tu info.\n\n` +
      'Un asesor de Reiki te escribirá por este mismo chat para cotizar tu proyecto de forma personalizada.\n\n' +
      'Si quieres, mientras tanto puedes ver equipos en:\n' +
      `${cfg.siteUrl}/tienda`,
    cfg,
  });
  s.step = 'human';
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

  // Reanudar bot
  if (n === 'menu' || n === 'hola' || n === 'inicio' || n === 'bot') {
    const s = session(from);
    s.step = 'idle';
    delete s.humanUntil;
    await sendMenu(from, cfg);
    return;
  }

  if (isHuman(from) && n !== 'menu' && id !== 'menu_root') {
    // Silencio: ya lo atiende el asesor (salvo que pida menú)
    return;
  }

  // Interactive IDs
  if (id === 'menu_tienda' || n === 'tienda' || n === '1') {
    await sendText({
      to: from,
      body:
        'En nuestra tienda encuentras paneles, inversores, baterías y más *con precio publicado* y envío a todo el país.\n\n' +
        `👉 ${cfg.siteUrl}/tienda\n\n` +
        'Si ya tienes instalador, compra ahí. Si necesitas el sistema completo, elige *Proyecto llave en mano*.',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Te ayudo con algo más?',
      buttons: [
        { id: 'menu_proyecto', title: 'Proyecto' },
        { id: 'menu_asesor', title: 'Asesor' },
        { id: 'menu_faq', title: 'FAQ' },
      ],
      cfg,
    });
    return;
  }

  if (id === 'menu_proyecto' || n === 'proyecto' || n === 'cotizar' || n === '2') {
    await startProject(from, cfg);
    return;
  }

  if (id === 'menu_faq' || n === 'faq' || n === 'preguntas' || n === '3') {
    await sendFaqMenu(from, cfg);
    return;
  }

  if (id.startsWith('faq_')) {
    await answerFaq(from, id, cfg);
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
        'Listo. Un asesor te atenderá por este chat en cuanto pueda.\n\n' +
        'Horario orientativo: Lun–Sáb 8:00–18:00 (Medellín).\n' +
        'Si es urgente, deja tu ciudad y qué necesitas en un mensaje.',
      cfg,
    });
    return;
  }

  // Flujo proyecto (pasos)
  const s = session(from);
  if (s.step === 'proyecto_nombre') {
    if (text.length < 2) {
      await sendText({ to: from, body: 'Escribe tu nombre, por favor.', cfg });
      return;
    }
    s.data.nombre = text.slice(0, 80);
    s.step = 'proyecto_ciudad';
    await sendText({ to: from, body: '2️⃣ ¿En qué *ciudad* estás?', cfg });
    return;
  }

  if (s.step === 'proyecto_ciudad') {
    if (text.length < 2) {
      await sendText({ to: from, body: 'Indica tu ciudad (ej. Medellín, Bogotá…).', cfg });
      return;
    }
    s.data.ciudad = text.slice(0, 80);
    s.step = 'proyecto_tipo';
    await sendButtons({
      to: from,
      body: '3️⃣ ¿Qué tipo de proyecto es?',
      buttons: [
        { id: 'tipo_hogar', title: 'Hogar' },
        { id: 'tipo_comercio', title: 'Comercio' },
        { id: 'tipo_industria', title: 'Industria' },
      ],
      cfg,
    });
    return;
  }

  if (s.step === 'proyecto_tipo' || id.startsWith('tipo_')) {
    if (id === 'tipo_hogar') s.data.tipo = 'Hogar';
    else if (id === 'tipo_comercio') s.data.tipo = 'Comercio';
    else if (id === 'tipo_industria') s.data.tipo = 'Industria';
    else if (text) s.data.tipo = text.slice(0, 40);
    else {
      await sendText({ to: from, body: 'Elige Hogar, Comercio o Industria (botones) o escríbelo.', cfg });
      return;
    }
    s.step = 'proyecto_consumo';
    await sendText({
      to: from,
      body:
        '4️⃣ Última: ¿cuál es tu *consumo mensual aprox. (kWh)* o el valor de tu *factura de luz*?\n\n' +
        'Ejemplos: `350 kWh` o `$280.000`',
      cfg,
    });
    return;
  }

  if (s.step === 'proyecto_consumo') {
    if (text.length < 1) {
      await sendText({ to: from, body: 'Cuéntame consumo (kWh) o valor de factura, aunque sea aproximado.', cfg });
      return;
    }
    s.data.consumo = text.slice(0, 80);
    await finishProject(from, cfg);
    return;
  }

  // Primer mensaje / desconocido
  if (!text && !id) return;
  await sendMenu(from, cfg);
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
