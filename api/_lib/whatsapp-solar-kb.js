/**
 * Base de conocimiento solar (Reiki) — tono cercano, comercial y claro.
 * Amplía keywords + body para “entrenar” respuestas naturales.
 */

/** @typedef {{ id: string, keywords: string[], title: string, body: string, cta?: 'proyecto'|'tienda'|'asesor' }} SolarTip */

/** @type {SolarTip[]} */
export const SOLAR_TIPS = [
  {
    id: 'ahorro_factura',
    keywords: ['ahorrar', 'factura', 'cuenta de luz', 'recibo', 'tarifa', 'epm', 'kwh', 'consumo'],
    title: 'Bajar la factura',
    body:
      'Si lo que te duele es la *cuenta de la luz*, en la mayoría de casas en Colombia vamos con un sistema *conectado a la red* (on-grid): de día generas y reduces lo que le compras a la empresa.\n\n' +
      'El tamaño no es “a ojo”: se arma con tu consumo o el valor de la factura, el techo y la ciudad. Así no te vendemos de más ni te quedas corto.\n\n' +
      'Si además tienes *cortes*, ahí sí miramos híbrido con batería. ¿Quieres que te arme una cotización seria?',
    cta: 'proyecto',
  },
  {
    id: 'backup',
    keywords: ['corte', 'cortes', 'apagón', 'apagon', 'respaldo', 'backup', 'ups', 'sin luz'],
    title: 'Cuando se va la luz',
    body:
      'Para *no quedarte a oscuras* no basta con “cualquier inversor”. Hay que mirar qué quieres mantener prendido (nevera, wifi, luces, bomba…) y por cuántas horas.\n\n' +
      'Eso define la batería y si te conviene un *híbrido*. Te puedo dejar el caso listo para que un asesor te pase opciones claras, sin tecnicismos de más.',
    cta: 'proyecto',
  },
  {
    id: 'offgrid',
    keywords: ['finca', 'rural', 'sin red', 'off grid', 'offgrid', 'aislado', 'campo'],
    title: 'Finca o sin red',
    body:
      'En finca o sitio *sin red* el sistema es otro cuento: paneles + inversor/controlador + baterías bien dimensionadas.\n\n' +
      'Lo más caro es equivocarse en el consumo o en la batería. Si me cuentas ciudad y para qué usas la energía (casa, riego, ganado), te oriento y te paso con alguien del equipo para cotizarte bien.',
    cta: 'proyecto',
  },
  {
    id: 'paneles',
    keywords: ['panel', 'paneles', 'modulo', 'módulo', 'watts', 'bifacial', 'trina', 'jinko', 'ja solar'],
    title: 'Sobre paneles',
    body:
      'En paneles lo importante es potencia, marca, garantía y que encajen con *tu* diseño (no solo el watt más barato).\n\n' +
      'Si ya tienes instalador, te dejo la tienda con precios. Si aún no tienes claro el sistema completo, mejor cotizamos el proyecto y elegimos el panel correcto contigo.\n\n' +
      'Catálogo: /tienda/categoria/paneles-solares',
    cta: 'tienda',
  },
  {
    id: 'inversores',
    keywords: ['inversor', 'inversores', 'hibrido', 'híbrido', 'ongrid', 'on-grid', 'growatt', 'must', 'victron'],
    title: 'Sobre inversores',
    body:
      'El inversor es el “cerebro”. Si quieres *ahorrar* en factura, casi siempre es on-grid. Si quieres *respaldo*, híbrido. Si no hay red, off-grid.\n\n' +
      'Elegir mal el tipo es el error que más plata quema. Cuéntame qué buscas (ahorrar, cortes o finca) y te digo el camino más sensato.',
    cta: 'proyecto',
  },
  {
    id: 'baterias',
    keywords: ['bateria', 'batería', 'baterias', 'baterías', 'litio', 'lifepo', 'almacenamiento'],
    title: 'Sobre baterías',
    body:
      'Hoy en residencial casi siempre hablamos de *litio*. Importa más el kWh útil y que sea compatible con tu inversor, que un número bonito en la etiqueta.\n\n' +
      'Si ya tienes equipo, dime marca/modelo. Si estás empezando, te ayudo a cotizar el paquete completo para que no compres una batería que después no te sirve.',
    cta: 'tienda',
  },
  {
    id: 'bombeo',
    keywords: ['bomba', 'bombeo', 'pozo', 'agua', 'riego'],
    title: 'Bombeo solar',
    body:
      'Para bombeo solar miramos caudal, altura y si necesitas agua de día o también de noche. A veces con tanque elevado te ahorras batería.\n\n' +
      'Dime ciudad y uso (casa, riego, ganado) y te paso con un asesor para cotizarte algo que sí funcione en campo.',
    cta: 'proyecto',
  },
  {
    id: 'precios',
    keywords: ['precio', 'precios', 'cuanto', 'cuánto', 'vale', 'costo', 'coste', 'cotizacion', 'cotización'],
    title: 'Cómo van los precios',
    body:
      'Te soy sincero: un precio “cerrado” por WhatsApp sin datos casi siempre falla.\n\n' +
      'Si ya sabes qué equipo necesitas, en la *tienda* hay precios publicados. Si quieres el sistema instalado (llave en mano), cotizamos con ciudad, tipo de uso y factura/consumo.\n\n' +
      'Así te doy un número real, no un globo.',
    cta: 'proyecto',
  },
  {
    id: 'financiacion',
    keywords: ['financi', 'cuotas', 'credi', 'addi', 'wompi', 'pagar', 'pago'],
    title: 'Pagos y cuotas',
    body:
      'En la tienda online puedes pagar con *Wompi* (tarjeta, PSE, Nequi, Bancolombia) y en muchos casos *Addi* a cuotas.\n\n' +
      'Si es un proyecto de instalación, el asesor te explica alcance y formas de pago del proyecto. ¿Quieres ver la tienda o prefieres que te coticiemos el sistema completo?',
    cta: 'tienda',
  },
  {
    id: 'cobertura',
    keywords: ['cobertura', 'ciudad', 'medellin', 'medellín', 'bogota', 'bogotá', 'envio', 'envío', 'colombia'],
    title: 'Dónde llegamos',
    body:
      'Estamos en *Medellín* y atendemos *toda Colombia*: equipos con envío nacional, y proyectos de instalación según ciudad y logística.\n\n' +
      '¿Desde qué ciudad me escribes? Con eso te digo el siguiente paso más rápido.',
    cta: 'proyecto',
  },
];

/**
 * @param {string} normalizedText
 * @returns {SolarTip | null}
 */
export function matchSolarTip(normalizedText) {
  if (!normalizedText || normalizedText.length < 3) return null;
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
  '¡Hola! ☀️ Habla con *Reiki Energía Solar*.\n\n' +
  'Estoy aquí para ayudarte de forma clara: entender qué necesitas, orientarte y, si te encaja, dejarte una cotización o los equipos listos.\n\n' +
  '¿En qué te puedo echar una mano hoy?';
