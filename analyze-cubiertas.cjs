const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'Cotizador (2.0).xlsm';

console.log('🔍 Analizando tipos de cubierta en el Excel...\n');

try {
  const workbook = XLSX.readFile(excelPath);
  const ws = workbook.Sheets['Datos de Entrada (On Grid)'];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  
  console.log('Buscando referencias a cubierta/estructura...\n');
  
  const cubiertas = [];
  
  for (let R = 0; R < Math.min(200, range.e.r); R++) {
    for (let C = 0; C < Math.min(30, range.e.c); C++) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddr];
      
      if (cell && cell.v && typeof cell.v === 'string') {
        const valor = cell.v.toLowerCase();
        if (valor.match(/cubierta|techo|estructura|montaje|tipo.*techo|tipo.*cubierta/i)) {
          // Buscar valores en celdas adyacentes
          const nextCell = ws[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
          const next2Cell = ws[XLSX.utils.encode_cell({ r: R, c: C + 2 })];
          
          if (nextCell && nextCell.v) {
            cubiertas.push({
              etiqueta: cell.v,
              fila: R + 1,
              columna: C + 1,
              valor: nextCell.v,
              valor2: next2Cell ? next2Cell.v : null
            });
          }
        }
      }
    }
  }
  
  console.log('Tipos de cubierta encontrados:\n');
  cubiertas.forEach(c => {
    console.log(`Fila ${c.fila}, Col ${c.columna}: "${c.etiqueta}" = "${c.valor}"${c.valor2 ? ` / ${c.valor2}` : ''}`);
  });
  
  // Buscar en la hoja de Datos Equipos
  console.log('\n\nBuscando en hoja "Datos Equipos"...\n');
  const wsEquipos = workbook.Sheets['Datos Equipos'];
  if (wsEquipos) {
    const rangeEquipos = XLSX.utils.decode_range(wsEquipos['!ref'] || 'A1:A1');
    const estructuras = [];
    
    for (let R = 0; R < Math.min(500, rangeEquipos.e.r); R++) {
      for (let C = 0; C < Math.min(30, rangeEquipos.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsEquipos[cellAddr];
        
        if (cell && cell.v && typeof cell.v === 'string') {
          const valor = cell.v.toLowerCase();
          if (valor.match(/estructura|montaje|techo|zinc|teja|concreto|metal|poli|fibro/i)) {
            estructuras.push({
              fila: R + 1,
              columna: C + 1,
              valor: cell.v,
              contexto: []
            });
            
            // Obtener contexto (filas adyacentes)
            for (let i = -2; i <= 2; i++) {
              for (let j = -2; j <= 2; j++) {
                if (i === 0 && j === 0) continue;
                const ctxCell = wsEquipos[XLSX.utils.encode_cell({ r: R + i, c: C + j })];
                if (ctxCell && ctxCell.v) {
                  estructuras[estructuras.length - 1].contexto.push({
                    pos: `${R + i + 1},${C + j + 1}`,
                    valor: String(ctxCell.v).substring(0, 30)
                  });
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`Encontradas ${estructuras.length} referencias a estructuras en Datos Equipos\n`);
    estructuras.slice(0, 20).forEach(e => {
      console.log(`Fila ${e.fila}, Col ${e.columna}: "${e.valor}"`);
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
}

