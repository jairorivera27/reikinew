# Bot WhatsApp (Cloud API Meta) — Reiki Energía Solar

Asistente gratis (cupo Meta + tu Vercel): saluda, responde FAQ, captura leads de proyecto y te avisa para atender personalizado.

**Número de producción:** `+57 300 405 2638` (`573004052638`)  
**Phone number ID:** `1372559729264279`  
Webhook: `https://reikisolar.com.co/api/whatsapp-webhook`

## Checklist Meta (hazlo una vez)

1. [developers.facebook.com](https://developers.facebook.com/) → app Business → caso de uso **WhatsApp**.
2. **Paso 1** (prueba) o **Paso 2** (producción): token + Phone number ID.
3. En producción: registrar el número real (`300…`), activar **Suscribir webhooks**, callback:
   - URL: `https://reikisolar.com.co/api/whatsapp-webhook`
   - Verify token: el mismo de `WHATSAPP_VERIFY_TOKEN` (ej. `reiki-wa-2026`)
   - Campo: `messages`
4. App → **Configuración** → **Básico** → **App secret** → `WHATSAPP_APP_SECRET`
5. Cargar variables en Vercel (Production + Preview) y **redeploy**.
6. Escribe `hola` al `+57 300 405 2638` desde otro celular → menú del bot.

### Aviso de leads al celular (gratis)

Opcional: [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)  
Guarda `CALLMEBOT_API_KEY` y `WHATSAPP_OWNER_PHONE=573004052638`.

## Variables (Vercel + `.env` local)

```env
WHATSAPP_VERIFY_TOKEN=reiki-wa-2026
WHATSAPP_ACCESS_TOKEN=token_de_meta
WHATSAPP_PHONE_NUMBER_ID=1372559729264279
WHATSAPP_APP_SECRET=app_secret_meta
WHATSAPP_OWNER_PHONE=573004052638
WHATSAPP_SITE_URL=https://reikisolar.com.co
CALLMEBOT_API_KEY=opcional
```

El teléfono público del sitio vive en `src/config/contact.ts` (`CONTACT_PHONE_*` / `CONTACT_WHATSAPP_URL`).

## Qué hace el bot (asesor comercial)

Prioridad: *asesorar* → calificar necesidad → cerrar a cotización / tienda / humano.

| Entrada | Acción |
|---|---|
| Hola / menú | Menú consultivo: ahorro · respaldo · finca · cotizar · tienda · aprender · asesor |
| Objetivo (ahorro/respaldo/finca) | Descubrimiento 5 preguntas + lead al dueño |
| Texto libre (panel, batería, factura…) | Tip experto desde `api/_lib/whatsapp-solar-kb.js` + CTA de venta |
| Cotizar / proyecto | Mismo flujo de descubrimiento |
| Tienda | Guía + link `/tienda` (sin forzar si aún no está claro el sistema) |
| Asesor | Handoff humano ~12 h |
| `menu` | Reactiva el bot |

Para “reentrenar”: añade keywords/respuestas en `whatsapp-solar-kb.js` y redespliega. Los intents no reconocidos quedan en logs Vercel (`unmatched intent`).

## Archivos

| Archivo | Rol |
|---|---|
| `api/whatsapp-webhook.js` | Webhook GET/POST |
| `api/_lib/whatsapp.js` | Envío Cloud API + CallMeBot |
| `api/_lib/whatsapp-bot.js` | Flujo comercial consultivo |
| `api/_lib/whatsapp-solar-kb.js` | Base de conocimiento solar (ampliable) |
| `scripts/lib/whatsapp-api-dev-plugin.mjs` | Local `astro dev` |

## Notas

- El token temporal de Meta caduca; conviene System User (token permanente).
- No subas tokens a git (`.env` está en `.gitignore`).
