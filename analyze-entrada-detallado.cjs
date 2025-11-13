const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'Cotizador (2.0).xlsm';

console.log('🔍 ANÁLISIS DETALLADO DE HOJAS DE ENTRADA\n');
console.log('='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath);
  
  // Analizar "Datos de Entrada (On Grid)"
  console.log('📋 HOJA: "Datos de Entrada (On Grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsOnGrid = workbook.Sheets['Datos de Entrada (On Grid)'];
  if (wsOnGrid) {
    const range = XLSX.utils.decode_range(wsOnGrid['!ref'] || 'A1:A1');
    
    console.log('CAMPOS DE ENTRADA IDENTIFICADOS:\n');
    
    const camposOnGrid = [];
    
    // Analizar las primeras 200 filas para encontrar todos los campos
    for (let R = 0; R < Math.min(200, range.e.r); R++) {
      for (let C = 0; C < Math.min(30, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOnGrid[cellAddr];
        
        if (cell && cell.v && typeof cell.v === 'string') {
          const valor = String(cell.v).trim();
          
          // Buscar etiquetas de campos (palabras clave comunes)
          if (valor.length > 0 && valor.length < 100) {
            const valorLower = valor.toLowerCase();
            
            // Buscar campos comunes
            if (valorLower.match(/^(nombre|cliente|nit|cedula|email|telefono|direccion|ciudad|departamento|municipio|barrio|consumo|tarifa|panel|inversor|bateria|controlador|potencia|voltaje|tipo|sistema|usuario|residencial|comercial|industrial|oficial|on.?grid|off.?grid|hibrido|autoconsumo|excedente|hsp|radiacion|dias|autonomia|profundidad|descarga|estructura|instalacion|transporte|certificacion|retie|descuento|iva|subtotal|total|precio|cotizacion|fecha|validez|numero|contrato|ppa|epc|inversion|ahorro|generacion|tir|van|roi|flujo|caja|co2|emision|ambiental|impacto|cubierta|techo|montaje|acometida|tipo.*acometida|trm|dolar|tasa|cambio|factor|eficiencia|perdida|sombra|suciedad|orientacion|inclinacion|azimut|angulo|superficie|area|m2|metros|cuadrados)$/i)) {
              
              // Obtener valor en celdas adyacentes
              const nextCell = wsOnGrid[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
              const next2Cell = wsOnGrid[XLSX.utils.encode_cell({ r: R, c: C + 2 })];
              const next3Cell = wsOnGrid[XLSX.utils.encode_cell({ r: R, c: C + 3 })];
              
              const campo = {
                etiqueta: valor,
                fila: R + 1,
                columna: C + 1,
                celda: cellAddr,
                valor: nextCell ? nextCell.v : null,
                valor2: next2Cell ? next2Cell.v : null,
                valor3: next3Cell ? next3Cell.v : null,
                tipo: nextCell ? typeof nextCell.v : 'vacío',
                esFormula: nextCell ? !!nextCell.f : false,
                formula: nextCell && nextCell.f ? nextCell.f : null
              };
              
              camposOnGrid.push(campo);
            }
          }
        }
      }
    }
    
    // Mostrar campos encontrados
    console.log(`Total de campos encontrados: ${camposOnGrid.length}\n`);
    camposOnGrid.forEach((campo, idx) => {
      console.log(`${idx + 1}. ${campo.etiqueta.padEnd(50)} [Fila ${campo.fila}, Col ${campo.columna}]`);
      if (campo.valor !== null && campo.valor !== undefined) {
        const valorStr = String(campo.valor).substring(0, 60);
        console.log(`   Valor: ${valorStr}`);
      }
      if (campo.esFormula) {
        const formulaStr = campo.formula.substring(0, 80);
        console.log(`   Fórmula: ${formulaStr}`);
      }
      console.log('');
    });
    
    // Guardar en archivo
    fs.writeFileSync('campos-entrada-ongrid.json', JSON.stringify(camposOnGrid, null, 2));
    console.log('\n✅ Campos guardados en: campos-entrada-ongrid.json\n');
  }
  
  // Analizar "Datos de entrada (Off grid)"
  console.log('\n\n' + '='.repeat(100));
  console.log('📋 HOJA: "Datos de entrada (Off grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsOffGrid = workbook.Sheets['Datos de entrada (Off grid)'];
  if (wsOffGrid) {
    const range = XLSX.utils.decode_range(wsOffGrid['!ref'] || 'A1:A1');
    
    console.log('CAMPOS DE ENTRADA IDENTIFICADOS:\n');
    
    const camposOffGrid = [];
    
    // Analizar las primeras 100 filas
    for (let R = 0; R < Math.min(100, range.e.r); R++) {
      for (let C = 0; C < Math.min(40, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOffGrid[cellAddr];
        
        if (cell && cell.v && typeof cell.v === 'string') {
          const valor = String(cell.v).trim();
          
          if (valor.length > 0 && valor.length < 100) {
            const valorLower = valor.toLowerCase();
            
            if (valorLower.match(/^(nombre|cliente|nit|cedula|email|telefono|direccion|ciudad|departamento|consumo|tarifa|panel|inversor|bateria|controlador|potencia|voltaje|tipo|sistema|usuario|residencial|comercial|industrial|oficial|off.?grid|autoconsumo|excedente|hsp|radiacion|dias|autonomia|profundidad|descarga|estructura|instalacion|transporte|certificacion|retie|descuento|iva|subtotal|total|precio|cotizacion|fecha|validez|numero|contrato|equipo|item|cantidad|horas|uso|diario|semanal|factor|potencia|corriente|watt|volt|amperio|eficiencia|rendimiento|descripcion|marca|modelo|litio|plomo|acido|gel|agm|monocristalino|policristalino|mppt|pwm|string|microinversor|hibrido)$/i)) {
              
              const nextCell = wsOffGrid[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
              const next2Cell = wsOffGrid[XLSX.utils.encode_cell({ r: R, c: C + 2 })];
              const next3Cell = wsOffGrid[XLSX.utils.encode_cell({ r: R, c: C + 3 })];
              
              const campo = {
                etiqueta: valor,
                fila: R + 1,
                columna: C + 1,
                celda: cellAddr,
                valor: nextCell ? nextCell.v : null,
                valor2: next2Cell ? next2Cell.v : null,
                valor3: next3Cell ? next3Cell.v : null,
                tipo: nextCell ? typeof nextCell.v : 'vacío',
                esFormula: nextCell ? !!nextCell.f : false,
                formula: nextCell && nextCell.f ? nextCell.f : null
              };
              
              camposOffGrid.push(campo);
            }
          }
        }
      }
    }
    
    // Mostrar campos encontrados
    console.log(`Total de campos encontrados: ${camposOffGrid.length}\n`);
    camposOffGrid.forEach((campo, idx) => {
      console.log(`${idx + 1}. ${campo.etiqueta.padEnd(50)} [Fila ${campo.fila}, Col ${campo.columna}]`);
      if (campo.valor !== null && campo.valor !== undefined) {
        const valorStr = String(campo.valor).substring(0, 60);
        console.log(`   Valor: ${valorStr}`);
      }
      if (campo.esFormula) {
        const formulaStr = campo.formula.substring(0, 80);
        console.log(`   Fórmula: ${formulaStr}`);
      }
      console.log('');
    });
    
    // Guardar en archivo
    fs.writeFileSync('campos-entrada-offgrid.json', JSON.stringify(camposOffGrid, null, 2));
    console.log('\n✅ Campos guardados en: campos-entrada-offgrid.json\n');
  }
  
  // Mostrar estructura completa de las hojas
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 ESTRUCTURA COMPLETA DE LAS HOJAS\n');
  console.log('='.repeat(100) + '\n');
  
  // Mostrar estructura de On-Grid (primeras 50 filas, todas las columnas relevantes)
  console.log('ESTRUCTURA "Datos de Entrada (On Grid)" (primeras 50 filas):\n');
  if (wsOnGrid) {
    const range = XLSX.utils.decode_range(wsOnGrid['!ref'] || 'A1:A1');
    for (let R = 0; R < Math.min(50, range.e.r); R++) {
      const fila = [];
      for (let C = 0; C < Math.min(15, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOnGrid[cellAddr];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).substring(0, 25);
          fila.push(valor);
        } else {
          fila.push('');
        }
      }
      if (fila.some(v => v.trim() !== '')) {
        console.log(`Fila ${(R + 1).toString().padStart(3)}: ${fila.join(' | ')}`);
      }
    }
  }
  
  console.log('\n\nESTRUCTURA "Datos de entrada (Off grid)" (primeras 50 filas):\n');
  if (wsOffGrid) {
    const range = XLSX.utils.decode_range(wsOffGrid['!ref'] || 'A1:A1');
    for (let R = 0; R < Math.min(50, range.e.r); R++) {
      const fila = [];
      for (let C = 0; C < Math.min(20, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOffGrid[cellAddr];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).substring(0, 25);
          fila.push(valor);
        } else {
          fila.push('');
        }
      }
      if (fila.some(v => v.trim() !== '')) {
        console.log(`Fila ${(R + 1).toString().padStart(3)}: ${fila.join(' | ')}`);
      }
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

