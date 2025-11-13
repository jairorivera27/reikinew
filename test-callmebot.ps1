# Script para probar directamente la API de CallMeBot
# Esto ayuda a verificar si la configuración es correcta

$apiKey = "5415200"
$phoneNumber = "573245737413"
$testMessage = "Prueba de CallMeBot desde la calculadora solar - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Host "=== PRUEBA DIRECTA DE CALLMEBOT ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Key: $apiKey" -ForegroundColor Gray
Write-Host "Número destino: +$phoneNumber" -ForegroundColor Gray
Write-Host "Mensaje: $testMessage" -ForegroundColor Gray
Write-Host ""

# Construir URL de CallMeBot
$encodedMessage = [System.Web.HttpUtility]::UrlEncode($testMessage)
$url = "https://api.callmebot.com/whatsapp.php?phone=$phoneNumber" + "&text=$encodedMessage" + "&apikey=$apiKey"

Write-Host "URL completa:" -ForegroundColor Yellow
Write-Host $url -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "Enviando mensaje..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ Respuesta recibida:" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "Contenido: $($response.Content)" -ForegroundColor Gray
    
    if ($response.Content -match "Message sent" -or $response.Content -match "OK") {
        Write-Host ""
        Write-Host "✅ ¡ÉXITO! El mensaje debería haberse enviado a tu WhatsApp." -ForegroundColor Green
        Write-Host "Revisa tu WhatsApp (+$phoneNumber) para confirmar." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "⚠️ La respuesta no indica éxito. Revisa el contenido arriba." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error al enviar:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Respuesta del servidor: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== FIN DE LA PRUEBA ===" -ForegroundColor Cyan

