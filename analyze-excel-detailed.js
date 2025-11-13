import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = path.join(process.cwd(), '..', 'modificado_nologin', 'cot', 'Cotizador (2.0).xlsm');

console.log('📊 ANÁLISIS DETALLADO DEL COTIZADOR\n');
console.log('='.repeat(80) + '\n');

try {
  const workbook = XLSX.readFile(excelPath, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    sheetStubs: true
  });

  // Analizar hoja "Datos de Entrada (On Grid)"
  console.log('📋 HOJA: "Datos de Entrada (On Grid)"');
  console.log('='.repeat(80));
  const entradaOnGrid = workbook.Sheets['Datos de Entrada (On Grid)'];
  if (entradaOnGrid) {
    const range = XLSX.utils.decode_range(entradaOnGrid['!ref'] || 'A1:A1');
    console.log('Campos principales encontrados:\n');
    
    // Buscar campos de entrada
    for (let R = range.s.r; R <= Math.min(range.e.r, 50); ++R) {
      for (let C = range.s.c; C <= Math.min(range.e.c, 10); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = entradaOnGrid[cellAddress];
        if (cell && cell.v) {
          const value = String(cell.v);
          // Buscar etiquetas de campos
          if (value.match(/nombre|cliente|consumo|tarifa|ciudad|panel|inversor|potencia|tipo|usuario/i) && value.length < 100) {
            // Buscar el valor en la columna siguiente
            const nextCell = entradaOnGrid[XLSX.utils.encode_cell({ r: R, c: C + 1 })];
            if (nextCell) {
              console.log(`  ${value.padEnd(40)} = ${String(nextCell.v).substring(0, 50)}`);
            }
          }
        }
      }
    }
  }

  console.log('\n\n📋 HOJA: "Datos Equipos"');
  console.log('='.repeat(80));
  const datosEquipos = workbook.Sheets['Datos Equipos'];
  if (datosEquipos) {
    const range = XLSX.utils.decode_range(datosEquipos['!ref'] || 'A1:A1');
    console.log('Estructura de equipos (primeras 30 filas):\n');
    
    for (let R = range.s.r; R <= Math.min(range.s.r + 30, range.e.r); ++R) {
      const row = [];
      for (let C = range.s.c; C <= Math.min(range.s.c + 15, range.e.c); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = datosEquipos[cellAddress];
        if (cell && cell.v !== undefined) {
          row.push(String(cell.v).substring(0, 20).padEnd(20));
        } else {
          row.push(''.padEnd(20));
        }
      }
      if (row.some(c => c.trim() !== '')) {
        console.log(row.join(' | '));
      }
    }
  }

  console.log('\n\n📋 HOJA: "Datos de Salida (On grid)"');
  console.log('='.repeat(80));
  const salidaOnGrid = workbook.Sheets['Datos de Salida (On grid)'];
  if (salidaOnGrid) {
    const range = XLSX.utils.decode_range(salidaOnGrid['!ref'] || 'A1:A1');
    console.log('Estructura de salida (primeras 25 filas):\n');
    
    for (let R = range.s.r; R <= Math.min(range.s.r + 25, range.e.r); ++R) {
      const row = [];
      for (let C = range.s.c; C <= Math.min(range.s.c + 12, range.e.c); ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = salidaOnGrid[cellAddress];
        if (cell && cell.v !== undefined) {
          const val = String(cell.v);
          row.push(val.substring(0, 25).padEnd(25));
        } else {
          row.push(''.padEnd(25));
        }
      }
      if (row.some(c => c.trim() !== '')) {
        console.log(row.join(' | '));
      }
    }
  }

  console.log('\n\n📋 RESUMEN DE FUNCIONALIDADES');
  console.log('='.repeat(80));
  console.log(`
El cotizador Excel tiene las siguientes funcionalidades principales:

1. ENTRADA DE DATOS:
   - Tipo de usuario (Residencial, Comercial, Industrial)
   - Datos del cliente (nombre, email, teléfono, dirección, ciudad)
   - Consumo mensual de energía (kWh/mes)
   - Tarifa eléctrica ($/kWh)
   - Selección de equipos (paneles, inversores, baterías)
   - Tipo de sistema (On-Grid, Off-Grid, Híbrido)

2. CÁLCULOS:
   - Cálculo de potencia necesaria
   - Cálculo de cantidad de paneles
   - Cálculo de generación de energía
   - Cálculo de ahorro económico
   - Análisis de flujo de caja
   - Cálculo de TIR y años de recuperación
   - Cálculo de emisiones de CO2 evitadas

3. SALIDA:
   - Lista de equipos con cantidades y precios
   - Subtotal, IVA, Total
   - Generación de cotización
   - Generación de contrato
   - Análisis financiero

4. BASE DE DATOS:
   - Catálogo de equipos (paneles, inversores, baterías, etc.)
   - Precios actualizados
   - Especificaciones técnicas
   - Histórico de cotizaciones
  `);

} catch (error) {
  console.error('❌ Error:', error.message);
}

