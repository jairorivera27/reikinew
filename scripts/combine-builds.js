import { copyFileSync, mkdirSync, readdirSync, statSync, cpSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔗 Combinando sitio Astro y plataforma Next.js...\n');

// Paso 1: Deshabilitar middleware temporalmente (incompatible con export estático)
const middlewarePath = join(rootDir, 'apps', 'web', 'middleware.ts');
const middlewareBackup = join(rootDir, 'apps', 'web', 'middleware.ts.backup');

if (existsSync(middlewarePath)) {
  console.log('⚠️  Deshabilitando middleware (incompatible con export estático)...');
  renameSync(middlewarePath, middlewareBackup);
  console.log('✅ Middleware deshabilitado temporalmente');
}

// Paso 2: Verificar que dist/ existe (build de Astro)
const distDir = join(rootDir, 'dist');
if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error('❌ ERROR: No se encontró dist/ de Astro');
  console.error('   Ejecuta primero: npm run build:astro');
  if (existsSync(middlewareBackup)) {
    renameSync(middlewareBackup, middlewarePath);
  }
  process.exit(1);
}
console.log('✅ Sitio Astro encontrado en dist/');

// Paso 3: Verificar que apps/web/out/ existe (build de Next.js)
const okrOutDir = join(rootDir, 'apps', 'web', 'out');
if (!existsSync(okrOutDir) || !statSync(okrOutDir).isDirectory()) {
  console.error('❌ ERROR: No se encontró apps/web/out/');
  console.error('   Ejecuta primero: npm run build:okr');
  if (existsSync(middlewareBackup)) {
    renameSync(middlewareBackup, middlewarePath);
  }
  process.exit(1);
}
console.log('✅ Plataforma OKR encontrada en apps/web/out/');

// Paso 4: Crear directorio okr/ en dist/
const distOkrDir = join(distDir, 'okr');
mkdirSync(distOkrDir, { recursive: true });

// Paso 5: Copiar contenido de apps/web/out/ a dist/okr/
console.log('\n📦 Copiando plataforma OKR a dist/okr/...');
cpSync(okrOutDir, distOkrDir, { recursive: true });

console.log('✅ Plataforma OKR copiada a dist/okr/');

// Paso 6: Restaurar middleware
if (existsSync(middlewareBackup)) {
  renameSync(middlewareBackup, middlewarePath);
  console.log('✅ Middleware restaurado');
}

// Verificar estructura
console.log('\n📁 Estructura final en dist/:');
const distContents = readdirSync(distDir).slice(0, 15);
distContents.forEach(item => {
  const itemPath = join(distDir, item);
  const isDir = statSync(itemPath).isDirectory();
  console.log(`   ${isDir ? '📁' : '📄'} ${item}${isDir ? '/' : ''}`);
});

console.log('\n✅ Build combinado completado!');
console.log('   - Sitio Astro: dist/');
console.log('   - Plataforma OKR: dist/okr/ (oculta, solo accesible por URL directa)');
