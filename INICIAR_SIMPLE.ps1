# Script simple para iniciar la plataforma
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Plataforma OKR/CRM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = $PSScriptRoot
$apiPath = Join-Path $rootPath "apps\api"
$webPath = Join-Path $rootPath "apps\web"

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no esta instalado" -ForegroundColor Red
    exit 1
}

# Verificar que existan las carpetas
if (-not (Test-Path $apiPath)) {
    Write-Host "ERROR: No se encuentra apps\api" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $webPath)) {
    Write-Host "ERROR: No se encuentra apps\web" -ForegroundColor Red
    exit 1
}

# Verificar dependencias
if (-not (Test-Path (Join-Path $apiPath "node_modules"))) {
    Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
    Set-Location $apiPath
    npm install
    Set-Location $rootPath
}

if (-not (Test-Path (Join-Path $webPath "node_modules"))) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Yellow
    Set-Location $webPath
    npm install --legacy-peer-deps
    Set-Location $rootPath
}

# Crear .env si no existe
if (-not (Test-Path (Join-Path $apiPath ".env"))) {
    Write-Host "Creando archivo .env del backend..." -ForegroundColor Yellow
    @"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="reiki-okr-platform-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=""
"@ | Out-File -FilePath (Join-Path $apiPath ".env") -Encoding utf8
}

# Crear .env.local si no existe
if (-not (Test-Path (Join-Path $webPath ".env.local"))) {
    Write-Host "Creando archivo .env.local del frontend..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:4000" | Out-File -FilePath (Join-Path $webPath ".env.local") -Encoding utf8
}

Write-Host ""
Write-Host "Iniciando servidores..." -ForegroundColor Cyan
Write-Host ""

# Iniciar Backend
Write-Host "Backend (puerto 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; Write-Host '=== BACKEND API ===' -ForegroundColor Green; Write-Host 'Puerto: 4000' -ForegroundColor Cyan; Write-Host 'URL: http://localhost:4000/api' -ForegroundColor Cyan; Write-Host ''; npm run start:dev"

Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host "Frontend (puerto 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; Write-Host '=== FRONTEND ===' -ForegroundColor Green; Write-Host 'Puerto: 3000' -ForegroundColor Cyan; Write-Host 'URL: http://localhost:3000' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Servidores iniciados!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Espera 15-20 segundos y luego:" -ForegroundColor Yellow
Write-Host "  1. Abre tu navegador" -ForegroundColor White
Write-Host "  2. Ve a: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si ves errores, revisa las ventanas de PowerShell que se abrieron" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para abrir el navegador..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000"



