# Medidas de Seguridad Implementadas

Este documento describe las medidas de seguridad implementadas en el cotizador solar.

## 1. Autenticación Segura

- **Endpoint de autenticación**: `/api/auth` con validación de credenciales en el servidor
- **Rate limiting**: Máximo 5 intentos fallidos, bloqueo de 15 minutos
- **Tokens de sesión**: Tokens únicos generados con `crypto.randomBytes`
- **Expiración de sesión**: Sesiones expiran después de 8 horas
- **Validación de sesión**: Verificación de token antes de cada operación

## 2. Protección contra XSS (Cross-Site Scripting)

- **Sanitización de HTML**: Función `escapeHTML()` para escapar caracteres peligrosos
- **Sanitización de HTML con tags seguros**: Función `sanitizeHTML()` que permite solo tags seguros
- **Validación de scripts**: Función `containsScript()` para detectar intentos de inyección
- **Uso de `textContent`**: Preferencia por `textContent` sobre `innerHTML` cuando es posible
- **Event listeners seguros**: Uso de `addEventListener` en lugar de atributos `onclick` inline

## 3. Validación y Sanitización de Inputs

- **Sanitización de strings**: Función `sanitizeString()` que limita longitud y remueve caracteres peligrosos
- **Validación de email**: Expresión regular para validar formato de email
- **Validación de teléfono**: Expresión regular para validar formato de teléfono (7-15 dígitos)
- **Validación de números**: Función `validatePositiveNumber()` para validar números positivos
- **Validación de porcentajes**: Función `validatePercentage()` para validar rangos 0-100
- **Validación de nombres**: Función `validateName()` para validar nombres con caracteres permitidos

## 4. Headers de Seguridad

- **X-Content-Type-Options**: `nosniff` - Previene MIME type sniffing
- **X-Frame-Options**: `DENY` - Previene clickjacking
- **X-XSS-Protection**: `1; mode=block` - Habilita protección XSS del navegador
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controla información del referrer
- **Permissions-Policy**: Restringe geolocalización, micrófono y cámara
- **Strict-Transport-Security**: `max-age=31536000` - Fuerza HTTPS
- **Content-Security-Policy**: Política estricta que solo permite recursos de fuentes confiables

## 5. Rate Limiting

- **Cliente**: Rate limiting básico en el navegador (5 intentos, 15 minutos)
- **Servidor**: Rate limiting en el endpoint `/api/auth` basado en IP
- **Bloqueo automático**: Bloqueo temporal después de múltiples intentos fallidos

## 6. Protección de Datos Sensibles

- **Credenciales en variables de entorno**: Las credenciales no están hardcodeadas en el código
- **Sanitización de datos antes de almacenar**: Todos los datos se sanitizan antes de guardar en `localStorage`
- **Expiración de sesión**: Las sesiones expiran automáticamente

## 7. Validación de Sesión

- **Verificación de token**: Cada operación verifica que exista un token de sesión válido
- **Expiración automática**: Las sesiones expiradas se detectan y se fuerza el cierre de sesión
- **Limpieza de datos**: Los datos de sesión se limpian al cerrar sesión

## Variables de Entorno

Crear un archivo `.env` con las siguientes variables:

```env
COTIZADOR_USERNAME=Jairo Alexander Rivera
COTIZADOR_PASSWORD=Reiki99193*
COTIZADOR_PASSWORD_HASH=<hash_sha256_de_la_contraseña>
```

## Recomendaciones Adicionales

1. **HTTPS**: Asegurar que el sitio siempre use HTTPS en producción
2. **Backup de datos**: Implementar backups regulares de las cotizaciones
3. **Logs de seguridad**: Monitorear intentos de acceso fallidos
4. **Actualizaciones**: Mantener todas las dependencias actualizadas
5. **Auditorías**: Realizar auditorías de seguridad periódicas

## Notas de Implementación

- El middleware de seguridad se aplica automáticamente a todas las rutas
- Las funciones de sanitización están disponibles globalmente en el cliente
- El rate limiting funciona tanto en cliente como en servidor
- Los headers de seguridad se agregan automáticamente a todas las respuestas

