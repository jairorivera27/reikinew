#!/usr/bin/env node
/**
 * Actualiza la ruta de imagen de los productos de la tienda para que apunten
 * a la carpeta `public/images/Productos tienda`.
 */

const fs = require('fs');
const path = require('path');

const baseDir = path.join('src', 'content', 'productos');

/** @type {Record<string, string>} */
const imageMap = {
  // Cargadores
  'cargador-solar-carro-10w': '/images/Productos tienda/Cargador de Carros/Cargador Solar para Carro 10W Powertech Medellín.png',
  'cargador-solar-carro-12v': '/images/Productos tienda/Cargador de Carros/Cargador Solar para Carro V12.png',
  'cargador-solar-carro-40w': '/images/Productos tienda/Cargador de Carros/Cargador Solar para Carro 40W Powertech Medellín.png',
  'cargador-solar-carro-60w': '/images/Productos tienda/Cargador de Carros/Cargador Solar para Carro 60W Powertech Medellín.png',
  'cargador-solar-carro-100w': '/images/Productos tienda/Cargador de Carros/Cargador Solar para Carro 100W Powertech Medellín.png',

  // Controladores
  'controlador-mppt-20a': '/images/Productos tienda/Controladores/20A.jpg',
  'controlador-mppt-40a': '/images/Productos tienda/Controladores/40A.avif',
  'controlador-mppt-60a': '/images/Productos tienda/Controladores/60A.jpg',
  'controlador-mppt-80a': '/images/Productos tienda/Controladores/80A.jpg',
  'controlador-mppt-100a': '/images/Productos tienda/Controladores/100A.jpg',

  // Inversores
  'apsystems-qt2': '/images/Productos tienda/Inversores/APSystems QT2 Medellín.png',
  'epever-ipt2000': '/images/Productos tienda/Inversores/Epever IPT2000 Medellín.png',
  'huawei-sun2000-8k-lc0': '/images/Productos tienda/Inversores/huawei 4ktl-l1 hibrido.jpg',
  'huawei-sun2000-10k-lc0': '/images/Productos tienda/Inversores/Huawei 4KTL-L1 Medellín.png',
  'huawei-sun2000-20ktl-m3': '/images/Productos tienda/Inversores/Huawei 36ktl-m3.avif',
  'inversor-hybrido-3kw': '/images/Productos tienda/Inversores/Must Pv30-1524 Medellín.png',
  'inversor-hybrido-5kw': '/images/Productos tienda/Inversores/Deye 5kwh híbrido.jpg',
  'inversor-hybrido-8kw': '/images/Productos tienda/Inversores/Huawei 4KTL-L1 Medellín.png',
  'inversor-micro-optimizador': '/images/Productos tienda/Inversores/Apsystems DS3D Medellín.png',
  'inversor-string-10kw': '/images/Productos tienda/Inversores/Huawei 36ktl-m3.avif',
  'victron-phoenix-24-375': '/images/Productos tienda/Inversores/Victron Phoenix 34-375.webp',
  'victron-quattro-48-5000': '/images/Productos tienda/Inversores/Victron Quattro 48-5000 Medellín.png',

  // Paneles
  'jinko-tiger-neo-585w': '/images/Productos tienda/Panel solar/Panel Solar Jinko Tiger Neo 585w medellín.png',
  'panel-solar-bifacial-600w': '/images/Productos tienda/Panel solar/Panel Solar Trinasolar 700w Medellín.png',
  'panel-solar-monocristalino-500w': '/images/Productos tienda/Panel solar/Panel Solar Monocristalino 500w JinkoSolar Medellín.png',
  'panel-solar-monocristalino-550w': '/images/Productos tienda/Panel solar/Panel Solar JAsolar 595w Medellín.png',
  'panel-solar-monocristalino-600w': '/images/Productos tienda/Panel solar/Trinasolar 650 panel solar medellín.png',
  'panel-solar-policristalino-450w': '/images/Productos tienda/Panel solar/LONGI 545W Panel solar.webp',

  // Protecciones
  'proteccion-breaker-32a': '/images/Productos tienda/Protección Electrica/Breaker DC 32a ABB Medellín.png',
  'proteccion-breaker-63a': '/images/Productos tienda/Protección Electrica/Breaker DC 63A ABB Medellín.png',
  'proteccion-breaker-100a': '/images/Productos tienda/Protección Electrica/Breaker DC 100A ABB Medellín.png',
  'proteccion-fusible-100a': '/images/Productos tienda/Protección Electrica/Breaker DC 100a con Portafusible ABB Medellín.png',
  'proteccion-fusible-200a': '/images/Productos tienda/Protección Electrica/Breaker DC 100a con Portafusible.png',
};

const pattern = /^image:\s*".*?"\s*$/m;

for (const [slug, imagePath] of Object.entries(imageMap)) {
  const filePath = path.join(baseDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo para ${slug}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (!pattern.test(content)) {
    throw new Error(`No se encontró la línea de imagen en ${filePath}`);
  }

  const updated = content.replace(pattern, `image: "${imagePath}"`);
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✓ Actualizado ${slug}`);
  }
}

