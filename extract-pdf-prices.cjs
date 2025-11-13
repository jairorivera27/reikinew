const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function extractPDFText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    // pdf-parse v1.1.1 exporta la función directamente
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error leyendo ${filePath}:`, error.message);
    if (error.stack) console.error(error.stack);
    return null;
  }
}

async function main() {
  console.log('📄 Extrayendo información de PDFs de precios...\n');
  
  const pdf1 = path.join(process.cwd(), 'Precios noviembre 2025.-1.pdf');
  const pdf2 = path.join(process.cwd(), 'Lista de precios OCTUBRE de 2025 COLOMBIA FOTOVOLTAICA.pdf');
  
  console.log('Leyendo PDF 1: Precios noviembre 2025...');
  const text1 = await extractPDFText(pdf1);
  
  console.log('Leyendo PDF 2: Lista de precios OCTUBRE...');
  const text2 = await extractPDFText(pdf2);
  
  console.log('\n' + '='.repeat(80));
  console.log('CONTENIDO PDF 1 (Precios noviembre 2025):');
  console.log('='.repeat(80));
  if (text1) {
    console.log(text1.substring(0, 5000)); // Primeros 5000 caracteres
    console.log('\n... (truncado) ...\n');
  } else {
    console.log('No se pudo leer el PDF');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('CONTENIDO PDF 2 (Lista de precios OCTUBRE):');
  console.log('='.repeat(80));
  if (text2) {
    console.log(text2.substring(0, 5000)); // Primeros 5000 caracteres
    console.log('\n... (truncado) ...\n');
  } else {
    console.log('No se pudo leer el PDF');
  }
  
  // Guardar texto completo en archivos para análisis
  if (text1) {
    fs.writeFileSync('precios-noviembre-2025.txt', text1);
    console.log('✅ Texto del PDF 1 guardado en: precios-noviembre-2025.txt');
  }
  
  if (text2) {
    fs.writeFileSync('precios-octubre-2025.txt', text2);
    console.log('✅ Texto del PDF 2 guardado en: precios-octubre-2025.txt');
  }
}

main().catch(console.error);

