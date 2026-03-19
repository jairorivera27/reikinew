const fs = require('fs');

// Leer equipos extraídos
const equiposExtraidos = JSON.parse(fs.readFileSync('equipos-precios-actualizados.json', 'utf-8'));

console.log('📦 Actualizando base de datos de equipos con precios reales...\n');

// Función para convertir equipos extraídos al formato de la base de datos
function convertirEquipo(equipo) {
  const id = equipo.codigo.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  let nombre = equipo.descripcion;
  // Limpiar nombre
  nombre = nombre.replace(/^\w+\s+/, ''); // Remover primera palabra si es corta
  nombre = nombre.substring(0, 100); // Limitar longitud
  
  const equipoConvertido = {
    id: id,
    tipo: equipo.tipo,
    categoria: equipo.tipo === 'panel' ? 'paneles' : 
               equipo.tipo === 'inversor' ? 'inversores' :
               equipo.tipo === 'controlador' ? 'controladores' :
               equipo.tipo === 'bateria' ? 'baterias' :
               equipo.tipo === 'estructura' ? 'estructuras' : 'accesorios',
    nombre: nombre,
    descripcion: equipo.descripcion,
    marca: equipo.marca || 'Genérico',
    modelo: equipo.codigo,
    precioUnitario: equipo.precioCOP,
  };
  
  // Agregar especificaciones si existen
  if (equipo.potencia) {
    equipoConvertido.potencia = equipo.potencia;
    if (equipo.tipo === 'panel') {
      equipoConvertido.precioWp = Math.round(equipo.precioCOP / equipo.potencia);
    }
  }
  
  if (equipo.voltaje) equipoConvertido.voltaje = equipo.voltaje;
  if (equipo.corriente) equipoConvertido.corriente = equipo.corriente;
  if (equipo.capacidad) equipoConvertido.capacidad = equipo.capacidad;
  if (equipo.capacidadKWh) equipoConvertido.capacidad = equipo.capacidadKWh;
  
  return equipoConvertido;
}

// Filtrar y convertir equipos más importantes
const equiposImportantes = {
  paneles: equiposExtraidos.equiposPorTipo.panel
    .filter(e => e.potencia && e.potencia >= 300) // Solo paneles de 300W o más
    .slice(0, 20) // Máximo 20 paneles
    .map(convertirEquipo),
  
  inversores: equiposExtraidos.equiposPorTipo.inversor
    .filter(e => e.potencia && e.potencia >= 1000) // Solo inversores de 1kW o más
    .slice(0, 30) // Máximo 30 inversores
    .map(convertirEquipo),
  
  controladores: equiposExtraidos.equiposPorTipo.controlador
    .filter(e => e.corriente && e.corriente >= 10) // Solo controladores de 10A o más
    .slice(0, 20) // Máximo 20 controladores
    .map(convertirEquipo),
  
  baterias: equiposExtraidos.equiposPorTipo.bateria
    .filter(e => e.capacidad && e.capacidad >= 1) // Solo baterías de 1kWh o más
    .map(convertirEquipo),
};

// Generar código TypeScript para actualizar equipos.ts
let codigoTS = `// Base de datos de equipos solares actualizada con precios reales
// Extraídos de: Precios noviembre 2025 y Lista de precios OCTUBRE 2025
// Fecha de actualización: ${new Date().toISOString()}

import type { Equipo } from './tipos';

// Equipos extraídos de los PDFs de precios
export const EQUIPOS_ACTUALIZADOS: Equipo[] = [
`;

// Agregar paneles
equiposImportantes.paneles.forEach(eq => {
  codigoTS += `  {\n`;
  codigoTS += `    id: '${eq.id}',\n`;
  codigoTS += `    tipo: '${eq.tipo}',\n`;
  codigoTS += `    categoria: '${eq.categoria}',\n`;
  codigoTS += `    nombre: '${eq.nombre.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    descripcion: '${eq.descripcion.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    marca: '${eq.marca}',\n`;
  codigoTS += `    modelo: '${eq.modelo}',\n`;
  if (eq.potencia) codigoTS += `    potencia: ${eq.potencia},\n`;
  if (eq.voltaje) codigoTS += `    voltaje: ${eq.voltaje},\n`;
  if (eq.corriente) codigoTS += `    corriente: ${eq.corriente},\n`;
  if (eq.capacidad) codigoTS += `    capacidad: ${eq.capacidad},\n`;
  codigoTS += `    precioUnitario: ${eq.precioUnitario},\n`;
  if (eq.precioWp) codigoTS += `    precioWp: ${eq.precioWp},\n`;
  codigoTS += `  },\n`;
});

// Agregar inversores
equiposImportantes.inversores.forEach(eq => {
  codigoTS += `  {\n`;
  codigoTS += `    id: '${eq.id}',\n`;
  codigoTS += `    tipo: '${eq.tipo}',\n`;
  codigoTS += `    categoria: '${eq.categoria}',\n`;
  codigoTS += `    nombre: '${eq.nombre.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    descripcion: '${eq.descripcion.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    marca: '${eq.marca}',\n`;
  codigoTS += `    modelo: '${eq.modelo}',\n`;
  if (eq.potencia) codigoTS += `    potencia: ${eq.potencia / 1000}, // kW\n`;
  if (eq.voltaje) codigoTS += `    voltaje: ${eq.voltaje},\n`;
  codigoTS += `    precioUnitario: ${eq.precioUnitario},\n`;
  codigoTS += `  },\n`;
});

// Agregar controladores
equiposImportantes.controladores.forEach(eq => {
  codigoTS += `  {\n`;
  codigoTS += `    id: '${eq.id}',\n`;
  codigoTS += `    tipo: '${eq.tipo}',\n`;
  codigoTS += `    categoria: '${eq.categoria}',\n`;
  codigoTS += `    nombre: '${eq.nombre.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    descripcion: '${eq.descripcion.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    marca: '${eq.marca}',\n`;
  codigoTS += `    modelo: '${eq.modelo}',\n`;
  if (eq.voltaje) codigoTS += `    voltaje: ${eq.voltaje},\n`;
  if (eq.corriente) codigoTS += `    corriente: ${eq.corriente},\n`;
  codigoTS += `    precioUnitario: ${eq.precioUnitario},\n`;
  codigoTS += `  },\n`;
});

// Agregar baterías
equiposImportantes.baterias.forEach(eq => {
  codigoTS += `  {\n`;
  codigoTS += `    id: '${eq.id}',\n`;
  codigoTS += `    tipo: '${eq.tipo}',\n`;
  codigoTS += `    categoria: '${eq.categoria}',\n`;
  codigoTS += `    nombre: '${eq.nombre.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    descripcion: '${eq.descripcion.replace(/'/g, "\\'")}',\n`;
  codigoTS += `    marca: '${eq.marca}',\n`;
  codigoTS += `    modelo: '${eq.modelo}',\n`;
  if (eq.voltaje) codigoTS += `    voltaje: ${eq.voltaje},\n`;
  if (eq.capacidad) codigoTS += `    capacidad: ${eq.capacidad},\n`;
  codigoTS += `    precioUnitario: ${eq.precioUnitario},\n`;
  codigoTS += `  },\n`;
});

codigoTS += `];\n`;

// Guardar en archivo
fs.writeFileSync('equipos-actualizados.ts', codigoTS);

console.log('✅ Equipos importantes convertidos:');
console.log(`  - ${equiposImportantes.paneles.length} paneles`);
console.log(`  - ${equiposImportantes.inversores.length} inversores`);
console.log(`  - ${equiposImportantes.controladores.length} controladores`);
console.log(`  - ${equiposImportantes.baterias.length} baterías`);
console.log('\n✅ Código TypeScript generado en: equipos-actualizados.ts');

