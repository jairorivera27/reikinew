# Script para iniciar solo el backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Backend API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $rootPath "apps\api"

Set-Location $apiPath

# Verificar .env
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env..." -ForegroundColor Yellow
    @"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="reiki-okr-platform-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
"@ | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "Iniciando backend en puerto 4000..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

npm run start:dev



