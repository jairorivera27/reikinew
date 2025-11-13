const XLSX = require('xlsx');

const excelPath = 'Cotizador (2.0).xlsm';

console.log('🔍 Análisis detallado de tipos de cubierta y estructuras\n');

try {
  const workbook = XLSX.readFile(excelPath);
  
  // Analizar hoja "Datos Equipos"
  const wsEquipos = workbook.Sheets['Datos Equipos'];
  if (wsEquipos) {
    const range = XLSX.utils.decode_range(wsEquipos['!ref'] || 'A1:A1');
    
    console.log('Buscando tipos de cubierta y precios de estructuras...\n');
    
    // Buscar fila con "Teja de barro" y analizar estructura
    for (let R = 150; R < Math.min(200, range.e.r); R++) {
      const row = [];
      for (let C = 0; C < Math.min(25, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsEquipos[cellAddr];
        if (cell && cell.v !== undefined) {
          row.push(String(cell.v).substring(0, 30));
        } else {
          row.push('');
        }
      }
      
      // Si la fila contiene información relevante
      const rowStr = row.join(' | ');
      if (rowStr.toLowerCase().match(/teja|zinc|concreto|metal|estructura|precio|montaje|cubierta/i)) {
        console.log(`Fila ${R + 1}: ${rowStr}`);
      }
    }
    
    // Buscar en "Datos de Entrada (On Grid)"
    console.log('\n\nAnalizando "Datos de Entrada (On Grid)"...\n');
    const wsEntrada = workbook.Sheets['Datos de Entrada (On Grid)'];
    if (wsEntrada) {
      const rangeEntrada = XLSX.utils.decode_range(wsEntrada['!ref'] || 'A1:A1');
      
      for (let R = 0; R < Math.min(100, rangeEntrada.e.r); R++) {
        for (let C = 0; C < Math.min(25, rangeEntrada.e.c); C++) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = wsEntrada[cellAddr];
          
          if (cell && cell.v && typeof cell.v === 'string') {
            const valor = cell.v.toLowerCase();
            if (valor.match(/cubierta|techo|montaje|estructura|teja|zinc|concreto|metal|poli|fibro/i)) {
              const nextCell = wsEntrada[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
              const next2Cell = wsEntrada[XLSX.utils.encode_cell({ r: R, c: C + 2 })];
              const next3Cell = wsEntrada[XLSX.utils.encode_cell({ r: R, c: C + 3 })];
              
              console.log(`Fila ${R + 1}, Col ${C + 1}: "${cell.v}"`);
              if (nextCell && nextCell.v) console.log(`  → ${nextCell.v}`);
              if (next2Cell && next2Cell.v) console.log(`  → ${next2Cell.v}`);
              if (next3Cell && next3Cell.v) console.log(`  → ${next3Cell.v}`);
            }
          }
        }
      }
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
}

