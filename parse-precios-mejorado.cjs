const fs = require('fs');

// Leer archivos de texto
const textoNoviembre = fs.readFileSync('precios-noviembre-2025.txt', 'utf-8');
const textoOctubre = fs.readFileSync('precios-octubre-2025.txt', 'utf-8');

console.log('📊 Analizando precios de equipos...\n');

// Tipo de cambio USD a COP
const TRM = 4200;

// Función para extraer número de potencia, voltaje, corriente, etc.
function extraerEspecificaciones(texto) {
  const specs = {};
  
  // Potencia en W, kW, VA
  const potenciaMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*(kW|W|VA|kVA)/i);
  if (potenciaMatch) {
    specs.potencia = parseFloat(potenciaMatch[1].replace(',', '.'));
    if (potenciaMatch[2].toUpperCase() === 'KW' || potenciaMatch[2].toUpperCase() === 'KVA') {
      specs.potencia = specs.potencia * 1000; // Convertir a W
    }
  }
  
  // Voltaje
  const voltajeMatch = texto.match(/(\d+)\s*V/i);
  if (voltajeMatch) {
    specs.voltaje = parseInt(voltajeMatch[1]);
  }
  
  // Corriente en A
  const corrienteMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (corrienteMatch) {
    specs.corriente = parseFloat(corrienteMatch[1].replace(',', '.'));
  }
  
  // Capacidad en kWh, Ah
  const capacidadMatch = texto.match(/(\d+(?:[.,]\d+)?)\s*(kWh|Ah)/i);
  if (capacidadMatch) {
    specs.capacidad = parseFloat(capacidadMatch[1].replace(',', '.'));
    if (capacidadMatch[2].toUpperCase() === 'KWH') {
      specs.capacidadKWh = specs.capacidad;
    }
  }
  
  return specs;
}

// Función para determinar tipo de equipo
function determinarTipo(descripcion, codigo) {
  const desc = descripcion.toLowerCase();
  const cod = codigo.toLowerCase();
  
  if (desc.includes('panel') || desc.includes('solar panel') || desc.includes('módulo')) {
    return 'panel';
  }
  if (desc.includes('inversor') || desc.includes('inverter') || cod.includes('sun2000') || cod.includes('solis') || cod.includes('fronius')) {
    if (desc.includes('microinversor') || desc.includes('microinverter')) {
      return 'inversor'; // microinversor
    }
    if (desc.includes('híbrido') || desc.includes('hibrido') || desc.includes('hybrid')) {
      return 'inversor'; // híbrido
    }
    return 'inversor';
  }
  if (desc.includes('controlador') || desc.includes('mppt') || desc.includes('pwm') || cod.includes('scc') || cod.includes('icm') || cod.includes('icc')) {
    return 'controlador';
  }
  if (desc.includes('batería') || desc.includes('bateria') || desc.includes('battery') || cod.includes('luna') || cod.includes('us5000') || cod.includes('us3000')) {
    return 'bateria';
  }
  if (desc.includes('estructura') || desc.includes('rail') || desc.includes('alurack')) {
    return 'estructura';
  }
  return 'accesorio';
}

// Función para extraer marca
function extraerMarca(descripcion) {
  const marcas = ['Victron Energy', 'Huawei', 'Solis', 'Fronius', 'Hoymiles', 'APS', 'Inti', 'Goodwe', 'Deye', 'Longi', 'Jinko', 'Trina', 'Canadian Solar', 'Pylontech', 'Studer'];
  for (const marca of marcas) {
    if (descripcion.includes(marca)) {
      return marca;
    }
  }
  return 'Genérico';
}

// Parsear PDF de Noviembre (USD)
function parsearNoviembre(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea || linea.length < 10) continue;
    
    // Buscar patrón: CODIGO Descripción Precio USD
    // Ejemplo: SCC010010050RBlueSolar MPPT 75/10 Retail Victron Energy48,20 USD
    const match = linea.match(/^([A-Z0-9-+]+)([A-Za-z][^0-9]+?)(\d{1,3}(?:[.,]\d{2,3})?)\s*USD/i);
    if (match) {
      const [, codigo, descripcion, precio] = match;
      const precioNum = parseFloat(precio.replace(',', '.'));
      
      if (!isNaN(precioNum) && precioNum > 0 && precioNum < 100000) {
        const specs = extraerEspecificaciones(descripcion);
        const tipo = determinarTipo(descripcion, codigo);
        const marca = extraerMarca(descripcion);
        
        equipos.push({
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          precioUSD: precioNum,
          precioCOP: Math.round(precioNum * TRM),
          tipo,
          marca,
          ...specs,
        });
      }
    }
  }
  
  return equipos;
}

// Parsear PDF de Octubre (COP)
function parsearOctubre(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea || linea.length < 10) continue;
    
    // Buscar patrón: DESCRIPCION Precio COP
    // Ejemplo: SUN2000-2KTL-L1 1.545.000$
    const match = linea.match(/^(.+?)\s+(\d{1,3}(?:\.\d{3})*(?:\.\d+)?)\s*\$/);
    if (match) {
      const [, descripcion, precio] = match;
      const precioNum = parseFloat(precio.replace(/\./g, '').replace(/,/g, ''));
      
      if (!isNaN(precioNum) && precioNum > 1000 && precioNum < 1000000000) {
        // Extraer código si está al inicio
        const codigoMatch = descripcion.match(/^([A-Z0-9-]+)/);
        const codigo = codigoMatch ? codigoMatch[1] : '';
        
        const specs = extraerEspecificaciones(descripcion);
        const tipo = determinarTipo(descripcion, codigo);
        const marca = extraerMarca(descripcion);
        
        equipos.push({
          codigo: codigo || descripcion.substring(0, 20).trim(),
          descripcion: descripcion.trim(),
          precioCOP: precioNum,
          precioUSD: Math.round(precioNum / TRM * 100) / 100,
          tipo,
          marca,
          ...specs,
        });
      }
    }
  }
  
  return equipos;
}

console.log('Extrayendo equipos del PDF de Noviembre (USD)...');
const equiposNoviembre = parsearNoviembre(textoNoviembre);
console.log(`✅ Encontrados ${equiposNoviembre.length} equipos\n`);

console.log('Extrayendo equipos del PDF de Octubre (COP)...');
const equiposOctubre = parsearOctubre(textoOctubre);
console.log(`✅ Encontrados ${equiposOctubre.length} equipos\n`);

// Combinar y organizar por tipo
const todosEquipos = [...equiposNoviembre, ...equiposOctubre];

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

// Mostrar muestra
console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE PANELES:');
console.log('='.repeat(80));
porTipo.panel.slice(0, 5).forEach(eq => {
  console.log(`${eq.codigo.padEnd(20)} | ${eq.descripcion.substring(0, 50).padEnd(50)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE INVERSORES:');
console.log('='.repeat(80));
porTipo.inversor.slice(0, 10).forEach(eq => {
  const potencia = eq.potencia ? `${eq.potencia}W` : 'N/A';
  console.log(`${eq.codigo.padEnd(20)} | ${eq.descripcion.substring(0, 40).padEnd(40)} | ${potencia.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE CONTROLADORES:');
console.log('='.repeat(80));
porTipo.controlador.slice(0, 10).forEach(eq => {
  const corriente = eq.corriente ? `${eq.corriente}A` : 'N/A';
  console.log(`${eq.codigo.padEnd(20)} | ${eq.descripcion.substring(0, 40).padEnd(40)} | ${corriente.padEnd(10)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
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

fs.writeFileSync('equipos-precios-completo.json', JSON.stringify(resultado, null, 2));
console.log('\n✅ Resultados completos guardados en: equipos-precios-completo.json');

