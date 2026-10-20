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
