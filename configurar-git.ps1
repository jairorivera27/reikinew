# Script para configurar Git paso a paso
Write-Host "=== Configuración de Git ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si Git está instalado
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Git está instalado: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git no disponible"
    }
} catch {
    Write-Host "✗ Git no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "  1. Instala Git desde: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "  2. Reinicia esta terminal después de instalar" -ForegroundColor White
    Write-Host "  3. Ejecuta este script de nuevo" -ForegroundColor White
    exit 1
}

Write-Host ""

# Verificar configuración actual
Write-Host "Paso 1: Verificando configuración actual..." -ForegroundColor Yellow
$currentName = git config --global user.name
$currentEmail = git config --global user.email

if ($currentName -and $currentEmail) {
    Write-Host "✓ Configuración actual:" -ForegroundColor Green
    Write-Host "  Nombre: $currentName" -ForegroundColor White
    Write-Host "  Email:  $currentEmail" -ForegroundColor White
    Write-Host ""
    $cambiar = Read-Host "¿Quieres cambiar la configuración? (S/N)"
    if ($cambiar -ne "S" -and $cambiar -ne "s") {
        Write-Host ""
        Write-Host "✓ Configuración mantenida. ¡Listo para usar!" -ForegroundColor Green
        exit 0
    }
} else {
    Write-Host "⚠ Git no está configurado aún" -ForegroundColor Yellow
    Write-Host ""
}

# Configurar nombre
Write-Host ""
Write-Host "Paso 2: Configurar tu nombre" -ForegroundColor Yellow
if ($currentName) {
    Write-Host "Nombre actual: $currentName" -ForegroundColor Gray
    $nombre = Read-Host "Ingresa tu nombre (Enter para mantener '$currentName')"
    if ([string]::IsNullOrWhiteSpace($nombre)) {
        $nombre = $currentName
    }
} else {
    $nombre = Read-Host "Ingresa tu nombre"
}

if ([string]::IsNullOrWhiteSpace($nombre)) {
    Write-Host "✗ El nombre no puede estar vacío" -ForegroundColor Red
    exit 1
}

git config --global user.name $nombre
Write-Host "✓ Nombre configurado: $nombre" -ForegroundColor Green

# Configurar email
Write-Host ""
Write-Host "Paso 3: Configurar tu email" -ForegroundColor Yellow
Write-Host "⚠️  Usa el mismo email que usas en GitHub" -ForegroundColor Yellow
if ($currentEmail) {
    Write-Host "Email actual: $currentEmail" -ForegroundColor Gray
    $email = Read-Host "Ingresa tu email (Enter para mantener '$currentEmail')"
    if ([string]::IsNullOrWhiteSpace($email)) {
        $email = $currentEmail
    }
} else {
    $email = Read-Host "Ingresa tu email"
}

if ([string]::IsNullOrWhiteSpace($email)) {
    Write-Host "✗ El email no puede estar vacío" -ForegroundColor Red
    exit 1
}

# Validar formato de email básico
if ($email -notmatch '^[^@]+@[^@]+\.[^@]+$') {
    Write-Host "⚠️  Advertencia: El formato del email parece incorrecto" -ForegroundColor Yellow
    $continuar = Read-Host "¿Continuar de todos modos? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 1
    }
}

git config --global user.email $email
Write-Host "✓ Email configurado: $email" -ForegroundColor Green

# Configuraciones adicionales opcionales
Write-Host ""
Write-Host "Paso 4: Configuraciones adicionales (Opcional)" -ForegroundColor Yellow
$configAdicional = Read-Host "¿Quieres configurar opciones adicionales? (S/N)"

if ($configAdicional -eq "S" -or $configAdicional -eq "s") {
    # Configurar rama principal
    Write-Host ""
    Write-Host "Configurando rama principal como 'main'..." -ForegroundColor Cyan
    git config --global init.defaultBranch main
    Write-Host "✓ Rama principal configurada" -ForegroundColor Green
    
    # Configurar colores
    Write-Host ""
    Write-Host "Configurando colores en la terminal..." -ForegroundColor Cyan
    git config --global color.ui auto
    Write-Host "✓ Colores configurados" -ForegroundColor Green
    
    # Configurar editor (VS Code si está disponible)
    $codePath = Get-Command code -ErrorAction SilentlyContinue
    if ($codePath) {
        Write-Host ""
        $usarVSCode = Read-Host "¿Usar VS Code como editor? (S/N)"
        if ($usarVSCode -eq "S" -or $usarVSCode -eq "s") {
            git config --global core.editor "code --wait"
            Write-Host "✓ Editor configurado como VS Code" -ForegroundColor Green
        }
    }
}

# Mostrar resumen
Write-Host ""
Write-Host "=== Resumen de configuración ===" -ForegroundColor Cyan
Write-Host ""
git config --global --list | Select-String -Pattern "user\.|init\.|color\.|core\.editor" | ForEach-Object {
    Write-Host "  $_" -ForegroundColor White
}

Write-Host ""
Write-Host "✓ ¡Git configurado correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Para inicializar tu repositorio: .\setup-github.ps1" -ForegroundColor Cyan
Write-Host "  2. O sigue la guía en: CONFIGURAR_GIT.md" -ForegroundColor Cyan
Write-Host ""


