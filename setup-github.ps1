# Script para configurar Git y conectar con GitHub
# Ejecuta este script después de instalar Git

Write-Host "=== Configuración de Git para GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✓ Git está instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git no está instalado. Por favor instálalo desde: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Paso 1: Verificando configuración de Git..." -ForegroundColor Yellow

# Verificar configuración de usuario
$userName = git config --global user.name
$userEmail = git config --global user.email

if (-not $userName -or -not $userEmail) {
    Write-Host "Necesitas configurar tu nombre y email de Git:" -ForegroundColor Yellow
    $name = Read-Host "Ingresa tu nombre"
    $email = Read-Host "Ingresa tu email"
    git config --global user.name $name
    git config --global user.email $email
    Write-Host "✓ Configuración guardada" -ForegroundColor Green
} else {
    Write-Host "✓ Git ya está configurado: $userName <$userEmail>" -ForegroundColor Green
}

Write-Host ""
Write-Host "Paso 2: Inicializando repositorio Git..." -ForegroundColor Yellow

# Verificar si ya existe un repositorio
if (Test-Path .git) {
    Write-Host "✓ El repositorio Git ya está inicializado" -ForegroundColor Green
} else {
    git init
    Write-Host "✓ Repositorio Git inicializado" -ForegroundColor Green
}

Write-Host ""
Write-Host "Paso 3: Agregando archivos..." -ForegroundColor Yellow
git add .
Write-Host "✓ Archivos agregados" -ForegroundColor Green

Write-Host ""
Write-Host "Paso 4: Creando commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit: Proyecto Reiki Energía Solar"
Write-Host "✓ Commit creado" -ForegroundColor Green

Write-Host ""
Write-Host "=== Próximos pasos ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a https://github.com y crea un nuevo repositorio" -ForegroundColor White
Write-Host "2. NO inicialices con README, .gitignore o licencia" -ForegroundColor White
Write-Host "3. Copia la URL del repositorio (ej: https://github.com/usuario/repositorio.git)" -ForegroundColor White
Write-Host ""
Write-Host "Luego ejecuta estos comandos:" -ForegroundColor Yellow
Write-Host "  git remote add origin URL_DE_TU_REPOSITORIO" -ForegroundColor Cyan
Write-Host "  git branch -M main" -ForegroundColor Cyan
Write-Host "  git push -u origin main" -ForegroundColor Cyan
Write-Host ""

$addRemote = Read-Host "¿Tienes la URL del repositorio de GitHub? (S/N)"
if ($addRemote -eq "S" -or $addRemote -eq "s") {
    $repoUrl = Read-Host "Ingresa la URL del repositorio"
    git remote add origin $repoUrl
    git branch -M main
    Write-Host ""
    Write-Host "✓ Repositorio remoto configurado" -ForegroundColor Green
    Write-Host ""
    $pushNow = Read-Host "¿Quieres hacer push ahora? (S/N)"
    if ($pushNow -eq "S" -or $pushNow -eq "s") {
        git push -u origin main
        Write-Host "✓ Código subido a GitHub" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "¡Listo! Tu proyecto está conectado con GitHub." -ForegroundColor Green

