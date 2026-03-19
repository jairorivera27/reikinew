import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = path.join(process.cwd(), '..', 'modificado_nologin', 'cot', 'Cotizador (2.0).xlsm');

console.log('📊 Analizando archivo Excel...\n');
console.log('Ruta:', excelPath);
console.log('Existe:', fs.existsSync(excelPath) ? 'Sí' : 'No');
console.log('\n' + '='.repeat(80) + '\n');

try {
  // Leer el archivo Excel
  const workbook = XLSX.readFile(excelPath, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    sheetStubs: true
  });

  console.log('✅ Archivo leído correctamente\n');
  console.log('📋 HOJAS DISPONIBLES:');
  console.log('='.repeat(80));
  workbook.SheetNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Analizar cada hoja
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    console.log(`\n📄 HOJA ${sheetIndex + 1}: "${sheetName}"`);
    console.log('='.repeat(80));
    console.log(`Rango: ${worksheet['!ref'] || 'Vacía'}`);
    console.log(`Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}`);
    
    // Buscar celdas con fórmulas
    const formulas = [];
    const importantCells = [];
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          // Buscar fórmulas
          if (cell.f) {
            formulas.push({
              cell: cellAddress,
              formula: cell.f,
              value: cell.v
            });
          }
          
          // Buscar celdas importantes (títulos, valores numéricos grandes, etc.)
          if (cell.v) {
            const value = String(cell.v);
            if (value.length > 20 || 
                (typeof cell.v === 'number' && cell.v > 1000) ||
                value.match(/cotiz|precio|total|subtotal|iva|descuento|cliente|nombre|nit/i)) {
              importantCells.push({
                cell: cellAddress,
                value: cell.v,
                type: typeof cell.v
              });
            }
          }
        }
      }
    }
    
    if (formulas.length > 0) {
      console.log(`\n🔢 FÓRMULAS ENCONTRADAS (${formulas.length}):`);
      formulas.slice(0, 20).forEach(f => {
        console.log(`  ${f.cell}: ${f.formula} = ${f.value}`);
      });
      if (formulas.length > 20) {
        console.log(`  ... y ${formulas.length - 20} fórmulas más`);
      }
    }
    
    if (importantCells.length > 0) {
      console.log(`\n⭐ CELDAS IMPORTANTES (primeras 30):`);
      importantCells.slice(0, 30).forEach(c => {
        const valueStr = String(c.value).substring(0, 50);
        console.log(`  ${c.cell}: ${valueStr} (${c.type})`);
      });
    }
    
    // Mostrar una muestra de datos (primeras 20 filas, primeras 10 columnas)
    console.log(`\n📊 MUESTRA DE DATOS (primeras 20 filas, primeras 10 columnas):`);
    console.log('-'.repeat(80));
    for (let R = range.s.r; R <= Math.min(range.s.r + 20, range.e.r); ++R) {
      const row = [];
      for (let C = range.s.c; C <= Math.min(range.s.c + 10, range.e.c); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v !== undefined) {
          const value = String(cell.v).substring(0, 15);
          row.push(value.padEnd(15));
        } else {
          row.push(''.padEnd(15));
        }
      }
      if (row.some(c => c.trim() !== '')) {
        console.log(row.join(' | '));
      }
    }
  });

  // Buscar macros VBA (si están disponibles)
  if (workbook.vbaraw) {
    console.log('\n\n🔧 MACROS VBA ENCONTRADAS');
    console.log('='.repeat(80));
    console.log('El archivo contiene macros VBA. Se requiere análisis manual.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Análisis completado\n');

} catch (error) {
  console.error('❌ Error al leer el archivo:', error.message);
  console.error(error.stack);
}

