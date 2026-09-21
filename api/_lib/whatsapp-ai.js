/**
 * Capa OpenAI (GPT) + function calling para el bot WhatsApp Reiki.
 * Si no hay OPENAI_API_KEY, el caller debe usar el flujo por reglas.
 */
import { getWhatsAppConfig, notifyOwner } from './whatsapp.js';
import { recommendProject, searchProducts } from './whatsapp-catalog.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const MAX_HISTORY = 6;

/** @type {Map<string, { role: string, content: string }[]>} */
const histories = globalThis.__reikiWaAiHistory || new Map();
globalThis.__reikiWaAiHistory = histories;

/** @type {Map<string, { until: number }>} */
const paused = globalThis.__reikiWaAiPaused || new Map();
globalThis.__reikiWaAiPaused = paused;

const SYSTEM_PROMPT = `Eres el asesor comercial estrella de Reiki Energía Solar SAS (https://reikisolar.com.co).
Tu tono es cálido, empático, amigable y muy natural (cero robótico). Hablas como un comercial colombiano profesional: cercano, claro y con gusto de ayudar.
Eres experto en energía solar, pero explicas fácil. No inventes precios de instalación cerrados ni productos que no existan en la tienda.

Flujos:
1) Proyectos llave en mano: guía con UNA pregunta a la vez. Cuando tengas consumo/factura, ciudad y tipo de uso, usa recomendar_proyecto_solar.
2) Productos/equipos: si piden un equipo concreto, usa buscar_producto_tienda y comparte nombre, precio y link exacto.
3) Humano: si piden asesor/persona/humano, están frustrados, o la duda es demasiado compleja, usa escalar_a_humano de inmediato.

Reglas de oro:
- NUNCA repitas la misma pregunta en bucle. Si no saben un dato, ofrece aproximado o escala a humano.
- Respuestas breves (máximo 2-3 párrafos cortos). Emojis con moderación.
- No digas que eres GPT/OpenAI; eres el asistente de Reiki.
- Si el cliente solo saluda, saluda con calidez y pregunta en qué le ayudas (dejar de pagar tanta energía, se le va la luz, o comprar equipos).`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'recomendar_proyecto_solar',
      description: 'Genera una recomendación estructurada de sistema solar con los datos del cliente.',
      parameters: {
        type: 'object',
        properties: {
          consumo_mensual: { type: 'string', description: 'Factura o kWh mensuales' },
          tipo_techo: { type: 'string', description: 'Tipo de techo si se conoce' },
          ubicacion: { type: 'string', description: 'Ciudad o zona' },
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
      description: 'Busca productos reales del catálogo reikisolar.com.co/tienda',
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
      description: 'Pausa la IA y avisa a un asesor humano con resumen del caso.',
      parameters: {
        type: 'object',
        properties: {
          resumen: { type: 'string', description: 'Resumen claro de lo que quiere el cliente' },
          nombre_cliente: { type: 'string' },
          ciudad: { type: 'string' },
        },
        required: ['resumen'],
      },
    },
  },
];

export function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
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
      productos: items,
      nota: items.length ? 'Usa estos links exactos.' : 'Sin coincidencias; ofrece cotizar proyecto o escalar a humano.',
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
    const cfg = getWhatsAppConfig();
    const summary =
      `LEAD IA WhatsApp\n` +
      `WhatsApp: +${from}\n` +
      `Nombre: ${args.nombre_cliente || '—'}\n` +
      `Ciudad: ${args.ciudad || '—'}\n` +
      `Resumen: ${args.resumen || '—'}`;
    await notifyOwner(summary, cfg);
    paused.set(from, { until: Date.now() + 12 * 60 * 60 * 1000 });
    try {
      const { getSession, saveSession } = await import('./whatsapp-session.js');
      const s = getSession(from);
      s.step = 'human';
      s.humanUntil = Date.now() + 12 * 60 * 60 * 1000;
      if (args.nombre_cliente) s.data.nombre = String(args.nombre_cliente).slice(0, 80);
      if (args.ciudad) s.data.ciudad = String(args.ciudad).slice(0, 80);
      if (args.resumen) s.data.necesidad = String(args.resumen).slice(0, 200);
      saveSession(from, s);
    } catch {
      /* session optional */
    }
    return JSON.stringify({
      ok: true,
      mensaje_para_cliente:
        '¡Claro que sí! Ya le envié un mensaje a uno de nuestros ingenieros; se pondrá en contacto contigo desde este mismo chat en breve.',
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

  /** @type {{ role: string, content?: string, tool_calls?: any[], tool_call_id?: string, name?: string }[]} */
  let messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

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
      const pausedMsg =
        '¡Claro que sí! Ya le envié un mensaje a uno de nuestros ingenieros; se pondrá en contacto contigo desde este mismo chat en breve.';
      pushHistory(from, 'assistant', pausedMsg);
      return { text: pausedMsg, paused: true };
    }

    data = await openaiChat(messages);
    choice = data.choices?.[0]?.message;
  }

  let reply = String(choice?.content || '').trim();
  if (!reply) {
    reply =
      'Con gusto te ayudo 🙂 Cuéntame si quieres dejar de pagar tanta energía, si se te va la luz, o si buscas un equipo específico.';
  }

  pushHistory(from, 'assistant', reply);
  return { text: reply, paused: false };
}
