const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(process.cwd(), 'Cotizador (2.0).xlsm');

console.log('🔍 ANÁLISIS DETALLADO DE CÁLCULOS DEL EXCEL\n');
console.log('='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    sheetStubs: true
  });

  // Analizar hojas de cálculo principales
  const hojasCalculo = ['Calculos (On Grid)', 'Calculos (Off Grid)'];
  
  hojasCalculo.forEach(sheetName => {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Hoja "${sheetName}" no encontrada\n`);
      return;
    }

    console.log(`\n${'='.repeat(100)}`);
    console.log(`📊 ANALIZANDO: "${sheetName}"`);
    console.log('='.repeat(100) + '\n');

    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Analizar fórmulas y valores importantes
    const formulas = [];
    const valores = [];
    
    for (let R = 0; R <= Math.min(range.e.r, 200); R++) {
      for (let C = 0; C <= Math.min(range.e.c, 50); C++) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          // Buscar fórmulas
          if (cell.f) {
            formulas.push({
              celda: cellAddress,
              formula: cell.f,
              valor: cell.v !== undefined ? cell.v : null,
              tipo: typeof cell.v
            });
          }
          
          // Buscar valores numéricos importantes
          if (typeof cell.v === 'number' && cell.v > 0) {
            valores.push({
              celda: cellAddress,
              valor: cell.v,
              formula: cell.f || null
            });
          }
        }
      }
    }

    // Mostrar fórmulas clave
    console.log('📐 FÓRMULAS PRINCIPALES:\n');
    
    // Filtrar fórmulas importantes
    const formulasImportantes = formulas.filter(f => {
      const formula = f.formula.toLowerCase();
      return formula.includes('sum') || 
             formula.includes('vlookup') || 
             formula.includes('round') || 
             formula.includes('if') ||
             formula.includes('*') ||
             formula.includes('/') ||
             formula.includes('+') ||
             formula.includes('-');
    });

    // Agrupar por fila
    const formulasPorFila = {};
    formulasImportantes.forEach(f => {
      const fila = parseInt(f.celda.match(/\d+/)[0]);
      if (!formulasPorFila[fila]) {
        formulasPorFila[fila] = [];
      }
      formulasPorFila[fila].push(f);
    });

    // Mostrar fórmulas organizadas
    Object.keys(formulasPorFila).sort((a, b) => parseInt(a) - parseInt(b)).forEach(fila => {
      console.log(`\n📌 FILA ${fila}:`);
      formulasPorFila[fila].forEach(f => {
        console.log(`   ${f.celda}: ${f.formula}`);
        if (f.valor !== null) {
          console.log(`      → Valor: ${f.valor}`);
        }
      });
    });

    // Analizar estructura de cálculo
    console.log('\n\n🔢 ESTRUCTURA DE CÁLCULOS:\n');
    
    // Buscar patrones específicos
    const patrones = {
      'Consumo': formulas.filter(f => f.formula.toLowerCase().includes('consumo') || f.formula.toLowerCase().includes('d25:d36')),
      'Potencia': formulas.filter(f => f.formula.toLowerCase().includes('potencia') || f.formula.toLowerCase().includes('b6')),
      'Paneles': formulas.filter(f => f.formula.toLowerCase().includes('panel') || f.formula.toLowerCase().includes('b23')),
      'Precio': formulas.filter(f => f.formula.toLowerCase().includes('precio') || f.formula.toLowerCase().includes('costo')),
      'Rentabilidad': formulas.filter(f => f.formula.toLowerCase().includes('rentabilidad') || f.formula.toLowerCase().includes('b27')),
      'IVA': formulas.filter(f => f.formula.toLowerCase().includes('iva') || f.formula.toLowerCase().includes('19%')),
    };

    Object.keys(patrones).forEach(patron => {
      if (patrones[patron].length > 0) {
        console.log(`\n${patron}:`);
        patrones[patron].slice(0, 10).forEach(f => {
          console.log(`   ${f.celda}: ${f.formula.substring(0, 80)}${f.formula.length > 80 ? '...' : ''}`);
        });
      }
    });

    // Analizar referencias cruzadas
    console.log('\n\n🔗 REFERENCIAS A OTRAS HOJAS:\n');
    const referencias = formulas.filter(f => f.formula.includes("'"));
    referencias.slice(0, 20).forEach(f => {
      const match = f.formula.match(/'([^']+)'/);
      if (match) {
        console.log(`   ${f.celda}: Referencia a "${match[1]}"`);
        console.log(`      Fórmula: ${f.formula.substring(0, 100)}${f.formula.length > 100 ? '...' : ''}`);
      }
    });
  });

  // Analizar hoja de datos de entrada
  console.log('\n\n' + '='.repeat(100));
  console.log('📥 ANALIZANDO DATOS DE ENTRADA');
  console.log('='.repeat(100) + '\n');

  const hojasEntrada = ['Datos de Entrada (On Grid)', 'Datos de entrada (Off grid)'];
  
  hojasEntrada.forEach(sheetName => {
    if (!workbook.SheetNames.includes(sheetName)) {
      return;
    }

    console.log(`\n📋 "${sheetName}":\n`);
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Buscar campos de entrada
    const campos = [];
    for (let R = 0; R <= Math.min(range.e.r, 100); R++) {
      for (let C = 0; C <= Math.min(range.e.c, 20); C++) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v !== undefined && typeof cell.v === 'string' && cell.v.length > 0) {
          // Buscar etiquetas
          const nextCell = worksheet[XLSX.utils.encode_cell({ c: C + 1, r: R })];
          if (nextCell && (typeof nextCell.v === 'number' || nextCell.v === '')) {
            campos.push({
              fila: R + 1,
              etiqueta: cell.v,
              valor: nextCell ? (nextCell.v !== undefined ? nextCell.v : '') : '',
              celda: cellAddress
            });
          }
        }
      }
    }

    campos.slice(0, 30).forEach(campo => {
      console.log(`   Fila ${campo.fila}: ${campo.etiqueta} = ${campo.valor}`);
    });
  });

  // Analizar hoja de equipos
  console.log('\n\n' + '='.repeat(100));
  console.log('🔧 ANALIZANDO DATOS DE EQUIPOS');
  console.log('='.repeat(100) + '\n');

  if (workbook.SheetNames.includes('Datos Equipos')) {
    const worksheet = workbook.Sheets['Datos Equipos'];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    console.log(`Rango: ${worksheet['!ref']}`);
    console.log(`Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}\n`);
    
    // Buscar tabla de HSP
    console.log('📊 Buscando tabla de HSP (Horas Sol Pico)...\n');
    for (let R = 190; R <= Math.min(range.e.r, 210); R++) {
      const row = [];
      for (let C = 1; C <= 3; C++) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: R })];
        if (cell && cell.v !== undefined) {
          row.push(cell.v);
        }
      }
      if (row.length > 0) {
        console.log(`   Fila ${R + 1}: ${row.join(' | ')}`);
      }
    }
  }

  console.log('\n\n' + '='.repeat(100));
  console.log('✅ ANÁLISIS COMPLETADO');
  console.log('='.repeat(100) + '\n');

} catch (error) {
  console.error('❌ Error al analizar el archivo:', error.message);
  console.error(error.stack);
}

