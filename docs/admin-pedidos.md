# Admin de pedidos (Reiki)

Stack compatible con el sitio actual:

- **Frontend:** Astro (página SPA en cliente) en `/admin/pedidos`
- **API:** Vercel Serverless (`api/checkout.js` router)
- **Datos:** Upstash Redis / Vercel KV (`checkout-order-store`)
- **PDF:** plantilla de cotización existente (`cotizacion-download`)

## Estructura

```
src/pages/admin/pedidos.astro          # Dashboard (login + kanban + modal)
data/admin-pedidos-mocks.json          # Datos demo solares
api/checkout.js                        # Router de acciones
api/_lib/admin-auth.js
api/_lib/handlers/orders-search.js
api/_lib/handlers/order-status.js
api/_lib/handlers/order-pdf.js
api/_lib/checkout-order-store.js
```

## Acceso

1. URL: https://reikisolar.com.co/admin/pedidos
2. Usuario: `admin` (o `ADMIN_ORDERS_USER`)
3. Contraseña: valor de `ADMIN_ORDERS_SECRET` en Vercel
4. Botón **Ver demo** carga mocks sin API

## Estados de gestión (`workflowStatus`)

- `nuevo` → columna Nuevo
- `en_revision` → En revisión
- `cerrado` → Cerrado

(Separado del estado de pago Wompi/Addi: `pending`, `approved`, etc.)
