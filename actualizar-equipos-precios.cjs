const fs = require('fs');

// Leer archivos de texto
const textoNoviembre = fs.readFileSync('precios-noviembre-2025.txt', 'utf-8');
const textoOctubre = fs.readFileSync('precios-octubre-2025.txt', 'utf-8');

console.log('📊 Extrayendo equipos y precios de los PDFs...\n');

const TRM = 4200; // Tipo de cambio USD a COP

// Función mejorada para parsear equipos del PDF de Noviembre
function parsearEquiposNoviembre(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  for (let i = 0; i < lineas.length; i++) {
    let linea = lineas[i].trim();
    if (!linea || linea.length < 10) continue;
    
    // Patrón: CODIGO Descripción Precio USD
    // Ejemplo: "SCC010010050RBlueSolar MPPT 75/10 Retail Victron Energy48,20 USD"
    // El código puede tener guiones, números, letras
    // La descripción empieza con letra mayúscula
    // El precio termina en "USD"
    
    // Buscar precio al final (formato: número,XX USD o número.XX USD)
    const precioMatch = linea.match(/(\d{1,4}(?:[.,]\d{2,3})?)\s*USD$/i);
    if (!precioMatch) continue;
    
    const precioStr = precioMatch[1].replace(',', '.');
    const precioUSD = parseFloat(precioStr);
    if (isNaN(precioUSD) || precioUSD <= 0 || precioUSD > 100000) continue;
    
    // Remover el precio del final
    linea = linea.substring(0, precioMatch.index).trim();
    
    // Buscar código al inicio (formato: letras-números o letras/números)
    const codigoMatch = linea.match(/^([A-Z0-9][A-Z0-9-+]+)/);
    if (!codigoMatch) continue;
    
    const codigo = codigoMatch[1];
    const descripcion = linea.substring(codigo.length).trim();
    
    if (descripcion.length < 5) continue;
    
    // Extraer especificaciones
    const specs = extraerEspecificaciones(descripcion);
    const tipo = determinarTipo(descripcion, codigo);
    const marca = extraerMarca(descripcion);
    
    equipos.push({
      codigo: codigo.trim(),
      descripcion: descripcion.trim(),
      precioUSD,
      precioCOP: Math.round(precioUSD * TRM),
      tipo,
      marca,
      ...specs,
    });
  }
  
  return equipos;
}

// Función mejorada para parsear equipos del PDF de Octubre
function parsearEquiposOctubre(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  for (let i = 0; i < lineas.length; i++) {
    let linea = lineas[i].trim();
    if (!linea || linea.length < 5) continue;
    
    // Patrón: DESCRIPCION Precio COP
    // Ejemplo: "SUN2000-2KTL-L1 1.545.000$"
    // El precio usa punto como separador de miles
    
    // Buscar precio al final (formato: número.número.número$)
    const precioMatch = linea.match(/(\d{1,3}(?:\.\d{3})*(?:\.\d+)?)\s*\$$/);
    if (!precioMatch) continue;
    
    const precioStr = precioMatch[1].replace(/\./g, '');
    const precioCOP = parseFloat(precioStr);
    if (isNaN(precioCOP) || precioCOP < 1000 || precioCOP > 1000000000) continue;
    
    // Remover el precio del final
    const descripcion = linea.substring(0, precioMatch.index).trim();
    if (descripcion.length < 3) continue;
    
    // Extraer código si está al inicio
    const codigoMatch = descripcion.match(/^([A-Z0-9][A-Z0-9-]+)/);
    const codigo = codigoMatch ? codigoMatch[1] : descripcion.substring(0, 20).trim();
    
    // Extraer especificaciones
    const specs = extraerEspecificaciones(descripcion);
    const tipo = determinarTipo(descripcion, codigo);
    const marca = extraerMarca(descripcion);
    
    equipos.push({
      codigo: codigo.trim(),
      descripcion: descripcion.trim(),
      precioCOP,
      precioUSD: Math.round((precioCOP / TRM) * 100) / 100,
      tipo,
      marca,
      ...specs,
    });
  }
  
  return equipos;
}

function extraerEspecificaciones(texto) {
  const specs = {};
  const desc = texto.toLowerCase();
  
  // Potencia en W, kW
  const potenciaMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*(kW|W|kVA|VA)\b/i);
  if (potenciaMatch) {
    specs.potencia = parseFloat(potenciaMatch[1].replace(',', '.'));
    if (potenciaMatch[2].toUpperCase().includes('KW') || potenciaMatch[2].toUpperCase().includes('KVA')) {
      specs.potencia = specs.potencia * 1000; // Convertir a W
    }
  }
  
  // Voltaje
  const voltajeMatch = texto.match(/(\d+)\s*V\b/i);
  if (voltajeMatch) {
    specs.voltaje = parseInt(voltajeMatch[1]);
  }
  
  // Corriente en A
  const corrienteMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (corrienteMatch) {
    specs.corriente = parseFloat(corrienteMatch[1].replace(',', '.'));
  }
  
  // Capacidad en kWh, Ah
  const capacidadMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*(kWh|Ah)\b/i);
  if (capacidadMatch) {
    specs.capacidad = parseFloat(capacidadMatch[1].replace(',', '.'));
    if (capacidadMatch[2].toUpperCase() === 'KWH') {
      specs.capacidadKWh = specs.capacidad;
    }
  }
  
  return specs;
}

function determinarTipo(descripcion, codigo) {
  const desc = descripcion.toLowerCase();
  const cod = codigo.toLowerCase();
  
  if (desc.includes('panel') || desc.includes('módulo') || desc.includes('galaxy plus')) {
    return 'panel';
  }
  if (desc.includes('inversor') || desc.includes('inverter') || cod.includes('sun2000') || cod.includes('solis') || cod.includes('fronius') || cod.includes('gw') || cod.includes('goodwe') || cod.includes('hms') || cod.includes('hmt')) {
    return 'inversor';
  }
  if (desc.includes('controlador') || desc.includes('mppt') || desc.includes('pwm') || cod.includes('scc') || cod.includes('icm') || cod.includes('icc')) {
    return 'controlador';
  }
  if (desc.includes('batería') || desc.includes('bateria') || desc.includes('battery') || cod.includes('luna') || cod.includes('us5000') || cod.includes('us3000') || cod.includes('lx')) {
    return 'bateria';
  }
  if (desc.includes('estructura') || desc.includes('rail') || desc.includes('alurack') || desc.includes('soporte')) {
    return 'estructura';
  }
  return 'accesorio';
}

function extraerMarca(descripcion) {
  const marcas = [
    'Victron Energy', 'Huawei', 'Solis', 'Fronius', 'Hoymiles', 'APS', 'APsystems',
    'Inti', 'Goodwe', 'Deye', 'Longi', 'Jinko', 'Trina', 'Canadian Solar',
    'Pylontech', 'Studer', 'JASolar', 'Renesola', 'Shoto', 'Schletter', 'GoodWe'
  ];
  for (const marca of marcas) {
    if (descripcion.includes(marca)) {
      return marca;
    }
  }
  return 'Genérico';
}

console.log('Extrayendo equipos del PDF de Noviembre (USD)...');
const equiposNoviembre = parsearEquiposNoviembre(textoNoviembre);
console.log(`✅ Encontrados ${equiposNoviembre.length} equipos\n`);

console.log('Extrayendo equipos del PDF de Octubre (COP)...');
const equiposOctubre = parsearEquiposOctubre(textoOctubre);
console.log(`✅ Encontrados ${equiposOctubre.length} equipos\n`);

// Combinar equipos
const todosEquipos = [...equiposNoviembre, ...equiposOctubre];

// Organizar por tipo
const porTipo = {
  panel: todosEquipos.filter(e => e.tipo === 'panel'),
  inversor: todosEquipos.filter(e => e.tipo === 'inversor'),
  controlador: todosEquipos.filter(e => e.tipo === 'controlador'),
  bateria: todosEquipos.filter(e => e.tipo === 'bateria'),
  estructura: todosEquipos.filter(e => e.tipo === 'estructura'),
  accesorio: todosEquipos.filter(e => e.tipo === 'accesorio'),
};

console.log('='.repeat(80));
console.log('RESUMEN POR TIPO:');
console.log('='.repeat(80));
Object.keys(porTipo).forEach(tipo => {
  console.log(`${tipo.padEnd(15)}: ${porTipo[tipo].length} equipos`);
});

// Mostrar muestras
console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE PANELES:');
console.log('='.repeat(80));
porTipo.panel.slice(0, 10).forEach(eq => {
  const potencia = eq.potencia ? `${eq.potencia}W` : 'N/A';
  console.log(`${eq.codigo.padEnd(25)} | ${eq.descripcion.substring(0, 45).padEnd(45)} | ${potencia.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE INVERSORES:');
console.log('='.repeat(80));
porTipo.inversor.slice(0, 15).forEach(eq => {
  const potencia = eq.potencia ? `${eq.potencia}W` : 'N/A';
  console.log(`${eq.codigo.padEnd(25)} | ${eq.descripcion.substring(0, 40).padEnd(40)} | ${potencia.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE CONTROLADORES:');
console.log('='.repeat(80));
porTipo.controlador.slice(0, 15).forEach(eq => {
  const corriente = eq.corriente ? `${eq.corriente}A` : 'N/A';
  console.log(`${eq.codigo.padEnd(25)} | ${eq.descripcion.substring(0, 40).padEnd(40)} | ${corriente.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE BATERÍAS:');
console.log('='.repeat(80));
porTipo.bateria.slice(0, 10).forEach(eq => {
  const capacidad = eq.capacidad ? `${eq.capacidad}kWh` : 'N/A';
  console.log(`${eq.codigo.padEnd(25)} | ${eq.descripcion.substring(0, 40).padEnd(40)} | ${capacidad.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

// Guardar resultados
const resultado = {
  fecha: new Date().toISOString(),
  trm: TRM,
  totalEquipos: todosEquipos.length,
  porTipo: Object.keys(porTipo).reduce((acc, tipo) => {
    acc[tipo] = porTipo[tipo].length;
    return acc;
  }, {}),
  equipos: todosEquipos,
  equiposPorTipo: porTipo,
};

fs.writeFileSync('equipos-precios-actualizados.json', JSON.stringify(resultado, null, 2));
console.log('\n✅ Resultados guardados en: equipos-precios-actualizados.json');

