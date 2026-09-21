/**
 * Bot comercial Reiki — captura clara nombre→ciudad (sin cruces) + aviso CallMeBot.
 */
import { getWhatsAppConfig, sendText, sendButtons, sendList, notifyOwner } from './whatsapp.js';
import { CONSULTANT_INTRO, SOLAR_TIPS, matchSolarTip } from './whatsapp-solar-kb.js';
import {
  getSession,
  saveSession,
  resetSession,
  normalizeText,
  isLikelyCity,
  isLikelyPersonName,
  extractPersonName,
} from './whatsapp-session.js';
import { clearAiPause, handleAiMessage, isAiPaused, isOpenAiConfigured } from './whatsapp-ai.js';

const HUMAN_MS = 12 * 60 * 60 * 1000;
const DISC_STEPS = new Set([
  'disc_nombre',
  'disc_ciudad',
  'disc_tipo',
  'disc_consumo',
  'disc_urgencia',
  'asesor_datos',
]);

/** Mapea botones/listas a intención en lenguaje natural para la IA */
function intentFromId(id) {
  const map = {
    obj_ahorro: 'Quiero dejar de pagar tanta energía / bajar mi factura de la luz',
    obj_respaldo: 'Se me va la energía, necesito respaldo por cortes de luz',
    obj_finca: 'Necesito un sistema solar para finca o un sitio sin red',
    menu_proyecto: 'Quiero cotizar un proyecto de instalación solar llave en mano',
    menu_tienda: 'Quiero ver o comprar equipos en la tienda online',
    menu_aprender: 'Explícame opciones de energía solar de forma sencilla',
    menu_asesor: 'Quiero hablar con un asesor humano de Reiki',
    menu_mas: 'Muéstrame más opciones de ayuda',
    menu_root: 'Hola, quiero empezar de nuevo',
    tip_ahorro_factura: 'Explícame cómo dejar de pagar tanta energía con paneles solares',
    tip_backup: 'Explícame qué hacer cuando se me va la energía',
    tip_offgrid: 'Explícame sistemas para finca o sin red',
    tip_paneles: 'Quiero información sobre paneles solares',
    tip_inversores: 'Quiero información sobre inversores',
    tip_baterias: 'Quiero información sobre baterías',
    tip_precios: 'Explícame cómo cotizan los precios',
    tipo_hogar: 'El proyecto es para casa u hogar',
    tipo_comercio: 'El proyecto es para un negocio o comercio',
    tipo_industria: 'El proyecto es para finca o industria',
    urg_ya: 'Quiero avanzar lo antes posible',
    urg_mes: 'Quiero avanzar este mes',
    urg_explorar: 'Todavía estoy explorando opciones',
  };
  return map[id] || '';
}

async function replyWithAi(from, cfg, userText, { withQuickMenu = false } = {}) {
  try {
    const result = await handleAiMessage(from, userText);
    if (result.paused) {
      const s = getSession(from);
      markHuman(from, s);
    }
    if (result.text) {
      await sendText({ to: from, body: result.text, cfg });
    }
    if (withQuickMenu && !result.paused) {
      await sendButtons({
        to: from,
        body: 'También puedes tocar una opción rápida:',
        buttons: [
          { id: 'obj_ahorro', title: 'Dejar de pagar luz' },
          { id: 'obj_respaldo', title: 'Se me va la energía' },
          { id: 'menu_asesor', title: 'Hablar con asesor' },
        ],
        cfg,
      });
    }
    return true;
  } catch (err) {
    console.error('[whatsapp-bot] OpenAI fallback a reglas:', err?.message || err);
    return false;
  }
}

function firstName(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
}

function isGreeting(n) {
  return /^(hola|buenas|buen[oa]s?\s*(dias|días|tardes|noches)?|hey|hi|holi|saludos|menu|inicio|bot)\b/.test(
    n
  );
}

function formatLeadSummary(from, data = {}, titulo = 'LEAD COMERCIAL') {
  const d = data || {};
  return (
    `${titulo}\n` +
    `WhatsApp: +${from}\n` +
    `Nombre: ${d.nombre || '—'}\n` +
    `Ciudad: ${d.ciudad || '—'}\n` +
    `Objetivo: ${d.objetivo || '—'}\n` +
    `Tipo: ${d.tipo || '—'}\n` +
    `Factura/consumo: ${d.consumo || '—'}\n` +
    `Urgencia: ${d.urgencia || '—'}\n` +
    `Necesidad: ${d.necesidad || '—'}`
  );
}

function markHuman(from, s) {
  s.step = 'human';
  s.humanUntil = Date.now() + HUMAN_MS;
  saveSession(from, s);
}

async function handoffToHuman(from, cfg, s, titulo) {
  await notifyOwner(formatLeadSummary(from, s.data, titulo || 'LEAD asesor'), cfg);
  markHuman(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      (name ? `Listo, *${name}*. ` : 'Listo. ') +
      'Ya avisé a un asesor de Reiki. Te escribirán por este mismo chat.\n\n' +
      'Horario: lunes a sábado, 8:00 a 18:00 (Medellín).\n\n' +
      'Si quieres volver con el asistente después, escribe *hola*.',
    cfg,
  });
}

async function sendMainMenu(from, cfg) {
  await sendText({ to: from, body: CONSULTANT_INTRO, cfg });
  await sendList({
    to: from,
    body: 'Si prefieres, elige una opción y seguimos por ahí 👇',
    buttonText: 'Ver opciones',
    sections: [
      {
        title: '¿Qué necesitas?',
        rows: [
          {
            id: 'obj_ahorro',
            title: 'Dejar de pagar energía',
            description: 'Quiero dejar de pagar energía',
          },
          {
            id: 'obj_respaldo',
            title: 'Se me va la energía',
            description: 'Cortes y respaldo',
          },
          {
            id: 'menu_mas',
            title: 'Otras opciones',
            description: 'Tienda, cotizar o asesor',
          },
        ],
      },
    ],
    cfg,
  });
}

async function sendMoreOptions(from, cfg) {
  await sendList({
    to: from,
    body: 'Claro, aquí tienes más opciones:',
    buttonText: 'Ver más',
    sections: [
      {
        title: 'Más opciones',
        rows: [
          { id: 'obj_finca', title: 'Finca / sin red', description: 'Sistema aislado' },
          { id: 'menu_proyecto', title: 'Cotizar instalación', description: 'Llave en mano' },
          { id: 'menu_tienda', title: 'Ver la tienda', description: 'Equipos con precio' },
          { id: 'menu_aprender', title: 'Explícame un poco', description: 'Orientación clara' },
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
    buttons: [
      { id: 'menu_proyecto', title: 'Sí, cotizar' },
      { id: 'menu_tienda', title: 'Ir a la tienda' },
      { id: 'menu_asesor', title: 'Hablar con asesor' },
    ],
    cfg,
  });
}

async function askNombre(from, cfg, blurb) {
  const s = getSession(from);
  s.step = 'disc_nombre';
  saveSession(from, s);
  await sendText({
    to: from,
    body:
      (blurb ? `${blurb}\n\n` : '') +
      'Para cotizarte bien, ¿cuál es tu *nombre*?\n\n' +
      '_Responde solo el nombre, por ejemplo: Alex_',
    cfg,
  });
}

async function askCiudad(from, cfg) {
  const s = getSession(from);
  s.step = 'disc_ciudad';
  saveSession(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      `Gracias, *${name}*.\n\n` +
      'Ahora sí: ¿en qué *ciudad* está el proyecto?\n\n' +
      '_Solo la ciudad, por ejemplo: Bogotá_',
    cfg,
  });
}

async function startDiscovery(from, objetivo, cfg) {
  const s = getSession(from);
  s.data.objetivo = objetivo || s.data.objetivo || 'ahorro';
  saveSession(from, s);

  const blurb =
    s.data.objetivo === 'ahorro'
      ? 'Perfecto. Vamos a trabajar en cómo *dejar de pagar tanta energía* con un sistema a tu medida.'
      : s.data.objetivo === 'respaldo'
        ? 'Perfecto. Vamos a armar un respaldo confiable para cuando *se te va la energía*.'
        : 'Perfecto. En finca o sin red dimensionamos el sistema con cuidado.';

  if (!s.data.nombre) {
    await askNombre(from, cfg, blurb);
    return;
  }
  if (!s.data.ciudad) {
    await askCiudad(from, cfg);
    return;
  }
  await askTipo(from, cfg);
}

async function askTipo(from, cfg) {
  const s = getSession(from);
  s.step = 'disc_tipo';
  saveSession(from, s);
  await sendButtons({
    to: from,
    body: `Quedó: *${s.data.nombre}* en *${s.data.ciudad}*. ¿El proyecto es para…?`,
    buttons: [
      { id: 'tipo_hogar', title: 'Casa / hogar' },
      { id: 'tipo_comercio', title: 'Negocio' },
      { id: 'tipo_industria', title: 'Finca / industria' },
    ],
    cfg,
  });
}

async function finishDiscovery(from, cfg) {
  const s = getSession(from);
  await notifyOwner(formatLeadSummary(from, s.data, 'LEAD COTIZACION'), cfg);
  markHuman(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      `Muchas gracias, *${name}*. Ya tengo tus datos:\n` +
      `• Ciudad: *${s.data.ciudad}*\n` +
      `• Tipo: *${s.data.tipo || '—'}*\n` +
      `• Consumo/factura: *${s.data.consumo || '—'}*\n\n` +
      'Un asesor de Reiki te escribe por este chat con la cotización.\n\n' +
      `Mientras tanto puedes mirar equipos: ${cfg.siteUrl}/tienda\n\n` +
      'Para volver al asistente: *hola*.',
    cfg,
  });
}

async function startAsesorCapture(from, cfg) {
  const s = getSession(from);
  await notifyOwner(
    `ALERTA: pidió asesor\nWhatsApp: +${from}\nNombre: ${s.data.nombre || 'pendiente'}\nCiudad: ${s.data.ciudad || 'pendiente'}`,
    cfg
  );

  if (s.data.nombre && s.data.ciudad) {
    s.data.necesidad = s.data.necesidad || s.data.objetivo || 'Hablar con asesor';
    await handoffToHuman(from, cfg, s, 'LEAD asesor');
    return;
  }

  s.step = 'asesor_datos';
  saveSession(from, s);
  await sendText({
    to: from,
    body:
      'Con gusto te conecto con un asesor.\n\n' +
      'Escríbeme en *un solo mensaje* así:\n' +
      '*Nombre, Ciudad, Qué necesitas*\n\n' +
      'Ejemplo:\n' +
      'Alex, Bogotá, paneles para mi casa',
    cfg,
  });
}

function parseDatosLinea(text) {
  const parts = String(text || '')
    .split(/[,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      nombre: extractPersonName(parts[0]).slice(0, 80),
      ciudad: parts[1].slice(0, 80),
      necesidad: parts.slice(2).join(', ').slice(0, 200) || 'Hablar con asesor',
    };
  }
  return null;
}

async function sendLearnMenu(from, cfg) {
  await sendList({
    to: from,
    body: 'Con gusto. Elige el tema:',
    buttonText: 'Temas',
    sections: [
      {
        title: 'Orientación',
        rows: [
          { id: 'tip_ahorro_factura', title: 'Dejar de pagar energía', description: 'Cómo funciona' },
          { id: 'tip_backup', title: 'Se me va la energía', description: 'Respaldo' },
          { id: 'tip_offgrid', title: 'Finca / sin red', description: 'Aislado' },
          { id: 'tip_paneles', title: 'Paneles', description: 'Qué mirar' },
          { id: 'tip_inversores', title: 'Inversores', description: 'Cuál te sirve' },
          { id: 'tip_baterias', title: 'Baterías', description: 'Litio' },
          { id: 'tip_precios', title: 'Precios', description: 'Cómo cotizamos' },
        ],
      },
    ],
    cfg,
  });
}

/** @returns {Promise<boolean>} */
async function handleDiscoveryStep(from, text, id, cfg) {
  const s = getSession(from);
  if (!DISC_STEPS.has(s.step)) return false;

  if (s.step === 'asesor_datos') {
    const parsed = parseDatosLinea(text);
    if (!parsed || !parsed.nombre || !parsed.ciudad) {
      await sendText({
        to: from,
        body:
          'Te leo. Mándalo en este formato, por favor:\n' +
          '*Nombre, Ciudad, Qué necesitas*\n\n' +
          'Ejemplo: Alex, Medellín, cotizar sistema para casa',
        cfg,
      });
      return true;
    }
    s.data.nombre = parsed.nombre;
    s.data.ciudad = parsed.ciudad;
    s.data.necesidad = parsed.necesidad;
    saveSession(from, s);
    await handoffToHuman(from, cfg, s, 'LEAD asesor');
    return true;
  }

  if (s.step === 'disc_nombre') {
    if (isLikelyCity(text) && !/me llamo|soy |mi nombre/i.test(text)) {
      await sendText({
        to: from,
        body:
          `*${text.trim()}* parece una ciudad 🙂\n\n` +
          'Primero necesito tu *nombre* (solo el nombre).\n' +
          'Ejemplo: Alex',
        cfg,
      });
      return true;
    }
    if (!isLikelyPersonName(text) && text.length < 2) {
      await sendText({ to: from, body: '¿Me escribes tu nombre? Solo el nombre, ej: Alex', cfg });
      return true;
    }
    s.data.nombre = extractPersonName(text);
    saveSession(from, s);
    await askCiudad(from, cfg);
    return true;
  }

  if (s.step === 'disc_ciudad') {
    // Si mandó un nombre otra vez, no lo tomes como ciudad
    if (isLikelyPersonName(text) && !isLikelyCity(text) && text.split(/\s+/).length <= 2) {
      s.data.nombre = extractPersonName(text);
      saveSession(from, s);
      await sendText({
        to: from,
        body:
          `Perfecto, tu nombre es *${firstName(s.data.nombre)}*.\n\n` +
          'Ahora dime la *ciudad* del proyecto (solo la ciudad).',
        cfg,
      });
      return true;
    }
    if (text.length < 2) {
      await sendText({ to: from, body: '¿Me indicas la ciudad del proyecto?', cfg });
      return true;
    }
    s.data.ciudad = text.trim().slice(0, 80);
    saveSession(from, s);
    await askTipo(from, cfg);
    return true;
  }

  if (s.step === 'disc_tipo') {
    if (id === 'tipo_hogar') s.data.tipo = 'Hogar';
    else if (id === 'tipo_comercio') s.data.tipo = 'Comercio';
    else if (id === 'tipo_industria') s.data.tipo = 'Industria/finca';
    else if (text) s.data.tipo = text.slice(0, 40);
    else {
      await sendText({ to: from, body: 'Elige una opción: casa, negocio o finca/industria.', cfg });
      return true;
    }
    s.step = 'disc_consumo';
    saveSession(from, s);
    await sendText({
      to: from,
      body:
        '¿Cuánto te llega de *luz al mes* (aprox.)?\n\n' +
        'Ej: $350.000 o 420 kWh. Si no sabes, escribe: no sé',
      cfg,
    });
    return true;
  }

  if (s.step === 'disc_consumo') {
    s.data.consumo = (text || 'no sé').slice(0, 80);
    s.step = 'disc_urgencia';
    saveSession(from, s);
    await sendButtons({
      to: from,
      body: '¿Con qué prioridad quieres avanzar?',
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
      await sendText({ to: from, body: 'Toca una de las opciones de tiempo, por favor.', cfg });
      return true;
    }
    saveSession(from, s);
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
  const n = normalizeText(text);
  const s = getSession(from);
  const useAi = isOpenAiConfigured();

  if (id === 'menu_root' || isGreeting(n) || n === 'menu') {
    resetSession(from);
    clearAiPause(from);
    if (useAi) {
      const ok = await replyWithAi(from, cfg, text || 'Hola', { withQuickMenu: true });
      if (ok) return;
    }
    await sendMainMenu(from, cfg);
    return;
  }

  if ((s.step === 'human' && s.humanUntil && Date.now() < s.humanUntil) || isAiPaused(from)) {
    return;
  }
  if (s.step === 'human') {
    s.step = 'idle';
    delete s.humanUntil;
    saveSession(from, s);
  }

  // Si hay captura estructurada a medias, terminarla con reglas (anti-bucle)
  if (DISC_STEPS.has(s.step)) {
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  if (id.startsWith('tipo_')) {
    s.step = 'disc_tipo';
    saveSession(from, s);
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }
  if (id.startsWith('urg_')) {
    s.step = 'disc_urgencia';
    saveSession(from, s);
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  // Modo IA: conversación natural + tools (tienda, cotizar, humano)
  if (useAi) {
    const userText = intentFromId(id) || text;
    if (userText) {
      const ok = await replyWithAi(from, cfg, userText, {
        withQuickMenu: id === 'menu_mas',
      });
      if (ok) return;
    }
  }

  // ——— Fallback por reglas (sin OPENAI_API_KEY o si falló OpenAI) ———
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
        `Si ya sabes qué equipo necesitas, aquí está la tienda:\n${cfg.siteUrl}/tienda\n\n` +
        'Si aún no estás seguro del sistema, mejor cotizamos juntos.',
      cfg,
    });
    await sendButtons({
      to: from,
      body: '¿Cómo deseas continuar?',
      buttons: [
        { id: 'menu_tienda', title: 'Abrir tienda' },
        { id: 'menu_proyecto', title: 'Mejor cotizar' },
        { id: 'menu_asesor', title: 'Hablar asesor' },
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
    await startAsesorCapture(from, cfg);
    return;
  }

  if (text && !id && s.step === 'idle') {
    const tip = matchSolarTip(n);
    const shortBuy =
      n.length <= 48 &&
      /\b(quiero|necesito|cotiz|proyecto|ahorrar|energia|energía|respaldo|finca)\b/.test(n);

    if (/\b(finca|offgrid|sin red)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'finca', cfg);
      return;
    }
    if (/\b(respaldo|corte|se me va)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'respaldo', cfg);
      return;
    }
    if (/\b(ahorrar|pagar energia|pagar energía|factura)\b/.test(n) && shortBuy) {
      await startDiscovery(from, 'ahorro', cfg);
      return;
    }
    if (tip) {
      await sendTip(from, tip, cfg);
      return;
    }
    await sendText({
      to: from,
      body: 'Con gusto te ayudo 🙂 ¿Quieres dejar de pagar tanta energía, tienes cortes, o buscas un equipo?',
      cfg,
    });
    await sendMainMenu(from, cfg);
    return;
  }

  if (!text && !id) return;
  await sendMainMenu(from, cfg);
}

export function extractInboundMessages(body) {
  /** @type {{ from: string, text?: string, buttonId?: string, listId?: string }[]} */
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const m of value.messages) {
        const from = m.from;
        if (m.type === 'text') out.push({ from, text: m.text?.body || '' });
        else if (m.type === 'interactive') {
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
