const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(process.cwd(), 'Cotizador (2.0).xlsm');

console.log('📊 ANÁLISIS COMPLETO DEL COTIZADOR EXCEL\n');
console.log('='.repeat(100) + '\n');
console.log('Ruta:', excelPath);
console.log('Archivo existe:', fs.existsSync(excelPath) ? '✅ SÍ' : '❌ NO');
console.log('\n' + '='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    sheetStubs: true
  });

  console.log('✅ Archivo leído correctamente\n');
  console.log('📋 TODAS LAS HOJAS DISPONIBLES:');
  console.log('='.repeat(100));
  workbook.SheetNames.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });
  console.log('\n' + '='.repeat(100) + '\n');

  // Analizar cada hoja en detalle
  const analisisHojas = {};
  
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    console.log(`\n📄 ANALIZANDO HOJA: "${sheetName}"`);
    console.log('='.repeat(100));
    console.log(`Rango: ${worksheet['!ref'] || 'Vacía'}`);
    console.log(`Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}`);
    
    const analisis = {
      nombre: sheetName,
      filas: range.e.r + 1,
      columnas: range.e.c + 1,
      formulas: [],
      valores: [],
      camposEntrada: [],
      camposSalida: [],
      referencias: [],
      tipo: 'desconocido'
    };
    
    // Detectar tipo de hoja
    if (sheetName.toLowerCase().includes('entrada') || sheetName.toLowerCase().includes('input')) {
      analisis.tipo = 'entrada';
    } else if (sheetName.toLowerCase().includes('salida') || sheetName.toLowerCase().includes('output') || sheetName.toLowerCase().includes('resultado')) {
      analisis.tipo = 'salida';
    } else if (sheetName.toLowerCase().includes('calculo') || sheetName.toLowerCase().includes('calculos')) {
      analisis.tipo = 'calculo';
    } else if (sheetName.toLowerCase().includes('equipo') || sheetName.toLowerCase().includes('producto')) {
      analisis.tipo = 'equipos';
    } else if (sheetName.toLowerCase().includes('ppa')) {
      analisis.tipo = 'ppa';
    } else if (sheetName.toLowerCase().includes('epc')) {
      analisis.tipo = 'epc';
    } else if (sheetName.toLowerCase().includes('flujo') || sheetName.toLowerCase().includes('caja')) {
      analisis.tipo = 'flujo_caja';
    } else if (sheetName.toLowerCase().includes('contrato')) {
      analisis.tipo = 'contrato';
    } else if (sheetName.toLowerCase().includes('historico')) {
      analisis.tipo = 'historico';
    }
    
    // Analizar celdas importantes
    const celdasImportantes = [];
    const formulasEncontradas = [];
    
    for (let R = range.s.r; R <= Math.min(range.e.r, 200); ++R) {
      for (let C = range.s.c; C <= Math.min(range.e.c, 30); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          // Buscar fórmulas
          if (cell.f) {
            formulasEncontradas.push({
              celda: cellAddress,
              formula: cell.f,
              valor: cell.v,
              fila: R + 1,
              columna: C + 1
            });
          }
          
          // Buscar campos de entrada (etiquetas comunes)
          if (cell.v !== undefined && cell.v !== null && typeof cell.v === 'string') {
            const valor = cell.v.toLowerCase();
            if (valor.match(/^(nombre|cliente|nit|cedula|email|telefono|direccion|ciudad|departamento|consumo|tarifa|panel|inversor|bateria|controlador|potencia|voltaje|tipo|sistema|usuario|residencial|comercial|industrial|on.?grid|off.?grid|hibrido|autoconsumo|excedente|hsp|radiacion|dias|autonomia|profundidad|descarga|estructura|instalacion|transporte|certificacion|retie|descuento|iva|subtotal|total|precio|cotizacion|fecha|validez|numero|contrato|ppa|epc|inversion|ahorro|generacion|tir|van|roi|flujo|caja|co2|emision|ambiental|impacto)$/i)) {
              const nextCellAddr = XLSX.utils.encode_cell({ r: R, c: C + 1 });
              const nextCell = worksheet[nextCellAddr];
              analisis.camposEntrada.push({
                etiqueta: cell.v,
                celda: cellAddress,
                valor: nextCell && nextCell.v !== undefined ? nextCell.v : null,
                tipo: nextCell && nextCell.v !== undefined ? typeof nextCell.v : 'vacío'
              });
            }
          }
          
          // Buscar valores numéricos grandes (probablemente resultados)
          if (cell.v !== undefined && cell.v !== null && typeof cell.v === 'number' && Math.abs(cell.v) > 1000) {
            const prevCellAddr = XLSX.utils.encode_cell({ r: R, c: C - 1 });
            const prevCell = worksheet[prevCellAddr];
            if (prevCell && prevCell.v !== undefined && typeof prevCell.v === 'string') {
              analisis.camposSalida.push({
                etiqueta: prevCell.v,
                celda: cellAddress,
                valor: cell.v
              });
            }
          }
        }
      }
    }
    
    analisis.formulas = formulasEncontradas;
    
    // Mostrar resumen
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Tipo detectado: ${analisis.tipo}`);
    console.log(`  Fórmulas encontradas: ${formulasEncontradas.length}`);
    console.log(`  Campos de entrada: ${analisis.camposEntrada.length}`);
    console.log(`  Campos de salida: ${analisis.camposSalida.length}`);
    
    if (analisis.camposEntrada.length > 0) {
      console.log(`\n📥 CAMPOS DE ENTRADA (primeros 20):`);
      analisis.camposEntrada.slice(0, 20).forEach(campo => {
        console.log(`  ${campo.etiqueta.padEnd(40)} ${campo.celda.padEnd(6)} = ${campo.valor !== null ? String(campo.valor).substring(0, 50) : 'vacío'}`);
      });
    }
    
    if (analisis.camposSalida.length > 0) {
      console.log(`\n📤 CAMPOS DE SALIDA (primeros 15):`);
      analisis.camposSalida.slice(0, 15).forEach(campo => {
        console.log(`  ${campo.etiqueta.padEnd(40)} ${campo.celda.padEnd(6)} = ${campo.valor}`);
      });
    }
    
    if (formulasEncontradas.length > 0) {
      console.log(`\n🔢 FÓRMULAS IMPORTANTES (primeras 15):`);
      formulasEncontradas.slice(0, 15).forEach(f => {
        const formulaCorta = f.formula.length > 80 ? f.formula.substring(0, 80) + '...' : f.formula;
        console.log(`  ${f.celda.padEnd(6)} = ${formulaCorta}`);
      });
    }
    
    // Buscar referencias a otras hojas
    const referenciasOtrasHojas = [];
    formulasEncontradas.forEach(f => {
      const match = f.formula.match(/'([^']+)'![A-Z]+\d+/g);
      if (match) {
        match.forEach(ref => {
          const hojaMatch = ref.match(/'([^']+)'/);
          if (hojaMatch && hojaMatch[1] !== sheetName) {
            referenciasOtrasHojas.push({
              desde: sheetName,
              hacia: hojaMatch[1],
              formula: f.formula.substring(0, 100)
            });
          }
        });
      }
    });
    
    if (referenciasOtrasHojas.length > 0) {
      console.log(`\n🔗 REFERENCIAS A OTRAS HOJAS (primeras 10):`);
      const unicas = [...new Set(referenciasOtrasHojas.map(r => r.hacia))];
      unicas.slice(0, 10).forEach(hoja => {
        console.log(`  → "${hoja}"`);
      });
      analisis.referencias = referenciasOtrasHojas;
    }
    
    analisisHojas[sheetName] = analisis;
  });
  
  // Análisis de flujos de datos
  console.log('\n\n' + '='.repeat(100));
  console.log('🔍 ANÁLISIS DE FLUJOS DE DATOS');
  console.log('='.repeat(100));
  
  const hojasEntrada = Object.values(analisisHojas).filter(h => h.tipo === 'entrada');
  const hojasCalculo = Object.values(analisisHojas).filter(h => h.tipo === 'calculo');
  const hojasSalida = Object.values(analisisHojas).filter(h => h.tipo === 'salida');
  const hojasPPA = Object.values(analisisHojas).filter(h => h.tipo === 'ppa');
  const hojasEPC = Object.values(analisisHojas).filter(h => h.tipo === 'epc');
  
  console.log(`\n📥 HOJAS DE ENTRADA (${hojasEntrada.length}):`);
  hojasEntrada.forEach(h => {
    console.log(`  - ${h.nombre} (${h.camposEntrada.length} campos)`);
  });
  
  console.log(`\n⚙️  HOJAS DE CÁLCULO (${hojasCalculo.length}):`);
  hojasCalculo.forEach(h => {
    console.log(`  - ${h.nombre} (${h.formulas.length} fórmulas)`);
  });
  
  console.log(`\n📤 HOJAS DE SALIDA (${hojasSalida.length}):`);
  hojasSalida.forEach(h => {
    console.log(`  - ${h.nombre} (${h.camposSalida.length} resultados)`);
  });
  
  console.log(`\n💼 MODELO PPA (${hojasPPA.length} hojas):`);
  hojasPPA.forEach(h => {
    console.log(`  - ${h.nombre}`);
    if (h.camposEntrada.length > 0) {
      console.log(`    Entradas: ${h.camposEntrada.map(c => c.etiqueta).join(', ')}`);
    }
    if (h.camposSalida.length > 0) {
      console.log(`    Salidas: ${h.camposSalida.map(c => c.etiqueta).join(', ')}`);
    }
  });
  
  console.log(`\n🏗️  MODELO EPC (${hojasEPC.length} hojas):`);
  hojasEPC.forEach(h => {
    console.log(`  - ${h.nombre}`);
    if (h.camposEntrada.length > 0) {
      console.log(`    Entradas: ${h.camposEntrada.map(c => c.etiqueta).join(', ')}`);
    }
    if (h.camposSalida.length > 0) {
      console.log(`    Salidas: ${h.camposSalida.map(c => c.etiqueta).join(', ')}`);
    }
  });
  
  // Guardar análisis en JSON
  const analisisJSON = {
    fecha: new Date().toISOString(),
    hojas: analisisHojas,
    resumen: {
      totalHojas: workbook.SheetNames.length,
      hojasEntrada: hojasEntrada.length,
      hojasCalculo: hojasCalculo.length,
      hojasSalida: hojasSalida.length,
      hojasPPA: hojasPPA.length,
      hojasEPC: hojasEPC.length
    }
  };
  
  fs.writeFileSync('analisis-excel-completo.json', JSON.stringify(analisisJSON, null, 2));
  console.log('\n\n✅ Análisis guardado en: analisis-excel-completo.json');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

