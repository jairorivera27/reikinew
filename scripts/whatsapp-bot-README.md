# Bot WhatsApp (Cloud API Meta) — Reiki Energía Solar

Asesor comercial en WhatsApp: tono natural, cotización, tienda y handoff a humano.

**Número:** `+57 300 405 2638` · **Phone number ID:** `1372559729264279`  
Webhook: `https://reikisolar.com.co/api/whatsapp-webhook`

## Modos

1. **Con OpenAI (recomendado)** — conversación natural (GPT), tools:
   - `buscar_producto_tienda` → catálogo real (`data/whatsapp-product-index.json`)
   - `recomendar_proyecto_solar` → orientación de sistema
   - `escalar_a_humano` → CallMeBot a tu celular + pausa IA
2. **Sin OpenAI** — flujo por reglas (menús + captura nombre/ciudad) como respaldo.

## Variables (Vercel Production + Preview)

```env
WHATSAPP_VERIFY_TOKEN=reiki-wa-2026
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=1372559729264279
WHATSAPP_APP_SECRET=
WHATSAPP_OWNER_PHONE=573245737413
WHATSAPP_SITE_URL=https://reikisolar.com.co
CALLMEBOT_API_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Plantilla: [`.env.whatsapp.example`](../.env.whatsapp.example)

Tras cambiar env: **Redeploy**.

## CallMeBot (aviso de leads)

1. Activa en tu celular personal con **+34 623 78 95 80**
2. Si está pausado: envía `resume` al número que indique CallMeBot
3. `WHATSAPP_OWNER_PHONE` = tu personal (ej. `573245737413`), no el 300 de la empresa

## Archivos

| Archivo | Rol |
|---|---|
| `api/whatsapp-webhook.js` | Webhook Meta |
| `api/_lib/whatsapp.js` | Envío Graph + CallMeBot |
| `api/_lib/whatsapp-bot.js` | Orquestación (IA + reglas) |
| `api/_lib/whatsapp-ai.js` | OpenAI + function calling |
| `api/_lib/whatsapp-catalog.js` | Búsqueda / recomendación |
| `api/_lib/whatsapp-session.js` | Sesión anti-cruces nombre/ciudad |
| `api/_lib/whatsapp-solar-kb.js` | Tips (fallback sin IA) |
| `data/whatsapp-product-index.json` | Índice tienda |
| `scripts/build-whatsapp-product-index.mjs` | Regenerar índice |

Regenerar índice tras cambios grandes de catálogo:

```bash
node scripts/build-whatsapp-product-index.mjs
```

## Prueba

1. `hola` al 300… → saludo natural (con IA) o menú (sin IA)
2. Pedir un panel/inversor → link real de `/tienda/...`
3. Pedir asesor → mensaje a tu celular vía CallMeBot
