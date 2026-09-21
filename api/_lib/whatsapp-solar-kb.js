/**
 * Base de conocimiento solar — tono comercial colombiano, cercano y profesional.
 */

/** @typedef {{ id: string, keywords: string[], title: string, body: string, cta?: 'proyecto'|'tienda'|'asesor' }} SolarTip */

/** @type {SolarTip[]} */
export const SOLAR_TIPS = [
  {
    id: 'ahorro_factura',
    keywords: ['ahorrar', 'factura', 'cuenta de luz', 'recibo', 'tarifa', 'epm', 'kwh', 'consumo', 'luz cara'],
    title: 'Dejar de pagar energía',
    body:
      'Claro que sí. Si lo que quieres es *dejar de pagar tanta energía*, en la mayoría de hogares en Colombia trabajamos con un sistema *conectado a la red*: de día generas con paneles y reduces lo que le compras a la empresa de energía.\n\n' +
      'Para cotizarte bien no inventamos un kit genérico: miramos tu consumo o el valor de la factura, el techo y la ciudad. Así te proponemos algo que sí te sirva.\n\n' +
      'Si además *se te va la energía*, te conviene mirar un híbrido con batería. ¿Quieres que te dejemos una cotización seria?',
    cta: 'proyecto',
  },
  {
    id: 'backup',
    keywords: ['corte', 'cortes', 'apagón', 'apagon', 'respaldo', 'backup', 'ups', 'sin luz', 'se va la luz'],
    title: 'Se me va la energía',
    body:
      'Entiendo perfecto. Si *se te va la energía* y quieres respaldo, hay que ver qué deseas mantener prendido (nevera, wifi, luces, bomba…) y por cuánto tiempo.\n\n' +
      'Con eso armamos un *híbrido con batería* a tu medida. Te puedo dejar el caso listo para que un asesor te pase opciones claras, sin rodeos.',
    cta: 'proyecto',
  },
  {
    id: 'offgrid',
    keywords: ['finca', 'rural', 'sin red', 'off grid', 'offgrid', 'aislado', 'campo', 'vereda'],
    title: 'Finca o sin red',
    body:
      'Con gusto. En finca o sitio *sin red* el sistema es otro: paneles, inversor/controlador y baterías bien dimensionadas.\n\n' +
      'Lo más importante es no subdimensionar el consumo ni la batería. Si me cuentas ciudad y para qué usas la energía (casa, riego, ganado), te oriento y te pasamos una propuesta formal.',
    cta: 'proyecto',
  },
  {
    id: 'paneles',
    keywords: ['panel', 'paneles', 'modulo', 'módulo', 'watts', 'bifacial', 'trina', 'jinko', 'ja solar'],
    title: 'Paneles',
    body:
      'Te cuento de frente: en paneles importa la potencia, la marca, la garantía y que encajen con *tu* diseño — no solo el más barato.\n\n' +
      'Si ya tienes instalador, en la tienda encuentras precios publicados. Si aún no tienes claro el sistema completo, mejor cotizamos el proyecto y elegimos el panel correcto contigo.\n\n' +
      'Catálogo: /tienda/categoria/paneles-solares',
    cta: 'tienda',
  },
  {
    id: 'inversores',
    keywords: ['inversor', 'inversores', 'hibrido', 'híbrido', 'ongrid', 'on-grid', 'growatt', 'must', 'victron'],
    title: 'Inversores',
    body:
      'El inversor es el corazón del sistema. Si quieres *ahorrar* en la factura, casi siempre es on-grid. Si quieres *respaldo*, híbrido. Si no hay red, off-grid.\n\n' +
      'Elegir mal el tipo es de los errores que más cuestan. Cuéntame qué buscas y te digo el camino más sensato.',
    cta: 'proyecto',
  },
  {
    id: 'baterias',
    keywords: ['bateria', 'batería', 'baterias', 'baterías', 'litio', 'lifepo', 'almacenamiento'],
    title: 'Baterías',
    body:
      'Hoy en residencial casi siempre hablamos de *litio*. Lo que importa es el kWh útil y que sea compatible con tu inversor.\n\n' +
      'Si ya tienes equipo, dime marca y modelo. Si estás empezando, te ayudamos a cotizar el paquete completo para que no compres algo que después no te sirve.',
    cta: 'tienda',
  },
  {
    id: 'bombeo',
    keywords: ['bomba', 'bombeo', 'pozo', 'agua', 'riego'],
    title: 'Bombeo solar',
    body:
      'Para bombeo solar miramos caudal, altura y si necesitas agua solo de día o también de noche. A veces con tanque elevado te ahorras batería.\n\n' +
      'Dime ciudad y uso (casa, riego, ganado) y con gusto te pasamos con un asesor para cotizarte algo que funcione en campo.',
    cta: 'proyecto',
  },
  {
    id: 'precios',
    keywords: ['precio', 'precios', 'cuanto', 'cuánto', 'vale', 'costo', 'coste', 'cotizacion', 'cotización', 'barato'],
    title: 'Precios',
    body:
      'Te soy transparente: un precio cerrado por WhatsApp sin datos casi siempre falla.\n\n' +
      'Si ya sabes qué equipo necesitas, en la *tienda* hay precios publicados. Si quieres el sistema instalado (llave en mano), cotizamos con ciudad, tipo de uso y factura o consumo.\n\n' +
      'Así te damos un número real y responsable.',
    cta: 'proyecto',
  },
  {
    id: 'financiacion',
    keywords: ['financi', 'cuotas', 'credi', 'addi', 'wompi', 'pagar', 'pago'],
    title: 'Pagos y cuotas',
    body:
      'En la tienda online puedes pagar con *Wompi* (tarjeta, PSE, Nequi, Bancolombia) y en muchos casos *Addi* a cuotas.\n\n' +
      'Si es un proyecto de instalación, el asesor te explica alcance y formas de pago. ¿Prefieres ver la tienda o que te coticiemos el sistema completo?',
    cta: 'tienda',
  },
  {
    id: 'cobertura',
    keywords: ['cobertura', 'envio', 'envío', 'colombia', 'nacional', 'medellin', 'medellín'],
    title: 'Cobertura',
    body:
      'Estamos en *Medellín* y atendemos *toda Colombia*: equipos con envío nacional, y proyectos de instalación según ciudad y logística.\n\n' +
      '¿Desde qué ciudad me escribes? Con eso te indico el siguiente paso más rápido.',
    cta: 'proyecto',
  },
];

/**
 * @param {string} normalizedText
 * @returns {SolarTip | null}
 */
export function matchSolarTip(normalizedText) {
  if (!normalizedText || normalizedText.length < 3) return null;
  // Evitar que una sola ciudad dispare tip de cobertura
  const cityOnly = /^(medellin|medellín|bogota|bogotá|cali|barranquilla|cartagena|bucaramanga|pereira|manizales|armenia|ibague|ibagué|neiva|villavicencio|cucuta|cúcuta|santa marta|pasto|monteria|montería)$/;
  if (cityOnly.test(normalizedText.trim())) return null;

  let best = null;
  let bestScore = 0;
  for (const tip of SOLAR_TIPS) {
    let score = 0;
    for (const kw of tip.keywords) {
      if (normalizedText.includes(kw)) score += kw.length > 5 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = tip;
    }
  }
  return bestScore > 0 ? best : null;
}

export const CONSULTANT_INTRO =
  '¡Hola! ☀️ Qué gusto saludarte.\n\n' +
  'Soy el asistente de *Reiki Energía Solar*. Estoy aquí para ayudarte con calma: entender qué necesitas y orientarte hacia la mejor opción (ahorro, respaldo o equipos).\n\n' +
  'Cuéntame, ¿en qué te puedo echar una mano hoy?';
