# Lote 2 — match exacto por código de artículo Autosolar

Fecha: 2026-09-28. Script: `scripts/autosolar-por-codigo.py` (busca el SKU de 7 dígitos en autosolar.co y
**confirma "Codigo de artículo" en la ficha** antes de aceptar). Autorización de uso Autosolar: 2026-09-28.

## Barrido

- 120 productos tienen como SKU un código Autosolar → **110 coincidencias exactas**, 10 sin ficha en Autosolar.
- **52 productos visibles** con foto exacta nueva (51 exactas + Growatt MID 25K con foto de serie MID 20K, porque
  Autosolar solo tiene 250 px).
- Foto definitiva en productos visibles: **55,8 % → 60,1 %** (261 de 434).

## Fotos "definitivas" que eran de OTRO producto (corregidas)

- Growatt SPF 3000 (3004250), Growatt MAX 50K (3004295), Growatt MIN 4200 (3205063): mostraban un inversor **MUST**
  sobre pedestal morado.
- Breakers Suntree 5504131 y 5504146 (4 polos) y 5504211 (1 polo) mostraban un breaker de 2 polos.
- Felicity 48V 16 kWh (home, 1880836): mostraba otra batería Felicity.

## Datos del catálogo en conflicto con Autosolar (NO modificados — requieren decisión)

| Código | En la tienda | En Autosolar |
|---|---|---|
| 3004613 | Panel Solar Monocristalino Felicity 1kW (categoría paneles) | Inversor Cargador Felicity 1000W 12V IVCM1012-LV |
| 3202011 | Medidor de Energía Eastron 3VA | Vatímetro Trifásico Growatt TPM |
| 1708249 | Batería Solar Litio Pylontech 48V 2.4kWh | Batería GEL 12V 150Ah GreenPoint |
| 3004247 | Inversor Solar Off-Grid Felicity 5kW | Inversor Cargador TENSITE 5000W 48V IVEM5048-LV |

## Ocultos identificados

53 productos ocultos (la mayoría "Sin marca") quedaron identificados con marca, modelo real y fotos:
`docs/ocultos-identificados-autosolar.csv` (Victron Cerbo/Ekrano/GX, SmartSolar MPPT, Phoenix, MultiPlus-II,
inversores SAJ R6, vatímetros SAJ/Growatt, fusibles Suntree…). Reactivarlos es decisión comercial; ojo con
posibles duplicados de productos ya visibles (p. ej. 2008192 SmartSolar 100/30).

## Sin ficha en Autosolar

1001104, 3002000, 4001005, 4024150, 6003001, 6003002, 6003003, 6048150 (Inti 60A), 9001005, 9001012 (medidor Must).
