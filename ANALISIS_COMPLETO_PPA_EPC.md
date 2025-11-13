# 📊 ANÁLISIS COMPLETO: MODELOS PPA Y EPC

## 🎯 Resumen Ejecutivo

El Excel "Cotizador (2.0).xlsm" implementa **dos modelos de negocio** para sistemas solares:

1. **EPC (Engineering, Procurement, Construction)**: Cliente invierte y es propietario
2. **PPA (Power Purchase Agreement)**: Sin inversión inicial, compra de energía a precio fijo

---

## 📋 ESTRUCTURA DE HOJAS

### Hojas que GENERAN RESULTADOS (mantener):

#### Modelo EPC:
1. **Datos de Entrada (On Grid)** - ✅ Entrada de datos
2. **Calculos (On Grid)** - ✅ Motor de cálculos
3. **Datos de Salida (On grid)** - ✅ Resultados y cotización
4. **Flujo de caja** - ✅ Análisis financiero EPC

#### Modelo PPA:
1. **PPA Calculos** - ✅ Motor de cálculos PPA
2. **PPA Datos Salida** - ✅ Resultados PPA (tarifas, ahorros)
3. **PPA Flujo de Caja Cliente** - ✅ Flujo desde perspectiva cliente
4. **PPA inversionista** - ✅ Flujo desde perspectiva inversionista

#### Modelo Off-Grid:
1. **Datos de entrada (Off grid)** - ✅ Entrada de datos
2. **Calculos (Off Grid)** - ✅ Motor de cálculos
3. **Datos de salida (Off Grid)** - ✅ Resultados

### Hojas AUXILIARES (no generan resultados directos):
- **Datos Equipos** - Base de datos (ya implementada)
- **Referencias** - Tablas de referencia
- **Var. Financieras** - Variables financieras (IPC, IPP, etc.)
- **Historico de Cotizaciones** - Histórico (ya implementado)
- **Precios**, **Precios Meico**, **Precios E&M** - Listas de precios
- **Contrato** - Plantilla de contrato
- **Graficas** - Gráficas (opcional)

---

## 🔍 ANÁLISIS DETALLADO: MODELO PPA

### Hoja "PPA Calculos" - Motor Principal

**Entradas (referencias a otras hojas):**
- Potencia Instalada (DC): `'Calculos (On Grid)'!C24`
- Potencia Instalada (AC): `'Calculos (On Grid)'!B30/1000`
- Radiación Promedio: `'Calculos (On Grid)'!B5`
- Generación de Energía: `'Datos de Salida (On grid)'!D7`
- CAPEX: `'Datos de Salida (On grid)'!I14` (costo total del sistema)
- Tarifa Eléctrica: `'Datos de Salida (On grid)'!D12`
- Porcentaje autoconsumo: `'Datos de Entrada (On Grid)'!D16`
- IPC: `'Var. Financieras'!B9`
- Aumento Precio Energía: `'Var. Financieras'!B10`
- IPP: `'Var. Financieras'!B9`

**Parámetros clave:**
- Perdida de Eficiencia: 0.55% anual (D6)
- OPEX/CAPEX: 1.5% anual (D13)
- WACC: 12% (D27) - Costo de oportunidad del capital
- Vida Útil: 25 años (D28)
- CRF (Capital Recovery Factor): `(WACC*(1+WACC)^VidaUtil)/(((1+WACC)^VidaUtil)-1)`

**Cálculos principales:**

1. **Energía Desplazada (año a año):**
   - Año 1: `D5` (generación inicial)
   - Año 2: `D35-D35*$D$6` (aplicando degradación)
   - Año N: `Año(N-1) - Año(N-1)*0.0055`

2. **Tarifa Eléctrica Equivalente:**
   - Año 1: `G127` (precio PPA calculado)
   - Año 2: `D36+D36*$D$20` (aplicando IPC)
   - Año N: `Año(N-1) + Año(N-1)*IPC`

3. **Ahorro de Energía:**
   - `Energía Desplazada * Tarifa Eléctrica Equivalente`

4. **Precio PPA ($/kWh):**
   - Se calcula usando CRF y flujo de caja del inversionista
   - Diferentes precios para 10, 12, 15 años

### Hoja "PPA Datos Salida" - Resultados

**Salidas principales:**
- **Tarifa PPA ($/kWh)** para diferentes duraciones:
  - 10 años: `'PPA Calculos'!G127`
  - 12 años: `'PPA Calculos'!G128`
  - 15 años: `'PPA Calculos'!G130`

- **Ahorro anual proyecto:**
  - `Generación * ((Tarifa Actual - Tarifa PPA) * %Autoconsumo + (Tarifa Actual * 0.9 - Tarifa PPA) * (1 - %Autoconsumo))`

- **Valor Cuota Mensual PPA:**
  - `Tarifa PPA * Generación Anual / 12`

### Hoja "PPA Flujo de Caja Cliente"

**Estructura:**
- **Año 0**: Inversión Inicial = **0** (cliente no invierte)
- **Años 1-N**:
  - Energía Generada (con degradación)
  - Tarifa Convencional (con IPC)
  - Tarifa PPA (fija o con escalamiento)
  - Ahorro por kWh = Tarifa Convencional - Tarifa PPA
  - Ahorro de Energía = Energía Generada * Ahorro por kWh
  - Flujo de Caja = Ahorro de Energía (sin inversión inicial)

### Hoja "PPA inversionista"

**Estructura:**
- **Año 0**: Inversión Inicial = **-CAPEX** (inversionista invierte)
- **Años 1-N**:
  - Venta de energía = Energía Desplazada * Tarifa PPA
  - OPEX = -10% de venta de energía
  - Repotenciación = -1% del CAPEX anual
  - Beneficio Renta = Deducción del 50% / 10 años
  - Flujo de Caja = Suma de todos los conceptos
  - TIR = `IRR(Flujo de Caja)`

---

## 🔍 ANÁLISIS DETALLADO: MODELO EPC

### Flujo de Datos EPC (ya implementado parcialmente):

```
Datos de Entrada (On Grid)
    ↓
Calculos (On Grid)
    ↓
Datos de Salida (On grid)
    ↓
Flujo de caja (análisis financiero)
```

**Características:**
- Cliente invierte el 100% del CAPEX
- Cliente es propietario del sistema
- Cliente recibe todos los ahorros
- Análisis financiero incluye: TIR, VAN, ROI, años de recuperación

---

## 📊 DIFERENCIAS CLAVE

| Aspecto | EPC | PPA |
|---------|-----|-----|
| **Inversión Inicial** | Cliente paga 100% | Cliente paga $0 |
| **Propiedad** | Cliente | Inversionista |
| **Riesgo** | Cliente | Inversionista |
| **Ahorro** | 100% para cliente | Cliente paga energía a precio fijo |
| **Análisis Financiero** | TIR, VAN, ROI del cliente | TIR del inversionista, ahorro del cliente |
| **Duración** | Vida útil del sistema (25 años) | Contrato (10-15 años típicamente) |
| **Mantenimiento** | Responsabilidad del cliente | Responsabilidad del inversionista |

---

## 🎯 IMPLEMENTACIÓN REQUERIDA

### 1. Selector de Modelo de Negocio
- Agregar radio buttons: "EPC" o "PPA"
- Mostrar campos específicos según modelo seleccionado

### 2. Módulo de Cálculos PPA
Crear `src/lib/cotizador/ppa.ts` con:
- `calcularPrecioPPA()`: Calcula precio PPA por kWh
- `calcularFlujoCajaClientePPA()`: Flujo de caja desde perspectiva cliente
- `calcularFlujoCajaInversionistaPPA()`: Flujo de caja desde perspectiva inversionista
- `calcularAhorroPPA()`: Ahorro vs tarifa actual

### 3. Actualizar Interfaz
- Mostrar resultados según modelo (EPC o PPA)
- Para PPA: mostrar tarifa PPA, cuota mensual, ahorro anual
- Para EPC: mostrar inversión, análisis financiero (ya implementado)

### 4. Variables Financieras
Crear `src/lib/cotizador/variables-financieras.ts`:
- IPC (Inflación): 3.7%
- Aumento Precio Energía: 7%
- IPP (Índice de Precios al Productor): 3.7%
- WACC: 12%

---

## 📝 FÓRMULAS CLAVE PPA

### Precio PPA ($/kWh):
```
Precio PPA = (CAPEX * CRF + OPEX) / Generación Anual
```

Donde:
- `CRF = (WACC * (1 + WACC)^VidaUtil) / (((1 + WACC)^VidaUtil) - 1)`
- `OPEX = CAPEX * 0.015` (1.5% anual)

### Ahorro Anual Cliente (PPA):
```
Ahorro = Generación * (
    (Tarifa Actual - Tarifa PPA) * %Autoconsumo +
    (Tarifa Actual * 0.9 - Tarifa PPA) * (1 - %Autoconsumo)
)
```

### Flujo de Caja Cliente (PPA):
- Año 0: $0 (sin inversión)
- Años 1-N: Ahorro Anual (positivo)

---

## ✅ PRÓXIMOS PASOS

1. ✅ Analizar Excel completo
2. ⏳ Implementar selector EPC/PPA
3. ⏳ Crear módulo de cálculos PPA
4. ⏳ Actualizar interfaz para mostrar resultados PPA
5. ⏳ Validar cálculos contra Excel

