# Bot WhatsApp + cotizaciones PDF — Reiki Energía Solar

Documentación operativa del bot híbrido (reglas + Claude Haiku), cotizaciones PDF y cierre de compra.

**Número bot/tienda:** `+57 300 405 2638`  
**Atención personalizada (ingeniero / comprobantes):** `+57 324 573 7413`  
**Webhook Meta:** `https://reikisolar.com.co/api/whatsapp-webhook`

---

## Variables de entorno (Vercel → Production)

### WhatsApp Cloud API
| Variable | Uso |
|----------|-----|
| `WHATSAPP_VERIFY_TOKEN` | Challenge GET del webhook |
| `WHATSAPP_ACCESS_TOKEN` | Token permanente Graph API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número 300… |
| `WHATSAPP_APP_SECRET` | Firma `X-Hub-Signature-256` |
| `WHATSAPP_SITE_URL` | Base HTTPS del sitio (links PDF/carrito), ej. `https://reikisolar.com.co` |
| `PERSONAL_PHONE_NUMBER` / `WHATSAPP_OWNER_PHONE` | Celular dueño para CallMeBot / avisos (ej. `573245737413`) |
| `ATTENTION_WHATSAPP` | Opcional; default atención `573245737413` |
| `CALLMEBOT_API_KEY` | Avisos al dueño |
| `LEADS_WEBHOOK_URL` | POST JSON de leads (Apps Script / Sheets) |
| `HUMAN_MODE_HOURS` | Pausa bot tras handoff/compra (default 12) |

### Redis (Upstash / Vercel KV) — obligatorio en prod
| Variable | Uso |
|----------|-----|
| `KV_REST_API_URL` | URL REST |
| `KV_REST_API_TOKEN` | Token de **escritura** (no el READ_ONLY) |

Guarda: sesiones, carritos, cotizaciones, consecutivo CT, historial IA, pausas, idempotencia `message.id`, log IA, locks.

### Claude / presupuesto IA
| Variable | Uso |
|----------|-----|
| `ANTHROPIC_API_KEY` | Messages API |
| `ANTHROPIC_MODEL` | Default `claude-haiku-4-5-20251001` |
| `AI_DAILY_LIMIT_PER_USER` | Default 15 |
| `AI_MONTHLY_BUDGET_USD` | Default 5 |
| `ADMIN_KEY` | Protege endpoints de uso/log |
| `OPENAI_API_KEY` | Solo Whisper (audios), opcional |

### Wompi
| Variable | Uso |
|----------|-----|
| `PUBLIC_WOMPI_KEY` / build | Widget checkout (`pub_prod_…` / `pub_test_…`) |
| `WOMPI_PRIVATE_KEY` | `prv_…` — consultar transacciones y confirmar pagos |
| `WOMPI_EVENTS_SECRET` | **Secreto de eventos** del dashboard (≠ prv/pub) — firma del webhook |

### Cotizaciones
| Variable | Uso |
|----------|-----|
| `QUOTE_PREFIX` | Prefijo del número (default `CT`) |

### Horario
| Variable | Uso |
|----------|-----|
| `BUSINESS_HOURS_START` | Default 8 |
| `BUSINESS_HOURS_END` | Default 18 |
| `BUSINESS_DAYS` | Default `1,2,3,4,5,6` (lun–sáb). Festivos CO 2026–2027 se excluyen siempre. |

---

## Gasto y log de la IA

- **Uso / presupuesto:**  
  `GET https://reikisolar.com.co/api/whatsapp-ai-usage?key=ADMIN_KEY`
- **Log de Q&A (sin teléfono ni nombre, últimos 200, TTL 30 d):**  
  `GET https://reikisolar.com.co/api/whatsapp-ai-usage?key=ADMIN_KEY&log=1`  
  Opcional: `&limit=50`

Cada respuesta IA guarda: fecha, pregunta, respuesta, tools usadas.

---

## Pruebas de intención (corren en cada `npm run build`)

Script: `scripts/test-whatsapp-intents.mjs`  
Lógica: `api/_lib/whatsapp-intent.js`

```bash
npm run test:intents
```

### Cómo agregar frases

1. Abre `scripts/test-whatsapp-intents.mjs`.
2. Añade un caso al array `CASES`:

```js
{ text: 'mi frase de prueba', expect: 'ahorro' },
// o con carrito/cotización:
{ text: 'lo quiero', expect: 'compra', hasCartOrQuote: true },
```

Valores de `expect`: `ingeniero` | `ahorro` | `respaldo` | `compra` | `pagar` | `ambiguo_pago` | `catalogo` | `ia`.

3. Si la frase debe mapear a una intención nueva, ajusta las funciones en `api/_lib/whatsapp-intent.js` (orden: ingeniero → ahorro → respaldo → compra → pagar → catálogo → IA).
4. Corre `npm run test:intents` antes de desplegar.

---

## Cotizaciones PDF y carrito

- Generación: Playwright + `@sparticuz/chromium` en `/api/cotizacion-pdf` y `/api/cotizacion-download` (memory 1769, 60 s).
- Descarga: `/cotizacion/{id}.pdf?t={token}` (sin token → 404).
- Compra web: `/carrito?cot={id}&t={token}` (precios congelados; si venció, aviso + precios de catálogo).
- Datos empresa / banco / Bre-B / atención: **`config/empresa.json`** (ver abajo).
- Assets estáticos: `public/cotizacion/` (logo, Montserrat, Wompi/Addi, **`qr-breb.png` sin regenerar**).

### Cómo cambiar banco, llave Bre-B o número de atención

Edita `config/empresa.json`:

```json
{
  "banco": {
    "nombre": "Bancolombia",
    "tipo": "ahorros",
    "numero": "36600008477",
    "llave_breb": "0089262235"
  },
  "atencion": {
    "telefono": "+57 324 573 7413",
    "whatsapp_url": "https://wa.me/573245737413"
  },
  "telefono": "+57 300 405 2638"
}
```

- El **QR Bre-B** es el archivo fijo `public/cotizacion/qr-breb.png` (no se regenera).
- Teléfono de atención en mensajes del bot: también `api/_lib/whatsapp-atencion.js` (`ATTENTION_PHONE_DISPLAY`) y/o env `ATTENTION_WHATSAPP`.
- Tras cambiar JSON: **redeploy** (se incluye con `includeFiles` en las funciones PDF).

Celulares en PDF/avisos usan `formatPhoneCO()` → `+57 324 573 7413`.

---

## Wompi — seguridad de pagos

1. **`/respuesta-pago` no marca `pagada_online` por sí sola.** Solo llama a  
   `POST /api/wompi-confirm-pago` con `{ "id": "<transactionId>" }`.  
   El servidor hace `GET /v1/transactions/{id}` con `WOMPI_PRIVATE_KEY` y solo marca si:
   - `status === APPROVED`
   - referencia `cot-{id}-…` (o índice Redis)
   - `amount_in_cents === total_cotización × 100`

2. **Webhook de eventos** (recomendado):

   - **URL a registrar en el panel Wompi**  
     (Mi cuenta → Desarrolladores / Eventos):  
     **`https://reikisolar.com.co/api/wompi-events`**  
     (si el sitio canónico es www: `https://www.reikisolar.com.co/api/wompi-events`)

   - **Variable a crear en Vercel:**  
     **`WOMPI_EVENTS_SECRET`** = “Secreto de eventos” del dashboard  
     (sección Secretos de integración técnica; **no** es `prv_` ni `pub_`).

   - Sin firma válida (`signature.checksum` / header `X-Event-Checksum`) → **401**.
   - También verifica el monto. El aviso al dueño es **idempotente** (`ownerNotifiedPagada`).

---

## Precios del bot al día

En cada build:

```text
npm run build
  → node scripts/test-whatsapp-intents.mjs
  → node scripts/build-whatsapp-product-index.mjs   # lee src/content/productos/*.md
  → astro build
```

El índice queda en `data/whatsapp-product-index.json` e incluye la función webhook.

---

## Orden de reglas del bot (sin IA)

1. Ingeniero  
2. Ahorro (factura/luz — nunca métodos de pago)  
3. Respaldo / compra (`lo quiero` solo con carrito o cotización)  
4. Pagar (estricto)  
5. Catálogo  
6. IA (texto libre con cupo)

---

## Smoke checklist

1. `hola` al 300… → bienvenida + **Bajar mi factura** + lista con **Ver equipos**  
2. `estoy cansado de pagar energía` → flujo ahorro (no QR Bre-B)  
3. Agregar equipo → Generar PDF → `lo quiero` → link compra + Bre-B + modo humano  
4. Abrir link del PDF `/carrito?cot=&t=` → Wompi/Addi  
5. `GET /api/whatsapp-ai-usage?key=…&log=1`

---

## Archivos clave

| Ruta | Rol |
|------|-----|
| `api/whatsapp-webhook.js` | Entrada Meta |
| `api/_lib/whatsapp-bot.js` | Orquestación reglas |
| `api/_lib/whatsapp-intent.js` | Clasificación de intenciones |
| `api/_lib/whatsapp-cart.js` | Carrito + PDF + compra WA |
| `api/_lib/cotizacion-*.js` | Store / HTML / PDF |
| `api/wompi-events.js` | Webhook firmado |
| `api/wompi-confirm-pago.js` | Confirmación server-side |
| `config/empresa.json` | Empresa, banco, Bre-B, atención |
| `scripts/test-whatsapp-intents.mjs` | Pruebas en cada deploy |
