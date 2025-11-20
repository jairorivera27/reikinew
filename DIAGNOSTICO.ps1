# Script de diagnóstico
Write-Host "=== DIAGNÓSTICO DE LA PLATAFORMA ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js NO está instalado" -ForegroundColor Red
    exit 1
}

# 2. Verificar npm
Write-Host "2. Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm NO está disponible" -ForegroundColor Red
    exit 1
}

# 3. Verificar dependencias
Write-Host "3. Verificando dependencias..." -ForegroundColor Yellow
$apiNodeModules = Test-Path "apps\api\node_modules"
$webNodeModules = Test-Path "apps\web\node_modules"

if ($apiNodeModules) {
    Write-Host "   ✅ Backend: dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend: FALTAN dependencias" -ForegroundColor Red
    Write-Host "      Ejecuta: cd apps\api; npm install" -ForegroundColor Yellow
}

if ($webNodeModules) {
    Write-Host "   ✅ Frontend: dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend: FALTAN dependencias" -ForegroundColor Red
    Write-Host "      Ejecuta: cd apps\web; npm install" -ForegroundColor Yellow
}

# 4. Verificar archivos de configuración
Write-Host "4. Verificando configuración..." -ForegroundColor Yellow
$apiEnv = Test-Path "apps\api\.env"
$webEnv = Test-Path "apps\web\.env.local"

if ($apiEnv) {
    Write-Host "   ✅ Backend: .env existe" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend: FALTA archivo .env" -ForegroundColor Red
}

if ($webEnv) {
    Write-Host "   ✅ Frontend: .env.local existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Frontend: .env.local no existe (se creará automáticamente)" -ForegroundColor Yellow
}

# 5. Verificar base de datos
Write-Host "5. Verificando base de datos..." -ForegroundColor Yellow
$dbExists = Test-Path "apps\api\prisma\dev.db"
if ($dbExists) {
    Write-Host "   ✅ Base de datos existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Base de datos NO existe (se creará al iniciar)" -ForegroundColor Yellow
}

# 6. Verificar puertos
Write-Host "6. Verificando puertos..." -ForegroundColor Yellow
$port3000 = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
$port4000 = Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($port3000) {
    Write-Host "   ✅ Puerto 3000 (Frontend): OCUPADO" -ForegroundColor Green
} else {
    Write-Host "   ❌ Puerto 3000 (Frontend): LIBRE (servidor no está corriendo)" -ForegroundColor Red
}

if ($port4000) {
    Write-Host "   ✅ Puerto 4000 (Backend): OCUPADO" -ForegroundColor Green
} else {
    Write-Host "   ❌ Puerto 4000 (Backend): LIBRE (servidor no está corriendo)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
if (-not $port3000 -or -not $port4000) {
    Write-Host "Los servidores NO están corriendo correctamente." -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciarlos, ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\INICIAR.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "O manualmente:" -ForegroundColor Yellow
    Write-Host "  Terminal 1: cd apps\api; npm run start:dev" -ForegroundColor White
    Write-Host "  Terminal 2: cd apps\web; npm run dev" -ForegroundColor White
} else {
    Write-Host "✅ Todo parece estar funcionando!" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Backend:  http://localhost:4000/api" -ForegroundColor Cyan
}

