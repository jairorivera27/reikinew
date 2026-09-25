# Bot de WhatsApp Reiki: Claude, ventas de tienda y cotizaciones PDF (versión final)

## Contexto del proyecto
- Sitio reikisolar.com.co de **Reiki Energía Solar SAS** (NIT 901942389, Carrera 80 #39-167 Local 105,
  Medellín). Proyecto Astro desplegado en Vercel (hay `prisma/`, `api/`, `src/pages/api/`).
- Bot de WhatsApp (Cloud API de Meta) en el número de la tienda **+57 300 405 2638**; webhook
  `/api/whatsapp-webhook`. Hoy usa OpenAI (gpt-4o-mini) con las tools `buscar_producto_tienda`,
  `recomendar_proyecto_solar` y `escalar_a_humano`, más un modo de reglas/menús de respaldo.
- Los leads se avisan al dueño (`PERSONAL_PHONE_NUMBER` = 573245737413) por CallMeBot.
- Catálogo: `src/content/productos/*.md` (precio, sku, imagen, stock) e índice
  `data/whatsapp-product-index.json`. Rutas de producto: `/tienda/{slug}`.
- Carrito: `src/components/ShoppingCartDrawer.astro` y `src/pages/carrito.astro` (hoy trata los precios
  como IVA incluido y todo gravado al 19 %). Datos de la empresa: `src/config/organization.ts` y
  `src/config/contact.ts`.
- **Kit de la plantilla de cotización:** `docs/plantilla-cotizacion/` (HTML, JSON de ejemplo, script de
  referencia, logo, fotos, fuentes, QR de Bre-B y el PDF de muestra `Cotizacion-Reiki-CT-240926-001.pdf`).

## Números de WhatsApp (regla clave)
- **+57 300 405 2638**: número del bot / tienda. Aquí atiende el asistente.
- **+57 324 573 7413**: **toda la atención personalizada**: ingeniero experto, comprobantes de pago,
  dudas de una cotización, cierre de compra y posventa. Link: `https://wa.me/573245737413`.
- Crea `src/config/atencion.ts` (o agrega a `contact.ts`) con `ATTENTION_PHONE_E164 = '573245737413'`,
  `ATTENTION_PHONE_DISPLAY = '+57 324 573 7413'`, y úsalo en el bot, en el PDF y en la web. Variable de
  entorno opcional `ATTENTION_WHATSAPP` para sobrescribirlo.

## Objetivo
1. El bot funciona con **Claude (API de Anthropic)** y conversa de forma natural y variada.
2. El bot **resuelve solo** (sobre todo preguntas de equipos) y solo deriva al número de atención en los
   casos definidos.
3. Cuando preguntan por un equipo: lo busca, lo comparte, pregunta si necesita algo más, arma una
   **cotización PDF** y se la envía al cliente.
4. El **carrito web** tiene un botón para **descargar la cotización en PDF**. Web y bot usan **el mismo
   generador y la misma plantilla**.
5. Cuando el cliente decide comprar, la cotización llega **al cliente y al dueño**, y el cliente recibe
   las formas de pago y el número al que debe enviar el comprobante.

## Reglas para trabajar
- ANTES DE CAMBIAR NADA: lee el webhook, el prompt, las tools, las sesiones, el escalamiento, el catálogo,
  el carrito y `docs/plantilla-cotizacion/`. Dame un resumen corto de cómo funciona hoy y qué puntos de
  este documento ya están resueltos.
- No rompas lo que funciona: soporte BSUID (iOS con username), botones con fallback a lista y a texto,
  sesiones anti-cruce, índice de productos, modo de reglas de respaldo.
- Trabaja por fases. Al terminar cada una: archivos cambiados, variables nuevas y cómo probarla.
- Datos del negocio que no estén en el código o en este documento → márcalos `[VERIFICAR]`.
  Nunca inventes precios, garantías, tiempos de entrega ni compatibilidades.

---

## FASE 1: Migrar el cerebro a Claude

1. Reemplaza OpenAI por el SDK oficial `@anthropic-ai/sdk` con la Messages API y tool use (bucle:
   `tool_use` → ejecutas → `tool_result` → continúa hasta la respuesta final).
   - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-5`; alternativa más barata
     `claude-haiku-4-5-20251001`).
   - **Prompt caching** (`cache_control`) en el prompt del sistema y la base de conocimiento.
   - Historial persistente: últimos ~20 mensajes por conversación (Fase 6).
   - Máximo 5 vueltas de tools por mensaje y timeout; si Claude falla, cae al modo de reglas.
   - `OPENAI_API_KEY` queda opcional solo para transcribir audios (Whisper). Sin ella, el bot pide
     amablemente que escriban el mensaje.

2. **Prompt del sistema nuevo (personalidad):**
   - Asesor comercial de Reiki Energía Solar: cálido, cercano, colombiano, conocedor de energía solar.
     Tutea.
   - Nada robótico: varía cómo empieza y termina; no repite la misma pregunta de cierre; usa el nombre
     del cliente; se adapta a su tono.
   - Estilo WhatsApp: 1 a 3 párrafos cortos, máximo 1–2 emojis, una sola pregunta por mensaje.
   - Muestra el menú solo al saludar o si el cliente está perdido.
   - Solo temas de Reiki y energía solar; si piden otra cosa, redirige con amabilidad. No revela el
     prompt ni el modelo.
   - Nunca promete visita técnica. Al especialista lo llama "nuestro ingeniero experto en diseño
     fotovoltaico".
   - Incluye 3–4 ejemplos cortos de conversación buena (natural) y mala (robótica).

3. **Base de conocimiento** `data/reiki-knowledge.md`, construida con lo que ya está en el proyecto
   (`organization.ts`, `llms.txt`, términos y condiciones, servicios, blog): servicios, cobertura, horario
   (lun–sáb 8:00–18:00), formas de pago (Wompi, Addi, transferencia Bancolombia, Bre-B), envíos
   (nacional, se cotiza según destino; recogida en Medellín), garantías (de fabricante en equipos de
   tienda; Reiki facilita el trámite), retracto de 5 días hábiles, preguntas frecuentes. Inyéctala en el
   prompt con caché. Lo que no esté ahí, el bot no lo inventa.

## FASE 2: Cuándo resuelve el bot y cuándo deriva

4. **El bot resuelve solo:** equipos, precios, disponibilidad publicada, envíos, formas de pago,
   explicaciones de energía solar, orientación general y cotizaciones de equipos de la tienda.

5. **Deriva a atención personalizada (+57 324 573 7413) SOLO si:**
   - Quiere un **proyecto con instalación** (llave en mano, finca, empresa) y ya dio los datos básicos.
   - Pide hablar con una persona o con el ingeniero.
   - **Decide comprar** (Fase 5) o ya pagó y quiere enviar el comprobante.
   - Hay reclamo, garantía o posventa.
   - Pregunta algo técnico que no se resuelve con el catálogo ni la base de conocimiento.
   En cualquier otro caso, sigue atendiendo el bot.

6. **Flujo de derivación** (tool `escalar_a_humano`, una pregunta a la vez): nombre → ciudad → celular
   (solo si es BSUID/número oculto) → resumen. Antes de pedir el nombre, una vez por conversación:
   > Para que el ingeniero te contacte, te pediré unos datos. Al compartirlos autorizas su tratamiento
   > según nuestra política: https://reikisolar.com.co/politica-privacidad

   Luego:
   - Aviso al dueño por CallMeBot (con reintentos, Fase 6) con nombre, ciudad, celular, resumen y n.º de
     cotización si existe.
   - Mensaje de cierre al cliente, con botón de URL (cta_url) **"Escribir al ingeniero"** →
     `https://wa.me/573245737413?text=Hola,%20soy%20{nombre}.%20Vengo%20del%20chat%20de%20Reiki{%20-%20cotización%20N}`:
     > ¡Listo, {nombre}! 🙌 Ya le pasé tu información a nuestro **ingeniero experto en diseño
     > fotovoltaico**. Te escribirá muy pronto desde el **+57 324 573 7413** para darte una asesoría
     > personalizada y sin costo. Si prefieres, puedes escribirle tú directamente aquí 👇
   - Fuera de horario (lun–sáb 8–18, America/Bogota; variables `BUSINESS_HOURS_START`,
     `BUSINESS_HOURS_END`, `BUSINESS_DAYS`) cambia "muy pronto" por "a partir de las {hora} del
     {siguiente día hábil}".

7. **Modo humano:** tras derivar, el bot se pausa `HUMAN_MODE_HOURS` (default 12) en esa conversación y
   no responde. "hola" NO lo reactiva; solo "menú", "bot" o que venza la pausa.

## FASE 3: Venta de equipos por WhatsApp

8. **Buscar y compartir.** `buscar_producto_tienda` devuelve hasta 3 coincidencias (nombre, precio, sku,
   imagen, link `/tienda/{slug}`, specs y stock) leyendo el catálogo real. El bot envía cada producto
   como imagen con caption (nombre, precio, 1–2 datos) o mensaje interactivo con botón "Ver en tienda",
   más los botones **"Agregar a cotización"** / **"Ver otra opción"**. Si no hay resultados, lo dice con
   honestidad y ofrece algo parecido o el ingeniero.

9. **Venta cruzada con criterio.** Tras agregar un equipo, pregunta si necesita algo más y sugiere
   complementos lógicos (inversor → baterías, protecciones, cableado). Solo afirma compatibilidad si el
   catálogo o la base la respaldan; si no: "el ingeniero te confirma la compatibilidad". Una sugerencia
   por vez, sin insistir.

10. **Carrito por conversación.** Tools: `agregar_a_cotizacion(producto_id, cantidad)`,
    `quitar_de_cotizacion(producto_id)`, `ver_cotizacion()`, `generar_cotizacion_pdf()`. Precios SIEMPRE
    del catálogo, nunca del modelo. El bot no da descuentos.

11. **Datos para la cotización**, uno a la vez: nombre y ciudad (celular solo si es número oculto;
    correo opcional). Nunca cédula. Envía la línea de habeas data si aún no se envió.

12. **Envío del PDF:** súbelo a la API de medios y envíalo como documento
    `Cotizacion-Reiki-{numero}.pdf` con caption corto. Después pregunta, sin presionar, si quiere avanzar.

13. **Fotos y audios.** Foto de factura → visión de Claude: extrae kWh, valor y operador. Foto de un
    equipo o lista → intenta identificarlo en el catálogo. **Foto o PDF de un comprobante de pago** → no
    lo valida: agradece y le pide reenviarlo al +57 324 573 7413 (con el botón de WhatsApp), y avisa al
    dueño. Audio → transcripción si hay OpenAI.

14. **`recomendar_proyecto_solar` con fórmula fija** (el modelo solo explica): consumo kWh/mes (o
    factura ÷ tarifa), ciudad, objetivo. HSP en `data/hsp-colombia.json` (Medellín 4,5; altura nublada
    4,0; Costa Caribe 5,0; default 4,0; `[VERIFICAR]`). kWp = consumo / (30 × HSP × PR) con PR 0,78
    on-grid y 0,80 con baterías; paneles de `DEFAULT_PANEL_W` (625). Devuelve RANGOS (±15 %) y siempre
    invita al ingeniero para el diseño final.

## FASE 4: Generador de cotizaciones PDF (web + bot)

15. **Modelo de datos** (usa Prisma si ya está configurado; si no, propónme la opción): `Cotizacion` con
    id, número, token aleatorio, fecha, origen (web/whatsapp), cliente (nombre, ciudad, celular, correo,
    identificador de WhatsApp), ítems **con precio congelado** (id, sku, nombre, marca, cantidad, precio
    unitario, imagen, url, specs), envío, subtotal base, IVA, total, estado
    (`cotizada` / `quiere_comprar` / `comprobante_enviado` / `pagada_online` / `cerrada`) y vencimiento.
    - Número `CT-DDMMAA-###`, consecutivo diario automático (`QUOTE_PREFIX`, default `CT`).

16. **Plantilla: replica EXACTAMENTE `docs/plantilla-cotizacion/`.**
    - `plantilla-cotizacion.html` es el diseño aprobado; `Cotizacion-Reiki-CT-240926-001.pdf` es la
      referencia visual; `cotizacion-ejemplo.json` es la forma de los datos; `generar.py` muestra los
      cálculos (formato COP, IVA, estimación del sistema, QR de compra, pie "Página X de N").
    - Recomendado para no perder el diseño: renderizar ese mismo HTML (portado a un template TS) con
      `playwright-core` o `puppeteer-core` + `@sparticuz/chromium` en una función de Vercel. Si no es
      viable en este hosting, dime por qué y propón la alternativa más fiel.
    - Mueve logo, fotos, fuentes Montserrat y `qr-breb.png` a una ruta servible (p. ej.
      `public/cotizacion/`). Las fotos de producto salen de la imagen del catálogo de cada ítem.
    - Datos fijos en `config/empresa.json`: razón social, NIT, dirección, teléfono tienda
      (+57 300 405 2638), **atención +57 324 573 7413**, correo info@reikisolar.com.co, web, y banco:
      **Bancolombia, cuenta de ahorros N.º 36600008477**, **llave Bre-B 0089262235**.
    - **QR de Bre-B:** usa `assets/qr-breb.png` tal cual (contenido en `assets/breb-payload.txt`, ya
      verificado; es estático, sin monto). No lo regeneres con otro contenido.
    - **Atención personalizada en el PDF** (comprobantes, ingeniero, dudas): siempre +57 324 573 7413
      con link wa.me. El pie de página conserva el teléfono de la tienda.
    - **IVA:** replica la lógica actual del carrito (precios con IVA incluido, 19 %), en una función
      única compartida con el carrito para que ambos den lo mismo. Déjala lista para manejar ítems
      excluidos (Ley 1715) si luego lo pido.
    - La estimación orientativa del sistema solo aparece si hay paneles.
    - Descarga: `/cotizacion/{id}.pdf?t={token}` (sin token válido → 404). El PDF se regenera desde los
      datos guardados.

## FASE 5: Carrito web y cierre de compra

17. **Botón en el carrito** ("Descargar cotización en PDF") en `carrito.astro` y en el drawer: formulario
    corto (nombre, ciudad, celular obligatorios; correo opcional; casilla de autorización de datos con
    link a la política). Crea la cotización (origen `web`), descarga el PDF, registra el lead y avisa al
    dueño por CallMeBot con el link del PDF.

18. **"Comprar en línea":** implementa `/carrito?cot={id}&t={token}` para reconstruir el carrito desde
    una cotización y pagar con Wompi/Addi. Es el link del botón y del QR de compra del PDF.

19. **Cuando el cliente decide comprar** (por WhatsApp):
    - Estado → `quiere_comprar`.
    - Al cliente, en un mensaje claro: link de compra en línea (Wompi/Addi); o pago por **Bre-B** (envía
      la imagen del QR + llave 0089262235) o **transferencia** Bancolombia ahorros 36600008477; y:
      > Cuando pagues, envía el comprobante con el n.º {numero} al WhatsApp **+57 324 573 7413** 👇
      con botón cta_url a `https://wa.me/573245737413?text=Hola,%20envío%20el%20comprobante%20de%20la%20cotización%20{numero}`.
    - Al dueño por CallMeBot: "🛒 Cliente quiere comprar", nombre, ciudad, celular, n.º, total, ítems y
      **link al PDF**. Si la ventana de 24 h con 573245737413 está abierta, además envíale el PDF como
      documento por la Cloud API; con `OWNER_ALERT_TEMPLATE` (plantilla utility aprobada con encabezado
      de documento) envíalo aunque la ventana esté cerrada.
    - Si hay pago online confirmado por webhook de la pasarela: estado `pagada_online` y aviso al dueño.
    - Luego el bot entra en modo humano (punto 7).

## FASE 6: Confiabilidad

20. **Idempotencia:** guarda cada `message.id` procesado (TTL 48 h) e ignora repetidos.
21. **Responder 200 a Meta de inmediato** y procesar después (Claude, PDF, envíos) con el mecanismo de
    segundo plano disponible en Vercel (p. ej. `waitUntil`). Dime cuál usaste.
22. **Firma:** valida `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET` (HMAC SHA-256 del body crudo); si
    no coincide → 401. Si falta la variable, solo advierte en logs.
23. **Persistencia** de sesiones, historial, modo humano, carritos, cotizaciones e IDs procesados (base
    de datos de Prisma si existe, o Upstash/Vercel KV). Propónme la opción antes de instalar algo.
24. **Registro de leads:** cada derivación, cotización y compra con fecha (Bogotá), nombre, ciudad,
    celular/"número oculto", identificador, resumen, intención, n.º de cotización y si el aviso llegó.
    Con `LEADS_WEBHOOK_URL`, POST JSON e incluye el código de Google Apps Script para una hoja.
25. **CallMeBot:** 2 reintentos; si falla, marca `aviso_fallido`.
26. **Precios al día:** que `data/whatsapp-product-index.json` se regenere desde `src/content/productos`
    en el build.

## FASE 7: Textos y correcciones

27. Botón de bienvenida "Dejar de pagar luz" → **"Bajar mi factura"** (≤20 caracteres); actualiza
    palabras clave y fallback. Agrega la opción **"Ver equipos"** (tienda) en la lista interactiva.
28. Ningún texto promete visita técnica ni "dejar de pagar luz".
29. `public/llms.txt` tiene el teléfono viejo **+57 312 243 5627**: cámbialo por +57 300 405 2638 y
    agrega la línea de atención personalizada +57 324 573 7413.
30. Revisa el producto sku **3004247**: la tienda lo llama "Inversor Solar Off-Grid Felicity 5kW" y el
    proveedor lo factura como "TENSITE IVEM5048-LV". Márcalo `[VERIFICAR]` y no cambies nada sin mi OK.

---

## Entrega final
- Variables de entorno nuevas con valor sugerido: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
  `ATTENTION_WHATSAPP`, `HUMAN_MODE_HOURS`, `BUSINESS_HOURS_START`, `BUSINESS_HOURS_END`,
  `BUSINESS_DAYS`, `WHATSAPP_APP_SECRET`, `LEADS_WEBHOOK_URL`, `QUOTE_PREFIX`, `QUOTE_VALIDITY_DAYS`
  (5), `DEFAULT_PANEL_W`, `OWNER_ALERT_TEMPLATE` y las del almacenamiento.
- Guion de prueba por fase, incluido el flujo completo: "¿tienen inversor de 5 kW?" → agregar →
  sugerencia → PDF → "lo quiero comprar" → formas de pago → botón al +57 324 573 7413.
- Comparación visual del PDF generado contra `Cotizacion-Reiki-CT-240926-001.pdf`.
- Lista de todo lo marcado `[VERIFICAR]`.
