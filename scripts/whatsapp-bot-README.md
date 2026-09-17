# Bot WhatsApp (Cloud API Meta) — Reiki Energía Solar

Asistente gratis (cupo Meta + tu Vercel): saluda, responde FAQ, captura leads de proyecto y te avisa para atender personalizado.

## Checklist Meta (hazlo una vez)

1. Entra a [developers.facebook.com](https://developers.facebook.com/) → **Crear app** → tipo **Business**.
2. Agrega el producto **WhatsApp** → **API Setup**.
3. En **Meta Business Suite** asocia un número (prueba de Meta o tu `312…` si lo migras a Cloud API).
4. Copia:
   - **Temporary / Permanent access token** → `WHATSAPP_ACCESS_TOKEN`
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
5. Inventa un verify token (ej. `reiki-wa-verify-2026`) → `WHATSAPP_VERIFY_TOKEN`
6. En la app → **Configuración** → **Básico** → **App secret** → `WHATSAPP_APP_SECRET`
7. Despliega el sitio en Vercel con las variables (abajo).
8. En WhatsApp → **Configuration** → Webhook:
   - Callback URL: `https://reikisolar.com.co/api/whatsapp-webhook`
   - Verify token: el mismo de `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete a: `messages`
9. Envía un mensaje de prueba al número Cloud API → debe responder el menú.

### Aviso de leads al celular (gratis)

Opcional pero recomendado: [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)  
Guarda `CALLMEBOT_API_KEY` y `WHATSAPP_OWNER_PHONE=573122435627`.  
Así te llega un WhatsApp cuando alguien pide proyecto o asesor.

## Variables (Vercel + `.env` local)

```env
WHATSAPP_VERIFY_TOKEN=elige_un_secreto
WHATSAPP_ACCESS_TOKEN=token_de_meta
WHATSAPP_PHONE_NUMBER_ID=id_del_numero
WHATSAPP_APP_SECRET=app_secret_meta
WHATSAPP_OWNER_PHONE=573122435627
WHATSAPP_SITE_URL=https://reikisolar.com.co
CALLMEBOT_API_KEY=opcional
```

## Qué hace el bot

| Entrada | Acción |
|---|---|
| Hola / menú | Menú: Tienda · Proyecto · FAQ · Asesor |
| Tienda | Link a `/tienda` |
| Proyecto | 4 preguntas (nombre, ciudad, tipo, consumo/factura) → te avisa |
| Asesor | Marca chat para humano + te avisa |
| `menu` | Reactiva el bot si estaba en modo humano |

Tras un lead de proyecto, el bot **deja de responder** ~12 h para que tú atiendas sin choque.

## Archivos

| Archivo | Rol |
|---|---|
| `api/whatsapp-webhook.js` | Webhook GET/POST |
| `api/_lib/whatsapp.js` | Envío Cloud API + CallMeBot |
| `api/_lib/whatsapp-bot.js` | Guion y sesiones |
| `scripts/lib/whatsapp-api-dev-plugin.mjs` | Local `astro dev` |

## Notas

- Volumen bajo: el cupo gratuito mensual de conversaciones de Meta suele bastar.
- El número de *prueba* de Meta solo escribe a números agregados en la consola; para producción verifica el negocio y usa tu línea.
- No subas tokens a git.
