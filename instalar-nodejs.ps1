# Script para instalar Node.js automáticamente
# Ejecutar como Administrador: Right-click > "Ejecutar con PowerShell"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalador de Node.js para REIKINEW" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Node.js ya está instalado
$nodeVersion = Get-Command node -ErrorAction SilentlyContinue
if ($nodeVersion) {
    Write-Host "✅ Node.js ya está instalado!" -ForegroundColor Green
    Write-Host "Versión: " -NoNewline
    node --version
    Write-Host "npm versión: " -NoNewline
    npm --version
    Write-Host ""
    Write-Host "Puedes continuar con: npm install" -ForegroundColor Yellow
    exit 0
}

Write-Host "Node.js no está instalado. Iniciando instalación..." -ForegroundColor Yellow
Write-Host ""

# URL de descarga de Node.js LTS (actualizar si es necesario)
$nodeUrl = "https://nodejs.org/dist/v24.11.1/node-v24.11.1-x64.msi"
$installerPath = "$env:TEMP\nodejs-installer.msi"

Write-Host "Descargando Node.js LTS desde nodejs.org..." -ForegroundColor Cyan
Write-Host "URL: $nodeUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Descargar el instalador
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -UseBasicParsing
    
    Write-Host "✅ Descarga completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Iniciando instalador..." -ForegroundColor Cyan
    Write-Host "Por favor, sigue las instrucciones del instalador." -ForegroundColor Yellow
    Write-Host "IMPORTANTE: Asegúrate de marcar 'Add to PATH' durante la instalación." -ForegroundColor Yellow
    Write-Host ""
    
    # Ejecutar el instalador
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installerPath`" /quiet /norestart" -Wait
    
    Write-Host ""
    Write-Host "Instalación completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Cierra y reabre PowerShell para que los cambios surtan efecto." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Después de reiniciar PowerShell, ejecuta:" -ForegroundColor Cyan
    Write-Host "  cd C:\Users\core i5\Desktop\REIKINEW" -ForegroundColor White
    Write-Host "  npm install" -ForegroundColor White
    Write-Host ""
    
    # Limpiar archivo temporal
    Remove-Item $installerPath -ErrorAction SilentlyContinue
    
} catch {
    Write-Host ""
    Write-Host "❌ Error durante la instalación:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalación manual recomendada:" -ForegroundColor Yellow
    Write-Host "1. Ve a: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Descarga la versión LTS para Windows" -ForegroundColor White
    Write-Host "3. Ejecuta el instalador y sigue las instrucciones" -ForegroundColor White
    Write-Host ""
}

