# Configuración de Notificaciones Automáticas de WhatsApp

Este documento explica cómo configurar el envío automático de notificaciones a WhatsApp cuando alguien usa la calculadora solar.

## 🎯 ¿Qué hace esto?

Cuando un cliente completa el formulario de la calculadora solar y hace clic en "Calcular", automáticamente se envía un mensaje a tu WhatsApp con todos los datos del cliente **sin que el cliente se dé cuenta**.

## 📋 Opciones de Configuración

### Opción 1: CallMeBot (Recomendado - GRATIS) ⭐

CallMeBot es un servicio gratuito que permite enviar mensajes de WhatsApp automáticamente.

#### Pasos para configurar:

1. **Registra tu número de WhatsApp:**
   - Ve a: https://www.callmebot.com/blog/free-api-whatsapp-messages/
   - Envía un mensaje de WhatsApp a: **+34 644 44 33 22**
   - Con el texto exacto: `I allow callmebot to send me messages`
   - Espera la confirmación (puede tardar unos minutos)

2. **Obtén tu API Key:**
   - Después de recibir la confirmación, ve a la página de CallMeBot
   - Busca tu API key (será un código alfanumérico)
   - Copia tu API key

3. **Configura el archivo .env:**
   - Abre el archivo `.env` en la raíz del proyecto
   - Reemplaza `tu_api_key_aqui` con tu API key real:
   ```
   CALLMEBOT_API_KEY=TU_API_KEY_REAL_AQUI
   ```

4. **Reinicia el servidor:**
   - Si el servidor está corriendo, deténlo (Ctrl+C)
   - Inicia de nuevo: `npm run dev`

#### ✅ Verificación:
- Haz una prueba usando la calculadora solar
- Deberías recibir un mensaje en tu WhatsApp con los datos del cliente

---

### Opción 2: Webhook Personalizado

Si tienes un webhook configurado (IFTTT, Zapier, Make.com, etc.), puedes usarlo.

1. **Obtén la URL de tu webhook:**
   - Configura un webhook en tu servicio preferido
   - Copia la URL del webhook

2. **Configura el archivo .env:**
   ```
   WHATSAPP_WEBHOOK_URL=https://tu-webhook-url.com
   ```

3. **Formato del webhook:**
   El webhook recibirá un POST con este formato:
   ```json
   {
     "phone": "573245737413",
     "message": "Mensaje formateado...",
     "data": {
       "nombre": "...",
       "telefono": "...",
       "email": "...",
       ...
     }
   }
   ```

---

### Opción 3: Twilio (Requiere cuenta de pago)

Si tienes una cuenta de Twilio con WhatsApp Business API:

1. **Obtén tus credenciales de Twilio:**
   - Account SID
   - Auth Token
   - Número de WhatsApp (formato: `whatsapp:+14155238886`)

2. **Configura el archivo .env:**
   ```
   TWILIO_ACCOUNT_SID=tu_account_sid
   TWILIO_AUTH_TOKEN=tu_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

3. **Descomenta el código de Twilio en:**
   `src/pages/api/whatsapp-notify.ts`

---

## 🔧 Solución de Problemas

### No recibo mensajes

1. **Verifica que el archivo .env existe:**
   - Debe estar en la raíz del proyecto
   - No debe tener espacios extra en las variables

2. **Verifica que reiniciaste el servidor:**
   - Las variables de entorno solo se cargan al iniciar el servidor

3. **Revisa los logs del servidor:**
   - Si hay errores, aparecerán en la consola del servidor
   - Busca mensajes que digan "Error con CallMeBot" o similar

4. **Para CallMeBot:**
   - Asegúrate de haber enviado el mensaje de confirmación correctamente
   - Verifica que tu API key sea correcta
   - Prueba enviar un mensaje manual usando la API de CallMeBot

### El mensaje no se envía pero no hay errores

- Por defecto, si no hay ningún servicio configurado, los datos se registran en los logs del servidor
- Revisa la consola del servidor para ver los datos registrados
- Esto es útil para debugging

---

## 📝 Notas Importantes

- **Privacidad:** El envío es completamente silencioso, el cliente no se da cuenta
- **Seguridad:** El archivo `.env` está en `.gitignore` y no se sube a Git
- **Fallback:** Si ningún servicio está configurado, los datos se registran en logs del servidor
- **Límites:** CallMeBot tiene límites de uso (consulta su documentación)

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica que las variables de entorno estén correctamente configuradas
3. Prueba con un servicio diferente (webhook, Twilio, etc.)


