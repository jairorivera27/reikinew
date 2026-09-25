/**
 * Clasificación de intenciones WhatsApp (reglas, sin IA).
 *
 * Orden canónico (documentado también en whatsapp-bot.js):
 *   1. ingeniero
 *   2. ahorro  (factura/luz — NUNCA métodos de pago)
 *   3. pagar   (solo pago a Reiki / carrito activo)
 *   4. catálogo
 *   5. IA
 *
 * "respaldo" se evalúa junto a ahorro (antes de pagar) para no confundir con pagos.
 */

export function normalizeIntentText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Ingeniero / asesor humano */
export function looksLikeEngineerIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  return (
    /\bingeniero\b/.test(n) ||
    /\b(hablar con (un )?(asesor|humano|persona)|quiero (un )?(asesor|ingeniero)|asesor(ia|ía)?)\b/.test(
      n
    ) ||
    /^(asesor|humano|persona)$/.test(n)
  );
}

/**
 * Intención AHORRO / bajar factura.
 * pagar|pago|cobro|factura|recibo + luz|energía|EPM|servicios|kWh,
 * o "muy cara", "me llega mucho", "ahorrar", "bajar la factura", "cansado de pagar".
 */
export function looksLikeAhorroIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;

  if (/\bcansado de pagar\b/.test(n)) return true;
  if (/\b(ahorrar|ahorro|ahorros)\b/.test(n)) return true;
  if (/\bbajar (la )?factura\b/.test(n)) return true;
  if (/\bdejar de pagar\b/.test(n)) return true;
  if (/\b(muy cara|me llega (muy )?(mucho|cara)|llega muy cara)\b/.test(n)) return true;
  if (/\b(cuanto|cuánto)\b.{0,40}\bahorr/.test(n)) return true;

  const moneyWord = /\b(pagar|pago|pagando|cobro|factura|recibo|cuenta de (luz|energia|servicios))\b/.test(
    n
  );
  const energyCtx =
    /\b(luz|energia|epm|servicios publicos|servicios|kwh|kilovatio|panel(es)?)\b/.test(n);
  if (moneyWord && energyCtx) return true;

  if (/\bfactura\b/.test(n) && /\b(epm|luz|energia|cara|mensual)\b/.test(n)) return true;

  return false;
}

/** Respaldo / apagones (no es pago a Reiki). */
export function looksLikeRespaldoIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  if (looksLikeAhorroIntent(text) && !/\brespaldo\b/.test(n) && !/\bse (me |nos )?va\b/.test(n)) {
    return false;
  }
  return (
    /\brespaldo\b/.test(n) ||
    /\b(se (me |nos )?va la (luz|energia)|apagones?|sin luz|backup|planta electric)\b/.test(n)
  );
}

/**
 * Pago explícito a Reiki (formas de pago, cuenta, Bre-B, comprobante, etc.).
 * No incluye "pagar energía/luz".
 */
export function looksLikeExplicitPayReiki(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  if (looksLikeAhorroIntent(text)) return false;

  if (
    /\b(como (les |le |les|le)?\s*pago|como pago|formas? de pago|metodos? de pago)\b/.test(n)
  ) {
    return true;
  }
  if (/\b(numero|nro|no\.?) de cuenta\b/.test(n) || /\bcuenta (bancaria|bancolombia)\b/.test(n)) {
    return true;
  }
  if (/\b(bre-?b|breb|llave|transferencia|consignar|consignacion)\b/.test(n)) return true;
  if (/\b(wompi|addi|nequi|pse|bancolombia)\b/.test(n)) return true;
  if (/\b(quiero pagar( la)?( cotizacion| pedido| orden)?|ya pague|comprobante)\b/.test(n)) {
    return true;
  }
  if (/\bpagar (con|la cotizacion|el pedido|mi pedido)\b/.test(n)) return true;
  if (/\bpuedo pagar\b/.test(n)) return true;

  return false;
}

/**
 * Intención PAGAR: solo si NO es ahorro Y
 * (pago explícito a Reiki O hay carrito/cotización + verbo pagar).
 */
export function looksLikePaymentIntent(text, { hasCartOrQuote = false } = {}) {
  if (looksLikeAhorroIntent(text)) return false;
  if (looksLikeExplicitPayReiki(text)) return true;

  const n = normalizeIntentText(text);
  if (hasCartOrQuote && /\b(pagar|pago|pagarlo|pagarla|pagarlo)\b/.test(n)) {
    // Evitar "pago de luz" aunque haya carrito
    if (/\b(luz|energia|epm|factura|kwh)\b/.test(n)) return false;
    return true;
  }
  return false;
}

/**
 * "pagar"/"pago" suelto sin contexto de ahorro ni de pago a Reiki ni carrito.
 */
export function looksLikeAmbiguousPayIntent(text, { hasCartOrQuote = false } = {}) {
  if (hasCartOrQuote) return false;
  if (looksLikeAhorroIntent(text)) return false;
  if (looksLikeExplicitPayReiki(text)) return false;
  if (looksLikeEngineerIntent(text) || looksLikeRespaldoIntent(text)) return false;

  const n = normalizeIntentText(text);
  return /\b(pagar|pago|pagos)\b/.test(n);
}

/** @deprecated Usar looksLikePaymentIntent. Conservado por compat. */
export function looksLikePaymentQuery(text, opts) {
  return looksLikePaymentIntent(text, opts);
}

/**
 * Intención de compra / cierre (punto 19).
 * Solo actúa si hay carrito o cotización; si no, el bot ofrece catálogo.
 */
export function looksLikeBuyIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  if (looksLikeAhorroIntent(text)) return false;
  return (
    /\blo quiero\b/.test(n) ||
    /\bcomo compro\b/.test(n) ||
    /\bquiero comprar(\s+la)?(\s+cotizacion)?\b/.test(n) ||
    /\bcomprar la cotizacion\b/.test(n) ||
    /\bvamos a (comprar|pagar)\b/.test(n) ||
    /\blo compro\b/.test(n)
  );
}

/** Instalación / sistema solar (casa, negocio, finca) — no es cotizar un solo equipo. */
export function looksLikeInstallIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  if (
    /\b(instalar|instalacion|instalación)\b/.test(n) &&
    /\b(solar|panel|paneles|energia|energía|sistema)\b/.test(n)
  ) {
    return true;
  }
  if (/\b(quiero|necesito|busco)\b.{0,40}\b(energia|energía) solar\b/.test(n)) return true;
  if (/\bsistema solar\b/.test(n) && /\b(casa|hogar|negocio|finca|empresa|comercio)\b/.test(n)) {
    return true;
  }
  if (/\bpaneles?\b.{0,30}\b(para (mi |la )?(casa|hogar|negocio|finca|empresa))\b/.test(n)) {
    return true;
  }
  if (/\b(para mi (casa|finca|negocio)|en mi (casa|finca|negocio))\b/.test(n) && /\b(solar|panel)/.test(n)) {
    return true;
  }
  if (/^(instalar solar|cotizar instalacion|cotizar instalación)$/.test(n)) return true;
  return false;
}

/**
 * Cotizar un equipo concreto (producto), no instalación llave en mano.
 * Si ya nombra panel/inversor/batería + potencia, suele ir a catálogo.
 */
export function looksLikeQuoteEquipmentIntent(text) {
  const n = normalizeIntentText(text);
  if (!n) return false;
  if (looksLikeInstallIntent(text)) return false;
  if (/\b(cotizar|cotizacion|cotización|cuanto cuesta|cuánto cuesta|precio de)\b/.test(n)) {
    if (/\b(inversor|panel|bateria|batería|controlador|estructura|cable|proteccion|protección)\b/.test(n)) {
      return true;
    }
    if (/\bun equipo\b/.test(n) || /^(cotizar|quiero cotizar)$/.test(n)) return true;
  }
  if (/\bquiero cotizar\b/.test(n)) return true;
  return false;
}

/**
 * Clasifica intención para tests y enrutado.
 * @returns {'ingeniero'|'instalar'|'cotizar'|'ahorro'|'respaldo'|'compra'|'pagar'|'ambiguo_pago'|'catalogo'|'ia'}
 */
export function classifyWhatsAppIntent(text, opts = {}) {
  const { hasCartOrQuote = false, looksLikeCatalogQuery } = opts;

  if (looksLikeEngineerIntent(text)) return 'ingeniero';
  if (looksLikeInstallIntent(text)) return 'instalar';
  if (looksLikeQuoteEquipmentIntent(text)) {
    // Si ya nombra un producto concreto → catálogo; si no → cotizar (preguntar qué equipo)
    if (typeof looksLikeCatalogQuery === 'function' && looksLikeCatalogQuery(text)) {
      return 'catalogo';
    }
    const n = normalizeIntentText(text);
    if (/\b(inversor|panel|bateria|batería|controlador)\b/.test(n) && /\d/.test(n)) {
      return 'catalogo';
    }
    return 'cotizar';
  }
  if (looksLikeAhorroIntent(text)) return 'ahorro';
  if (looksLikeRespaldoIntent(text)) return 'respaldo';
  if (looksLikeBuyIntent(text)) {
    return hasCartOrQuote ? 'compra' : 'catalogo';
  }
  if (looksLikePaymentIntent(text, { hasCartOrQuote })) return 'pagar';
  if (looksLikeAmbiguousPayIntent(text, { hasCartOrQuote })) return 'ambiguo_pago';

  if (typeof looksLikeCatalogQuery === 'function') {
    if (looksLikeCatalogQuery(text)) return 'catalogo';
  } else {
    const n = normalizeIntentText(text);
    if (/\b(panel|inversor|bateria|batería)\b/.test(n) || /\b\d+\s*kw\b/.test(n)) return 'catalogo';
  }

  return 'ia';
}
