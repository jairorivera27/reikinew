const fs = require('fs');

// Leer archivos de texto
const textoNoviembre = fs.readFileSync('precios-noviembre-2025.txt', 'utf-8');
const textoOctubre = fs.readFileSync('precios-octubre-2025.txt', 'utf-8');

console.log('📊 Analizando precios de equipos...\n');

// Función para extraer precios en USD
function parsearPreciosUSD(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  let categoriaActual = '';
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    // Detectar categorías
    if (linea.match(/P\.V\.P\.|CONTROLADOR|INVERSOR|PANEL|BATERIA|ESTRUCTURA/i)) {
      categoriaActual = linea;
      continue;
    }
    
    // Buscar líneas con códigos y precios
    // Formato: CODIGO Descripción Precio USD
    const match = linea.match(/^([A-Z0-9-]+)\s+(.+?)\s+([\d,]+\.?\d*)\s*USD/i);
    if (match) {
      const [, codigo, descripcion, precio] = match;
      const precioNum = parseFloat(precio.replace(/,/g, ''));
      if (!isNaN(precioNum) && precioNum > 0) {
        equipos.push({
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          precioUSD: precioNum,
          categoria: categoriaActual,
        });
      }
    }
  }
  
  return equipos;
}

// Función para extraer precios en COP
function parsearPreciosCOP(texto) {
  const equipos = [];
  const lineas = texto.split('\n');
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    
    // Buscar líneas con descripción y precio en COP
    // Formato: DESCRIPCION Precio COP
    const match = linea.match(/^(.+?)\s+([\d\.]+\.?\d*)\s*\$/);
    if (match) {
      const [, descripcion, precio] = match;
      const precioNum = parseFloat(precio.replace(/\./g, '').replace(/,/g, ''));
      if (!isNaN(precioNum) && precioNum > 1000) { // Filtrar precios muy bajos
        equipos.push({
          descripcion: descripcion.trim(),
          precioCOP: precioNum,
        });
      }
    }
  }
  
  return equipos;
}

// Tipo de cambio aproximado USD a COP (ajustar según necesidad)
const TRM = 4200; // Tasa de cambio aproximada

console.log('Extrayendo equipos del PDF de Noviembre (USD)...');
const equiposNoviembre = parsearPreciosUSD(textoNoviembre);
console.log(`Encontrados ${equiposNoviembre.length} equipos\n`);

console.log('Extrayendo equipos del PDF de Octubre (COP)...');
const equiposOctubre = parsearPreciosCOP(textoOctubre);
console.log(`Encontrados ${equiposOctubre.length} equipos\n`);

// Mostrar muestra de equipos
console.log('='.repeat(80));
console.log('MUESTRA DE EQUIPOS (Noviembre - USD):');
console.log('='.repeat(80));
equiposNoviembre.slice(0, 20).forEach(eq => {
  console.log(`${eq.codigo.padEnd(20)} | ${eq.descripcion.substring(0, 50).padEnd(50)} | $${eq.precioUSD.toFixed(2)} USD (${(eq.precioUSD * TRM).toLocaleString('es-CO')} COP)`);
});

console.log('\n' + '='.repeat(80));
console.log('MUESTRA DE EQUIPOS (Octubre - COP):');
console.log('='.repeat(80));
equiposOctubre.slice(0, 20).forEach(eq => {
  console.log(`${eq.descripcion.substring(0, 70).padEnd(70)} | ${eq.precioCOP.toLocaleString('es-CO')} COP`);
});

// Guardar resultados en JSON
const resultado = {
  fecha: new Date().toISOString(),
  trm: TRM,
  equiposNoviembre: equiposNoviembre,
  equiposOctubre: equiposOctubre,
};

fs.writeFileSync('equipos-precios.json', JSON.stringify(resultado, null, 2));
console.log('\n✅ Resultados guardados en: equipos-precios.json');

