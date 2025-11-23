import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const webDir = join(rootDir, 'apps', 'web');

console.log('🔨 Construyendo Next.js OKR como estático...\n');

// Establecer variables de entorno y ejecutar build
process.env.STATIC_EXPORT = 'true';
process.env.NEXT_PUBLIC_BASE_PATH = '/okr';

try {
  execSync('npm run build', {
    cwd: webDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      STATIC_EXPORT: 'true',
      NEXT_PUBLIC_BASE_PATH: '/okr',
    },
  });
  console.log('\n✅ Build de Next.js OKR completado!');
} catch (error) {
  console.error('\n❌ Error al construir Next.js OKR');
  process.exit(1);
}

