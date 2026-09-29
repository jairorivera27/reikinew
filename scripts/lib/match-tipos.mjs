/**
 * Reglas de tipo OBLIGATORIAS para match de fotos de proveedor.
 * Usado por reclasificar-manifest y descargar-imagenes-proveedores.
 */

export function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

/** Texto del producto (nombre, specs) — NUNCA interpretar dígitos SCC como V/A. */
export function productBlob(p) {
  return `${p.title || ''} ${p.model || ''} ${p.sku || ''} ${p.power || ''} ${(p.specifications || []).join(' ')}`;
}

export function detectProductType(p) {
  const blob = productBlob(p);
  const n = norm(blob);
  const out = {
    tech: null, // pwm | mppt
    victronLine: null, // bluesolar | smartsolar
    inverterFamily: null, // multiplus-ii | multiplus-compact | multiplus | quattro | phoenix
    growattFamily: null, // min | mid | mac | mod
    verified: false,
  };

  if (/\bPWM\b/i.test(blob) || /TIPO:\s*PWM/i.test(blob)) out.tech = 'pwm';
  else if (/\bMPPT\b/i.test(blob) || /TIPO:\s*MPPT/i.test(blob)) out.tech = 'mppt';

  if (/BLUESOLAR/i.test(blob) || n.includes('BLUESOLAR')) out.victronLine = 'bluesolar';
  else if (/SMARTSOLAR/i.test(blob) || n.includes('SMARTSOLAR')) out.victronLine = 'smartsolar';
  // Infer line from tech + brand Victron when name has PWM/MPPT but not line:
  // BlueSolar covers both PWM and some MPPT; SmartSolar is MPPT-only naming.
  // Do NOT infer from SCC digits.

  if (/MULTIPLUS[\s-]*II|MULTIPLUSII/i.test(blob) || n.includes('MULTIPLUSII'))
    out.inverterFamily = 'multiplus-ii';
  else if (/MULTIPLUS[\s-]*COMPACT|MULTIPLUSCOMPACT/i.test(blob) || n.includes('MULTIPLUSCOMPACT'))
    out.inverterFamily = 'multiplus-compact';
  else if (/MULTIPLUS/i.test(blob) || n.includes('MULTIPLUS')) out.inverterFamily = 'multiplus';
  else if (/QUATTRO/i.test(blob) || n.includes('QUATTRO')) out.inverterFamily = 'quattro';
  else if (/PHOENIX/i.test(blob) || n.includes('PHOENIX')) out.inverterFamily = 'phoenix';

  // Growatt family: prefer explicit tokens in title/model (word boundaries)
  if (/\bMAC\b/i.test(blob) || /GROWATT\s*MAC/i.test(blob)) out.growattFamily = 'mac';
  else if (/\bMID\b/i.test(blob) || /MID\s*\d|KTL3|TL3/i.test(blob)) out.growattFamily = 'mid';
  else if (/\bMIN\b/i.test(blob) || /MIN\s*\d|TL-?X\b/i.test(blob)) out.growattFamily = 'min';
  else if (/\bMOD\b/i.test(blob) || /GROWATT\s*MOD/i.test(blob)) out.growattFamily = 'mod';

  out.verified = Boolean(
    out.tech || out.victronLine || out.inverterFamily || out.growattFamily
  );
  return out;
}

export function detectSourceType(haystack) {
  const blob = String(haystack || '');
  const n = norm(blob);
  const out = {
    tech: null,
    victronLine: null,
    inverterFamily: null,
    growattFamily: null,
    nfacAccessory: false,
    verified: false,
  };

  // NFAC = Solaire accessories — never product photo for inverter/battery
  if (/\bNFAC\d+/i.test(blob) || n.includes('NFAC')) out.nfacAccessory = true;

  if (/\bPWM\b/i.test(blob) || n.includes('PWM')) out.tech = 'pwm';
  else if (/\bMPPT\b/i.test(blob) || n.includes('MPPT')) out.tech = 'mppt';

  if (/BLUESOLAR/i.test(blob) || n.includes('BLUESOLAR')) out.victronLine = 'bluesolar';
  else if (/SMARTSOLAR/i.test(blob) || n.includes('SMARTSOLAR')) out.victronLine = 'smartsolar';

  if (/MULTIPLUS[\s-]*II|MULTIPLUSII/i.test(blob) || n.includes('MULTIPLUSII'))
    out.inverterFamily = 'multiplus-ii';
  else if (/MULTIPLUS[\s-]*COMPACT|MULTIPLUSCOMPACT/i.test(blob) || n.includes('MULTIPLUSCOMPACT'))
    out.inverterFamily = 'multiplus-compact';
  else if (/MULTIPLUS/i.test(blob) || n.includes('MULTIPLUS')) out.inverterFamily = 'multiplus';
  else if (/QUATTRO/i.test(blob) || n.includes('QUATTRO')) out.inverterFamily = 'quattro';
  else if (/PHOENIX/i.test(blob) || n.includes('PHOENIX')) out.inverterFamily = 'phoenix';

  if (/\bMAC\b/i.test(blob) || n.includes('GROWATTMAC') || /\/mac[-_]/i.test(blob))
    out.growattFamily = 'mac';
  else if (/\bMID\b/i.test(blob) || /MID[-_]?\d|KTL3|TL3/i.test(blob)) out.growattFamily = 'mid';
  else if (/\bMIN\b/i.test(blob) || /MIN[-_]?\d|TL-?X/i.test(blob)) out.growattFamily = 'min';
  else if (/\bMOD\b/i.test(blob) || /GROWATTMOD|\/mod[-_]/i.test(blob)) out.growattFamily = 'mod';

  out.verified = Boolean(
    out.tech || out.victronLine || out.inverterFamily || out.growattFamily || out.nfacAccessory
  );
  return out;
}

/**
 * @returns {{ ok: boolean, reason?: string, forceMatch?: 'serie'|'dudoso'|null }}
 */
export function typeGate(product, sourceHaystack) {
  const pt = detectProductType(product);
  const st = detectSourceType(sourceHaystack);
  const cat = product.category || '';

  // NFAC accessories cannot illustrate inverter/battery
  if (st.nfacAccessory && (cat === 'inversores' || cat === 'baterias')) {
    return { ok: false, reason: 'NFAC es accesorio; no vale como foto de inversor/batería' };
  }

  // PWM / MPPT hard rule
  if (pt.tech && st.tech && pt.tech !== st.tech) {
    return { ok: false, reason: `${pt.tech.toUpperCase()} no puede usar foto ${st.tech.toUpperCase()}` };
  }
  if (pt.tech && !st.tech) {
    // cannot verify source tech → dudoso at best
    return { ok: true, forceMatch: 'dudoso', reason: `producto ${pt.tech.toUpperCase()} pero fuente sin tech verificable` };
  }

  // BlueSolar ≠ SmartSolar for exacto; serie allowed between them
  if (pt.victronLine && st.victronLine && pt.victronLine !== st.victronLine) {
    return {
      ok: true,
      forceMatch: 'serie',
      reason: `${pt.victronLine} vs ${st.victronLine} → máximo serie`,
    };
  }

  // Inverter families never cross
  if (pt.inverterFamily && st.inverterFamily && pt.inverterFamily !== st.inverterFamily) {
    return {
      ok: false,
      reason: `familia ${pt.inverterFamily} ≠ ${st.inverterFamily}`,
    };
  }
  if (pt.inverterFamily && !st.inverterFamily) {
    return {
      ok: true,
      forceMatch: 'dudoso',
      reason: `producto ${pt.inverterFamily} pero fuente sin familia verificable`,
    };
  }

  // Growatt families never cross
  if (pt.growattFamily && st.growattFamily && pt.growattFamily !== st.growattFamily) {
    return {
      ok: false,
      reason: `Growatt ${pt.growattFamily.toUpperCase()} ≠ ${st.growattFamily.toUpperCase()}`,
    };
  }
  if (pt.growattFamily && !st.growattFamily) {
    return {
      ok: true,
      forceMatch: 'dudoso',
      reason: `producto Growatt ${pt.growattFamily.toUpperCase()} sin familia en fuente`,
    };
  }

  // If we couldn't verify any relevant type on either side for typed products → dudoso
  if (!pt.verified && !st.verified) {
    return { ok: true, forceMatch: 'dudoso', reason: 'tipo no verificable' };
  }

  return { ok: true, forceMatch: null };
}

/**
 * Clasifica match tras pasar typeGate.
 * No interpreta dígitos SCC como potencia.
 */
export function classifyMatchStrict(product, pageTitle, pageUrl, extraHay = '') {
  const hayRaw = `${pageTitle || ''} ${pageUrl || ''} ${extraHay || ''}`;
  const gate = typeGate(product, hayRaw);
  if (!gate.ok) return { match: null, reason: gate.reason };

  const hay = norm(hayRaw);
  const model = norm(product.model || product.sku || '');
  const titleN = norm(product.title);
  const pt = detectProductType(product);
  const st = detectSourceType(hayRaw);

  let match = null;
  let reason = gate.reason || '';

  // Exact model string in page (not SCC digit decoding)
  if (model && model.length >= 5 && hay.includes(model)) {
    match = 'exacto';
    reason = 'modelo exacto en página';
  }

  // Named product tokens from title (SmartSolar MPPT 100/50 etc.) — from NAME not SCC
  const nameAmp = String(product.title || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (nameAmp) {
    const token = norm(`${nameAmp[1]}${nameAmp[2]}`);
    if (hay.includes(token) || hay.includes(norm(`${nameAmp[1]}/${nameAmp[2]}`))) {
      // only exacto if same Victron line when both known
      if (pt.victronLine && st.victronLine && pt.victronLine !== st.victronLine) {
        match = 'serie';
        reason = 'misma potencia nominal, línea BlueSolar≠SmartSolar';
      } else if (pt.tech && st.tech && pt.tech === st.tech) {
        match = match === 'exacto' ? 'exacto' : 'exacto';
        reason = reason || 'nombre con V/A coincidente';
      } else if (!match) {
        match = 'serie';
        reason = 'V/A en nombre, tech parcial';
      }
    }
  }

  // Same verified family → serie (if not already exacto)
  if (!match) {
    if (pt.victronLine && st.victronLine && pt.victronLine === st.victronLine) {
      match = 'serie';
      reason = `misma línea ${pt.victronLine}`;
    } else if (pt.inverterFamily && st.inverterFamily && pt.inverterFamily === st.inverterFamily) {
      match = 'serie';
      reason = `misma familia ${pt.inverterFamily}`;
    } else if (pt.growattFamily && st.growattFamily && pt.growattFamily === st.growattFamily) {
      match = 'serie';
      reason = `misma familia Growatt ${pt.growattFamily}`;
    } else if (pt.tech && st.tech && pt.tech === st.tech && pt.victronLine && st.victronLine && pt.victronLine === st.victronLine) {
      match = 'serie';
      reason = `mismo tech+línea`;
    } else if (pt.tech && st.tech && pt.tech === st.tech) {
      // PWM↔PWM / MPPT↔MPPT
      if (pt.tech === 'pwm') {
        match = 'serie';
        reason = 'PWM↔PWM';
      } else if (pt.tech === 'mppt') {
        match = 'serie';
        reason = 'MPPT↔MPPT';
      }
    }
  }

  // Apply force from gate (caps the match)
  if (gate.forceMatch === 'dudoso') {
    if (match === 'exacto' || match === 'serie') {
      reason = `${reason || match} → dudoso (${gate.reason})`;
      match = 'dudoso';
    } else if (!match) {
      match = 'dudoso';
      reason = gate.reason;
    }
  } else if (gate.forceMatch === 'serie') {
    if (match === 'exacto') {
      reason = `${reason} → serie (${gate.reason})`;
      match = 'serie';
    } else if (!match) {
      match = 'serie';
      reason = gate.reason;
    }
  }

  // BlueSolar vs SmartSolar never exacto
  if (match === 'exacto' && pt.victronLine && st.victronLine && pt.victronLine !== st.victronLine) {
    match = 'serie';
    reason = 'BlueSolar≠SmartSolar → no exacto';
  }

  if (!match) {
    // leftover weak overlap → dudoso if any brand token, else null
    const brand = norm(product.brand);
    if (brand && hay.includes(brand)) {
      match = 'dudoso';
      reason = 'solo marca; tipo incompleto';
    }
  }

  return { match, reason, productType: pt, sourceType: st };
}

