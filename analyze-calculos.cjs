const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'Cotizador (2.0).xlsm';

console.log('🔍 ANÁLISIS DETALLADO DE HOJAS DE CÁLCULOS\n');
console.log('='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath);
  
  // Analizar "Calculos (On Grid)"
  console.log('📋 HOJA: "Calculos (On Grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsCalculosOnGrid = workbook.Sheets['Calculos (On Grid)'];
  if (wsCalculosOnGrid) {
    const range = XLSX.utils.decode_range(wsCalculosOnGrid['!ref'] || 'A1:A1');
    
    console.log('ESTRUCTURA COMPLETA (Filas 1-150):\n');
    console.log('Formato: Fila | Columna | Etiqueta/Valor | Tipo\n');
    
    const calculosOnGrid = [];
    
    for (let R = 0; R < Math.min(150, range.e.r); R++) {
      const filaDatos = [];
      for (let C = 0; C < Math.min(30, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsCalculosOnGrid[cellAddr];
        
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).trim();
          if (valor.length > 0) {
            filaDatos.push({
              col: C + 1,
              celda: cellAddr,
              valor: valor.substring(0, 80),
              esFormula: !!cell.f,
              formula: cell.f || null
            });
          }
        }
      }
      
      if (filaDatos.length > 0) {
        calculosOnGrid.push({
          fila: R + 1,
          datos: filaDatos
        });
      }
    }
    
    // Mostrar estructura
    calculosOnGrid.forEach(item => {
      console.log(`\nFila ${item.fila.toString().padStart(3)}:`);
      item.datos.forEach(d => {
        const tipo = d.esFormula ? '[FÓRMULA]' : '[VALOR]';
        console.log(`  Col ${d.col.toString().padStart(2)} (${d.celda}): ${tipo} ${d.valor}`);
        if (d.esFormula && d.formula) {
          console.log(`    Fórmula: ${d.formula.substring(0, 100)}`);
        }
      });
    });
    
    // Guardar en archivo
    fs.writeFileSync('calculos-ongrid.json', JSON.stringify(calculosOnGrid, null, 2));
    console.log('\n✅ Datos guardados en: calculos-ongrid.json\n');
  } else {
    console.log('❌ No se encontró la hoja "Calculos (On Grid)"\n');
  }
  
  // Analizar "Calculos (Off Grid)"
  console.log('\n\n' + '='.repeat(100));
  console.log('📋 HOJA: "Calculos (Off Grid)"\n');
  console.log('='.repeat(100) + '\n');
  
  const wsCalculosOffGrid = workbook.Sheets['Calculos (Off Grid)'];
  if (wsCalculosOffGrid) {
    const range = XLSX.utils.decode_range(wsCalculosOffGrid['!ref'] || 'A1:A1');
    
    console.log('ESTRUCTURA COMPLETA (Filas 1-150):\n');
    console.log('Formato: Fila | Columna | Etiqueta/Valor | Tipo\n');
    
    const calculosOffGrid = [];
    
    for (let R = 0; R < Math.min(150, range.e.r); R++) {
      const filaDatos = [];
      for (let C = 0; C < Math.min(30, range.e.c); C++) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsCalculosOffGrid[cellAddr];
        
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valor = String(cell.v).trim();
          if (valor.length > 0) {
            filaDatos.push({
              col: C + 1,
              celda: cellAddr,
              valor: valor.substring(0, 80),
              esFormula: !!cell.f,
              formula: cell.f || null
            });
          }
        }
      }
      
      if (filaDatos.length > 0) {
        calculosOffGrid.push({
          fila: R + 1,
          datos: filaDatos
        });
      }
    }
    
    // Mostrar estructura
    calculosOffGrid.forEach(item => {
      console.log(`\nFila ${item.fila.toString().padStart(3)}:`);
      item.datos.forEach(d => {
        const tipo = d.esFormula ? '[FÓRMULA]' : '[VALOR]';
        console.log(`  Col ${d.col.toString().padStart(2)} (${d.celda}): ${tipo} ${d.valor}`);
        if (d.esFormula && d.formula) {
          console.log(`    Fórmula: ${d.formula.substring(0, 100)}`);
        }
      });
    });
    
    // Guardar en archivo
    fs.writeFileSync('calculos-offgrid.json', JSON.stringify(calculosOffGrid, null, 2));
    console.log('\n✅ Datos guardados en: calculos-offgrid.json\n');
  } else {
    console.log('❌ No se encontró la hoja "Calculos (Off Grid)"\n');
  }
  
  // Listar todas las hojas para verificar nombres exactos
  console.log('\n\n' + '='.repeat(100));
  console.log('📋 TODAS LAS HOJAS DEL LIBRO:\n');
  console.log('='.repeat(100) + '\n');
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`${idx + 1}. ${name}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

