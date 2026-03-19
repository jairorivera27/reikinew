# Script para configurar e iniciar la plataforma completa
Write-Host "🚀 Configurando Plataforma OKR/CRM Reiki Solar" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instálalo primero." -ForegroundColor Red
    exit 1
}

# Verificar y crear .env del backend si no existe
if (-not (Test-Path "apps\api\.env")) {
    Write-Host "📝 Creando archivo .env del backend..." -ForegroundColor Yellow
    @"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="reiki-solar-secret-key-change-in-production-$(Get-Random -Minimum 1000 -Maximum 9999)"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
"@ | Out-File -FilePath "apps\api\.env" -Encoding UTF8
    Write-Host "✅ Archivo .env del backend creado" -ForegroundColor Green
} else {
    Write-Host "✅ Archivo .env del backend ya existe" -ForegroundColor Green
}

# Instalar dependencias del backend
Write-Host ""
Write-Host "📦 Instalando dependencias del backend..." -ForegroundColor Cyan
Set-Location "apps\api"
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "✅ Dependencias del backend ya instaladas" -ForegroundColor Green
}

# Generar Prisma Client
Write-Host ""
Write-Host "🔧 Generando Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate

# Aplicar esquema de base de datos
Write-Host ""
Write-Host "🗄️ Aplicando esquema de base de datos..." -ForegroundColor Cyan
npx prisma db push --accept-data-loss

# Poblar datos iniciales
Write-Host ""
Write-Host "🌱 Poblando datos iniciales (seed)..." -ForegroundColor Cyan
npm run prisma:seed

# Instalar dependencias del frontend
Write-Host ""
Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Cyan
Set-Location "..\web"
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "✅ Dependencias del frontend ya instaladas" -ForegroundColor Green
}

# Volver a la raíz
Set-Location "..\.."

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar los servicios, ejecuta:" -ForegroundColor Yellow
Write-Host "  .\INICIAR_TODO.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "O manualmente:" -ForegroundColor Yellow
Write-Host "  Terminal 1: cd apps\api; npm run start:dev" -ForegroundColor White
Write-Host "  Terminal 2: cd apps\web; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Credenciales de acceso:" -ForegroundColor Yellow
Write-Host "  Email: admin@reikisolar.com.co" -ForegroundColor White
Write-Host "  Contraseña: admin123" -ForegroundColor White
Write-Host ""


