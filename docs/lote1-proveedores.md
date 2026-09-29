# Lote 1 — fotos de proveedor (Solaire / Autosolar)

Fecha: 2026-09-28 · Autorización de uso de imágenes: Solaire y Autosolar (confirmada 2026-09-28).

## Resultado

| Métrica (productos visibles) | Antes | Después |
|---|---:|---:|
| Foto definitiva | 167 (38.8 %) | **242 (55.8 %)** |
| Provisional | 263 | 192 |
| Visibles | 430 | 434 |

- **81 productos** con foto nueva: **45 exactas** + **36 de la serie** (con aviso «Imagen de referencia de la serie …» bajo la foto).
- **3 reactivados** (estaban ocultos solo por falta de foto; `imagenPendiente`).
- 35 imágenes únicas en `public/images/productos-estudio/` (WebP q87, ≤150 KB, thumb 600).
- Decisiones por SKU: `docs/lote1-decisiones.json` · Reporte: `docs/lote1-reporte.json` · Script: `scripts/lote1-proveedores.mjs`.

## Criterio de match (verificado a mano)

- **Huawei (Solaire):** los códigos NFIN/NFAC se verificaron contra el catálogo de Solaire; todos corresponden al modelo exacto. `NFAC0003` = LUNA2000-10kW-C1 (Solaire lo codifica como accesorio, pero es el producto).
  Solaire usa una sola imagen por carcasa (p. ej. SUN2000 2–6KTL-L1 comparten foto): es la foto oficial.
- **Victron MPPT (Autosolar):** foto exacta cuando existe; si no, la del mismo tamaño de carcasa (p. ej. 250/100 → foto 250/85). Nunca se cruzan carcasas pequeñas/medianas/Tr.
- **Growatt:** MIN con MIN, MID con MID. MAC (36KTL3) descartado.
- **MultiPlus-II** 3000/5000 → foto MultiPlus-II 48/5000 (serie). **MultiPlus Compact 12/2000** exacto.

## Descartados (siguen provisionales u ocultos)

- Victron PWM-Light (SCC0100…), PWM Pro (SCC940…), SmartSolar RS 450 (SCC145…), SCC0100 60/70, SCC900650010.
- MultiPlus clásicos (500/800/1200/3000 no Compact) y Quattro: familias distintas, sin foto propia.
- Growatt MAC 36KTL3-XL2.
- APsystems DS3D (fuente 350 px) y cable Hoymiles HMT (600 px).
- Conectores Hoymiles HMT: la foto es correcta, pero su descripción dice «microinversor» → se dejan ocultos hasta corregir el texto.

## Técnica

- Fotos con transparencia (Solaire): se usa el alfa original.
- Victron sobre blanco: recorte por inundación desde los bordes.
- **Equipos blancos sobre blanco (Growatt, LUNA):** fusión en modo *multiply* sobre el fondo de estudio (el recorte se comía la carcasa).

## Nota de dirección de arte

Los controladores Victron llevan el modelo impreso en la etiqueta (p. ej. «MPPT 250|85»). En las fichas con foto de serie
el cliente verá otro número en la etiqueta; el aviso bajo la foto lo aclara. Reemplazar por la foto exacta cuando llegue
el paquete de imágenes del proveedor.

## Pendientes detectados (no tocados en este lote)

- Fotos provisionales con **pedestal/fondo de marketing**: EPever Tracer (pedestal rosado) y APsystems DS3D (pedestal lila con texto).
- Home: batería 5 kWh, Jinko Tiger Neo 585W, bomba Kolos3 y Felicity 16 kWh siguen con foto provisional.
- 365 productos ocultos (ver `docs/ocultos-resumen.md`), 191 «Sin marca».
