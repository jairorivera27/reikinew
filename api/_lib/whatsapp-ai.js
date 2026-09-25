/**
 * Capa OpenAI (GPT) + function calling para el bot WhatsApp Reiki.
 * Si no hay OPENAI_API_KEY, el caller debe usar el flujo por reglas.
 */
import { getWhatsAppConfig, notifyOwner, isBsuid, parsePhoneCo, formatClientContact } from './whatsapp.js';
import { recommendProject, searchProducts } from './whatsapp-catalog.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const MAX_HISTORY = 12;
const HUMAN_PAUSE_MS = 12 * 60 * 60 * 1000;
/** Si hay más de esto en el historial, NO pedir resumen al escalar */
const RESUMEN_ASK_MAX_MSGS = 5;

const HANDOFF_CLIENT_MSG =
  '¡Claro que sí! Nuestro *ingeniero de diseño fotovoltaico* se contactará contigo por este mismo chat para darte un *asesoramiento más personalizado*, sin costo.';

/** @type {Map<string, { role: string, content: string }[]>} */
const histories = globalThis.__reikiWaAiHistory || new Map();
globalThis.__reikiWaAiHistory = histories;

/** @type {Map<string, { until: number }>} */
const paused = globalThis.__reikiWaAiPaused || new Map();
globalThis.__reikiWaAiPaused = paused;

const SYSTEM_PROMPT = `Eres el asesor comercial estrella de Reiki Energía Solar SAS. Tu tono es cálido, empático, amigable y muy natural (cero robótico). Eres un experto en energía solar, pero explicas las cosas de manera sencilla, sin tecnicismos excesivos a menos que el cliente lo pida. Toda tu base de conocimiento sobre la empresa pertenece a www.reikisolar.com.co.

Tus flujos principales son:

Proyectos: Si un cliente quiere un sistema completo, guíalo. No hagas 5 preguntas de golpe. Haz UNA pregunta a la vez (ej. '¡Qué excelente iniciativa! Para darte un estimado preciso, ¿sabes más o menos de cuánto es tu factura de luz o tu consumo en kWh?'). Cuando tengas los datos básicos, usa la herramienta recomendar_proyecto_solar.

Productos/Equipos: Si un cliente busca comprar un equipo específico, usa la herramienta buscar_producto_tienda para encontrar el producto ideal y envíale el enlace directo para que lo compre en la página web.

Derivación a ingeniero de diseño fotovoltaico (asesoramiento sin costo). Di siempre "ingeniero de diseño fotovoltaico", no digas solo "asesor".

Cuándo derivar al ingeniero:
1) Si el cliente pide ingeniero / persona / humano / asesor: primero asegúrate de tener *nombre*, *ciudad* y un *resumen* de lo que necesita (UNA pregunta a la vez, en ese orden).
2) Si el identificador del chat no es un teléfono (privacidad/username de WhatsApp), también pide su *celular* (ej. 300 123 4567) y pásalo en telefono_cliente.
3) Solo cuando ya tengas los datos, llama escalar_a_humano con nombre_cliente, ciudad, resumen y telefono_cliente si aplica.
4) Si YA hay conversación larga y faltan nombre o ciudad, pregunta solo lo que falte; no vuelvas a pedir el resumen si ya quedó claro en el chat.
5) NUNCA llames escalar_a_humano sin nombre del cliente.

NUNCA prometas visita técnica ni digas que "vamos a realizar la visita". Di que el *ingeniero de diseño fotovoltaico* se contactará contigo para darte un *asesoramiento más personalizado* (sin costo).

Reglas de Oro:

NUNCA te quedes en un bucle repitiendo la misma pregunta. Si el cliente no sabe la respuesta, ofrécele un aproximado o deriva al ingeniero.

Tus respuestas deben ser breves (máximo 2-3 párrafos cortos). Usa emojis con moderación para mantener la cercanía.

Extra: si el cliente solo saluda, responde EXACTAMENTE con este mensaje de bienvenida (sin cambiarlo):
"¡Hola! ☀️ Te saluda el equipo de Reiki Energía Solar. Nos alegra mucho que quieras dar el paso hacia la energía limpia.

¿Qué tienes en mente para hoy? ¿Te gustaría saber cuánto podrías ahorrar con un proyecto solar en tu factura de luz, o buscas un producto en particular?"
No digas que eres GPT/OpenAI.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'recomendar_proyecto_solar',
      description:
        'Recibe consumo mensual, tipo de techo y ubicación y retorna una recomendación estructurada de sistema solar.',
      parameters: {
        type: 'object',
        properties: {
          consumo_mensual: { type: 'string', description: 'Factura mensual o consumo en kWh' },
          tipo_techo: { type: 'string', description: 'Tipo de techo (teja, concreto, lámina, etc.)' },
          ubicacion: { type: 'string', description: 'Ciudad o zona del proyecto' },
          objetivo: {
            type: 'string',
            description: 'ahorro | respaldo | finca | mixto',
          },
        },
        required: ['ubicacion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_producto_tienda',
      description:
        'Busca equipos específicos (inversores, paneles, baterías) en la tienda y retorna nombre, precio y link exacto de compra (reikisolar.com.co/tienda/...).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto de búsqueda (panel, inversor, batería, marca, watts…)' },
          categoria: { type: 'string', description: 'Opcional: paneles, inversores, baterias, etc.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalar_a_humano',
      description:
        'Pasa al ingeniero de diseño fotovoltaico. REQUIERE nombre_cliente, ciudad y resumen. Si el chat no tiene teléfono visible, también telefono_cliente. Si falta alguno, NO uses esta tool: pregunta lo que falte primero.',
      parameters: {
        type: 'object',
        properties: {
          resumen: {
            type: 'string',
            description: 'Resumen del requerimiento (del cliente o del historial)',
          },
          nombre_cliente: { type: 'string', description: 'Nombre del cliente (obligatorio)' },
          ciudad: { type: 'string', description: 'Ciudad del proyecto (obligatorio)' },
          telefono_cliente: {
            type: 'string',
            description: 'Celular del cliente (ej. 3001234567). Obligatorio si WhatsApp ocultó el número.',
          },
        },
        required: ['resumen', 'nombre_cliente', 'ciudad'],
      },
    },
  },
];

export function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

/** Cantidad de mensajes en el historial de IA (user+assistant) */
export function getAiHistoryCount(from) {
  return (histories.get(from) || []).length;
}

/** True si la conversación ya es larga: no pedir resumen al escalar */
export function shouldSkipResumenAsk(from) {
  return getAiHistoryCount(from) > RESUMEN_ASK_MAX_MSGS;
}

export function isAiPaused(from) {
  const p = paused.get(from);
  if (!p) return false;
  if (Date.now() > p.until) {
    paused.delete(from);
    return false;
  }
  return true;
}

export function clearAiPause(from) {
  paused.delete(from);
  histories.delete(from);
}

function pushHistory(from, role, content) {
  const list = histories.get(from) || [];
  list.push({ role, content: String(content || '').slice(0, 1500) });
  while (list.length > MAX_HISTORY) list.shift();
  histories.set(from, list);
}

async function openaiChat(messages) {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      max_tokens: 500,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function runTool(name, args, from) {
  if (name === 'buscar_producto_tienda') {
    const items = searchProducts(args.query || '', { category: args.categoria, limit: 5 });
    return JSON.stringify({
      encontrados: items.length,
      productos: items.map((p) => ({
        nombre: p.nombre,
        precio: p.precio,
        link_compra: p.url,
      })),
      nota: items.length
        ? 'Comparte al cliente el nombre y el link_compra exacto (no inventes URLs).'
        : 'Sin coincidencias; ofrece cotizar proyecto o escalar a humano.',
    });
  }
  if (name === 'recomendar_proyecto_solar') {
    return JSON.stringify(
      recommendProject({
        consumoMensual: args.consumo_mensual,
        tipoTecho: args.tipo_techo,
        ubicacion: args.ubicacion,
        objetivo: args.objetivo,
      })
    );
  }
  if (name === 'escalar_a_humano') {
    let resumen = String(args.resumen || '').trim();
    let nombre = String(args.nombre_cliente || '').trim();
    let ciudad = String(args.ciudad || '').trim();
    let telefono = parsePhoneCo(args.telefono_cliente || '');

    // Completar desde sesión si la IA no los mandó
    try {
      const { getSession } = await import('./whatsapp-session.js');
      const s = getSession(from);
      if (!nombre) nombre = String(s.data.nombre || '').trim();
      if (!ciudad) ciudad = String(s.data.ciudad || '').trim();
      if (!resumen) resumen = String(s.data.necesidad || '').trim();
      if (!telefono) telefono = parsePhoneCo(s.data.telefono || '');
    } catch {
      /* optional */
    }

    const longChat = shouldSkipResumenAsk(from);
    const tooThin =
      resumen.length < 12 ||
      /^(hablar con (un )?(asesor|ingeniero)|asesor|humano|persona|quiero (un )?(asesor|ingeniero)|ing\.? diseño)\b/i.test(
        resumen
      );

    if (!nombre || nombre.length < 2) {
      return JSON.stringify({
        ok: false,
        error:
          'Falta el NOMBRE del cliente. Pídele solo el nombre (ej. Alex) y NO llames escalar_a_humano hasta tenerlo. Luego pásalo en nombre_cliente.',
      });
    }
    if (!ciudad || ciudad.length < 3) {
      return JSON.stringify({
        ok: false,
        error:
          'Falta la CIUDAD del cliente. Pídele solo la ciudad y NO llames escalar_a_humano hasta tenerla. Luego pásala en ciudad.',
      });
    }
    if (isBsuid(from) && !telefono) {
      return JSON.stringify({
        ok: false,
        error:
          'Este cliente oculta su número de WhatsApp. Pídele su CELULAR (ej. 300 123 4567) y pásalo en telefono_cliente antes de escalar.',
      });
    }

    if (tooThin && longChat) {
      const hist = histories.get(from) || [];
      resumen = hist
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' | ')
        .slice(0, 500);
      if (resumen.length < 8) resumen = 'Cliente pidió ingeniero tras conversación; ver historial en chat.';
    } else if (tooThin && !longChat) {
      return JSON.stringify({
        ok: false,
        error:
          'Falta un resumen concreto. Pídele qué necesita y NO vuelvas a llamar escalar_a_humano hasta tenerlo.',
      });
    }

    const cfg = getWhatsAppConfig();
    const leadData = { nombre, ciudad, necesidad: resumen, telefono };
    const summary =
      `LEAD IA WhatsApp — Reiki\n` +
      `${formatClientContact(from, leadData)}\n` +
      `Nombre: ${nombre}\n` +
      `Ciudad: ${ciudad}\n` +
      `Resumen: ${resumen}\n` +
      `Notificado a: +${cfg.personalPhone || cfg.ownerPhone}`;

    paused.set(from, { until: Date.now() + HUMAN_PAUSE_MS });
    await notifyOwner(summary, cfg);

    try {
      const { getSession, saveSession } = await import('./whatsapp-session.js');
      const s = getSession(from);
      s.step = 'human';
      s.humanUntil = Date.now() + HUMAN_PAUSE_MS;
      s.data.nombre = nombre.slice(0, 80);
      s.data.ciudad = ciudad.slice(0, 80);
      s.data.necesidad = resumen.slice(0, 400);
      if (telefono) s.data.telefono = telefono;
      saveSession(from, s);
    } catch {
      /* session optional */
    }

    return JSON.stringify({
      ok: true,
      pausado: true,
      mensaje_para_cliente: HANDOFF_CLIENT_MSG,
    });
  }
  return JSON.stringify({ error: 'tool_unknown' });
}

/**
 * Procesa un mensaje de usuario y retorna texto de respuesta.
 * @param {string} from
 * @param {string} userText
 * @returns {Promise<{ text: string, paused?: boolean }>}
 */
export async function handleAiMessage(from, userText) {
  const text = String(userText || '').trim();
  if (!text) return { text: '' };

  if (isAiPaused(from)) {
    return { text: '', paused: true };
  }

  // Reactivar con hola/menu
  const n = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (/^(hola|menu|inicio|bot)\b/.test(n)) {
    clearAiPause(from);
  }

  pushHistory(from, 'user', text);
  const history = histories.get(from) || [];
  const longChat = history.length > RESUMEN_ASK_MAX_MSGS;

  /** @type {{ role: string, content?: string, tool_calls?: any[], tool_call_id?: string, name?: string }[]} */
  let messages = [
    {
      role: 'system',
      content:
        SYSTEM_PROMPT +
        `\n\nEstado actual del chat: ${history.length} mensajes en historial. ` +
        (longChat
          ? 'Conversación LARGA (>5): si piden ingeniero, escala YA sin pedir resumen.'
          : 'Conversación CORTA (≤5): si piden ingeniero desde el menú inicial, pide resumen primero.'),
    },
    ...history,
  ];

  let data = await openaiChat(messages);
  let choice = data.choices?.[0]?.message;
  let guard = 0;

  while (choice?.tool_calls?.length && guard < 3) {
    guard += 1;
    messages.push({
      role: 'assistant',
      content: choice.content || null,
      tool_calls: choice.tool_calls,
    });

    for (const call of choice.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || '{}');
      } catch {
        args = {};
      }
      const result = await runTool(call.function?.name, args, from);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      });
    }

    if (isAiPaused(from)) {
      pushHistory(from, 'assistant', HANDOFF_CLIENT_MSG);
      return { text: HANDOFF_CLIENT_MSG, paused: true };
    }

    data = await openaiChat(messages);
    choice = data.choices?.[0]?.message;
  }

  let reply = String(choice?.content || '').trim();
  if (!reply) {
    reply =
      'Gracias por el mensaje. ¿Me cuentas un poco más qué necesitas, o prefieres que te pase con nuestro ingeniero de diseño fotovoltaico?';
  }

  pushHistory(from, 'assistant', reply);
  return { text: reply, paused: false };
}
