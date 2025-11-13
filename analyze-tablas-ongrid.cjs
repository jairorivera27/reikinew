const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Cotizador (2.0).xlsm');
const workbook = XLSX.readFile(excelPath, { cellStyles: true });

const sheetName = 'Calculos (On Grid)';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  console.error(`Hoja "${sheetName}" no encontrada`);
  process.exit(1);
}

console.log(`\n📊 ANALIZANDO TABLAS Y CUADROS EN: "${sheetName}"\n`);
console.log('='.repeat(80));

// Función para obtener el rango de una hoja
function getRange(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  return range;
}

// Función para obtener el valor de una celda
function getCellValue(sheet, cellAddress) {
  const cell = sheet[cellAddress];
  if (!cell) return null;
  return cell.v !== undefined ? cell.v : cell.w;
}

// Función para buscar tablas/cuadros (áreas con bordes o formato especial)
function findTables(sheet) {
  const range = getRange(sheet);
  const tables = [];
  const visited = new Set();
  
  // Buscar celdas con bordes o formato especial que indiquen tablas
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellAddress];
      
      if (cell && !visited.has(cellAddress)) {
        // Buscar si hay un encabezado cerca
        const value = getCellValue(sheet, cellAddress);
        if (value && typeof value === 'string' && value.length > 0) {
          // Verificar si hay una estructura de tabla cerca
          const tableInfo = detectTable(sheet, R, C, visited);
          if (tableInfo) {
            tables.push(tableInfo);
          }
        }
      }
    }
  }
  
  return tables;
}

// Función para detectar una tabla desde una posición
function detectTable(sheet, startRow, startCol, visited) {
  const maxRows = 50; // Máximo de filas a revisar
  const maxCols = 20; // Máximo de columnas a revisar
  
  let endRow = startRow;
  let endCol = startCol;
  let hasHeader = false;
  let headerRow = startRow;
  
  // Buscar el final de la tabla
  for (let r = startRow; r < startRow + maxRows; r++) {
    let hasData = false;
    for (let c = startCol; c < startCol + maxCols; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
      const value = getCellValue(sheet, cellAddress);
      if (value !== null && value !== '') {
        hasData = true;
        visited.add(cellAddress);
        endRow = Math.max(endRow, r);
        endCol = Math.max(endCol, c);
      }
    }
    if (!hasData && r > startRow + 2) break; // Si hay 2 filas vacías, terminar
  }
  
  // Verificar si tiene encabezado (primera fila con texto)
  for (let c = startCol; c <= endCol; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: startRow, c: c });
    const value = getCellValue(sheet, cellAddress);
    if (value && typeof value === 'string' && value.length > 2) {
      hasHeader = true;
      break;
    }
  }
  
  if (endRow > startRow && endCol > startCol) {
    return {
      startRow,
      startCol,
      endRow,
      endCol,
      hasHeader,
      headerRow: hasHeader ? startRow : null
    };
  }
  
  return null;
}

// Buscar la tabla de RETIE específicamente
function findRETIETable(sheet) {
  const range = getRange(sheet);
  
  // Buscar "RETIE" en la hoja
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const value = getCellValue(sheet, cellAddress);
      
      if (value && typeof value === 'string' && value.toUpperCase().includes('RETIE')) {
        console.log(`\n🔍 RETIE encontrado en: ${cellAddress} (Fila ${R + 1}, Columna ${C + 1})`);
        
        // Buscar la tabla alrededor de esta celda
        // La fórmula menciona A103:E118, así que busquemos esa área
        const retieTableStart = XLSX.utils.decode_cell('A103');
        const retieTableEnd = XLSX.utils.decode_cell('E118');
        
        console.log('\n📋 TABLA DE RETIE (A103:E118):');
        console.log('-'.repeat(80));
        
        const headers = [];
        for (let c = retieTableStart.c; c <= retieTableEnd.c; c++) {
          const headerCell = XLSX.utils.encode_cell({ r: retieTableStart.r, c: c });
          const headerValue = getCellValue(sheet, headerCell);
          headers.push(headerValue || `Col${c + 1}`);
        }
        console.log('Encabezados:', headers.join(' | '));
        
        console.log('\nDatos:');
        for (let r = retieTableStart.r + 1; r <= retieTableEnd.r; r++) {
          const row = [];
          for (let c = retieTableStart.c; c <= retieTableEnd.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
            const value = getCellValue(sheet, cellAddress);
            row.push(value !== null ? value : '');
          }
          if (row.some(v => v !== '')) {
            console.log(`Fila ${r + 1}:`, row.join(' | '));
          }
        }
        
        // Buscar la fórmula de RETIE (Fila 79)
        const retieFormulaCell = 'B79';
        const retieFormula = sheet[retieFormulaCell];
        if (retieFormula && retieFormula.f) {
          console.log(`\n📐 FÓRMULA RETIE (${retieFormulaCell}):`);
          console.log(`   ${retieFormula.f}`);
          console.log(`   Valor: ${retieFormula.v}`);
        }
        
        return {
          tableRange: 'A103:E118',
          formulaCell: 'B79',
          formula: retieFormula?.f,
          value: retieFormula?.v
        };
      }
    }
  }
  
  return null;
}

// Buscar todas las tablas principales
console.log('\n🔍 BUSCANDO TABLAS Y CUADROS PRINCIPALES...\n');

// Buscar tabla de RETIE
const retieInfo = findRETIETable(sheet);

// Buscar otras tablas importantes por filas conocidas
console.log('\n📊 TABLAS IDENTIFICADAS POR FILAS:\n');

const importantRanges = [
  { name: 'Cálculos Principales', range: 'B1:B32', description: 'Cálculos básicos del sistema' },
  { name: 'Dimensionamiento Paneles/Inversor', range: 'B10:B32', description: 'Cálculos de paneles e inversores' },
  { name: 'Cableado y Accesorios', range: 'I38:I41', description: 'Cálculos de cableado DC/AC y accesorios' },
  { name: 'Mano de Obra', range: 'F51:F58', description: 'Cálculos de mano de obra e ingeniería' },
  { name: 'Viáticos y Transporte', range: 'F63:F68', description: 'Cálculos de viáticos, peajes y gasolina' },
  { name: 'Tabla de Precios', range: 'B75:F93', description: 'Tabla de precios con rentabilidad e IVA' },
  { name: 'Tabla RETIE', range: 'A103:E118', description: 'Tabla de referencia para cálculo RETIE' }
];

importantRanges.forEach(({ name, range, description }) => {
  const [start, end] = range.split(':');
  const startCell = XLSX.utils.decode_cell(start);
  const endCell = XLSX.utils.decode_cell(end);
  
  console.log(`\n📋 ${name} (${range}):`);
  console.log(`   ${description}`);
  console.log(`   Desde: Fila ${startCell.r + 1}, Col ${startCell.c + 1}`);
  console.log(`   Hasta: Fila ${endCell.r + 1}, Col ${endCell.c + 1}`);
  
  // Mostrar algunos valores de ejemplo
  if (startCell.r === endCell.r) {
    // Es una fila
    const row = [];
    for (let c = startCell.c; c <= endCell.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: startCell.r, c: c });
      const value = getCellValue(sheet, cellAddress);
      const formula = sheet[cellAddress]?.f;
      row.push({
        address: cellAddress,
        value: value,
        formula: formula
      });
    }
    console.log(`   Valores:`, row.map(r => `${r.address}=${r.value !== null ? r.value : 'N/A'}`).join(', '));
  } else if (startCell.c === endCell.c) {
    // Es una columna
    const col = [];
    for (let r = startCell.r; r <= endCell.r && r < startCell.r + 10; r++) {
      const cellAddress = XLSX.utils.encode_cell({ r: r, c: startCell.c });
      const value = getCellValue(sheet, cellAddress);
      const formula = sheet[cellAddress]?.f;
      if (value !== null || formula) {
        col.push({
          address: cellAddress,
          value: value,
          formula: formula
        });
      }
    }
    if (col.length > 0) {
      console.log(`   Primeros valores:`);
      col.forEach(c => {
        console.log(`     ${c.address}: ${c.value !== null ? c.value : 'N/A'} ${c.formula ? `[${c.formula}]` : ''}`);
      });
    }
  } else {
    // Es un rango
    console.log(`   Rango de ${(endCell.r - startCell.r + 1)} filas × ${(endCell.c - startCell.c + 1)} columnas`);
  }
});

// Mostrar estructura de la tabla de precios (B75:F93)
console.log('\n\n📊 ESTRUCTURA DE LA TABLA DE PRECIOS (B75:F93):');
console.log('='.repeat(80));

const precioTableStart = XLSX.utils.decode_cell('B75');
const precioTableEnd = XLSX.utils.decode_cell('F93');

// Encabezados esperados
const precioHeaders = ['Costo', 'IVA Costo', 'PRECIO', 'IVA Precio', 'TOTAL'];

console.log('\nColumnas esperadas:', precioHeaders.join(' | '));
console.log('\nFilas de la tabla:');

for (let r = precioTableStart.r; r <= precioTableEnd.r; r++) {
  const row = [];
  const formulas = [];
  for (let c = precioTableStart.c; c <= precioTableEnd.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
    const value = getCellValue(sheet, cellAddress);
    const formula = sheet[cellAddress]?.f;
    row.push(value !== null ? value : '');
    if (formula) formulas.push(`${cellAddress}: ${formula}`);
  }
  
  // Solo mostrar filas con datos
  if (row.some(v => v !== '' && v !== 0)) {
    // Buscar etiqueta en columna A
    const labelCell = XLSX.utils.encode_cell({ r: r, c: 0 }); // Columna A
    const label = getCellValue(sheet, labelCell);
    
    console.log(`\nFila ${r + 1}${label ? ` (${label})` : ''}:`);
    console.log(`  Valores:`, row.map((v, i) => `${precioHeaders[i] || `Col${i+1}`}=${v}`).join(' | '));
    if (formulas.length > 0) {
      console.log(`  Fórmulas:`);
      formulas.forEach(f => console.log(`    ${f}`));
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Análisis completado\n');

