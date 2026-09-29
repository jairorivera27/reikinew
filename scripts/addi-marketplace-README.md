# Marketplace Addi — catálogo Reiki

Publicar los mismos equipos de `src/content/productos` en el **Marketplace de Addi** (canal distinto al BNPL del carrito).

## 1. Specs obligatorias (ya redactadas)

Archivo: [`data/addi-marketplace-specs.json`](../data/addi-marketplace-specs.json)

| Campo | Límite | Uso |
|---|---|---|
| Vendedor | — | `Reiki Energía Solar SAS – info@reikisolar.com.co` |
| Garantía | ≤300 | Defectos de fábrica / exclusiones |
| Devoluciones | ≤300 | Retracto 5 días hábiles |
| Términos | ≤500 | Resumen + link a T&C del sitio |

Guía de tallas: **no aplica** (no es moda).

Edita el JSON si Addi pide otro tono; el script valida los límites al exportar.

## 2. Exportar catálogo

```bash
npm run addi:export-catalog
# o
node scripts/export-addi-marketplace.mjs
node scripts/export-addi-marketplace.mjs --pilot=30
node scripts/export-addi-marketplace.mjs --all
```

Salida:

- `data/addi-marketplace-catalogo.xlsx` — hojas Productos / SpecsObligatorias / Resumen
- `data/addi-marketplace-catalogo.csv` — misma data tabular

Un producto queda **Listo_Addi = SI** si tiene: precio ≥ $5.000, marca real, imagen de producto (no placeholder), no draft, no agotado.

La columna **Piloto_sugerido** marca los primeros N (default 20) de categorías prioritarias (paneles, inversores, baterías…).

## 3. Pasos comerciales con Addi

1. Inscribirse: [Marketplace Addi](https://cloud.comercios.addi.com/marketplace) (formulario).
2. Esperar activación / Seller Portal o cuenta VTEX que Addi asigne.
3. Crear en su panel las 4 specs (copiar de la hoja `SpecsObligatorias`).
4. Cargar primero el **piloto** (`Piloto_sugerido = SI`).
5. Cuando aprueben, importar el resto de `Listo_Addi = SI`.
6. Definir con Addi: comisiones, logística, tiempos de despacho.

Docs útiles:

- [Specs obligatorias](https://support.addi.com/marketplace-integration/4-creacion-de-especificaciones-de-producto-obligatorias-para-addi)
- [Política Marketplace](https://co.addi.com/politica-marketplace-aliados)
- [FAQ](https://cloud.comercios.addi.com/marketplace)

## 4. Relación con BNPL (ya en el sitio)

| | BNPL en reikisolar.com.co | Marketplace Addi |
|---|---|---|
| Dónde compra el cliente | Tu tienda | App/web Addi |
| Código en el repo | `api/addi-checkout.js` | Este export + portal Addi |
| Credenciales | `ADDI_CLIENT_ID` / `SECRET` | Cuenta Marketplace / Seller Portal |

## 5. Bloqueos frecuentes en el export

- `sin marca` / `Sin marca`
- `imagen débil/pendiente` (`imagenPendiente` o logo genérico)
- `draft`
- `precio < 5000`
- `agotado`

Corrige en las fichas `.md` y vuelve a correr el export.
