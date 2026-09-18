/**
 * Base de conocimiento solar (Reiki) — fácil de ampliar sin tocar el flujo.
 * Añade keywords + respuesta para mejorar el “entrenamiento” continuo.
 */

/** @typedef {{ id: string, keywords: string[], title: string, body: string, cta?: 'proyecto'|'tienda'|'asesor' }} SolarTip */

/** @type {SolarTip[]} */
export const SOLAR_TIPS = [
  {
    id: 'ahorro_factura',
    keywords: ['ahorrar', 'factura', 'cuenta de luz', 'recibo', 'tarifa', 'epm', 'kwh', 'consumo'],
    title: 'Ahorro en factura',
    body:
      'Para *bajar la factura*, lo habitual en Colombia es un sistema *on-grid* (conectado a la red):\n\n' +
      '• Generas de día y reduces lo que compras a la empresa de energía.\n' +
      '• El tamaño del sistema se dimensiona con tu *consumo (kWh)* o valor de factura.\n' +
      '• Un asesor Reiki te diseña paneles + inversor según tu techo y ciudad.\n\n' +
      '_Tip:_ si hay cortes frecuentes, conviene valorar *híbrido + batería*.',
    cta: 'proyecto',
  },
  {
    id: 'backup',
    keywords: ['corte', 'cortes', 'apagón', 'apagon', 'respaldo', 'backup', 'ups', 'sin luz'],
    title: 'Respaldo ante cortes',
    body:
      'Si lo que buscas es *no quedarte sin luz*, la ruta es *híbrido o off-grid con baterías*:\n\n' +
      '• Define qué cargas son críticas (nevera, bombas, internet, luces).\n' +
      '• La autonomía (horas) define el tamaño de la batería.\n' +
      '• No todos los “inversores baratos” manejan bien picos de arranque.\n\n' +
      'Te puedo dejar listo el caso para que un asesor te cotice el respaldo correcto.',
    cta: 'proyecto',
  },
  {
    id: 'offgrid',
    keywords: ['finca', 'rural', 'sin red', 'off grid', 'offgrid', 'aislado', 'campo'],
    title: 'Sin red / finca',
    body:
      'En *finca o sitio sin red* se diseña *off-grid*:\n\n' +
      '• Paneles + controlador/inversor + banco de baterías.\n' +
      '• Hay que listar equipos (W) y horas de uso — de ahí sale el dimensionamiento.\n' +
      '• El error más caro es subdimensionar batería o cableado.\n\n' +
      'Con unos datos básicos un asesor Reiki te arma la propuesta.',
    cta: 'proyecto',
  },
  {
    id: 'paneles',
    keywords: ['panel', 'paneles', 'modulo', 'módulo', 'watts', ' bifacial', 'trina', 'jinko', 'ja solar'],
    title: 'Paneles',
    body:
      'En paneles mira *potencia (W), eficiencia, garantía y marca*:\n\n' +
      '• Residencial: suele usarse 500–700 W según el diseño.\n' +
      '• Bifacial puede dar más generación según montaje.\n' +
      '• En tienda tienes precios publicados; en proyecto llave en mano el panel se elige con el diseño completo.\n\n' +
      `Catálogo: /tienda/categoria/paneles-solares`,
    cta: 'tienda',
  },
  {
    id: 'inversores',
    keywords: ['inversor', 'inversores', 'hibrido', 'híbrido', 'ongrid', 'on-grid', 'growatt', 'must', 'victron'],
    title: 'Inversores',
    body:
      'El *inversor* es el cerebro del sistema:\n\n' +
      '• *On-grid:* inyecta/compensa con la red (ahorro de factura).\n' +
      '• *Híbrido:* red + batería (ahorro y respaldo).\n' +
      '• *Off-grid:* sitios sin red.\n\n' +
      'Elegir mal el tipo es el error #1. Si me dices tu objetivo (ahorrar / respaldo / finca) te oriento.',
    cta: 'proyecto',
  },
  {
    id: 'baterias',
    keywords: ['bateria', 'batería', 'baterias', 'baterías', 'litio', 'lifepo', 'almacenamiento'],
    title: 'Baterías',
    body:
      'Las baterías de *litio (LiFePO4)* son hoy la opción más usada en residencial:\n\n' +
      '• Ciclos largos y mejor profundidad de descarga que plomo.\n' +
      '• El kWh útil importa más que el kWh “de etiqueta”.\n' +
      '• Deben ser compatibles con el inversor (comunicación / voltaje).\n\n' +
      'Si ya tienes inversor, dime marca/modelo y te indico el camino.',
    cta: 'tienda',
  },
  {
    id: 'bombeo',
    keywords: ['bomba', 'bombeo', 'pozo', 'agua', 'riego'],
    title: 'Bombeo solar',
    body:
      'El *bombeo solar* se dimensiona con caudal, altura (metros) y horas de sol.\n\n' +
      '• A veces no hace falta batería (bombeo de día al tanque).\n' +
      '• Si necesitas agua de noche, sí entra almacenamiento o tanque elevado.\n\n' +
      'Cuéntame ciudad + uso (casa, riego, ganado) y te paso con un asesor.',
    cta: 'proyecto',
  },
  {
    id: 'precios',
    keywords: ['precio', 'precios', 'cuanto', 'cuánto', 'vale', 'costo', 'coste', 'cotizacion', 'cotización'],
    title: 'Precios',
    body:
      'Hay dos caminos de precio:\n\n' +
      '1) *Tienda:* equipos sueltos con precio publicado (ideal si ya tienes instalador).\n' +
      '2) *Proyecto llave en mano:* diseño + equipos + instalación — se cotiza con tus datos (ciudad, tipo, factura/consumo).\n\n' +
      'Sin esos datos cualquier “precio cerrado” por chat suele ser engañoso.',
    cta: 'proyecto',
  },
  {
    id: 'financiacion',
    keywords: ['financi', 'cuotas', 'credi', 'addi', 'wompi', 'pagar', 'pago'],
    title: 'Pagos y cuotas',
    body:
      'En la *tienda online* puedes pagar con *Wompi* (tarjeta, PSE, Nequi, Bancolombia) o *Addi* (cuotas), según disponibilidad.\n\n' +
      'Los *proyectos llave en mano* se cotizan con asesor (alcance, visita y forma de pago del proyecto).',
    cta: 'tienda',
  },
  {
    id: 'cobertura',
    keywords: ['cobertura', 'ciudad', 'medellin', 'medellín', 'bogota', 'bogotá', 'envio', 'envío', 'colombia'],
    title: 'Cobertura',
    body:
      'Operamos desde *Medellín* con alcance *nacional*:\n\n' +
      '• Equipos: envío a todo el país desde la tienda.\n' +
      '• Instalación llave en mano: cotizamos según ciudad y logística.\n\n' +
      'Dime tu ciudad y te indico el siguiente paso.',
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
  'Soy el *asesor virtual de Reiki Energía Solar* ☀️\n\n' +
  'Mi prioridad es *entender tu caso* (ahorro, respaldo o equipos) y orientarte con criterio técnico antes de vender.\n\n' +
  '¿Qué te describe mejor hoy?';
