/**
 * Bot comercial Reiki — captura clara nombre→ciudad (sin cruces) + aviso CallMeBot.
 */
import {
  getWhatsAppConfig,
  sendText,
  sendButtons,
  sendList,
  notifyOwner,
  isBsuid,
  parsePhoneCo,
  formatClientContact,
} from './whatsapp.js';
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
import { clearAiPause, handleAiMessage, isAiPaused, isOpenAiConfigured, shouldSkipResumenAsk } from './whatsapp-ai.js';

const HUMAN_MS = 12 * 60 * 60 * 1000;
const DISC_STEPS = new Set([
  'disc_nombre',
  'disc_ciudad',
  'disc_tipo',
  'disc_consumo',
  'disc_urgencia',
  'asesor_datos',
  'asesor_nombre',
  'asesor_ciudad',
  'asesor_celular',
  'asesor_resumen',
]);

const ASESOR_CAPTURE_STEPS = new Set([
  'asesor_nombre',
  'asesor_ciudad',
  'asesor_celular',
  'asesor_resumen',
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
    menu_asesor:
      'Quiero hablar con el ingeniero de diseño fotovoltaico para un mejor asesoramiento sin costo.',
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
          { id: 'menu_asesor', title: 'Ing. diseño solar' },
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
  const t = String(n || '')
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .trim();
  return /^(hola|buenas|buen[oa]s?\s*(dias|días|tardes|noches)?|hey|hi|holi|saludos|menu|inicio|bot|hello)\b/.test(
    t
  );
}

function formatLeadSummary(from, data = {}, titulo = 'LEAD COMERCIAL') {
  const d = data || {};
  return (
    `${titulo}\n` +
    `${formatClientContact(from, d)}\n` +
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
      'Ya avisé a nuestro *ingeniero de diseño fotovoltaico*. Se contactará contigo por este mismo chat para darte un *asesoramiento más personalizado*, sin costo.\n\n' +
      'Horario: lunes a sábado, 8:00 a 18:00 (Medellín).\n\n' +
      'Si quieres volver con el asistente después, escribe *hola*.',
    cfg,
  });
}

async function sendMainMenu(from, cfg) {
  // Primero solo texto (máxima compatibilidad iOS). Luego menú.
  await sendText({ to: from, body: CONSULTANT_INTRO, cfg });
  try {
    // Botones primero: más confiables en iOS que la lista
    await sendButtons({
      to: from,
      body: 'Elige una opción 👇',
      buttons: [
        { id: 'obj_ahorro', title: 'Dejar de pagar luz' },
        { id: 'obj_respaldo', title: 'Se me va la energía' },
        { id: 'menu_asesor', title: 'Ing. diseño solar' },
      ],
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-bot] sendButtons falló:', err?.message || err);
    try {
      await sendList({
        to: from,
        body: 'Si prefieres, elige una opción y seguimos por ahí 👇',
        buttonText: 'Ver opciones',
        sections: [
          {
            title: '¿Qué necesitas?',
            rows: [
              { id: 'obj_ahorro', title: 'Dejar de pagar energía', description: 'Ahorro en factura' },
              { id: 'obj_respaldo', title: 'Se me va la energía', description: 'Cortes y respaldo' },
              { id: 'menu_tienda', title: 'Productos/tienda solar', description: 'Ver y comprar equipos' },
              { id: 'menu_mas', title: 'Otras opciones', description: 'Cotizar, finca o ingeniero' },
            ],
          },
        ],
        cfg,
      });
    } catch (err2) {
      console.warn('[whatsapp-bot] sendList también falló:', err2?.message || err2);
      await sendText({
        to: from,
        body:
          'Puedes escribirme:\n' +
          '• *ahorro* — dejar de pagar tanta luz\n' +
          '• *respaldo* — se me va la energía\n' +
          '• *tienda* — ver equipos\n' +
          '• *ingeniero* — hablar con diseño fotovoltaico',
        cfg,
      });
    }
  }
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
          {
            id: 'menu_asesor',
            title: 'Ing. diseño solar',
            description: 'Asesoría FV sin costo',
          },
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
      { id: 'menu_asesor', title: 'Ing. diseño solar' },
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
      'Un *ingeniero de diseño fotovoltaico* de Reiki se contactará contigo por este chat para un *asesoramiento más personalizado* (sin costo).\n\n' +
      `Mientras tanto puedes mirar equipos: ${cfg.siteUrl}/tienda\n\n` +
      'Para volver al asistente: *hola*.',
    cfg,
  });
}

async function askAsesorNombre(from, cfg) {
  const s = getSession(from);
  s.step = 'asesor_nombre';
  saveSession(from, s);
  await sendText({
    to: from,
    body:
      'Claro, con gusto te paso con nuestro *ingeniero de diseño fotovoltaico* para un asesoramiento más personalizado, *sin costo* 👍\n\n' +
      'Para avisarle bien, ¿cuál es tu *nombre*?\n\n' +
      '_Solo el nombre, por ejemplo: Alex_',
    cfg,
  });
}

async function askAsesorCiudad(from, cfg) {
  const s = getSession(from);
  s.step = 'asesor_ciudad';
  saveSession(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      (name ? `Gracias, *${name}*. ` : 'Gracias. ') +
      '¿En qué *ciudad* está el proyecto?\n\n' +
      '_Solo la ciudad, por ejemplo: Medellín_',
    cfg,
  });
}

async function askAsesorCelular(from, cfg) {
  const s = getSession(from);
  s.step = 'asesor_celular';
  saveSession(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      (name ? `Gracias, *${name}*. ` : '') +
      'WhatsApp no nos muestra tu número (privacidad/username). ¿Me compartes tu *celular* para que el ingeniero te escriba?\n\n' +
      '_Ejemplo: 300 123 4567_',
    cfg,
  });
}

async function askAsesorResumen(from, cfg) {
  const s = getSession(from);
  s.step = 'asesor_resumen';
  saveSession(from, s);
  const name = firstName(s.data.nombre);
  await sendText({
    to: from,
    body:
      (name ? `Perfecto, *${name}*. ` : '') +
      'Antes de pasar el caso, déjame un *resumen corto* de lo que necesitas.\n\n' +
      'Ejemplo: _Cotizar sistema solar para casa, factura de unos $250.000_',
    cfg,
  });
}

/**
 * Pide nombre → ciudad → (celular si BSUID) → resumen, y solo entonces avisa por CallMeBot.
 */
async function continueAsesorLead(from, cfg) {
  const s = getSession(from);
  if (!String(s.data.nombre || '').trim()) {
    await askAsesorNombre(from, cfg);
    return;
  }
  if (!String(s.data.ciudad || '').trim()) {
    await askAsesorCiudad(from, cfg);
    return;
  }
  // iOS/username: Meta no envía teléfono → pedir celular para el aviso al ingeniero
  if (isBsuid(from) && !parsePhoneCo(s.data.telefono)) {
    await askAsesorCelular(from, cfg);
    return;
  }
  if (!String(s.data.necesidad || '').trim()) {
    await askAsesorResumen(from, cfg);
    return;
  }
  await handoffToHuman(from, cfg, s, 'LEAD ingeniero FV');
}

async function startAsesorCapture(from, cfg, { seedNecesidad } = {}) {
  const s = getSession(from);
  if (seedNecesidad && !s.data.necesidad) {
    s.data.necesidad = String(seedNecesidad).slice(0, 400);
  }
  // En chat largo: reutilizar contexto como resumen si aún no hay
  const turns = Number(s.msgCount || 0);
  const longChat = turns > 5 || shouldSkipResumenAsk(from);
  if (longChat && !s.data.necesidad) {
    const bits = [
      s.data.objetivo,
      s.data.consumo && `Consumo: ${s.data.consumo}`,
      'Pidió ingeniero tras conversación',
    ].filter(Boolean);
    s.data.necesidad = bits.join(' · ').slice(0, 400);
  }
  saveSession(from, s);
  await continueAsesorLead(from, cfg);
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

  if (s.step === 'asesor_nombre') {
    const raw = String(text || '').trim();
    const nRes = normalizeText(raw);
    if (isGreeting(nRes) || nRes === 'menu') {
      await askAsesorNombre(from, cfg);
      return true;
    }
    if (isLikelyCity(raw) && !/me llamo|soy |mi nombre/i.test(raw)) {
      await sendText({
        to: from,
        body:
          `*${raw}* parece una ciudad 🙂\n\n` +
          'Primero necesito tu *nombre* (solo el nombre).\nEjemplo: Alex',
        cfg,
      });
      return true;
    }
    if (!isLikelyPersonName(raw) && raw.length < 2) {
      await sendText({ to: from, body: '¿Me escribes tu nombre? Solo el nombre, ej: Alex', cfg });
      return true;
    }
    s.data.nombre = extractPersonName(raw);
    saveSession(from, s);
    await continueAsesorLead(from, cfg);
    return true;
  }

  if (s.step === 'asesor_ciudad') {
    const raw = String(text || '').trim();
    const nRes = normalizeText(raw);
    if (isGreeting(nRes) || nRes === 'menu') {
      await askAsesorCiudad(from, cfg);
      return true;
    }
    if (isLikelyPersonName(raw) && !isLikelyCity(raw) && raw.split(/\s+/).length <= 2) {
      s.data.nombre = extractPersonName(raw);
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
    if (raw.length < 3) {
      await sendText({ to: from, body: '¿En qué ciudad está el proyecto? Ej: Bogotá', cfg });
      return true;
    }
    s.data.ciudad = raw.slice(0, 80);
    saveSession(from, s);
    await continueAsesorLead(from, cfg);
    return true;
  }

  if (s.step === 'asesor_celular') {
    const raw = String(text || '').trim();
    const nRes = normalizeText(raw);
    if (isGreeting(nRes) || nRes === 'menu') {
      await askAsesorCelular(from, cfg);
      return true;
    }
    const tel = parsePhoneCo(raw);
    if (!tel || tel.length < 10) {
      await sendText({
        to: from,
        body: 'Necesito un celular válido 🙂\nEjemplo: *300 123 4567*',
        cfg,
      });
      return true;
    }
    s.data.telefono = tel;
    saveSession(from, s);
    await continueAsesorLead(from, cfg);
    return true;
  }

  if (s.step === 'asesor_resumen') {
    const resumen = String(text || '').trim();
    const nRes = normalizeText(resumen);
    if (isGreeting(nRes) || nRes === 'menu') {
      await askAsesorResumen(from, cfg);
      return true;
    }
    if (resumen.length < 5) {
      await sendText({
        to: from,
        body:
          'Necesito un poquito más de detalle para el ingeniero 🙂\n\n' +
          'Cuéntame qué necesitas (proyecto, equipo, consumo…).',
        cfg,
      });
      return true;
    }
    s.data.necesidad = resumen.slice(0, 400);
    saveSession(from, s);
    await continueAsesorLead(from, cfg);
    return true;
  }

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
  // Conservar BSUID (CO.xxx) o teléfono; no destruir con replace(/\D/)
  const from = String(msg.from || '').trim();
  if (!from) return;

  const text = String(msg.text || '').trim();
  const id = msg.buttonId || msg.listId || '';
  const n = normalizeText(text);
  const s = getSession(from);
  const useAi = isOpenAiConfigured();

  // Contador de mensajes de la conversación (para no pedir resumen si ya hay chat)
  if (!isGreeting(n) && id !== 'menu_root') {
    s.msgCount = Number(s.msgCount || 0) + 1;
    saveSession(from, s);
  }

  // Si estamos capturando datos del ingeniero, NO reiniciar ni saludar
  if (ASESOR_CAPTURE_STEPS.has(s.step)) {
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  if (id === 'menu_root' || isGreeting(n) || n === 'menu') {
    resetSession(from);
    clearAiPause(from);
    // Bienvenida fija (no regenerar con IA)
    await sendMainMenu(from, cfg);
    return;
  }

  // Pedir ingeniero: siempre capturar nombre/ciudad/resumen antes de CallMeBot
  const asksEngineer =
    id === 'menu_asesor' ||
    n === 'asesor' ||
    n === 'humano' ||
    n === 'persona' ||
    /\bingeniero\b/.test(n) ||
    /\basesor(ia|ía)?\b/.test(n);

  if (asksEngineer && !ASESOR_CAPTURE_STEPS.has(s.step)) {
    await startAsesorCapture(from, cfg);
    return;
  }

  if ((s.step === 'human' && s.humanUntil && Date.now() < s.humanUntil) || isAiPaused(from)) {
    // No dejar a iOS/Android en silencio total tras handoff
    if (text) {
      try {
        await sendText({
          to: from,
          body:
            'Un ingeniero de diseño fotovoltaico ya tiene tu caso y te escribirá por este chat.\n\n' +
            'Si quieres volver al menú del asistente, escribe *hola*.',
          cfg,
        });
      } catch (err) {
        console.warn('[whatsapp-bot] aviso human-mode falló', err?.message || err);
      }
    }
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
        { id: 'menu_asesor', title: 'Ing. diseño solar' },
      ],
      cfg,
    });
    return;
  }

  if (id === 'menu_proyecto' || n === 'proyecto' || n === 'cotizar') {
    await startDiscovery(from, s.data.objetivo || 'ahorro', cfg);
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
  /** @type {{ from: string, text?: string, buttonId?: string, listId?: string, rawType?: string }[]} */
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;
      const contactWa = String(value.contacts?.[0]?.wa_id || '').trim();
      const contactUserId = String(
        value.contacts?.[0]?.user_id || value.contacts?.[0]?.bsuid || ''
      ).trim();
      const msgs = value.messages;
      if (!Array.isArray(msgs) || msgs.length === 0) continue;

      for (const m of msgs) {
        // Teléfono clásico O BSUID (iOS / username / privacidad)
        let from =
          String(m.from || '').trim() ||
          String(m.from_user_id || '').trim() ||
          contactWa ||
          contactUserId;
        // Si from es solo dígitos, normalizar; si es BSUID, dejar intacto
        if (from && /^\d+$/.test(from.replace(/\D/g, '')) && !/^[A-Z]{2}\./.test(from)) {
          from = from.replace(/\D/g, '');
        }
        if (!from) {
          console.warn('[whatsapp] mensaje sin from resoluble', {
            type: m.type,
            id: m.id,
            fromRaw: m.from,
            fromUserId: m.from_user_id,
            keys: Object.keys(m || {}),
          });
          continue;
        }
        const type = String(m.type || '').toLowerCase();

        if (type === 'text') {
          const bodyText = String(m.text?.body || '')
            .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, '')
            .trim();
          out.push({ from, text: bodyText || 'hola', rawType: type });
          continue;
        }

        if (type === 'interactive') {
          const btn = m.interactive?.button_reply;
          const list = m.interactive?.list_reply;
          const nfm = m.interactive?.nfm_reply;
          out.push({
            from,
            text: btn?.title || list?.title || nfm?.body || 'hola',
            buttonId: btn?.id,
            listId: list?.id,
            rawType: type,
          });
          continue;
        }

        if (type === 'button') {
          out.push({
            from,
            text: m.button?.text || 'hola',
            buttonId: m.button?.payload || m.button?.text,
            rawType: type,
          });
          continue;
        }

        // Primer mensaje iOS / CTWA: type=unsupported (131051/131060)
        if (type === 'unsupported' || type === 'system') {
          console.warn('[whatsapp] mensaje especial → hola', { from, type, errors: m.errors || null });
          out.push({ from, text: 'hola', rawType: type });
          continue;
        }

        if (type === 'reaction') {
          // No abrir menú por cada reacción
          continue;
        }

        if (['image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'order'].includes(type)) {
          out.push({ from, text: 'hola', rawType: type });
          continue;
        }

        console.warn('[whatsapp] tipo no mapeado → hola', { from, type, keys: Object.keys(m) });
        out.push({ from, text: 'hola', rawType: type || 'unknown' });
      }
    }
  }
  return out;
}
