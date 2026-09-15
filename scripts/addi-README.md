# Integración Addi (BNPL)

Checkout a cuotas vía API oficial de Addi.

## Flujo

1. Cliente elige **Addi** en `/carrito` e ingresa cédula.
2. El sitio llama `POST /api/addi-checkout`.
3. El servidor autentica (OAuth) y crea `POST …/v1/online-applications`.
4. El cliente es redirigido a Addi.
5. Addi notifica a `POST /api/addi-webhook` y regresa a `/respuesta-pago?gateway=addi&orderId=…`.

## Credenciales (obligatorias)

Addi las entrega al aliarte (no son públicas). Contacto típico: `integraciones@addi.com` o [Portal aliados](https://aliados.addi.com).

En `.env` / Vercel:

```env
ADDI_ENV=sandbox
ADDI_CLIENT_ID=tu_client_id
ADDI_CLIENT_SECRET=tu_client_secret
# Opcional:
# ADDI_SITE_URL=https://reikisolar.com.co
# ADDI_LOGO_URL=https://reikisolar.com.co/images/Addi.png
```

- Sandbox auth: `https://auth.addi-staging.com`
- Sandbox API: `https://api.addi-staging.com`
- Prod auth: `https://auth.addi.com`
- Prod API: `https://api.addi.com`

Docs: https://api-docs-sandbox.addi.com/

## Archivos

| Archivo | Rol |
|---|---|
| `api/addi-checkout.js` | Crea la solicitud y devuelve `redirectUrl` |
| `api/addi-webhook.js` | Recibe estados APPROVED/REJECTED/… |
| `api/_lib/addi.js` | OAuth + helpers |
| `src/pages/carrito.astro` | Selector Wompi / Addi |
| `src/pages/respuesta-pago.astro` | Retorno `?gateway=addi` |

## Probar

1. Pon `ADDI_CLIENT_ID` + `ADDI_CLIENT_SECRET` (sandbox).
2. `npm run dev` → carrito → elige Addi → Ir al pago.
3. Sin credenciales, la API responde `503 ADDI_NOT_CONFIGURED` (el UI muestra el error).
