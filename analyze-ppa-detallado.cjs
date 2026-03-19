const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(process.cwd(), 'Cotizador (2.0).xlsm');

console.log('📊 ANÁLISIS DETALLADO DE HOJAS PPA\n');
console.log('='.repeat(100) + '\n');

try {
  const workbook = XLSX.readFile(excelPath, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    sheetStubs: true
  });

  const hojasPPA = [
    'PPA Calculos',
    'PPA inversionista',
    'PPA Datos Salida',
    'PPA Flujo de Caja Cliente',
    'PPA Formulario INELCO',
    'PPA Modalidades'
  ];

  const analisisPPA = {};

  hojasPPA.forEach(sheetName => {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Hoja "${sheetName}" no encontrada\n`);
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    console.log(`\n📄 ANALIZANDO: "${sheetName}"`);
    console.log('='.repeat(100));
    console.log(`Rango: ${worksheet['!ref'] || 'Vacía'}`);
    console.log(`Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}\n`);

    const analisis = {
      nombre: sheetName,
      campos: [],
      formulas: [],
      valores: [],
      estructura: []
    };

    // Analizar estructura completa (primeras 100 filas, primeras 20 columnas)
    console.log('📋 ESTRUCTURA DE DATOS (primeras 50 filas):\n');
    for (let R = range.s.r; R <= Math.min(range.s.r + 50, range.e.r); ++R) {
      const fila = [];
      for (let C = range.s.c; C <= Math.min(range.s.c + 20, range.e.c); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          let valor = '';
          if (cell.f) {
            valor = `[FÓRMULA: ${cell.f.substring(0, 60)}]`;
          } else if (cell.v !== undefined && cell.v !== null) {
            valor = String(cell.v).substring(0, 30);
          }
          
          if (valor) {
            fila.push({
              celda: cellAddress,
              valor: valor,
              esFormula: !!cell.f,
              formula: cell.f || null
            });
            
            // Guardar fórmulas importantes
            if (cell.f) {
              analisis.formulas.push({
                celda: cellAddress,
                formula: cell.f,
                valor: cell.v
              });
            }
            
            // Guardar campos importantes
            if (typeof cell.v === 'string' && cell.v.length < 100) {
              const valorLower = cell.v.toLowerCase();
              if (valorLower.match(/precio|tarifa|consumo|generacion|ahorro|inversion|ppa|cliente|energia|kwh|flujo|caja|año|mes|total|subtotal|iva|descuento|modalidad|contrato|duracion|escalamiento|tasa|interes|tir|van|roi/i)) {
                analisis.campos.push({
                  etiqueta: cell.v,
                  celda: cellAddress,
                  valor: null
                });
              }
            }
          }
        }
      }
      
      if (fila.length > 0) {
        analisis.estructura.push({
          fila: R + 1,
          celdas: fila
        });
        
        // Mostrar fila si tiene información relevante
        const filaStr = fila.map(c => `${c.celda}:${c.valor.substring(0, 25)}`).join(' | ');
        if (filaStr.length > 0) {
          console.log(`Fila ${(R + 1).toString().padStart(3)}: ${filaStr.substring(0, 150)}`);
        }
      }
    }

    // Mostrar fórmulas clave
    if (analisis.formulas.length > 0) {
      console.log(`\n🔢 FÓRMULAS ENCONTRADAS (${analisis.formulas.length}):\n`);
      analisis.formulas.slice(0, 30).forEach(f => {
        const formulaCorta = f.formula.length > 100 ? f.formula.substring(0, 100) + '...' : f.formula;
        console.log(`  ${f.celda.padEnd(6)} = ${formulaCorta}`);
        if (f.valor !== undefined) {
          console.log(`         Valor: ${f.valor}`);
        }
      });
    }

    // Buscar referencias a otras hojas
    const referencias = new Set();
    analisis.formulas.forEach(f => {
      const match = f.formula.match(/'([^']+)'!/g);
      if (match) {
        match.forEach(ref => {
          const hoja = ref.replace(/'/g, '').replace('!', '');
          if (hoja !== sheetName) {
            referencias.add(hoja);
          }
        });
      }
    });

    if (referencias.size > 0) {
      console.log(`\n🔗 REFERENCIAS A OTRAS HOJAS:`);
      referencias.forEach(ref => {
        console.log(`  → "${ref}"`);
      });
    }

    analisisPPA[sheetName] = analisis;
  });

  // Guardar análisis
  fs.writeFileSync('analisis-ppa-detallado.json', JSON.stringify(analisisPPA, null, 2));
  console.log('\n\n✅ Análisis guardado en: analisis-ppa-detallado.json');

  // Resumen
  console.log('\n\n' + '='.repeat(100));
  console.log('📊 RESUMEN DEL ANÁLISIS PPA');
  console.log('='.repeat(100));
  Object.keys(analisisPPA).forEach(hoja => {
    const a = analisisPPA[hoja];
    console.log(`\n${hoja}:`);
    console.log(`  - Campos identificados: ${a.campos.length}`);
    console.log(`  - Fórmulas encontradas: ${a.formulas.length}`);
    console.log(`  - Filas analizadas: ${a.estructura.length}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}

