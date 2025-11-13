const XLSX = require('xlsx');

const excelPath = 'Cotizador (2.0).xlsm';

console.log('🔍 ANÁLISIS COMPLETO DE ESTRUCTURA DE ENTRADA\n');
console.log('='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath);
  
  // Analizar "Datos de Entrada (On Grid)"
  console.log('📋 HOJA: "Datos de Entrada (On Grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsOnGrid = workbook.Sheets['Datos de Entrada (On Grid)'];
  if (wsOnGrid) {
    const range = XLSX.utils.decode_range(wsOnGrid['!ref'] || 'A1:A1');
    
    // Mostrar estructura completa (primeras 100 filas, todas las columnas relevantes)
    console.log('ESTRUCTURA COMPLETA (Filas 1-100):\n');
    console.log('Formato: Fila | Columna | Etiqueta | Valor\n');
    
    for (let R = 0; R < Math.min(100, range.e.r); R++) {
      const filaDatos = [];
      for (let C = 0; C < Math.min(25, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOnGrid[cellAddr];
        
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).trim();
          if (valor.length > 0) {
            filaDatos.push({
              col: C + 1,
              celda: cellAddr,
              valor: valor.substring(0, 50),
              esFormula: !!cell.f
            });
          }
        }
      }
      
      if (filaDatos.length > 0) {
        console.log(`\nFila ${(R + 1).toString().padStart(3)}:`);
        filaDatos.forEach(d => {
          const tipo = d.esFormula ? '[FÓRMULA]' : '[VALOR]';
          console.log(`  Col ${d.col.toString().padStart(2)} (${d.celda}): ${tipo} ${d.valor}`);
        });
      }
    }
  }
  
  // Analizar "Datos de entrada (Off grid)"
  console.log('\n\n' + '='.repeat(100));
  console.log('📋 HOJA: "Datos de entrada (Off grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsOffGrid = workbook.Sheets['Datos de entrada (Off grid)'];
  if (wsOffGrid) {
    const range = XLSX.utils.decode_range(wsOffGrid['!ref'] || 'A1:A1');
    
    console.log('ESTRUCTURA COMPLETA (Filas 1-50):\n');
    console.log('Formato: Fila | Columna | Etiqueta | Valor\n');
    
    for (let R = 0; R < Math.min(50, range.e.r); R++) {
      const filaDatos = [];
      for (let C = 0; C < Math.min(40, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsOffGrid[cellAddr];
        
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).trim();
          if (valor.length > 0) {
            filaDatos.push({
              col: C + 1,
              celda: cellAddr,
              valor: valor.substring(0, 50),
              esFormula: !!cell.f
            });
          }
        }
      }
      
      if (filaDatos.length > 0) {
        console.log(`\nFila ${(R + 1).toString().padStart(3)}:`);
        filaDatos.forEach(d => {
          const tipo = d.esFormula ? '[FÓRMULA]' : '[VALOR]';
          console.log(`  Col ${d.col.toString().padStart(2)} (${d.celda}): ${tipo} ${d.valor}`);
        });
      }
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

