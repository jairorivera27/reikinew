# Script para verificar la conexion con GitHub
Write-Host "=== Verificacion de Repositorio GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verificar Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git no esta instalado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verificar si es un repositorio Git
if (Test-Path .git) {
    Write-Host "[OK] Repositorio Git inicializado" -ForegroundColor Green
    
    # Verificar configuracion de usuario
    Write-Host ""
    Write-Host "Configuracion de Git:" -ForegroundColor Yellow
    $userName = git config user.name
    $userEmail = git config user.email
    
    if ($userName) {
        Write-Host "  Nombre: $userName" -ForegroundColor White
    } else {
        Write-Host "  [ADVERTENCIA] Nombre no configurado" -ForegroundColor Yellow
    }
    
    if ($userEmail) {
        Write-Host "  Email:  $userEmail" -ForegroundColor White
    } else {
        Write-Host "  [ADVERTENCIA] Email no configurado" -ForegroundColor Yellow
    }
    
    # Verificar remoto
    Write-Host ""
    Write-Host "Conexion con GitHub:" -ForegroundColor Yellow
    $remotes = git remote -v 2>&1
    
    if ($remotes -match "origin") {
        Write-Host "[OK] Repositorio remoto configurado:" -ForegroundColor Green
        $remotes | ForEach-Object {
            if ($_ -match "origin") {
                Write-Host "  $_" -ForegroundColor White
            }
        }
        
        # Verificar conexion
        Write-Host ""
        Write-Host "Verificando conexion con GitHub..." -ForegroundColor Yellow
        $remoteUrl = git remote get-url origin 2>&1
        
        if ($remoteUrl -match "github.com") {
            Write-Host "[OK] URL de GitHub detectada: $remoteUrl" -ForegroundColor Green
            
            # Intentar verificar si el remoto es accesible
            Write-Host ""
            Write-Host "Probando conexion..." -ForegroundColor Yellow
            $fetchTest = git ls-remote --heads origin 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Conexion exitosa con GitHub" -ForegroundColor Green
                Write-Host ""
                Write-Host "Ramas disponibles en GitHub:" -ForegroundColor Cyan
                $fetchTest | Select-String -Pattern "refs/heads/" | ForEach-Object {
                    $branch = $_ -replace ".*refs/heads/", ""
                    Write-Host "  - $branch" -ForegroundColor White
                }
            } else {
                Write-Host "[ADVERTENCIA] No se pudo conectar con GitHub" -ForegroundColor Yellow
                Write-Host "  Puede ser un problema de autenticacion" -ForegroundColor Gray
                Write-Host "  Verifica tu Personal Access Token" -ForegroundColor Gray
            }
        } else {
            Write-Host "[ADVERTENCIA] El remoto no parece ser de GitHub" -ForegroundColor Yellow
            Write-Host "  URL: $remoteUrl" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] No hay repositorio remoto configurado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Para conectar con GitHub:" -ForegroundColor Yellow
        Write-Host "  1. Crea un repositorio en GitHub" -ForegroundColor White
        Write-Host "  2. Ejecuta: git remote add origin URL_DE_TU_REPOSITORIO" -ForegroundColor Cyan
        Write-Host "  3. Ejecuta: git push -u origin main" -ForegroundColor Cyan
    }
    
    # Verificar estado del repositorio
    Write-Host ""
    Write-Host "Estado del repositorio:" -ForegroundColor Yellow
    $status = git status --short 2>&1
    
    if ($status) {
        Write-Host "[ADVERTENCIA] Hay cambios sin commitear:" -ForegroundColor Yellow
        $status | ForEach-Object {
            Write-Host "  $_" -ForegroundColor White
        }
    } else {
        $branch = git branch --show-current 2>&1
        $upstream = git rev-parse --abbrev-ref '@{u}' 2>&1
        if ($LASTEXITCODE -eq 0 -and $upstream) {
            $commitsAhead = git rev-list --count "$upstream..HEAD" 2>&1
            $commitsBehind = git rev-list --count "HEAD..$upstream" 2>&1
        } else {
            $commitsAhead = ""
            $commitsBehind = ""
        }
        
        if ($commitsAhead -match "^\d+$") {
            Write-Host "  Rama actual: $branch" -ForegroundColor White
            if ([int]$commitsAhead -gt 0) {
                Write-Host "  [ADVERTENCIA] $commitsAhead commit(s) por subir" -ForegroundColor Yellow
            }
            if ($commitsBehind -match "^\d+$" -and [int]$commitsBehind -gt 0) {
                Write-Host "  [ADVERTENCIA] $commitsBehind commit(s) por actualizar" -ForegroundColor Yellow
            }
            if ($commitsAhead -match "^\d+$" -and [int]$commitsAhead -eq 0 -and ($commitsBehind -notmatch "^\d+$" -or [int]$commitsBehind -eq 0)) {
                Write-Host "  [OK] Todo esta sincronizado" -ForegroundColor Green
            }
        } else {
            Write-Host "  Rama actual: $branch" -ForegroundColor White
            Write-Host "  [INFO] No hay rama remota configurada" -ForegroundColor Gray
        }
    }
    
} else {
    Write-Host "[ERROR] Este directorio no es un repositorio Git" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para inicializar el repositorio:" -ForegroundColor Yellow
    Write-Host "  1. Ejecuta: .\setup-github.ps1" -ForegroundColor Cyan
    Write-Host "  2. O manualmente:" -ForegroundColor Cyan
    Write-Host "     git init" -ForegroundColor White
    Write-Host "     git add ." -ForegroundColor White
    Write-Host "     git commit -m 'Initial commit'" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Fin de la verificacion ===" -ForegroundColor Cyan
Write-Host ""
