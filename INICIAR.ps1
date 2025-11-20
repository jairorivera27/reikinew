# Script simple para iniciar la plataforma
Write-Host "Iniciando plataforma OKR/CRM..." -ForegroundColor Cyan

$apiPath = Join-Path $PSScriptRoot "apps\api"
$webPath = Join-Path $PSScriptRoot "apps\web"

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js no está instalado" -ForegroundColor Red
    exit 1
}

# Iniciar Backend
Write-Host "`nIniciando Backend (puerto 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; Write-Host '=== BACKEND API ===' -ForegroundColor Green; Write-Host 'Puerto: 4000' -ForegroundColor Cyan; Write-Host 'URL: http://localhost:4000/api' -ForegroundColor Cyan; Write-Host ''; npm run start:dev"

Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host "Iniciando Frontend (puerto 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; Write-Host '=== FRONTEND ===' -ForegroundColor Green; Write-Host 'Puerto: 3000' -ForegroundColor Cyan; Write-Host 'URL: http://localhost:3000' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host "`n✅ Servidores iniciados!" -ForegroundColor Green
Write-Host "`nEspera 10-15 segundos y luego:" -ForegroundColor Yellow
Write-Host "  1. Abre tu navegador" -ForegroundColor White
Write-Host "  2. Ve a: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPresiona cualquier tecla para abrir el navegador..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000"



