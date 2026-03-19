# Script para crear usuario inicial
Write-Host "Creando usuario inicial..." -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:4000/api/auth/register"

$userData = @{
    email = "admin@reikisolar.com.co"
    password = "admin123"
    name = "Administrador"
} | ConvertTo-Json

try {
    Write-Host "Enviando solicitud al backend..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $userData -ContentType "application/json"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  USUARIO CREADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Email: admin@reikisolar.com.co" -ForegroundColor Cyan
    Write-Host "Contraseña: admin123" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ahora puedes iniciar sesión en:" -ForegroundColor Yellow
    Write-Host "  http://localhost:3000/login" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR al crear usuario:" -ForegroundColor Red
    $errorMessage = $_.Exception.Message
    Write-Host $errorMessage -ForegroundColor Red
    Write-Host ""
    
    if ($errorMessage -like "*ya existe*" -or $errorMessage -like "*already exists*") {
        Write-Host "El usuario ya existe. Puedes usar:" -ForegroundColor Yellow
        Write-Host "  Email: admin@reikisolar.com.co" -ForegroundColor Cyan
        Write-Host "  Contraseña: admin123" -ForegroundColor Cyan
    } else {
        Write-Host "Asegúrate de que el backend esté corriendo en http://localhost:4000" -ForegroundColor Yellow
    }
}



