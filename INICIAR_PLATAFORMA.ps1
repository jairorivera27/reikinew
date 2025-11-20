# Script para iniciar la plataforma OKR/CRM
# Ejecuta este script para iniciar tanto el backend como el frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Plataforma OKR/CRM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiPath = "C:\Users\core i5\Desktop\REIKINEW\apps\api"
$webPath = "C:\Users\core i5\Desktop\REIKINEW\apps\web"

# Verificar que Node.js esté instalado
$nodeVersion = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeVersion) {
    Write-Host "❌ Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor, instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js encontrado" -ForegroundColor Green
Write-Host ""

# Iniciar Backend
Write-Host "🚀 Iniciando Backend (API)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; Write-Host 'Backend API - Puerto 4000' -ForegroundColor Green; npm run start:dev"

Start-Sleep -Seconds 2

# Iniciar Frontend
Write-Host "🚀 Iniciando Frontend (Web)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; Write-Host 'Frontend - Puerto 3000' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:4000/api" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Espera unos segundos para que los servidores terminen de iniciar..." -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Presiona cualquier tecla para abrir el navegador..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000"



