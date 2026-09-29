# Auditoría de imágenes de producto

Fecha: 2026-09-28

> **Solo diagnóstico.** No se copió, procesó ni sobrescribió ninguna imagen.
> El lote piloto (5 productos) y el catálogo completo esperan tu visto bueno.

## 1. Dónde viven y cómo las usa la ficha

| Qué | Dónde |
|---|---|
| Fichas | `src/content/productos/*.md`, campo `image: "/images/…"` |
| Schema | `src/content/config.ts` — `image: z.string()`, más `imagenPendiente` |
| Archivos | `public/images/productos-tienda/` (paneles, inversores, baterías, controladores, protecciones, bombeo, monitoreo) y `public/images/Productos tienda/Luminarias/` |
| Placeholders | `public/images/placeholders/*.svg` |
| Tarjeta y ficha | `<img src={data.image}>` en `ProductCard.astro`, `tienda/[slug].astro`, carrusel `Tienda.astro` y el listado de categoría. No usan `<Image>` de `astro:assets`. |
| Medidas en HTML | La tarjeta y la ficha ya declaran `width="1600"` y `height="1600"`, aunque el archivo real no es cuadrado. El alt de respaldo ya es «Marca Título – Reiki Energía Solar». |
| URLs externas | Ninguna en productos activos. |

Hay 799 fichas. 224 están en borrador y no salen en la tienda. Este informe cubre las **575 activas**.

## 2. Lo que se ve

El catálogo no es una sesión de estudio. Son unos pocos archivos repetidos con nombres de marca distintos.

1. **38 archivos de 500×500** (238 productos) son renders con pedestal sobre fondo morado, azul o rosa, varios con un badge de potencia. Eso choca con la dirección de arte: la foto principal no puede llevar fondo de color ni sellos.
2. **El nombre del archivo miente.** El mismo bytes está guardado como Growatt, Deye, Huawei o Pylontech. Abrir la imagen muestra otro producto.
3. **Luminarias y un microinversor Hoymiles** son fichas de otras marcas (SKL / skylights.com.co y SOLUX), con titular y tabla dentro de la foto.
4. Las pocas fotos de producto sobre blanco que sí aguantan un recorte de estudio están abajo, en «sirven como fuente». No hacen falta upscales: lo que está por debajo de 1000 px se deja fuera.

## 3. Cifras

| Métrica | Valor |
|---|---|
| Productos activos | 575 |
| Rutas distintas | 99 |
| Fotos distintas (por hash) | 63 |
| Grupos de archivos idénticos con otro nombre | 17 |
| Placeholders SVG (activos) | 2 productos |
| Renders 500 px con fondo de color | 238 productos |
| Fichas con marca de otra tienda (SKL o SOLUX) | 19 productos |
| Productos cuyo lado mayor es < 1000 px | 403 |
| Fotos que sirven como fuente de estudio | 6 archivos, 9 productos (varias compartidas) |

## 4. Inventario por foto (no por SKU)

Cada fila es un archivo único. Si varios nombres apuntan al mismo hash, se listan juntos. «Productos» es cuántas fichas activas lo usan.

| Ruta (y copias) | Productos | Resolución | Formato | Peso | Fondo | Marca de agua | Textos o bordes | < 1000 px | ¿Sirve? |
|---|---:|---|---|---:|---|---|---|---|---|
| `/images/productos-tienda/protecciones/generic-mcb-ac.jpg`<br>`/images/productos-tienda/protecciones/suntree-scb8-ac.jpg`<br>`/images/productos-tienda/protecciones/suntree-sq8-switch.jpg` | 93 | 549×600 | jpeg | 52,4 KB | casi blanco | No | Marca LUMEK en el breaker | SÍ | No |
| `/images/Productos tienda/Controladores/Controlador MPPT 60A Medellín .png`<br>`/images/productos-tienda/controladores/victron-smartsolar-mppt.jpg` | 83 | 500×500 | png | 194,3 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/leader-breaker.jpg`<br>`/images/productos-tienda/protecciones/suntree-siso-dc.jpg`<br>`/images/productos-tienda/protecciones/suntree-sl7n-dc.jpg` | 65 | 1080×1080 | jpeg | 210,3 KB | blanco limpio | No | Marca Suntree SL7N-63 |  | Solo si el SKU es ese breaker |
| `/images/productos-tienda/inversores/victron-multiplus.png`<br>`/images/productos-tienda/inversores/victron-phoenix.png`<br>`/images/productos-tienda/inversores/victron-quattro.png` | 53 | 500×500 | png | 216,7 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/goodwe-es.jpg`<br>`/images/productos-tienda/inversores/goodwe-sdt.jpg` | 42 | 650×650 | png (ext .jpg) | 24,7 KB | blanco limpio | No | Iconos del equipo | SÍ | No |
| `/images/productos-tienda/monitoreo/apsystems-ecu.jpg`<br>`/images/productos-tienda/monitoreo/deye-logger.jpg`<br>`/images/productos-tienda/monitoreo/eastron-meter.jpg`<br>`/images/productos-tienda/monitoreo/goodwe-ezlogger.jpg`<br>`/images/productos-tienda/monitoreo/growatt-shine.jpg`<br>`/images/productos-tienda/monitoreo/hoymiles-dtu.jpg`<br>`/images/productos-tienda/monitoreo/huawei-smartlogger.jpg`<br>`/images/productos-tienda/monitoreo/solis-datamanager.jpg`<br>`/images/productos-tienda/protecciones/growatt-wifi.jpg` | 29 | 800×1000 | jpeg | 33,7 KB | blanco limpio | No | Logo Growatt en el equipo | SÍ | No |
| `/images/productos-tienda/inversores/huawei-sun2000.png` | 23 | 500×500 | png | 217,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/growatt-mod.jpg`<br>`/images/productos-tienda/inversores/must-pv.png` | 22 | 500×500 | png (ext .jpg) | 203,1 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/citel-spd.jpg`<br>`/images/productos-tienda/protecciones/leader-dps.jpg`<br>`/images/productos-tienda/protecciones/suntree-spd-dc.jpg` | 20 | 1080×1080 | jpeg | 182,6 KB | blanco limpio | No | Suntree SUP2H-PV |  | Solo si el SKU es ese DPS |
| `/images/productos-tienda/inversores/apsystems-ds3.png` | 13 | 500×500 | png | 238,5 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/baterias/felicity-12v.jpg`<br>`/images/productos-tienda/baterias/felicity-fla24.jpg`<br>`/images/productos-tienda/baterias/felicity-fla48.jpg` | 12 | 1500×1500 | png (ext .jpg) | 252,2 KB | blanco limpio | No | No (vista trasera, sin cara frontal) |  | Con reserva |
| `/images/productos-tienda/baterias/bslbatt-5-12.png`<br>`/images/productos-tienda/baterias/dyness-bx51100.png`<br>`/images/productos-tienda/baterias/goodwe-lynxl.png`<br>`/images/productos-tienda/baterias/growatt-ark.png`<br>`/images/productos-tienda/baterias/pylontech-us.png`<br>`/images/productos-tienda/baterias/pytes-battery.png` | 11 | 500×500 | png | 202,3 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/hoymiles-hms.jpg` | 7 | 1080×1080 | jpeg | 112,2 KB | ficha comercial | Sí — SOLUX / solux.energy | Sí — titular, iconos y 800VA |  | No |
| `/images/productos-tienda/monitoreo/victron-cerbo-gx.jpg`<br>`/images/productos-tienda/monitoreo/victron-gx-touch.jpg` | 6 | 4246×1519 | png (ext .jpg) | 8.522,1 KB | transparente | No | Serigrafía del equipo |  | Con reserva |
| `/images/productos-tienda/baterias/byd-battery.png`<br>`/images/productos-tienda/baterias/pylontech-uf5000.png` | 5 | 500×500 | png | 220,4 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/bombeo/kolos3-sumergible.jpg` | 5 | 510×600 | jpeg | 15 KB | blanco / casi blanco | No | Etiquetas del equipo | SÍ | No |
| `/images/productos-tienda/bombeo/kolos4-sumergible.jpg` | 5 | 560×560 | jpeg | 28,9 KB | blanco / casi blanco | No | Etiquetas del equipo | SÍ | No |
| `/images/productos-tienda/inversores/felicity-hybrid.png` | 5 | 800×800 | png | 198,5 KB | blanco | No | Pantalla y logo | SÍ | No |
| `/images/Productos tienda/Controladores/Controlador MPPT 20A Medellín .png`<br>`/images/productos-tienda/controladores/inti-mppt.jpg` | 4 | 500×500 | png | 211,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/controladores/controlador-mppt-80a-medellin.png`<br>`/images/productos-tienda/controladores/studer-vs.jpg` | 4 | 500×500 | png | 190,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/Productos tienda/Luminarias/reflector led solar 200W.jpeg` | 3 | 1080×1080 | jpeg | 161,8 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/productos-tienda/baterias/huawei-luna.png` | 3 | 400×400 | png | 16,9 KB | transparente | No | Logo Huawei | SÍ | No |
| `/images/productos-tienda/baterias/soluna-battery.png` | 3 | 1500×1125 | png | 66,9 KB | blanco limpio | No | Logo SOLUNA |  | Con reserva |
| `/images/productos-tienda/inversores/deye-hybrid.png` | 3 | 550×550 | png | 89,7 KB | azul plano | No | No | SÍ | No |
| `/images/productos-tienda/inversores/fronius-primo.jpg` | 3 | 527×474 | png (ext .jpg) | 74,7 KB | transparente (negro de origen) | No | Logo Fronius | SÍ | No |
| `/images/productos-tienda/paneles-solares/ja-solar-625w-bifacial.jpg`<br>`/images/productos-tienda/paneles-solares/ja-solar-715w-bifacial.jpg`<br>`/images/productos-tienda/paneles-solares/ja-solar-720w-bifacial.jpg` | 3 | 1500×1500 | jpeg | 72,4 KB | blanco limpio | No | No |  | Sí, como fuente |
| `/images/productos-tienda/protecciones/generic-mccb.jpg` | 3 | 1080×1080 | jpeg | 248,8 KB | blanco limpio | No | Marca LUMEK |  | No |
| `/images/productos-tienda/protecciones/suntree-spd-ac.jpg` | 3 | 1080×1080 | jpeg | 48,8 KB | blanco limpio | No | Marca MOREDAY MD1-40 |  | No para Suntree |
| `/images/productos-tienda/baterias/pylontech-3kwh-medellin.png` | 2 | 500×500 | png | 201,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/bombeo/kolos-pool.jpg` | 2 | 510×600 | jpeg | 15,6 KB | blanco / casi blanco | No | Etiquetas del equipo | SÍ | No |
| `/images/productos-tienda/inversores/apsystems-qt2.png` | 2 | 500×500 | png | 239,4 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/studer-xtender.jpg` | 2 | 650×953 | jpeg | 107,4 KB | gris de estudio sucio | No | Panel del equipo, legible | SÍ | No |
| `/images/productos-tienda/paneles-solares/felicity-panel-mono.jpg`<br>`/images/productos-tienda/paneles-solares/tensite-620w-bifacial.jpg` | 2 | 1080×1080 | jpeg | 73,9 KB | blanco limpio | No | No |  | Sí, como fuente |
| `/images/productos-tienda/paneles-solares/trina-670w-deg21c.png`<br>`/images/productos-tienda/paneles-solares/trinasolar-650w.png` | 2 | 500×500 | png | 242,1 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/abb-fuseholder-100a.png` | 2 | 500×500 | png | 180 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/Productos tienda/Luminarias/Luminaria solar 100w.jpeg` | 1 | 1597×1600 | jpeg | 386,4 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/Luminaria solar 200w.jpeg` | 1 | 1080×1080 | jpeg | 199,8 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/Luminaria solar 30w.jpeg` | 1 | 1280×1263 | jpeg | 231,9 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/Luminaria solar 90W.jpeg` | 1 | 1080×1080 | jpeg | 243,3 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/Lumionaria solar tipo jardin 90w.jpeg` | 1 | 800×600 | jpeg | 99,9 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights | SÍ | No |
| `/images/Productos tienda/Luminarias/reflector led solar 100W.jpeg` | 1 | 1080×1080 | jpeg | 241 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/reflector led solar 400W.jpeg` | 1 | 1080×1080 | jpeg | 211,6 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/reflector led solar 600W.jpeg` | 1 | 1080×1080 | jpeg | 211,8 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/Productos tienda/Luminarias/reflector led solar 60W.jpeg` | 1 | 1080×1080 | jpeg | 240,3 KB | escenografía / ficha | Sí — SKL y skylights.com.co | Sí — titular, tabla y Master Lights |  | No |
| `/images/placeholders/accesorios.svg` | 1 | SVG | svg | 1 KB | sin foto (SVG) | — | — | SÍ | No |
| `/images/placeholders/inversores.svg` | 1 | SVG | svg | 1 KB | sin foto (SVG) | — | — | SÍ | No |
| `/images/productos-tienda/bombeo/kolos-cfp-horizontal.png` | 1 | 560×560 | png | 50 KB | verde plano | No | Etiqueta de producto | SÍ | No |
| `/images/productos-tienda/controladores/controlador-mppt-100a-medellin.png` | 1 | 500×500 | png | 194,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/controladores/controlador-mppt-40a-medellin.png` | 1 | 500×500 | png | 170,4 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/epever-ipt.png` | 1 | 500×500 | png | 207,5 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/inversores/tensite-inverter.jpg` | 1 | 1080×1080 | jpeg | 228,4 KB | blanco limpio | No | Logo y pantalla legibles |  | Sí, como fuente |
| `/images/productos-tienda/paneles-solares/astroenergy-n5-medellin.png` | 1 | 500×500 | png | 231,6 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/ja-solar-595w.png` | 1 | 500×500 | png | 237,9 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/jinko-tiger-neo-585w.png` | 1 | 500×500 | png | 249,1 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/jinkosolar-500w.png` | 1 | 500×500 | png | 250,8 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/longi-545w-medellin.png` | 1 | 500×500 | png | 243,3 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/must-panel-mono.jpg` | 1 | 1100×1422 | jpeg | 20 KB | blanco limpio | No | No |  | No |
| `/images/productos-tienda/paneles-solares/tensite-240w-mono.jpg` | 1 | 801×1001 | jpeg | 50,4 KB | blanco limpio | No | No |  | Con reserva |
| `/images/productos-tienda/paneles-solares/tensite-710w-bifacial.jpg` | 1 | 1080×1080 | jpeg | 69,1 KB | blanco limpio | No | No |  | Sí, como fuente |
| `/images/productos-tienda/paneles-solares/trinasolar-700w.png` | 1 | 500×500 | png | 209,4 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/paneles-solares/victron-bluesolar-mono.jpg` | 1 | 2110×2000 | jpeg | 411,6 KB | blanco limpio | No | Etiqueta del fabricante en el marco |  | Sí, como fuente |
| `/images/productos-tienda/protecciones/abb-breaker-dc-100a.png` | 1 | 500×500 | png | 217,1 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/abb-breaker-dc-32a.png` | 1 | 500×500 | png | 181,5 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/abb-breaker-dc-63a.png` | 1 | 500×500 | png | 156,8 KB | estudio de color (morado, azul o rosa) | No de otra tienda | Pedestal de color; badge en las muestras abiertas | SÍ | No |
| `/images/productos-tienda/protecciones/victron-batteryprotect.jpg` | 1 | 3562×1753 | png (ext .jpg) | 4.547,7 KB | transparente | No | Serigrafía Victron, legible |  | Sí, como fuente |

### Notas de las filas que más pesan

- `/images/productos-tienda/protecciones/generic-mcb-ac.jpg` (93 fichas): Breaker LUMEK de 6 A, 549×600, reutilizado en 93 fichas (cables, medidores, breakers de otras marcas).
- `/images/Productos tienda/Controladores/Controlador MPPT 60A Medellín .png` (83 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/protecciones/leader-breaker.jpg` (65 fichas): Foto correcta de un SL7N, copiada también a seccionadores y a productos que no lo son.
- `/images/productos-tienda/inversores/victron-multiplus.png` (53 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/inversores/goodwe-es.jpg` (42 fichas): Misma foto para series ES y SDT. 650 px. No escalar.
- `/images/productos-tienda/monitoreo/apsystems-ecu.jpg` (29 fichas): Es un dongle Growatt. El mismo JPEG está copiado con nombres Deye, Huawei, Hoymiles, Solis, APsystems y Eastron.
- `/images/productos-tienda/inversores/huawei-sun2000.png` (23 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/inversores/growatt-mod.jpg` (22 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/protecciones/citel-spd.jpg` (20 fichas): El archivo citel-spd.jpg y leader-dps.jpg son este mismo Suntree, no Citel ni Leader.
- `/images/productos-tienda/inversores/apsystems-ds3.png` (13 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/baterias/felicity-12v.jpg` (12 fichas): 1500 px, fondo blanco. Es la parte de atrás del gabinete y la misma foto cubre 12 V, 24 V y 48 V.
- `/images/productos-tienda/baterias/bslbatt-5-12.png` (11 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/inversores/hoymiles-hms.jpg` (7 fichas): Ficha de distribuidor, no foto de producto.
- `/images/productos-tienda/monitoreo/victron-cerbo-gx.jpg` (6 fichas): Recorte ancho (4246×1519) de un Cerbo. El mismo archivo está asignado también al GX Touch. Pesa 8,5 MB.
- `/images/productos-tienda/baterias/byd-battery.png` (5 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/bombeo/kolos3-sumergible.jpg` (5 fichas): Foto real de bomba, lado mayor bajo 1000 px. No escalar.
- `/images/productos-tienda/bombeo/kolos4-sumergible.jpg` (5 fichas): Foto real de bomba, lado mayor bajo 1000 px. No escalar.
- `/images/productos-tienda/inversores/felicity-hybrid.png` (5 fichas): Dos equipos en cuadro, 800 px. No escalar.
- `/images/Productos tienda/Controladores/Controlador MPPT 20A Medellín .png` (4 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/controladores/controlador-mppt-80a-medellin.png` (4 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/Productos tienda/Luminarias/reflector led solar 200W.jpeg` (3 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/productos-tienda/baterias/soluna-battery.png` (3 fichas): Lateral casi vacío, 1500×1125. Poca información de producto.
- `/images/productos-tienda/inversores/deye-hybrid.png` (3 fichas): Fondo azul y 550 px. Pedir foto oficial Deye.
- `/images/productos-tienda/paneles-solares/ja-solar-625w-bifacial.jpg` (3 fichas): Panel en perspectiva, celdas oscuras reales, 1500 px. La misma foto está en 625 W, 715 W y 720 W.
- `/images/productos-tienda/protecciones/suntree-spd-ac.jpg` (3 fichas): Foto de teléfono de un DPS MOREDAY asignada a supresores Suntree.
- `/images/productos-tienda/baterias/pylontech-3kwh-medellin.png` (2 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/bombeo/kolos-pool.jpg` (2 fichas): Foto real de bomba, lado mayor bajo 1000 px. No escalar.
- `/images/productos-tienda/inversores/apsystems-qt2.png` (2 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/paneles-solares/felicity-panel-mono.jpg` (2 fichas): Panel en perspectiva, 1080 px. felicity-panel-mono.jpg y tensite-620w son el mismo archivo.
- `/images/productos-tienda/paneles-solares/trina-670w-deg21c.png` (2 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/productos-tienda/protecciones/abb-fuseholder-100a.png` (2 fichas): Render a 500 px. Fondo de color prohibido en la foto principal. No escalar.
- `/images/Productos tienda/Luminarias/Luminaria solar 100w.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/Luminaria solar 200w.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/Luminaria solar 30w.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/Luminaria solar 90W.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/Lumionaria solar tipo jardin 90w.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/reflector led solar 100W.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/reflector led solar 400W.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/reflector led solar 600W.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.
- `/images/Productos tienda/Luminarias/reflector led solar 60W.jpeg` (1 fichas): Pieza publicitaria de otra marca. No recortar.

## 5. El mismo archivo con otro nombre

Estas copias son byte a byte iguales. El nombre de carpeta no describe lo que hay dentro.

| Qué es en realidad | Nombres en disco |
|---|---|
| Dongle negro Growatt | `apsystems-ecu.jpg`, `deye-logger.jpg`, `eastron-meter.jpg`, `goodwe-ezlogger.jpg`, `growatt-shine.jpg`, `hoymiles-dtu.jpg`, `huawei-smartlogger.jpg`, `solis-datamanager.jpg`, `growatt-wifi.jpg` |
| Render morado de un Victron Quattro | `victron-multiplus.png`, `victron-phoenix.png`, `victron-quattro.png` |
| Render azul de un Pylontech US5000 | `bslbatt-5-12.png`, `dyness-bx51100.png`, `goodwe-lynxl.png`, `growatt-ark.png`, `pylontech-us.png`, `pytes-battery.png` |
| Render azul de dos US5000 | `byd-battery.png`, `pylontech-uf5000.png` |
| Render morado de un inversor MUST | `growatt-mod.jpg`, `must-pv.png` |
| Gabinete blanco Felicity, vista trasera | `felicity-12v.jpg`, `felicity-fla24.jpg`, `felicity-fla48.jpg` |
| Panel bifacial en perspectiva | `ja-solar-625w-bifacial.jpg`, `ja-solar-715w-bifacial.jpg`, `ja-solar-720w-bifacial.jpg` |
| Panel en perspectiva (Felicity y Tensite 620 W) | `felicity-panel-mono.jpg`, `tensite-620w-bifacial.jpg` |
| Inversor blanco GoodWe | `goodwe-es.jpg`, `goodwe-sdt.jpg` |
| Breaker Suntree SL7N-63 | `leader-breaker.jpg`, `suntree-siso-dc.jpg`, `suntree-sl7n-dc.jpg` |
| DPS Suntree SUP2H-PV | `citel-spd.jpg`, `leader-dps.jpg`, `suntree-spd-dc.jpg` |
| Breaker LUMEK 6 A | `generic-mcb-ac.jpg`, `suntree-scb8-ac.jpg`, `suntree-sq8-switch.jpg` |
| Cerbo GX Victron | `victron-cerbo-gx.jpg`, `victron-gx-touch.jpg` |
| Panel Trina (render 500 px) | `trina-670w-deg21c.png`, `trinasolar-650w.png` |

## 6. No sirven — pedir foto oficial

No se va a escalar ninguna de estas para disimularla.

### A. Render de estudio en color, 500×500, con badge o pedestal

238 productos. Fondo morado, azul o rosa. Ejemplos revisados: Jinko 585 W con pastilla «585 W», JA Solar 595 W con pastilla, Huawei, APsystems DS3/QT2, MUST (archivo llamado Growatt), Quattro morado (archivo llamado Multiplus, Phoenix y Quattro), Pylontech US5000 (archivos BSL, Dyness, GoodWe, Growatt ARK, Pytes, BYD), controladores EPEVER sobre nubes, ABB sobre degradado violeta.

### B. Marca de agua o ficha de otra tienda

| Archivo | Qué lleva encima | Productos |
|---|---|---:|
| `public/images/Productos tienda/Luminarias/*` (10 archivos) | Logo SKL, www.skylights.com.co, tablas y «Master Lights» | 12 |
| `inversores/hoymiles-hms.jpg` | Logo SOLUX, www.solux.energy, titular e iconos | 7 |

El logo SKL está confirmado en la luminaria de 30 W, la de 100 W y el reflector de 200 W. Las otras siete de esa carpeta son la misma pieza: escena nocturna arriba y ficha azul abajo.

### C. Foto de otro producto, aunque el fondo sea blanco

| Archivo real | Se está usando como | Fichas |
|---|---|---:|
| Dongle Growatt 800×1000 | Dataloggers y medidores Deye, Huawei, Hoymiles, Solis, APsystems, Eastron, GoodWe | 29 |
| Breaker LUMEK | Cables, pinzas, medidores, breakers y accesorios de muchas marcas | 93 |
| DPS MOREDAY | Supresores Suntree de corriente alterna | 3 |
| DPS Suntree | Archivos llamados Citel y Leader | 20 |
| Breaker Suntree SL7N | Seccionadores y referencias que no son ese modelo | 65 |

### D. Foto real, pero por debajo de 1000 px o con fondo que no es estudio

| Archivo | Medida | Motivo |
|---|---|---|
| `bombeo/kolos3-sumergible.jpg` y `kolos4-sumergible.jpg` | 510×600 y 560×560 | Bombas reales, fondo claro, demasiado chicas |
| `bombeo/kolos-pool.jpg` | 510×600 | Bomba de piscina real, chica |
| `bombeo/kolos-cfp-horizontal.png` | 560×560 | Fondo verde |
| `inversores/deye-hybrid.png` | 550×550 | Fondo azul |
| `inversores/goodwe-es.jpg` | 650×650 | Sirve de look, no de resolución. Además es la misma para ES y SDT |
| `inversores/felicity-hybrid.png` | 800×800 | Dos equipos, corta |
| `inversores/fronius-primo.jpg` | 527×474 | Corta |
| `inversores/studer-xtender.jpg` | 650×953 | Foto real, gris sucio, corta |
| `baterias/huawei-luna.png` | 400×400 | Lavada |
| `paneles-solares/must-panel-mono.jpg` | lienzo grande, sujeto chico, 20 KB | No da para 1600 px |

Placeholders activos, sin foto: `medidor-de-energia-goodwe-gm330` y `inversor-solar-on-grid-goodwe-3kw-gw3000-xs-30`.

## 7. Fuentes que sí aguantan el estilo de estudio

Fondo blanco o recorte limpio, sin marca de otra tienda, lado mayor de al menos 1000 px, producto reconocible. Aun así, varias están compartidas entre potencias distintas: normalizarlas no crea una foto por modelo.

| Archivo | Medida | Producto de muestra | Reserva |
|---|---|---|---|
| `paneles-solares/victron-bluesolar-mono.jpg` | 2110×2000 | Panel Victron SCC900300000 | La mejor de paneles. Frontal. |
| `paneles-solares/ja-solar-625w-bifacial.jpg` | 1500×1500 | JA Solar 625 W | Misma foto en 715 W y 720 W. Perspectiva, no deformar. |
| `paneles-solares/tensite-710w-bifacial.jpg` | 1080×1080 | Tensite 710 W | Perspectiva. |
| `paneles-solares/felicity-panel-mono.jpg` | 1080×1080 | Felicity / Tensite 620 W | Un solo archivo para dos marcas. |
| `inversores/tensite-inverter.jpg` | 1080×1080 | Tensite off-grid 6,5 kW | Logo y pantalla legibles. |
| `baterias/felicity-12v.jpg` | 1500×1500 | Felicity 12 V | Vista trasera. La misma imagen en 24 V y 48 V. |
| `baterias/soluna-battery.png` | 1500×1125 | Soluna | Lateral muy vacío. |
| `protecciones/victron-batteryprotect.jpg` | 3562×1753 | BatteryProtect 12/24 100 A | Recorte ancho, archivo pesado. |
| `monitoreo/victron-cerbo-gx.jpg` | 4246×1519 | Cerbo GX | También asignado al GX Touch, que es otro equipo. |

No hay una foto de controlador que cumpla el criterio. Las que hay son renders de 500 px (EPEVER sobre nubes, Victron/Studer en pedestal).

## 8. Propuesta de piloto — sin procesar todavía

Si apruebas el diagnóstico, el primer lote sería este. Donde no hay original bueno, el piloto muestra la ficha actual y no inventa píxeles.

| Rol | Ficha | Archivo | Decisión propuesta |
|---|---|---|---|
| Panel | `panel-solar-monocristalino-victron-scc900300000` | `victron-bluesolar-mono.jpg` | Procesar. Es la más nítida y frontal. |
| Inversor | `inversor-solar-off-grid-tensite-6-5kw-3004117` | `tensite-inverter.jpg` | Procesar. Fondo blanco, 1080 px, pantalla legible. |
| Batería | `bateria-solar-litio-felicity-12v-1-28kwh-1880812` | `felicity-12v.jpg` | Procesar con reserva: es la espalda del gabinete, no la cara. |
| Controlador | — | — | No procesar. No hay original ≥ 1000 px sin fondo de color. |
| Bomba | `bomba-solar-1100w-kolos3-123-110-20` | `kolos3-sumergible.jpg` | No escalar (510 px). Mostrar el original en la hoja de contacto y pedir foto del fabricante. |

## 9. Qué necesito de ti

1. Visto bueno de este diagnóstico.
2. Confirmación del piloto: Victron panel, Tensite inversor y Felicity batería sí; controlador y bomba no, hasta tener foto oficial.
3. Si prefieres otro panel (JA Solar en perspectiva) o otra batería, dímelo antes de tocar archivos.

Cuando haya OK: copia de originales a `imagenes-originales/`, script `scripts/procesar-imagenes.mjs`, salida WebP 1600 en carpeta nueva, y `docs/contact-sheet.html` solo de esas tres más el antes de la bomba y del controlador.
