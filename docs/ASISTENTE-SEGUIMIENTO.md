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
(p. ej. tienda `guia:hecho`, proyecto `programacion:hecho`). Se envían por el SMTP del correo de Hostinger;
variables en Vercel: `SMTP_USER` (buzón que envía), `SMTP_PASS`, opcionales `SMTP_HOST` (smtp.hostinger.com),
`SMTP_PORT` (465), `MAIL_FROM`, `MAIL_REPLY_TO`, `MAIL_BCC`. Alternativa sin SMTP: `RESEND_API_KEY`.

- Nunca incluyen proveedores, costos ni las notas internas de las etapas.
- No se reenvía un correo ya enviado; si no se pudo enviar (sin correo del cliente, sin guía, sin fecha, sin clave) queda
  "No enviado" con el motivo y se puede reintentar (`POST op=correo { id, key }`).
- Etapas con fecha para el cliente (visita técnica, programación de cuadrilla): `POST op=etapa { id, key, fechaCliente: 'YYYY-MM-DD' }`.
- `correosActivos: false` en el expediente desactiva los avisos de ese cliente.
- Pedidos web pagados hace más de 48 h no disparan correos al crearse su expediente.

## Desempeño y equipos comprometidos

- `GET op=desempeno`: KPIs (ventas del mes vs. anterior, cobrado, saldo, pagos por verificar, margen), ventas por mes
  (tienda, proyectos, tienda web y cobrado), ventas por proveedor, etapas donde está detenido el trabajo y la foto de Alegra.
- `GET op=equipos`: equipos de compras/proyectos activos con su estado de compra (por pedir, pedido, comprado, en camino,
  en obra) derivado de las etapas, agrupados por proveedor. Reiki trabaja casi todo bajo pedido: no se cuenta stock.
- `POST op=alegra-snapshot`: Claude lee Alegra con su conector y guarda `{ facturacionMensual, recaudoMensual, cartera, topClientes }`.
  El sitio no se conecta a Alegra directamente.
- Margen: costo unitario por equipo (dato interno, solo en Redis; el repo es público) + "otros costos" del expediente.

## Inicio y Por comprar

- El panel abre en **Inicio** (`GET op=inicio`): acciones del día (pagos por verificar, ventas pagadas con equipos sin pedir,
  etapas detenidas, cartera vencida, ventas entregadas sin factura, clientes sin correo, equipos sin proveedor), tabla de
  ventas y cobros hoy / semana / mes contra el periodo anterior, equipos (por pedir, pedidos, por entregar, vendidos y
  estado del catálogo) e indicadores con meta.
- **Por comprar** (`GET op=compras`, `POST op=compra`): cada equipo de cada venta activa con su proveedor, disponibilidad en la
  tienda y estado de compra (por pedir, pedido, recibido, no se compra) con referencia del pedido. Vista por proveedor con
  "Copiar pedido" (texto para WhatsApp/correo al proveedor) y marcar en lote. Las ventas sin pago no entran al lote.
  Al pedir se cierra "Disponibilidad"; al recibir todo se cierra "Compra a proveedores".
- Botón de WhatsApp "¿Disponible?" en cada equipo y uno consolidado por venta cuando varios equipos van al mismo proveedor
  (y por proveedor en esa vista): abre el chat del asesor con nombre del producto, referencia exacta (cód. proveedor →
  modelo → SKU) y cantidad. Los asesores se editan en "Contactos de proveedores" (`GET|POST op=prov-contactos`), guardados en
  Redis (`reiki:wa:proveedores:contactos`), no en el repo.
- Indicadores (últimos 90 días): días para entregar (meta ≤ 5), días para poner en marcha un proyecto (≤ 30), días del pago al
  pedido al proveedor (≤ 1), horas para verificar un pago (≤ 24), margen bruto (≥ 20 %), cartera vencida > 30 días (≤ 20 %),
  etapas detenidas (0), catálogo disponible (≥ 90 %), ticket promedio y % de ventas por la web.

## Cotizaciones

Sección **Cotizaciones** del panel (`api/_lib/cotizaciones.js`, `public/admin/panel-cotizaciones.js`).

- Entran solas: las que hace Claude en cualquier chat (habilidad `registrar-cotizacion-reiki`, token limitado
  `cotz_…` derivado de `CLAUDE_AGENT_TOKEN`, solo sirve para `cot-save` y `cot-pdf`), y las que generan los clientes en
  la página web o el bot de WhatsApp (`cotizacion-store.createCotizacion` → `registrarDesdeTienda`). Los PDF de pedidos
  pagados (`tienda_pedido`) no se registran.
- Estados: por_enviar → enviada → seguimiento → aceptada | rechazada (con motivo). Aceptada crea la venta en Compras en
  tienda o Proyectos (ítems con `comprar:false` quedan "no se compra"). Pagada en línea → aceptada sin crear venta (la crea
  el pedido web).
- El número sin la revisión es la llave (`CT-271026-006 R1` → `CT271026006`): una R1 actualiza la misma cotización.
- PDF en Redis en trozos (`reiki:wa:cotzpdf:*`), máx. 12 MB; las web usan `pdfUrl`. Envío por correo desde info@ con el PDF
  adjunto (`cot-enviar`); seguimiento a los 3 días del envío y 4 días después de cada contacto.

## Factura en Alegra (prefactura en borrador)

- `api/_lib/alegra.js`. Variables en Vercel: `ALEGRA_EMAIL`, `ALEGRA_TOKEN` (Alegra → Configuración → API). Opcionales:
  `ALEGRA_NUMERACION` (15, RK electrónica), `ALEGRA_BANCO` (3, Banco 1), `ALEGRA_IVA19` (4), `ALEGRA_IVA_EXCLUIDO` (2).
- `POST op=alegra-borrador { id }`: busca o crea el cliente por cédula/NIT, crea o reutiliza los ítems (por referencia = slug),
  y crea la factura con `status: draft` (no se emite). IVA por línea con las reglas de Reiki (paneles, inversores,
  reflectores y bombeo excluidos; el resto y el envío 19 %); si con esas reglas no cuadra el total, prueba con IVA en todo.
- `POST op=alegra-sync { id }`: si ya se emitió, guarda el número RK (cierra la etapa y envía el correo de factura) y
  registra el pago en Alegra contra Banco 1 si la venta está pagada.

## Consecutivo único y datos mínimos del cotizador web

- Todas las cotizaciones (página, WhatsApp, chats de Claude) usan **CT-DDMMAA-###** de un solo contador diario en Redis
  (`cotizacion-store.allocNumero`), que salta números ya registrados en el panel en formato `CT-…` o `Cot -…`.
  Los chats lo piden con `POST op=cot-numero` (token limitado).
- El cotizador del carrito exige nombre y apellido, WhatsApp colombiano real, correo real (rechaza `00@gmal.com`,
  `notengo@…`, etc.) y departamento + municipio de la lista oficial (`public/data/colombia-municipios.json`, 32 dptos.,
  1.104 municipios). Se valida en el navegador y en `api/cotizacion-web.js` (`api/_lib/validar-cliente.js`).
