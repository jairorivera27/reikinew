# 📋 PLAN DETALLADO: COTIZADOR SOLAR PROFESIONAL

## 🎯 Objetivo
Recrear el cotizador Excel "Cotizador (2.0).xlsm" como aplicación web funcional en `/COTSOLRK` que replique todas sus funcionalidades principales.

---

## 📊 ANÁLISIS DEL EXCEL ACTUAL

### Hojas Principales Identificadas:
1. **Datos de Entrada (On Grid)** - Formulario principal
2. **Datos de Entrada (Off Grid)** - Formulario para sistemas aislados
3. **Datos Equipos** - Base de datos de productos
4. **Calculos (On Grid)** - Motor de cálculos para On-Grid
5. **Calculos (Off Grid)** - Motor de cálculos para Off-Grid
6. **Datos de Salida (On grid)** - Resultados y cotización
7. **Datos de Salida (Off Grid)** - Resultados Off-Grid
8. **Flujo de caja** - Análisis financiero
9. **PPA** - Cálculos para Power Purchase Agreement
10. **Contrato** - Generación de contratos
11. **Historico de Cotizaciones** - Base de datos histórica

---

## 🏗️ ARQUITECTURA PROPUESTA

### 1. ESTRUCTURA DE ARCHIVOS

```
src/
├── pages/
│   └── COTSOLRK.astro                    # Página principal del cotizador
├── components/
│   ├── Cotizador/
│   │   ├── FormularioEntrada.astro       # Formulario de datos del cliente
│   │   ├── SelectorEquipos.astro         # Selector de paneles/inversores
│   │   ├── ResultadosCotizacion.astro    # Vista de resultados
│   │   ├── AnalisisFinanciero.astro      # Flujo de caja, TIR, etc.
│   │   └── GeneradorContrato.astro       # Generación de contrato
│   └── ...
├── lib/
│   ├── cotizador/
│   │   ├── calculos.ts                   # Funciones de cálculo
│   │   ├── equipos.ts                    # Base de datos de equipos
│   │   ├── financiero.ts                 # Cálculos financieros
│   │   └── tipos.ts                      # TypeScript types
│   └── ...
└── content/
    └── equipos/                          # Markdown files para equipos (opcional)
```

---

## 📝 FUNCIONALIDADES DETALLADAS

### FASE 1: FORMULARIO DE ENTRADA

#### 1.1 Datos del Cliente
- [ ] **Campos básicos:**
  - Nombre / Razón Social
  - NIT / Cédula
  - Email
  - Teléfono
  - Dirección
  - Ciudad
  - Tipo de cliente (Residencial, Comercial, Industrial, Oficial)

#### 1.2 Datos del Proyecto
- [ ] **Tipo de Sistema:**
  - On-Grid (Conectado a red)
  - Off-Grid (Aislado)
  - Híbrido

- [ ] **Para On-Grid:**
  - Consumo mensual (kWh/mes) - 12 campos (uno por mes) o promedio
  - Tarifa eléctrica ($/kWh)
  - % Autoconsumo deseado (0-100%)
  - Tipo de cubierta/montaje (Alurack, estructura, etc.)
  - Tipo de acometida (IMC Exterior, Subterránea, etc.)
  - ¿El cliente paga contribución? (Sí/No)
  - Propiedad del transformador (Propio/Compartido)

- [ ] **Para Off-Grid:**
  - Consumo diario (kWh/día)
  - Días de autonomía
  - Voltaje del sistema (12V, 24V, 48V)
  - Tipo de consumo (solo día, día y noche, 24h)

#### 1.3 Selección de Equipos
- [ ] **Paneles Solares:**
  - Selector de tipo de panel
  - Mostrar especificaciones (potencia, dimensiones, eficiencia, precio)
  - Cálculo automático de cantidad según consumo

- [ ] **Inversores:**
  - Selector de tipo (String, Microinversor, Híbrido)
  - Mostrar especificaciones (potencia, eficiencia, precio)
  - Cálculo automático de cantidad según paneles

- [ ] **Baterías (solo Off-Grid/Híbrido):**
  - Selector de tipo de batería
  - Cálculo automático de capacidad necesaria

- [ ] **Controladores (solo Off-Grid):**
  - Selector MPPT
  - Cálculo automático según paneles

---

### FASE 2: MOTOR DE CÁLCULOS

#### 2.1 Cálculos On-Grid
- [ ] **Cálculo de Potencia Necesaria:**
  ```typescript
  consumoAnual = sum(consumosMensuales) o promedio * 12
  potenciaNecesaria = consumoAnual / (HSP * 365 * factorEficiencia)
  ```

- [ ] **Cálculo de Paneles:**
  ```typescript
  cantidadPaneles = ceil(potenciaNecesaria / potenciaPanel)
  potenciaInstalada = cantidadPaneles * potenciaPanel
  ```

- [ ] **Cálculo de Generación:**
  ```typescript
  generacionAnual = potenciaInstalada * HSP * 365 * factorEficiencia
  generacionMensual = generacionAnual / 12
  ```

- [ ] **Cálculo de Ahorro:**
  ```typescript
  energiaAutoconsumo = generacionAnual * porcentajeAutoconsumo
  energiaExcedente = generacionAnual - energiaAutoconsumo
  ahorroAnual = (energiaAutoconsumo * tarifa) + (energiaExcedente * tarifaVenta)
  ```

#### 2.2 Cálculos Off-Grid
- [ ] **Cálculo de Capacidad de Batería:**
  ```typescript
  consumoDiario = consumoMensual / 30
  capacidadBateria = (consumoDiario * diasAutonomia) / (profundidadDescarga * voltaje)
  ```

- [ ] **Cálculo de Paneles:**
  ```typescript
  energiaNecesaria = consumoDiario / (HSP * factorEficiencia)
  potenciaNecesaria = energiaNecesaria / horasSol
  cantidadPaneles = ceil(potenciaNecesaria / potenciaPanel)
  ```

- [ ] **Cálculo de Controlador:**
  ```typescript
  corrienteMaxima = (cantidadPaneles * corrientePanel) * factorSeguridad
  // Seleccionar controlador con capacidad >= corrienteMaxima
  ```

#### 2.3 Validaciones Técnicas
- [ ] Verificar compatibilidad voltaje paneles-inversor
- [ ] Verificar amperaje máximo controladores
- [ ] Verificar restricciones de área disponible
- [ ] Verificar límites de conexión en paralelo/serie

---

### FASE 3: BASE DE DATOS DE EQUIPOS

#### 3.1 Estructura de Datos
```typescript
interface Equipo {
  id: string;
  tipo: 'panel' | 'inversor' | 'bateria' | 'controlador' | 'estructura' | 'accesorio';
  categoria: string; // 'paneles', 'inversores', etc.
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  
  // Especificaciones técnicas
  potencia?: number; // W para paneles, kW para inversores
  voltaje?: number;
  corriente?: number;
  eficiencia?: number;
  dimensiones?: { ancho: number; largo: number; alto?: number };
  area?: number; // m²
  
  // Precios
  precioUnitario: number; // COP
  precioWp?: number; // Para paneles
  
  // Imagen
  imagen?: string;
  
  // Compatibilidad
  compatibilidad?: string[];
}
```

#### 3.2 Fuentes de Datos
- [ ] **Opción 1:** Archivo JSON estático (`src/lib/cotizador/equipos.json`)
- [ ] **Opción 2:** Markdown files en `src/content/equipos/`
- [ ] **Opción 3:** API endpoint que lee del Excel (para mantener sincronización)

#### 3.3 Equipos a Incluir (basado en Excel)
- [ ] **Paneles:**
  - Policristalino: 40W, 60W, 80W, 100W, 140W, 200W, 310W
  - Monocristalino: 360W, 445W, 540W, 545W, 550W, 570W, 585W, 600W, etc.
  
- [ ] **Inversores:**
  - Microinversores: 800W, 1600W, 2000W
  - String: Varios modelos
  - Híbridos: 3kW, 5kW, 8kW, 10kW
  
- [ ] **Baterías:**
  - Litio: US5000, US3000, etc.
  - Plomo-ácido: Varios modelos
  
- [ ] **Controladores:**
  - MPPT: 20A, 40A, 60A, 80A, 100A, 150A
  
- [ ] **Estructuras y Accesorios:**
  - Estructuras para techo
  - Tableros de protección
  - Cajas, fusibles, breakers
  - Cables, conectores

---

### FASE 4: GENERACIÓN DE COTIZACIÓN

#### 4.1 Lista de Items
- [ ] Mostrar equipos seleccionados con:
  - Descripción completa
  - Cantidad
  - Precio unitario
  - Subtotal por item
  - Descuento por item (si aplica)

#### 4.2 Cálculo de Totales
- [ ] Subtotal (suma de todos los items)
- [ ] Descuento general (porcentaje configurable)
- [ ] Subtotal con descuento
- [ ] IVA (19%)
- [ ] Total final

#### 4.3 Items Adicionales (del Excel)
- [ ] Accesorios y tablero de protección
- [ ] Estructura para paneles
- [ ] Instalación, transporte, supervisión
- [ ] Servicio de certificación RETIE
- [ ] Obras adicionales (si aplica)
- [ ] Transporte de materiales

#### 4.4 Presentación
- [ ] Vista de tabla ordenada
- [ ] Formato de moneda colombiana
- [ ] Opción de editar cantidades/precios
- [ ] Opción de agregar items manuales

---

### FASE 5: ANÁLISIS FINANCIERO

#### 5.1 Flujo de Caja (On-Grid)
- [ ] **Año 0:**
  - Inversión inicial (total cotización)
  
- [ ] **Años 1-25:**
  - Ahorro anual (con incremento por inflación tarifa)
  - Degradación de paneles (0.5-0.7% anual)
  - Operación y mantenimiento (OPEX)
  - Flujo neto anual
  - Flujo acumulado

#### 5.2 Métricas Financieras
- [ ] **Años de Recuperación:**
  ```typescript
  añosRecuperacion = inversiónInicial / ahorroAnualPromedio
  ```

- [ ] **TIR (Tasa Interna de Retorno):**
  ```typescript
  // Calcular TIR usando método de Newton-Raphson o similar
  // TIR es la tasa que hace VAN = 0
  ```

- [ ] **VAN (Valor Actual Neto):**
  ```typescript
  VAN = -inversion + sum(flujoAnual / (1 + tasaDescuento)^año)
  ```

- [ ] **ROI (Retorno de Inversión):**
  ```typescript
  ROI = (ahorroTotal - inversion) / inversion * 100
  ```

#### 5.3 Gráficas
- [ ] Gráfica de flujo de caja acumulado
- [ ] Gráfica de generación mensual
- [ ] Gráfica de ahorro mensual
- [ ] Comparativa consumo vs generación

#### 5.4 Impacto Ambiental
- [ ] Toneladas de CO2 evitadas por año
- [ ] Equivalente a árboles plantados
- [ ] Equivalente a autos retirados de circulación

---

### FASE 6: GENERACIÓN DE DOCUMENTOS

#### 6.1 Cotización PDF
- [ ] Encabezado con logo y datos de la empresa
- [ ] Datos del cliente
- [ ] Número de cotización y fecha
- [ ] Lista de equipos con precios
- [ ] Totales (subtotal, descuento, IVA, total)
- [ ] Condiciones comerciales
- [ ] Validez de la cotización
- [ ] Firma y contacto

#### 6.2 Contrato PDF (Opcional)
- [ ] Plantilla de contrato
- [ ] Campos reemplazables con datos del cliente
- [ ] Términos y condiciones
- [ ] Forma de pago
- [ ] Plazos de ejecución

#### 6.3 Envío por WhatsApp
- [ ] Mensaje formateado con toda la información
- [ ] Resumen ejecutivo
- [ ] Link para descargar PDF (si está disponible)

---

### FASE 7: FUNCIONALIDADES ADICIONALES

#### 7.1 Histórico de Cotizaciones
- [ ] Guardar cotizaciones en localStorage
- [ ] Lista de cotizaciones anteriores
- [ ] Opción de duplicar/editar cotizaciones anteriores
- [ ] Exportar histórico a Excel/CSV

#### 7.2 Configuración
- [ ] Configurar porcentajes de descuento por defecto
- [ ] Configurar tarifas de venta de excedentes
- [ ] Configurar factores de eficiencia
- [ ] Configurar HSP (Horas Sol Pico) por ciudad

#### 7.3 Validaciones y Alertas
- [ ] Validar que todos los campos requeridos estén completos
- [ ] Alertas de incompatibilidad técnica
- [ ] Sugerencias de optimización
- [ ] Advertencias sobre restricciones de área

---

## 🎨 DISEÑO DE INTERFAZ

### Layout Principal
```
┌─────────────────────────────────────────────────────────┐
│  HEADER (Logo, Navegación)                              │
├─────────────────────────────────────────────────────────┤
│  Título: Cotizador Solar Profesional                    │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│  FORMULARIO      │  RESULTADOS                          │
│  DE ENTRADA      │  Y COTIZACIÓN                        │
│                  │                                      │
│  - Datos Cliente │  - Lista de Equipos                  │
│  - Tipo Sistema  │  - Totales                           │
│  - Consumo       │  - Análisis Financiero               │
│  - Equipos       │  - Gráficas                          │
│                  │                                      │
│                  │  [Enviar WhatsApp] [Generar PDF]     │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### Responsive Design
- [ ] Mobile-first approach
- [ ] Layout de una columna en móviles
- [ ] Layout de dos columnas en desktop
- [ ] Navegación por tabs/secciones

---

## 🔧 TECNOLOGÍAS Y HERRAMIENTAS

### Frontend
- **Astro** - Framework base
- **TypeScript** - Tipado estático
- **Vanilla JavaScript** - Lógica del cotizador (sin frameworks pesados)
- **CSS Moderno** - Grid, Flexbox, Variables CSS

### Librerías Adicionales
- [ ] **Chart.js** o **ApexCharts** - Para gráficas financieras
- [ ] **jsPDF** o **PDFKit** - Para generación de PDFs
- [ ] **xlsx** (opcional) - Para exportar a Excel

### Almacenamiento
- **localStorage** - Para histórico de cotizaciones
- **JSON estático** - Para base de datos de equipos

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1: Estructura Base
- [ ] Crear estructura de archivos
- [ ] Implementar formulario de entrada básico
- [ ] Crear base de datos de equipos (JSON)
- [ ] Implementar selección de equipos

### Semana 2: Motor de Cálculos
- [ ] Implementar cálculos On-Grid
- [ ] Implementar cálculos Off-Grid
- [ ] Validaciones técnicas
- [ ] Pruebas de cálculos

### Semana 3: Interfaz y Resultados
- [ ] Vista de resultados y cotización
- [ ] Cálculo de totales
- [ ] Análisis financiero básico
- [ ] Gráficas

### Semana 4: Funcionalidades Avanzadas
- [ ] Generación de PDF
- [ ] Envío por WhatsApp
- [ ] Histórico de cotizaciones
- [ ] Ajustes y pulido

---

## ✅ CRITERIOS DE ÉXITO

1. **Funcionalidad:**
   - ✅ Todos los cálculos del Excel funcionan correctamente
   - ✅ Los resultados coinciden con el Excel (margen de error < 1%)
   - ✅ Validaciones técnicas funcionan

2. **Usabilidad:**
   - ✅ Interfaz intuitiva y fácil de usar
   - ✅ Responsive en todos los dispositivos
   - ✅ Tiempo de carga < 3 segundos

3. **Mantenibilidad:**
   - ✅ Código bien documentado
   - ✅ Fácil de actualizar precios de equipos
   - ✅ Fácil de agregar nuevos equipos

4. **Compatibilidad:**
   - ✅ Funciona en Chrome, Firefox, Safari, Edge
   - ✅ Funciona en móviles iOS y Android

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Crear estructura base del proyecto**
2. **Implementar formulario de entrada básico**
3. **Crear base de datos de equipos (empezar con 5-10 equipos principales)**
4. **Implementar cálculos básicos On-Grid**
5. **Mostrar resultados en pantalla**

---

## ❓ DECISIONES PENDIENTES

1. **Base de datos de equipos:**
   - ¿JSON estático o Markdown files?
   - ¿Cómo mantener sincronizado con el Excel?

2. **Generación de PDF:**
   - ¿jsPDF (cliente) o PDFKit (servidor)?
   - ¿Qué plantilla usar?

3. **Almacenamiento:**
   - ¿Solo localStorage o también backend?
   - ¿Guardar histórico en servidor?

4. **Actualización de precios:**
   - ¿Manual o automática?
   - ¿Desde Excel o desde admin panel?

---

## 📝 NOTAS ADICIONALES

- El Excel tiene macros VBA que no se pueden replicar directamente
- Algunos cálculos complejos pueden requerir librerías adicionales
- La generación de PDF puede ser el desafío más grande
- Considerar hacer el cotizador progresivo (PWA) para uso offline

---

**¿Quieres que proceda con la implementación siguiendo este plan?**

