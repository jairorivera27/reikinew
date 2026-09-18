/**
 * Bot comercial Reiki — conversación natural, amigable y orientada a la venta.
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

function firstName(nombre) {
  const n = String(nombre || '').trim().split(/\s+/)[0];
  return n || '';
}

function isGreeting(n) {
  return /^(hola|buenas|buen[oa]s?\s*(dias|días|tardes|noches)?|hey|hi|holi|saludos|menu|inicio|bot)\b/.test(
    n
  );
}

async function sendMainMenu(from, cfg) {
  await sendText({ to: from, body: CONSULTANT_INTRO, cfg });
  await sendButtons({
    to: from,
    body: 'Elige lo que más se parece a lo que buscas (o escríbeme con tus palabras):',
    buttons: [
      { id: 'obj_ahorro', title: 'Bajar la factura' },
      { id: 'obj_respaldo', title: 'Ya no más cortes' },
      { id: 'menu_mas', title: 'Otras opciones' },
    ],
    cfg,
  });
}

async function sendMoreOptions(from, cfg) {
  await sendList({
    to: from,
    body: 'Claro, mira qué te sirve mejor ahora mismo:',
    buttonText: 'Ver más',
    sections: [
      {
        title: '¿Qué necesitas?',
        rows: [
          { id: 'obj_finca', title: 'Finca / sin red', description: 'Sistema aislado' },
          { id: 'menu_proyecto', title: 'Cotizar instalación', description: 'Llave en mano' },
          { id: 'menu_tienda', title: 'Ver la tienda', description: 'Equipos con precio' },
          { id: 'menu_aprender', title: 'Explícame un poco', description: 'Sin tecnicismos' },
          { id: 'menu_asesor', title: 'Hablar con alguien', description: 'Asesor Reiki' },
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
    .replace(/Catálogo: \//, `Míralos aquí: ${site}/`);
  await sendText({ to: from, body: body, cfg });

  if (tip.cta === 'tienda') {
    await sendButtons({
      to: from,
      body: '¿Qué prefieres hacer?',
      buttons: [
        { id: 'menu_tienda', title: 'Ver tienda' },
        { id: 'menu_proyecto', title: 'Cotizar sistema' },
        { id: 'menu_asesor', title: 'Hablar con ustedes' },
      ],
      cfg,
    });
  } else if (tip.cta === 'asesor') {
    await sendButtons({
      to: from,
      body: '¿Te conecto con un asesor?',
      buttons: [
        { id: 'menu_asesor', title: 'Sí, por favor' },
        { id: 'menu_proyecto', title: 'Mejor cotizar' },
        { id: 'menu_root', title: 'Empezar de nuevo' },
      ],
      cfg,
    });
  } else {
    await sendButtons({
      to: from,
      body: 'Si te late, en 1 minutito te dejo listo para una cotización real 👇',
      buttons: [
        { id: 'menu_proyecto', title: 'Sí, cotícenme' },
        { id: 'menu_aprender', title: 'Cuéntame más' },
        { id: 'menu_asesor', title: 'Hablar con alguien' },
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
      ? 'Genial — vamos a mirar cómo *bajar esa factura* sin venderte un kit que no te sirve.'
      : objetivo === 'respaldo'
        ? 'Perfecto — vamos a cuidar que no te quedes sin lo importante cuando se vaya la luz.'
        : 'Listo — en finca/sin red hay que dimensionar bien para que no te quedes corto (ni te gastes de más).';

  await sendText({
    to: from,
    body:
      `${blurb}\n\n` +
      'Para orientarte bien solo necesito unos datos rapiditos (como si habláramos en la oficina).\n\n' +
      '¿Cómo te llamas?',
    cfg,
  });
}

async function finishDiscovery(from, cfg) {
  const s = session(from);
  const d = s.data;
  const name = firstName(d.nombre);
  const summary =
    `☀️ *LEAD COMERCIAL — WhatsApp*\n\n` +
    `Objetivo: ${d.objetivo || '—'}\n` +
    `Nombre: ${d.nombre || '—'}\n` +
    `WhatsApp: +${from}\n` +
    `Ciudad: ${d.ciudad || '—'}\n` +
    `Tipo: ${d.tipo || '—'}\n` +
    `Factura/consumo: ${d.consumo || '—'}\n` +
    `Urgencia: ${d.urgencia || '—'}`;

  await notifyOwner(summary, cfg);
  markHuman(from);

  const tip =
    d.objetivo === 'respaldo'
      ? 'Con lo que me contaste, lo más probable es revisar un *híbrido con batería* según lo que quieras mantener prendido.'
      : d.objetivo === 'finca'
        ? 'En tu caso vamos a validar consumo y autonomía antes de hablar de equipos sueltos.'
        : 'Con tu factura/consumo podemos estimar un sistema on-grid a tu medida.';

  await sendText({
    to: from,
    body:
      (name ? `¡Gracias, *${name}*! ` : '¡Gracias! ') +
      `Ya tengo lo importante.\n\n` +
      `${tip}\n\n` +
      'En un momento un *asesor de Reiki* te escribe por aquí con la orientación y la cotización.\n\n' +
      'Si quieres ir mirando equipos mientras tanto:\n' +
      `${cfg.siteUrl}/tienda\n\n` +
      'Cuando quieras volver a hablar conmigo, escribe *hola*.',
    cfg,
  });
  s.step = 'human';
}

async function sendLearnMenu(from, cfg) {
  await sendList({
    to: from,
    body: 'Claro — dime qué te intriga y te lo cuento fácil, sin enrollarte:',
    buttonText: 'Temas',
    sections: [
      {
        title: 'Te lo explico fácil',
        rows: [
          { id: 'tip_ahorro_factura', title: 'Bajar la factura', description: 'Cómo funciona' },
          { id: 'tip_backup', title: 'Cuando hay cortes', description: 'Respaldo real' },
          { id: 'tip_offgrid', title: 'Finca / sin red', description: 'Sistema aislado' },
          { id: 'tip_paneles', title: 'Paneles', description: 'Qué mirar' },
          { id: 'tip_inversores', title: 'Inversores', description: 'Cuál te sirve' },
          { id: 'tip_baterias', title: 'Baterías', description: 'Litio y autonomía' },
          { id: 'tip_precios', title: 'Precios', description: 'Cómo cotizamos' },
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

  if (id === 'menu_root' || isGreeting(n) || n === 'menu') {
    const s = session(from);
    s.step = 'idle';
    delete s.humanUntil;
    await sendMainMenu(from, cfg);
    return;
  }

  if (isHuman(from) && n !== 'menu' && id !== 'menu_root') {
    return;
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

  // Texto libre: primero asesoría natural; si es intención corta de compra, cotizar
  if (text && !id) {
    const tip = matchSolarTip(n);
    const shortBuy =
      n.length <= 48 &&
      /\b(quiero|necesito|me gustaria|me gustaría|cotiz|proyecto|ahorrar|respaldo|finca)\b/.test(n);

    if (tip && !shortBuy) {
      console.log('[whatsapp-bot] tip matched', tip.id, 'from', from);
      await sendTip(from, tip, cfg);
      return;
    }
    if (/\b(finca|offgrid|off grid|sin red)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'finca', cfg);
      return;
    }
    if (/\b(respaldo|corte|cortes|apagon|apagón)\b/.test(n) && (shortBuy || !tip)) {
      await startDiscovery(from, 'respaldo', cfg);
      return;
    }
    if (/\b(ahorrar|ahorro|bajar (la )?factura)\b/.test(n) && (shortBuy || !tip)) {
      await startDiscovery(from, 'ahorro', cfg);
      return;
    }
    if (tip) {
      await sendTip(from, tip, cfg);
      return;
    }
  }

  if (/\b(aprender|explic|guia|guía)\b/.test(n)) {
    await sendLearnMenu(from, cfg);
    return;
  }

  if (id === 'menu_tienda' || n === 'tienda' || n === 'comprar') {
    await sendText({
      to: from,
      body:
        'Si ya sabes qué equipo necesitas (o tienes instalador), la tienda es lo más rápido: precios claros y envío a todo el país.\n\n' +
        `Aquí la tienes: ${cfg.siteUrl}/tienda\n\n` +
        'Si todavía no estás seguro del *tipo de sistema*, mejor te cotizamos: así no compras algo que después no encaja.',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Cómo quieres seguir?',
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
    const s = session(from);
    await startDiscovery(from, s.data.objetivo || 'ahorro', cfg);
    return;
  }

  if (id === 'menu_asesor' || n === 'asesor' || n === 'humano' || n === 'persona') {
    markHuman(from);
    await notifyOwner(
      `👤 *Cliente pide asesor*\nWhatsApp: +${from}\nMensaje: ${text || '(pidió hablar con alguien)'}`,
      cfg
    );
    await sendText({
      to: from,
      body:
        'Listo 🙂 En breve alguien del equipo te escribe por este mismo chat.\n\n' +
        'Horario aproximado: Lun–Sáb 8:00–18:00 (Medellín).\n\n' +
        'Si puedes, déjame en un mensajito tu *ciudad* y qué necesitas — así te atienden más rápido.\n\n' +
        'Si quieres volver conmigo después, escribe *hola*.',
      cfg,
    });
    return;
  }

  const s = session(from);

  if (s.step === 'disc_nombre') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me dices tu nombre? Así te hablo de tú a tú 🙂', cfg });
      return;
    }
    s.data.nombre = text.slice(0, 80);
    s.step = 'disc_ciudad';
    const name = firstName(s.data.nombre);
    await sendText({
      to: from,
      body: `Encantado, *${name}*.\n\n¿En qué ciudad está el proyecto?`,
      cfg,
    });
    return;
  }

  if (s.step === 'disc_ciudad') {
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me dices la ciudad? (ej. Medellín, Bogotá, Cali…)', cfg });
      return;
    }
    s.data.ciudad = text.slice(0, 80);
    s.step = 'disc_tipo';
    await sendButtons({
      to: from,
      body: `¡Nice! *${s.data.ciudad}*. ¿Esto es para casa, negocio o algo más grande?`,
      buttons: [
        { id: 'tipo_hogar', title: 'Casa / hogar' },
        { id: 'tipo_comercio', title: 'Negocio' },
        { id: 'tipo_industria', title: 'Finca / industria' },
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
      await sendText({ to: from, body: '¿Me ayudas con un toque? Casa, negocio o finca/industria.', cfg });
      return;
    }
    s.step = 'disc_consumo';
    await sendText({
      to: from,
      body:
        'Última cosa importante: ¿cuánto te llega más o menos de *luz al mes*?\n\n' +
        'Puede ser en pesos (ej. $350.000) o en kWh. Si no lo tienes a la mano, escribe *no sé* y lo estimamos juntos.',
      cfg,
    });
    return;
  }

  if (s.step === 'disc_consumo') {
    if (text.length < 1) {
      await sendText({ to: from, body: '¿Me das un aproximado de la factura o del consumo? Con “no sé” también sirve.', cfg });
      return;
    }
    s.data.consumo = text.slice(0, 80);
    s.step = 'disc_urgencia';
    await sendButtons({
      to: from,
      body: '¿Y tú cómo lo ves de tiempo? Así sabemos si te priorizamos esta semana.',
      buttons: [
        { id: 'urg_ya', title: 'Lo antes posible' },
        { id: 'urg_mes', title: 'Este mes' },
        { id: 'urg_explorar', title: 'Estoy mirando' },
      ],
      cfg,
    });
    return;
  }

  if (s.step === 'disc_urgencia' || id.startsWith('urg_')) {
    if (id === 'urg_ya') s.data.urgencia = 'Lo antes posible';
    else if (id === 'urg_mes') s.data.urgencia = 'Este mes';
    else if (id === 'urg_explorar') s.data.urgencia = 'Explorando';
    else if (text) s.data.urgencia = text.slice(0, 40);
    else {
      await sendText({ to: from, body: '¿Me tocas una de las opciones de tiempo? Así te organizamos mejor.', cfg });
      return;
    }
    await finishDiscovery(from, cfg);
    return;
  }

  if (s.step?.startsWith('proyecto_')) {
    s.step = 'idle';
    s.data = {};
  }

  if (text && !id) {
    console.log('[whatsapp-bot] unmatched intent', n.slice(0, 80), 'from', from);
    await sendText({
      to: from,
      body:
        'Te leo 🙂 Para ayudarte mejor, cuéntame si quieres *bajar la factura*, *respaldo por cortes*, o *comprar un equipo*.\n\n' +
        'También puedes tocar una opción:',
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
