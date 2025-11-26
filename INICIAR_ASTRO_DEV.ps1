# Script para iniciar el servidor de desarrollo de Astro
# Ejecuta este script para ver el sitio Astro en localhost:4321

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Servidor Astro (Desarrollo)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js no está instalado" -ForegroundColor Red
    Write-Host "Por favor, instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar que npm esté instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: npm no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Verificando dependencias..." -ForegroundColor Yellow

# Verificar si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencias encontradas" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Iniciando servidor de desarrollo..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 URL: http://localhost:4321" -ForegroundColor White
Write-Host "📍 URL Alternativa: http://127.0.0.1:4321" -ForegroundColor White
Write-Host ""
Write-Host "💡 Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar el servidor de desarrollo
npm run dev


