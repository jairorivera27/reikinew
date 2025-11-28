# Script de prueba para el endpoint de WhatsApp
# Uso: .\test-whatsapp.ps1

$baseUrl = "http://localhost:4321"
$endpoint = "$baseUrl/api/whatsapp-notify"

$testData = @{
    nombre = "Cliente Prueba"
    telefono = "3001234567"
    email = "prueba@ejemplo.com"
    ciudad = "Bogota"
    consumoMensual = 150
    tarifa = 800
    paneles = 8
    potenciaSistema = 4.96
    ahorroMensual = 120000
    ahorroAnual = 1440000
    valorSistema = 18352000
    anosRecuperacion = 8.5
    tir = 0.12
}

Write-Host "Enviando prueba al endpoint de WhatsApp..." -ForegroundColor Cyan
Write-Host "Endpoint: $endpoint" -ForegroundColor Gray
Write-Host ""

try {
    # Convertir a JSON explícitamente
    $jsonBody = $testData | ConvertTo-Json -Depth 10 -Compress
    
    Write-Host "Enviando datos:" -ForegroundColor Gray
    Write-Host $jsonBody.Substring(0, [Math]::Min(200, $jsonBody.Length)) -ForegroundColor Gray
    Write-Host ""
    
    # Usar Invoke-RestMethod que maneja mejor el JSON
    $responseBody = Invoke-RestMethod -Uri $endpoint -Method POST -Body $jsonBody -ContentType "application/json; charset=utf-8" -ErrorAction Stop
    
    Write-Host "Respuesta del servidor:" -ForegroundColor Green
    $responseBody | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($responseBody.ok) {
        Write-Host ""
        Write-Host "Prueba exitosa! El mensaje deberia haberse enviado a tu WhatsApp." -ForegroundColor Green
        Write-Host "Metodo usado: $($responseBody.method)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Revisa tu WhatsApp (573022357757) para ver el mensaje de prueba." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "El servidor respondio pero puede haber un problema." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error al enviar la prueba:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host ""
        Write-Host "Asegurate de que:" -ForegroundColor Yellow
        Write-Host "   1. El servidor este corriendo (npm run dev)" -ForegroundColor Yellow
        Write-Host "   2. El servidor este en el puerto 4321" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host ""
        Write-Host "Revisa los logs del servidor para mas detalles." -ForegroundColor Yellow
    }
}

