# Bot WhatsApp (Cloud API Meta) — Reiki Energía Solar

Asesor comercial en WhatsApp: Claude + tools, catálogo real, handoff a ingeniero.

**Número bot/tienda:** `+57 300 405 2638` · **Phone number ID:** `1372559729264279`  
**Atención personalizada (ingeniero / comprobantes):** `+57 324 573 7413`  
Webhook: `https://reikisolar.com.co/api/whatsapp-webhook`

## Modos

1. **Con Claude (recomendado)** — `ANTHROPIC_API_KEY` + Messages API + tool use:
   - `buscar_producto_tienda` → catálogo (`data/whatsapp-product-index.json`) + link exacto
   - `recomendar_proyecto_solar` → orientación de sistema
   - `escalar_a_humano` → pausa + CallMeBot a `PERSONAL_PHONE_NUMBER` + opcional `LEADS_WEBHOOK_URL`
2. **Sin Claude** — flujo por reglas (menús + captura nombre/ciudad) como respaldo.
3. **Audios** — si hay `OPENAI_API_KEY`, Whisper; si no, pide texto.

## Variables (Vercel Production + Preview)

```env
WHATSAPP_VERIFY_TOKEN=reiki-wa-2026
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=1372559729264279
WHATSAPP_APP_SECRET=
PERSONAL_PHONE_NUMBER=573245737413
WHATSAPP_OWNER_PHONE=573245737413
ATTENTION_WHATSAPP=573245737413
WHATSAPP_SITE_URL=https://reikisolar.com.co
CALLMEBOT_API_KEY=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5
# Alternativa: claude-haiku-4-5-20251001

OPENAI_API_KEY=
HUMAN_MODE_HOURS=12

# Upstash / Vercel KV — token de ESCRITURA (no el READ_ONLY)
KV_REST_API_URL=
KV_REST_API_TOKEN=

LEADS_WEBHOOK_URL=
```

Plantilla: [`.env.whatsapp.example`](../.env.whatsapp.example)

Tras cambiar env: **Redeploy**.

## Persistencia (Upstash / Vercel KV)

Obligatorio en producción: `KV_REST_API_URL` + **`KV_REST_API_TOKEN`** (escritura).  
Sirve para: sesiones (nombre/ciudad), historial Claude, pausa humana, `message.id` (idempotencia 48 h) y lock por usuario (20 s).

Sin el token de escritura, cada instancia de Vercel ve una sesión distinta y se cruzan los datos.

## CallMeBot (aviso de leads)

1. Activa en tu celular personal con **+34 623 78 95 80**
2. Si está pausado: envía `resume` al número que indique CallMeBot
3. `PERSONAL_PHONE_NUMBER` = tu personal (ej. `573245737413`), no el 300 de la empresa

## Archivos (Fase 1)

| Archivo | Rol |
|---|---|
| `api/whatsapp-webhook.js` | Webhook Meta |
| `api/_lib/whatsapp.js` | Graph + CallMeBot + `LEADS_WEBHOOK_URL` |
| `api/_lib/whatsapp-bot.js` | Orquestación (IA + reglas) |
| `api/_lib/whatsapp-ai.js` | Claude + tools + historial Redis |
| `api/_lib/whatsapp-redis.js` | Cliente Upstash |
| `api/_lib/whatsapp-atencion.js` | Teléfono ingeniero (runtime) |
| `src/config/atencion.ts` | Teléfono ingeniero (site) |
| `data/reiki-knowledge.md` | Base de conocimiento (prompt cache) |
| `api/_lib/whatsapp-catalog.js` | Búsqueda / recomendación |
| `api/_lib/whatsapp-session.js` | Sesión anti-cruces |
| `data/whatsapp-product-index.json` | Índice tienda |

```bash
node scripts/build-whatsapp-product-index.mjs
```

## Modo humano

Tras derivar, el bot se pausa `HUMAN_MODE_HOURS` (default 12).  
**"hola" no reactiva.** Escribe *menú* o *bot* (o espera a que venza la pausa).

Durante la pausa: **un solo aviso** (Redis `pause_notice`) con botón "Escribir al ingeniero"; el resto de mensajes → silencio.

## Horario hábil (cierre de handoff)

Fuera de lun–sáb 8–18 Bogotá, el cierre dice "a partir de las 8:00 del …" en vez de "muy pronto".

```env
BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18
BUSINESS_DAYS=1,2,3,4,5,6
```

## Prueba Fase 2

1. Pedir ingeniero → habeas data (una vez) → nombre → ciudad → resumen → CTA "Escribir al ingeniero" + timing según horario
2. Escribir cualquier cosa en pausa → **un** aviso con botón; segundo mensaje → nada
3. `hola` en pausa → no reactiva; `menú` → sí
4. Enviar foto/audio → "¡Recibido! 📎…" (no reinicia a menú)
5. Equipo/precio de tienda → el bot responde sin derivar

## Prueba Fase 1

1. Configura en Vercel: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-5`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` → Redeploy
2. `hola` al 300… → bienvenida fija (sin "dejar de pagar luz")
3. "tienen paneles de 550?" → link real de `/tienda/...`
4. Pedir ingeniero → nombre → ciudad → (celular si iOS oculto) → resumen → CallMeBot + pausa
5. Sin Redis/token de escritura: el bot sigue, pero el historial queda solo en memoria del proceso
