# Seguimiento de compras y proyectos (panel /admin/pedidos)

El panel tiene tres pestañas:

- **Compras en tienda**: ventas de equipos sin instalación. Los pedidos web pagados (Wompi/Addi) entran solos.
- **Proyectos**: instalaciones solares.
- **Pedidos web (carrito)**: la bandeja original de checkouts, incluidos los no pagados.

Cada venta aprobada es un *expediente* con cliente, equipos (con proveedor), pagos, envío, factura y etapas.

## API

`/api/seguimiento?op=…` (vive dentro de `api/checkout.js` por el límite de 12 funciones del plan Hobby).

Autorización: `Authorization: Bearer <ADMIN_ORDERS_SECRET>` (panel) o `Bearer <CLAUDE_AGENT_TOKEN>` (asistente Claude; los cambios quedan firmados como "claude" en el historial).

| Método | op | Cuerpo / parámetros |
|---|---|---|
| GET | `list` | — Devuelve expedientes con `resumen` (pagos, avance, siguiente paso, proveedores) y las plantillas de etapas. |
| GET | `get` | `id` |
| GET | `revision` | `marcar=1` marca los nuevos como notificados. Devuelve `nuevos`, `activos` y `alertas`. |
| POST | `save` | `{ id?, tipo: 'tienda'|'proyecto', titulo, cliente:{nombre,documento,correo,celular,ciudad,direccion}, cotizacion:{numero,fecha,url}, total, condicionesPago, items:[{nombre,sku,cantidad,precioUnit,proveedor}], pagos, envio:{transportadora,guia}, factura:{numero}, notas, estado: activo|cerrado|cancelado }` |
| POST | `etapa` | `{ id, key, estado: pendiente|en_curso|hecho|no_aplica, nota }` |
| POST | `pago` | `{ id, pago:{ monto, fecha, medio, referencia, estado: verificado|por_verificar } }` |

El proveedor de cada equipo se toma de `data/proveedores-tienda.json` (Lista Interna) por SKU/slug o título; si no aparece queda "Por confirmar".

Las etapas y su texto de ayuda están en `api/_lib/seguimiento.js` (`PLANTILLAS`).

## Correos automáticos al cliente

`api/_lib/correos.js` (`CORREOS`) define qué etapa, al pasar a qué estado, envía un correo al cliente
(p. ej. tienda `guia:hecho`, proyecto `programacion:hecho`). Se envían con Resend; variables en Vercel:
`RESEND_API_KEY` (obligatoria), `MAIL_FROM` (por defecto `Reiki Energía Solar <notificaciones@reikisolar.com.co>`),
`MAIL_REPLY_TO`, `MAIL_BCC` (copia interna opcional).

- Nunca incluyen proveedores, costos ni las notas internas de las etapas.
- No se reenvía un correo ya enviado; si no se pudo enviar (sin correo del cliente, sin guía, sin fecha, sin clave) queda
  "No enviado" con el motivo y se puede reintentar (`POST op=correo { id, key }`).
- Etapas con fecha para el cliente (visita técnica, programación de cuadrilla): `POST op=etapa { id, key, fechaCliente: 'YYYY-MM-DD' }`.
- `correosActivos: false` en el expediente desactiva los avisos de ese cliente.
- Pedidos web pagados hace más de 48 h no disparan correos al crearse su expediente.
