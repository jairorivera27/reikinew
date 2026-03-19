# Script para verificar la instalación de Git
Write-Host "=== Verificación de Git ===" -ForegroundColor Cyan
Write-Host ""

# Intentar ejecutar git --version
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Git está instalado y funcionando: $gitVersion" -ForegroundColor Green
        Write-Host ""
        
        # Verificar configuración
        Write-Host "Verificando configuración..." -ForegroundColor Yellow
        $userName = git config --global user.name
        $userEmail = git config --global user.email
        
        if ($userName -and $userEmail) {
            Write-Host "✓ Git configurado: $userName <$userEmail>" -ForegroundColor Green
        } else {
            Write-Host "⚠ Git no está configurado. Necesitas configurar tu nombre y email:" -ForegroundColor Yellow
            Write-Host "  git config --global user.name 'Tu Nombre'" -ForegroundColor Cyan
            Write-Host "  git config --global user.email 'tu-email@ejemplo.com'" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "✓ ¡Todo listo! Puedes continuar con la conexión a GitHub." -ForegroundColor Green
        Write-Host ""
        Write-Host "Próximos pasos:" -ForegroundColor Yellow
        Write-Host "  1. Ejecuta: .\setup-github.ps1" -ForegroundColor Cyan
        Write-Host "  2. O sigue los pasos en GITHUB_SETUP.md" -ForegroundColor Cyan
        
    } else {
        Write-Host "✗ Error al ejecutar Git" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Git no está disponible en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "  1. Cierra y abre una nueva terminal" -ForegroundColor White
    Write-Host "  2. Verifica que Git esté instalado correctamente" -ForegroundColor White
    Write-Host "  3. Reinstala Git y asegúrate de marcar 'Add Git to PATH'" -ForegroundColor White
    Write-Host ""
    Write-Host "Descarga Git desde: https://git-scm.com/download/win" -ForegroundColor Cyan
}

Write-Host ""



