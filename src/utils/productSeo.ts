type ProductSeoInput = {
  title: string;
  brand?: string;
  model?: string;
  category: string;
  specifications?: string[];
};

function cleanText(v: string): string {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function extractPowerSpec(specs: string[]): string {
  const power = specs.find((s) => /potencia|w\b|kw\b/i.test(s));
  return cleanText(power || '');
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    paneles: 'panel solar',
    inversores: 'inversor solar',
    baterias: 'bateria de litio solar',
    reflectores: 'reflector solar led',
    controladores: 'controlador mppt solar',
    protecciones: 'proteccion electrica solar',
    cargadores: 'cargador solar',
  };
  return map[category] || 'equipo solar';
}

export function buildSeoKeywords(input: ProductSeoInput): string[] {
  const brand = cleanText(input.brand || '');
  const model = cleanText(input.model || '');
  const specs = Array.isArray(input.specifications) ? input.specifications : [];
  const power = extractPowerSpec(specs);
  const productType = categoryLabel(input.category);

  const core = [
    `comprar ${productType} ${brand} ${model} colombia`,
    `${productType} ${power || input.title} precio colombia`,
    `${productType} ${brand || input.title} medellin`,
    `${productType} para casa y negocio colombia`,
    `${productType} envio nacional garantia`,
  ];

  return core.map(cleanText).filter(Boolean).slice(0, 5);
}

export function buildDifferentiator(input: ProductSeoInput): string {
  const specs = Array.isArray(input.specifications) ? input.specifications : [];
  const main = cleanText(specs[0] || '');
  const secondary = cleanText(specs[1] || '');
  if (main && secondary) return `${main} · ${secondary}`;
  if (main) return main;
  return `Ficha tecnica optimizada para ${categoryLabel(input.category)} en Colombia.`;
}
