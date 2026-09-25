/**
 * Bot comercial Reiki — captura clara nombre→ciudad (sin cruces) + aviso CallMeBot.
 */
import {
  getWhatsAppConfig,
  sendText,
  sendButtons,
  sendList,
  sendCtaUrl,
  notifyOwner,
  postLeadWebhook,
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
import {
  clearAiPause,
  handleAiMessage,
  isAiConfigured,
  isAiPaused,
  setAiPause,
  shouldSkipResumenAsk,
} from './whatsapp-ai.js';
import {
  MEDIA_RECEIVED_MSG,
  ensureHabeasDataSent,
  sendEngineerHandoff,
  sendPauseNoticeOnce,
  clearHabeasFlag,
  ATTENTION_PHONE_DISPLAY,
  attentionWhatsAppUrl,
} from './whatsapp-atencion.js';
import { looksLikeCatalogQuery, sendProductSearchList } from './whatsapp-catalog.js';
import {
  handleCartMessage,
  hasActiveCartOrQuote,
  sendPaymentOptions,
  sendAmbiguousPayOrAhorro,
  startPurchaseClose,
} from './whatsapp-cart.js';
import {
  looksLikeAhorroIntent,
  looksLikeRespaldoIntent,
  looksLikePaymentIntent,
  looksLikeAmbiguousPayIntent,
  looksLikeBuyIntent,
  looksLikeInstallIntent,
  looksLikeQuoteEquipmentIntent,
} from './whatsapp-intent.js';
import { canUseAi } from './whatsapp-ai-budget.js';
import { recommendProject } from './whatsapp-catalog.js';

const MEDIA_TYPES = new Set([
  'image',
  'audio',
  'video',
  'document',
  'sticker',
  'location',
  'contacts',
  'order',
]);

const HUMAN_MS =
  (Number(process.env.HUMAN_MODE_HOURS) > 0 ? Number(process.env.HUMAN_MODE_HOURS) : 12) * 60 * 60 * 1000;
const DISC_STEPS = new Set([
  'disc_nombre',
  'disc_ciudad',
  'disc_tipo',
  'disc_consumo',
  'disc_urgencia',
  'inst_lugar',
  'inst_objetivo',
  'inst_consumo',
  'inst_ciudad',
  'inst_techo',
  'inst_nombre',
  'inst_celular',
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
    obj_ahorro: 'Quiero bajar mi factura de la luz con energía solar',
    obj_respaldo: 'Se me va la energía, necesito respaldo por cortes de luz',
    obj_finca: 'Necesito un sistema solar para finca o un sitio sin red',
    menu_proyecto: 'Quiero cotizar un proyecto de instalación solar llave en mano',
    menu_instalar: 'Quiero instalar energía solar en mi casa o negocio',
    menu_cotizar: 'Quiero cotizar un equipo de la tienda',
    menu_tienda: 'Quiero ver o comprar equipos en la tienda online',
    menu_aprender: 'Explícame opciones de energía solar de forma sencilla',
    menu_asesor:
      'Quiero hablar con el ingeniero de diseño fotovoltaico para un mejor asesoramiento sin costo.',
    menu_mas: 'Muéstrame más opciones de ayuda',
    menu_root: 'Hola, quiero empezar de nuevo',
    tip_ahorro_factura: 'Explícame cómo bajar mi factura con paneles solares',
    tip_backup: 'Explícame qué hacer cuando se me va la energía',
    tip_offgrid: 'Explícame sistemas para finca o sin red',
    tip_paneles: 'Quiero información sobre paneles solares',
    tip_inversores: 'Quiero información sobre inversores',
    tip_baterias: 'Quiero información sobre baterías',
    tip_precios: 'Explícame cómo cotizan los precios',
    tipo_hogar: 'El proyecto es para casa u hogar',
    tipo_comercio: 'El proyecto es para un negocio o comercio',
    tipo_industria: 'El proyecto es para finca o industria',
    lugar_casa: 'La instalación sería en casa',
    lugar_negocio: 'La instalación sería en un negocio',
    lugar_finca: 'La instalación sería en una finca',
    obj_ahorrar: 'Busco principalmente ahorrar en la factura',
    obj_respaldo_btn: 'Busco respaldo en cortes de luz',
    obj_ambos: 'Busco ahorrar y tener respaldo',
    obj_sin_red: 'Necesito energía sin red eléctrica',
    techo_teja: 'Techo de teja de barro',
    techo_lamina: 'Techo de lámina o metálico',
    techo_losa: 'Techo de losa o concreto',
    techo_nose: 'No sé cómo es el techo',
    urg_ya: 'Quiero avanzar lo antes posible',
    urg_mes: 'Quiero avanzar este mes',
    urg_explorar: 'Todavía estoy explorando opciones',
  };
  return map[id] || '';
}

async function replyWithAi(from, cfg, userText, { withQuickMenu = false } = {}) {
  try {
    const result = await handleAiMessage(from, userText);
    if (result.skipped) {
      // tope diario / presupuesto / crédito → menú + CTA 324 sin error
      await sendText({
        to: from,
        body:
          result.skipped === 'daily'
            ? 'Por hoy ya te ayudé bastante por este chat 🙂 Puedes usar el menú o escribirle directo al ingeniero.'
            : result.skipped === 'budget'
              ? 'En este momento te atiendo con el menú y nuestro ingeniero. Elige una opción 👇'
              : 'Te atiendo con el menú o con nuestro ingeniero experto 👇',
        cfg,
      });
      await sendMainMenu(from, cfg);
      try {
        await sendCtaUrl({
          to: from,
          body: 'O escribe directo al ingeniero:',
          displayText: 'Escribir al ingeniero',
          url: attentionWhatsAppUrl(),
          cfg,
        });
      } catch {
        /* ignore */
      }
      return true;
    }
    if (result.paused) {
      const s = await getSession(from);
      await markHuman(from, s);
    }
    if (result.text) {
      await sendText({ to: from, body: result.text, cfg });
    }
    if (withQuickMenu && !result.paused) {
      await sendButtons({
        to: from,
        body: 'También puedes tocar una opción rápida:',
        buttons: [
          { id: 'obj_ahorro', title: 'Bajar mi factura' },
          { id: 'obj_respaldo', title: 'Se me va la energía' },
          { id: 'menu_asesor', title: 'Ing. diseño solar' },
        ],
        cfg,
      });
    }
    return true;
  } catch (err) {
    console.error('[whatsapp-bot] Claude fallback a reglas:', err?.message || err);
    return false;
  }
}

async function sendAiBlockedFallback(from, cfg) {
  await sendMainMenu(from, cfg);
  try {
    await sendCtaUrl({
      to: from,
      body: `Atención personalizada: ${ATTENTION_PHONE_DISPLAY}`,
      displayText: 'Escribir al ingeniero',
      url: attentionWhatsAppUrl(),
      cfg,
    });
  } catch {
    /* ignore */
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

async function markHuman(from, s) {
  s.step = 'human';
  s.humanUntil = Date.now() + HUMAN_MS;
  await saveSession(from, s);
}

async function handoffToHuman(from, cfg, s, titulo) {
  const notify = await notifyOwner(formatLeadSummary(from, s.data, titulo || 'LEAD asesor'), cfg);
  await markHuman(from, s);
  await setAiPause(from, HUMAN_MS);
  await postLeadWebhook({
    tipo: 'derivacion_reglas',
    nombre: s.data.nombre || '',
    ciudad: s.data.ciudad || '',
    celular: s.data.telefono || (isBsuid(from) ? 'número oculto' : from),
    identificador: from,
    resumen: s.data.necesidad || s.data.objetivo || '',
    intencion: titulo || 'asesor',
    aviso_ok: Boolean(notify?.ok),
  });
  await sendEngineerHandoff({ to: from, nombre: s.data.nombre, cfg });
}

async function finishDiscovery(from, cfg) {
  const s = await getSession(from);
  const notify = await notifyOwner(formatLeadSummary(from, s.data, 'LEAD COTIZACION'), cfg);
  await markHuman(from, s);
  await setAiPause(from, HUMAN_MS);
  await postLeadWebhook({
    tipo: 'derivacion_cotizacion_reglas',
    nombre: s.data.nombre || '',
    ciudad: s.data.ciudad || '',
    celular: s.data.telefono || (isBsuid(from) ? 'número oculto' : from),
    identificador: from,
    resumen: [s.data.tipo, s.data.consumo, s.data.objetivo].filter(Boolean).join(' · '),
    intencion: 'cotizacion',
    aviso_ok: Boolean(notify?.ok),
  });
  await sendEngineerHandoff({ to: from, nombre: s.data.nombre, cfg });
}

async function sendMainMenu(from, cfg) {
  await sendText({ to: from, body: CONSULTANT_INTRO, cfg });
  try {
    await sendButtons({
      to: from,
      body: 'Elige una opción, por favor 👇',
      buttons: [
        { id: 'menu_cotizar', title: 'Cotizar un equipo' },
        { id: 'menu_instalar', title: 'Instalar solar' },
        { id: 'menu_asesor', title: 'Hablar c/ ingeniero' },
      ],
      cfg,
    });
  } catch (err) {
    console.warn('[whatsapp-bot] sendButtons falló:', err?.message || err);
    await sendText({
      to: from,
      body:
        'Puedes escribirme, por favor:\n' +
        '• *cotizar* — un equipo de la tienda\n' +
        '• *instalar* — sistema solar a tu medida\n' +
        '• *ingeniero* — hablar con diseño fotovoltaico',
      cfg,
    });
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
          { id: 'menu_tienda', title: 'Ver equipos', description: 'Catálogo y tienda' },
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
  const s = await getSession(from);
  s.step = 'disc_nombre';
  await saveSession(from, s);
  await ensureHabeasDataSent(from, cfg);
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
  const s = await getSession(from);
  s.step = 'disc_ciudad';
  await saveSession(from, s);
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
  // Unificamos ahorro/respaldo/finca en el flujo de instalación (preguntas una a una).
  await startInstallFlow(from, cfg, { seedObjetivo: objetivo });
}

async function startQuoteEquipment(from, cfg, { seedQuery } = {}) {
  const q = String(seedQuery || '').trim();
  if (q && looksLikeCatalogQuery(q)) {
    await sendProductSearchList(from, q, cfg);
    return;
  }
  await sendText({
    to: from,
    body:
      'Con mucho gusto te ayudo a cotizar. Por favor cuéntame qué equipo buscas (por ejemplo: inversor de 5 kW, panel de 625 W o batería de litio) 🙌',
    cfg,
  });
}

async function startInstallFlow(from, cfg, { seedObjetivo } = {}) {
  const s = await getSession(from);
  s.data.flujo = 'instalar';
  if (seedObjetivo) s.data.objetivo = seedObjetivo;
  s.step = 'inst_lugar';
  await saveSession(from, s);
  await sendText({
    to: from,
    body:
      '¡Qué buena decisión! 🌞 Con mucho gusto te ayudo. Te haré unas preguntas rápidas para que nuestro ingeniero experto en diseño fotovoltaico prepare una propuesta a tu medida, sin costo.',
    cfg,
  });
  await sendButtons({
    to: from,
    body: '¿Dónde sería la instalación, por favor?',
    buttons: [
      { id: 'lugar_casa', title: 'Casa' },
      { id: 'lugar_negocio', title: 'Negocio' },
      { id: 'lugar_finca', title: 'Finca' },
    ],
    cfg,
  });
}

async function askInstallObjetivo(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_objetivo';
  await saveSession(from, s);
  const isFinca = /finca/i.test(String(s.data.tipo || ''));
  if (isFinca) {
    await sendButtons({
      to: from,
      body: '¿Qué buscas principalmente, por favor?',
      buttons: [
        { id: 'obj_ahorrar', title: 'Ahorrar factura' },
        { id: 'obj_ambos', title: 'Ambos' },
        { id: 'obj_sin_red', title: 'Energía sin red' },
      ],
      cfg,
    });
  } else {
    await sendButtons({
      to: from,
      body: '¿Qué buscas principalmente, por favor?',
      buttons: [
        { id: 'obj_ahorrar', title: 'Ahorrar factura' },
        { id: 'obj_respaldo_btn', title: 'Respaldo cortes' },
        { id: 'obj_ambos', title: 'Ambos' },
      ],
      cfg,
    });
  }
}

async function askInstallConsumo(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_consumo';
  await saveSession(from, s);
  await sendText({
    to: from,
    body:
      'Por favor, compárteme el valor de tu factura mensual o los kWh (o una foto de la factura).',
    cfg,
  });
}

async function askInstallCiudad(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_ciudad';
  await saveSession(from, s);
  await sendText({
    to: from,
    body: '¿En qué ciudad o municipio está la instalación, por favor?\n\n_Ejemplo: Medellín_',
    cfg,
  });
}

async function askInstallTecho(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_techo';
  await saveSession(from, s);
  await sendList({
    to: from,
    body: '¿Cómo es tu techo, por favor?',
    buttonText: 'Tipo de techo',
    sections: [
      {
        title: 'Techo',
        rows: [
          { id: 'techo_teja', title: 'Teja de barro', description: '' },
          { id: 'techo_lamina', title: 'Lámina/metálico', description: '' },
          { id: 'techo_losa', title: 'Losa/concreto', description: '' },
          { id: 'techo_nose', title: 'No sé', description: '' },
        ],
      },
    ],
    cfg,
  });
}

async function askInstallNombre(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_nombre';
  await saveSession(from, s);
  await ensureHabeasDataSent(from, cfg);
  await sendText({
    to: from,
    body: '¿Me regalas tu nombre, por favor?',
    cfg,
  });
}

async function askInstallCelular(from, cfg) {
  const s = await getSession(from);
  s.step = 'inst_celular';
  await saveSession(from, s);
  await sendText({
    to: from,
    body:
      'WhatsApp no nos muestra tu número. ¿Me compartes tu celular, por favor?\n\n_Ejemplo: 300 123 4567_',
    cfg,
  });
}

async function finishInstallFlow(from, cfg) {
  const s = await getSession(from);
  const rec = recommendProject({
    consumoMensual: s.data.consumo,
    tipoTecho: s.data.techo,
    ubicacion: s.data.ciudad,
    objetivo: s.data.objetivo || s.data.tipo,
  });
  const name = firstName(s.data.nombre);
  let orient = '';
  if (rec.kwp_min != null && rec.kwp_max != null) {
    orient =
      `\n\nComo orientación amable, para tu consumo te alcanzaría un sistema de aproximadamente *${String(rec.kwp_min).replace('.', ',')} a ${String(rec.kwp_max).replace('.', ',')} kWp*. El ingeniero lo confirma sin costo.`;
  }
  await sendText({
    to: from,
    body:
      (name ? `Gracias por tu paciencia, *${name}*. ` : 'Gracias por tu paciencia. ') +
      `Con la información que me diste, ${rec.resumen}${orient}`,
    cfg,
  });
  s.data.necesidad = [
    `Instalación ${s.data.tipo || ''}`.trim(),
    s.data.objetivo && `Objetivo: ${s.data.objetivo}`,
    s.data.consumo && `Consumo/factura: ${s.data.consumo}`,
    s.data.techo && `Techo: ${s.data.techo}`,
    s.data.ciudad && `Ciudad: ${s.data.ciudad}`,
    rec.kwp_min != null && `Rango orientativo: ${rec.kwp_min}-${rec.kwp_max} kWp`,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 500);
  await saveSession(from, s);
  await handoffToHuman(from, cfg, s, 'LEAD instalación solar');
}

async function handleInstallStep(from, text, id, cfg) {
  const s = await getSession(from);
  const step = s.step;

  if (step === 'inst_lugar') {
    if (id === 'lugar_casa' || /\bcasa\b|\bhogar\b/.test(normalizeText(text))) {
      s.data.tipo = 'Casa';
    } else if (id === 'lugar_negocio' || /\bnegocio\b|\bcomercio\b/.test(normalizeText(text))) {
      s.data.tipo = 'Negocio';
    } else if (id === 'lugar_finca' || /\bfinca\b|\bindustria\b/.test(normalizeText(text))) {
      s.data.tipo = 'Finca';
    } else if (!id && text) {
      await sendButtons({
        to: from,
        body: 'Por favor elige una opción:',
        buttons: [
          { id: 'lugar_casa', title: 'Casa' },
          { id: 'lugar_negocio', title: 'Negocio' },
          { id: 'lugar_finca', title: 'Finca' },
        ],
        cfg,
      });
      return true;
    } else {
      return false;
    }
    await saveSession(from, s);
    await askInstallObjetivo(from, cfg);
    return true;
  }

  if (step === 'inst_objetivo') {
    if (id === 'obj_ahorrar') s.data.objetivo = 'ahorro';
    else if (id === 'obj_respaldo_btn') s.data.objetivo = 'respaldo';
    else if (id === 'obj_ambos') s.data.objetivo = 'ambos';
    else if (id === 'obj_sin_red') s.data.objetivo = 'sin red / finca';
    else if (text) s.data.objetivo = String(text).slice(0, 80);
    else return false;
    await saveSession(from, s);
    await askInstallConsumo(from, cfg);
    return true;
  }

  if (step === 'inst_consumo') {
    if (!text && !id) return false;
    s.data.consumo = String(text || id || '').slice(0, 120);
    await saveSession(from, s);
    await askInstallCiudad(from, cfg);
    return true;
  }

  if (step === 'inst_ciudad') {
    if (!text || !isLikelyCity(text)) {
      await sendText({
        to: from,
        body: 'Por favor indícame solo la ciudad o municipio (ej. *Bogotá*).',
        cfg,
      });
      return true;
    }
    s.data.ciudad = String(text).trim().slice(0, 80);
    await saveSession(from, s);
    await askInstallTecho(from, cfg);
    return true;
  }

  if (step === 'inst_techo') {
    const map = {
      techo_teja: 'Teja de barro',
      techo_lamina: 'Lámina/metálico',
      techo_losa: 'Losa/concreto',
      techo_nose: 'No sé',
    };
    if (id && map[id]) s.data.techo = map[id];
    else if (text) s.data.techo = String(text).slice(0, 80);
    else return false;
    await saveSession(from, s);
    await askInstallNombre(from, cfg);
    return true;
  }

  if (step === 'inst_nombre') {
    const nombre = extractPersonName(text);
    if (!nombre || !isLikelyPersonName(nombre)) {
      await sendText({
        to: from,
        body: 'Por favor responde solo tu nombre (ej. *Alex*).',
        cfg,
      });
      return true;
    }
    s.data.nombre = nombre.slice(0, 80);
    await saveSession(from, s);
    if (isBsuid(from) && !parsePhoneCo(s.data.telefono)) {
      await askInstallCelular(from, cfg);
      return true;
    }
    await finishInstallFlow(from, cfg);
    return true;
  }

  if (step === 'inst_celular') {
    const tel = parsePhoneCo(text);
    if (!tel) {
      await sendText({
        to: from,
        body: 'No reconocí el celular. Ejemplo: *300 123 4567*. Por favor inténtalo de nuevo.',
        cfg,
      });
      return true;
    }
    s.data.telefono = tel;
    await saveSession(from, s);
    await finishInstallFlow(from, cfg);
    return true;
  }

  return false;
}

async function askTipo(from, cfg) {
  const s = await getSession(from);
  s.step = 'disc_tipo';
  await saveSession(from, s);
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

async function askAsesorNombre(from, cfg) {
  const s = await getSession(from);
  s.step = 'asesor_nombre';
  await saveSession(from, s);
  await ensureHabeasDataSent(from, cfg);
  await sendText({
    to: from,
    body:
      'Claro, con gusto te paso con nuestro *ingeniero experto en diseño fotovoltaico* para un asesoramiento más personalizado, *sin costo* 👍\n\n' +
      'Para avisarle bien, ¿cuál es tu *nombre*?\n\n' +
      '_Solo el nombre, por ejemplo: Alex_',
    cfg,
  });
}

async function askAsesorCiudad(from, cfg) {
  const s = await getSession(from);
  s.step = 'asesor_ciudad';
  await saveSession(from, s);
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
  const s = await getSession(from);
  s.step = 'asesor_celular';
  await saveSession(from, s);
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
  const s = await getSession(from);
  s.step = 'asesor_resumen';
  await saveSession(from, s);
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
  const s = await getSession(from);
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
  const s = await getSession(from);
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
  await saveSession(from, s);
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
          { id: 'tip_ahorro_factura', title: 'Bajar mi factura', description: 'Cómo funciona' },
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
  const s = await getSession(from);
  if (!DISC_STEPS.has(s.step)) return false;

  if (String(s.step || '').startsWith('inst_')) {
    return handleInstallStep(from, text, id, cfg);
  }

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
    await saveSession(from, s);
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
      await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
    await askCiudad(from, cfg);
    return true;
  }

  if (s.step === 'disc_ciudad') {
    // Si mandó un nombre otra vez, no lo tomes como ciudad
    if (isLikelyPersonName(text) && !isLikelyCity(text) && text.split(/\s+/).length <= 2) {
      s.data.nombre = extractPersonName(text);
      await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
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
    await saveSession(from, s);
    await finishDiscovery(from, cfg);
    return true;
  }

  return false;
}

/**
 * @param {{ from: string, text?: string, buttonId?: string, listId?: string, rawType?: string, mediaId?: string, caption?: string }} msg
 */
export async function handleIncomingMessage(msg) {
  const cfg = getWhatsAppConfig();
  // Conservar BSUID (CO.xxx) o teléfono; no destruir con replace(/\D/)
  const from = String(msg.from || '').trim();
  if (!from) return;

  const rawType = String(msg.rawType || '').toLowerCase();
  const isMedia = MEDIA_TYPES.has(rawType);
  const text = String(msg.text || msg.caption || '').trim();
  const id = msg.buttonId || msg.listId || '';
  const n = normalizeText(text);
  const s = await getSession(from);
  const wantsRestart =
    id === 'menu_root' || n === 'menu' || n === 'bot' || n === 'inicio' || /^(menu|inicio|bot)\b/.test(n);
  const humanPaused =
    (s.step === 'human' && s.humanUntil && Date.now() < s.humanUntil) || (await isAiPaused(from));

  // Contador de mensajes de la conversación (para no pedir resumen si ya hay chat)
  if (!isMedia && !isGreeting(n) && id !== 'menu_root' && !wantsRestart) {
    s.msgCount = Number(s.msgCount || 0) + 1;
    await saveSession(from, s);
  }

  // Si estamos capturando datos del ingeniero, NO reiniciar ni saludar
  if (ASESOR_CAPTURE_STEPS.has(s.step) && !isMedia) {
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  // Modo humano: "hola" NO reactiva; solo menú / bot / inicio (o que venza la pausa)
  if (humanPaused) {
    if (wantsRestart) {
      await resetSession(from);
      await clearAiPause(from);
      await clearHabeasFlag(from);
      await sendMainMenu(from, cfg);
      return;
    }
    // Un solo aviso por pausa; el resto: silencio
    await sendPauseNoticeOnce(from, cfg);
    return;
  }
  if (s.step === 'human') {
    s.step = 'idle';
    delete s.humanUntil;
    await saveSession(from, s);
  }

  // Media (foto/audio/doc…): sin IA
  if (isMedia) {
    const cap = String(msg.caption || text || '').toLowerCase();
    if (/comprobante|pago|transfer|bre-?b|wompi|addi|nequi|recibo/.test(cap) || rawType === 'document') {
      try {
        await sendText({
          to: from,
          body: `¡Gracias! 📎 Los comprobantes van al *${ATTENTION_PHONE_DISPLAY}*. Reenvíalo allí (no lo validamos en este chat).`,
          cfg,
        });
        await sendCtaUrl({
          to: from,
          body: 'Enviar comprobante:',
          displayText: 'Enviar comprobante',
          url: attentionWhatsAppUrl('Hola, envío el comprobante de pago'),
          cfg,
        });
      } catch {
        await sendText({ to: from, body: MEDIA_RECEIVED_MSG, cfg });
      }
      return;
    }
    try {
      await sendText({ to: from, body: MEDIA_RECEIVED_MSG, cfg });
    } catch (err) {
      console.warn('[whatsapp-bot] media ack falló', err?.message || err);
    }
    return;
  }

  if (id === 'menu_root' || isGreeting(n) || wantsRestart) {
    await resetSession(from);
    await clearAiPause(from);
    await sendMainMenu(from, cfg);
    return;
  }

  // Carrito en captura (nombre/ciudad/qty) — antes del resto de reglas
  if (
    ['cart_nombre', 'cart_ciudad', 'cart_celular', 'cart_qty_other'].includes(s.step) ||
    (id &&
      (id.startsWith('cart_') ||
        id.startsWith('qty:') ||
        id.startsWith('qty_other:') ||
        id.startsWith('prod:') ||
        id === 'quiere_comprar'))
  ) {
    if (await handleCartMessage(from, text, id, cfg)) return;
  }

  // ——— Orden de reglas (sin IA): ingeniero → ahorro → pagar → catálogo → IA ———
  // (respaldo va con ahorro, antes de pagar, para no confundir con métodos de pago)

  // 1) Pedir ingeniero
  const asksEngineer =
    id === 'menu_asesor' ||
    n === 'asesor' ||
    n === 'humano' ||
    n === 'persona' ||
    /\bingeniero\b/.test(n) ||
    /\basesor(ia|ía)?\b/.test(n) ||
    /\bhablar con (un )?(asesor|ingeniero|humano|persona)\b/.test(n);

  if (asksEngineer && !ASESOR_CAPTURE_STEPS.has(s.step)) {
    await startAsesorCapture(from, cfg);
    return;
  }

  // Si hay captura estructurada a medias, terminarla con reglas (anti-bucle)
  if (DISC_STEPS.has(s.step)) {
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  if (id.startsWith('tipo_')) {
    s.step = 'disc_tipo';
    await saveSession(from, s);
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }
  if (id.startsWith('urg_')) {
    s.step = 'disc_urgencia';
    await saveSession(from, s);
    if (await handleDiscoveryStep(from, text, id, cfg)) return;
  }

  // Botones/listas de menú → reglas (nunca IA)
  if (id === 'menu_mas') {
    await sendMoreOptions(from, cfg);
    return;
  }
  if (id === 'menu_cotizar') {
    await startQuoteEquipment(from, cfg);
    return;
  }
  if (id === 'menu_instalar' || id === 'obj_ahorro' || id === 'menu_proyecto') {
    await startInstallFlow(from, cfg, {
      seedObjetivo: id === 'obj_ahorro' ? 'ahorro' : undefined,
    });
    return;
  }
  if (id === 'obj_respaldo') {
    await startInstallFlow(from, cfg, { seedObjetivo: 'respaldo' });
    return;
  }
  if (id === 'obj_finca') {
    await startInstallFlow(from, cfg, { seedObjetivo: 'finca' });
    return;
  }
  if (id === 'menu_tienda' || id === 'tip_paneles' || id === 'tip_inversores' || id === 'tip_baterias') {
    const q =
      id === 'tip_paneles'
        ? 'panel solar'
        : id === 'tip_inversores'
          ? 'inversor'
          : id === 'tip_baterias'
            ? 'bateria litio'
            : 'panel';
    await sendProductSearchList(from, q, cfg);
    return;
  }
  if (id === 'menu_aprender') {
    await sendLearnMenu(from, cfg);
    return;
  }
  if (id.startsWith('tip_')) {
    const tip = matchSolarTip(intentFromId(id) || text);
    if (tip) {
      await sendTip(from, tip, cfg);
      return;
    }
  }

  // 2) Instalar sistema / cotizar equipo (antes de ahorro genérico)
  if (text && looksLikeInstallIntent(text)) {
    await startInstallFlow(from, cfg);
    return;
  }
  if (text && looksLikeQuoteEquipmentIntent(text)) {
    if (looksLikeCatalogQuery(text)) {
      await sendProductSearchList(from, text, cfg);
    } else {
      await startQuoteEquipment(from, cfg, { seedQuery: text });
    }
    return;
  }

  // 2b) Ahorro / bajar factura → flujo instalación
  if (text && looksLikeAhorroIntent(text)) {
    await startInstallFlow(from, cfg, { seedObjetivo: 'ahorro' });
    return;
  }

  // 2c) Respaldo / apagones
  if (text && looksLikeRespaldoIntent(text)) {
    await startInstallFlow(from, cfg, { seedObjetivo: 'respaldo' });
    return;
  }

  // 2c) Quiere comprar (solo con carrito/cotización; si no → catálogo)
  const hasCartOrQuoteEarly = text ? await hasActiveCartOrQuote(from) : false;
  if (text && looksLikeBuyIntent(text)) {
    if (hasCartOrQuoteEarly) {
      await startPurchaseClose(from, cfg);
      return;
    }
    await sendText({
      to: from,
      body:
        '¡Claro! Primero elige el equipo. Busca por ejemplo *panel 550W* o *inversor 5kW*, agrégalo a tu cotización y luego te ayudo a comprar.',
      cfg,
    });
    return;
  }

  // 3) Pagar a Reiki (estricto) o aclarar si es ambiguo
  const hasCartOrQuote = hasCartOrQuoteEarly;
  if (text && looksLikeAmbiguousPayIntent(text, { hasCartOrQuote })) {
    await sendAmbiguousPayOrAhorro(from, cfg);
    return;
  }
  if (text && looksLikePaymentIntent(text, { hasCartOrQuote })) {
    await sendPaymentOptions(from, cfg);
    return;
  }

  // Resto de carrito (agregar, ver, PDF…) sin re-evaluar pagos por texto libre
  if (await handleCartMessage(from, text, id, cfg)) return;

  // 4) Catálogo por palabras clave → lista interactiva sin IA
  if (text && looksLikeCatalogQuery(text)) {
    await sendProductSearchList(from, text, cfg);
    return;
  }

  // 5) IA solo para texto libre que no encajó arriba (y si hay cupo)
  if (!id && text) {
    const gate = await canUseAi(from);
    if (gate.ok && isAiConfigured()) {
      const ok = await replyWithAi(from, cfg, text);
      if (ok) return;
    } else if (gate.reason === 'daily' || gate.reason === 'budget') {
      await sendAiBlockedFallback(from, cfg);
      return;
    }
  }

  // ——— Fallback por reglas ———
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

  if (id === 'menu_proyecto' || n === 'proyecto' || n === 'instalar') {
    await startInstallFlow(from, cfg, { seedObjetivo: s.data.objetivo || 'ahorro' });
    return;
  }
  if (id === 'menu_cotizar' || n === 'cotizar') {
    await startQuoteEquipment(from, cfg);
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
      body: 'Con gusto te ayudo 🙂 ¿Quieres bajar tu factura, tienes cortes, o buscas un equipo?',
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
          out.push({ from, text: bodyText || 'hola', rawType: type, messageId: m.id });
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
            messageId: m.id,
          });
          continue;
        }

        if (type === 'button') {
          out.push({
            from,
            text: m.button?.text || 'hola',
            buttonId: m.button?.payload || m.button?.text,
            rawType: type,
            messageId: m.id,
          });
          continue;
        }

        // Primer mensaje iOS / CTWA: type=unsupported (131051/131060)
        if (type === 'unsupported' || type === 'system') {
          console.warn('[whatsapp] mensaje especial → hola', { from, type, errors: m.errors || null });
          out.push({ from, text: 'hola', rawType: type, messageId: m.id });
          continue;
        }

        if (type === 'reaction') {
          // No abrir menú por cada reacción
          continue;
        }

        if (['image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'order'].includes(type)) {
          const mediaObj = m[type] || {};
          const mediaId = String(mediaObj.id || mediaObj.voice?.id || '').trim() || undefined;
          const caption = String(mediaObj.caption || '').trim() || undefined;
          out.push({
            from,
            rawType: type,
            mediaId,
            caption,
            text: caption,
            messageId: m.id,
          });
          continue;
        }

        console.warn('[whatsapp] tipo no mapeado (ignorado)', { from, type, keys: Object.keys(m) });
      }
    }
  }
  return out;
}
