# Auditoría de imágenes de productos

Fecha: 2026-09-25

Criterio: marca en la ruta de la imagen distinta a la del producto, o tipo de equipo
incompatible (ej. medidor con foto de inversor; on-grid XS con foto híbrida SDT/ES).

**No se borraron archivos de imagen.** Solo se cambió el frontmatter `image` a
placeholder de categoría en los casos confirmados abajo.

Sospechosos detectados: **3**
Placeholders aplicados en esta corrida: **0**

| Producto | Marca | Categoría | Imagen actual | Motivo | Acción |
|---|---|---|---|---|---|
| Inversor Solar On-Grid GoodWe 5kW GW5000-MS-US30 | GoodWe | inversores | `/images/productos-tienda/inversores/goodwe-sdt.jpg` | on-grid/XS con foto de serie híbrida u otra familia | Pendiente (revisar / no tocar sin OK) |
| Inversor Solar On-Grid GoodWe 9,6kW GW9600-MS-US30 | GoodWe | inversores | `/images/productos-tienda/inversores/goodwe-sdt.jpg` | on-grid/XS con foto de serie híbrida u otra familia | Pendiente (revisar / no tocar sin OK) |
| Módulo Inalámbrico LDSolar Accesorio/Monitor | LDSolar | accesorios | `/images/productos-tienda/monitoreo/growatt-shine.jpg` | marca imagen «growatt» ≠ marca producto «LDSolar» | Pendiente (revisar / no tocar sin OK) |

## Casos confirmados por el dueño (ya corregidos → placeholder)

- GoodWe GW3000-XS-30: tenía `goodwe-sdt.jpg` (familia SDT / aspecto híbrido) → `/images/placeholders/inversores.svg`
- Medidor GoodWe GM330: tenía `goodwe-ezlogger.jpg` (datalogger; se reportó como dongle Growatt) → `/images/placeholders/accesorios.svg`

## Otros sospechosos (sin cambiar sin tu OK)

Ver tabla arriba: GW5000-MS-US30, GW9600-MS-US30 (misma foto SDT) y módulo LDSolar con imagen Growatt.
