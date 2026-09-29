# Métricas de imágenes de producto

Actualizado: 2026-09-29T00:17:52.885Z

## Estado actual (tras reclasificación REVISAR G1/G2/G3)

| Estado | SKUs | % |
|---|---:|---:|
| Foto **definitiva** (estudio, no provisional) | 167 | 38.8% |
| **Provisional** (`imagen_provisional: true`) | 263 | 61.2% |
| **Sin imagen** usable (placeholder/logo) | 0 | 0.0% |
| **Total activos** | 430 | 100% |

| Extra | SKUs |
|---|---:|
| Ocultos (`draft: true`) | 369 |
| Ocultos con `imagenPendiente` (G1/G2) | 290 |
| Con caption de serie (`imagenSerieRef`) | 145 |

## Reclasificación REVISAR

### Grupo 1 — error de categoría
- Corregidos: **0**
- Ocultos: **132**
- Mantenidos (tipo coherente): **59**
- Detalle: `docs/grupo1-correcciones.md`

### Grupo 2 — misma serie, distinto tamaño
- Caption «Imagen de referencia de la serie …»: **145**
- Ocultos (no misma serie): **11**
- Detalle: `docs/grupo2-serie.md`
- Prioridad proveedores: Victron/Growatt/Pylontech → Autosolar; Huawei/Hoymiles/APsystems/Pytes → Solaire

### Grupo 3 — aspecto idéntico
- `suntree-spd-ac`, `pylontech-us`, `pylontech-3kwh`, kolos3/kolos4 sumergibles, `felicity-12v`
- **Quitados de prioridad ALTA** en `docs/imagenes-no-sirven.md`

## Fase C / descarga proveedores
- Autorización Solaire + Autosolar: **confirmada**
- Descarga-only completada: `imagenes-proveedores/` + `manifest.csv` + `resumen.md`
- Cobertura SKUs: **exacto 50** · **serie 71** · **sin coincidencia 453** (de 574 buscados)
- Peso carpeta: **434.1 MB**
- Lote 1 (procesar ×20) **pendiente** de OK tras revisión del inventario

## Notas
- No se toca `public/` ni se procesa en el barrido de descarga.
- Flag `imagen_provisional` es interno (sin badge público).
