# 📊 RESUMEN COMPLETO DE CÁLCULOS DEL EXCEL

## 🔍 HOJA: "Calculos (On Grid)"

### 1. CONSUMO ANUAL (Fila 1, Columna B)
```
Fórmula: (SUM('Datos de Entrada (On Grid)'!D25:D36)/COUNTA('Datos de Entrada (On Grid)'!D25:D36))*12
```
- **Lógica**: Suma los consumos mensuales, calcula el promedio y multiplica por 12
- **Resultado**: Consumo anual en kWh

### 2. CONSUMO DIARIO (Fila 2, Columna B)
```
Fórmula: B1/365
```
- **Lógica**: Consumo anual dividido entre 365 días
- **Resultado**: Consumo diario promedio en kWh/día

### 3. PORCENTAJE DE ENERGÍA (Fila 3, Columna B)
```
Fórmula: 'Datos de Entrada (On Grid)'!D37
```
- **Lógica**: Lee el porcentaje del consumo que se desea suplir (default: 1 = 100%)
- **Resultado**: Factor multiplicador (0-1)

### 4. CONSUMO A SUPLIR (Fila 4, Columna B)
```
Fórmula: B3*B2
```
- **Lógica**: Multiplica el porcentaje por el consumo diario
- **Resultado**: Consumo diario a suplir en kWh/día

### 5. HORAS DE SOL PICO - HSP (Fila 5, Columna B)
```
Fórmula: VLOOKUP('Datos de Entrada (On Grid)'!G6,'Datos Equipos'!B192:D205,3,FALSE)
```
- **Lógica**: Busca el HSP según la estación meteorológica seleccionada
- **Resultado**: HSP promedio diario (kWh/m²/día)

### 6. POTENCIA NECESARIA (Fila 6, Columna B) ⚡ **CLAVE**
```
Fórmula: +B4/B5/B7/B8/B9
```
**Desglosado:**
```
Potencia (kWp) = ConsumoDiario / HSP / PerdidasAdicionales / FactorPerdidas / EficienciaInversor
```

**Donde:**
- B4 = Consumo a suplir (kWh/día)
- B5 = HSP (horas de sol pico)
- B7 = Pérdidas adicionales = 0.97 (desde entrada G29 - "Eficiencia Con Respecto al Óptimo")
- B8 = Factor de pérdidas = 0.82 (FIJO)
- B9 = Eficiencia del inversor = 0.97 (FIJO)

**Simplificado:**
```
Potencia (kWp) = ConsumoDiario / (HSP * 0.97 * 0.82 * 0.97)
Potencia (kWp) = ConsumoDiario / (HSP * 0.771)
```

### 7. NÚMERO DE PANELES (Fila 23, Columna B)
```
Fórmula: IF('Datos de Entrada (On Grid)'!G21="Microinversor",ROUND(B6*1000/B10,0),ROUND(B6*1000/B10,0))
```
- **Lógica**: Potencia necesaria (kW) * 1000 / Potencia panel (W)
- **Resultado**: Cantidad de paneles (redondeado)

### 8. POTENCIA INSTALADA (Fila 24)
```
Fórmula: B23*B10 (en W)
Fórmula: B24/1000 (en kW)
```
- **Lógica**: Cantidad de paneles * Potencia del panel
- **Resultado**: Potencia total instalada en kWp

### 9. NÚMERO DE INVERSORES (Fila 26)
```
Fórmula: IF('Datos de Entrada (On Grid)'!G21="Microinversor",
            B23/VLOOKUP(...),
            B24/VLOOKUP(...))
Cantidad: IF('Datos de Entrada (On Grid)'!G21="Microinversor",
            ROUNDUP(B26,0),
            IF(B26<0.9,1,ROUNDUP(B26/1.38,0)))
```
- **Lógica**: 
  - Microinversor: 1 inversor por panel
  - String: Potencia instalada / Potencia inversor (mínimo 1, máximo 1.38x)
- **Resultado**: Cantidad de inversores

### 10. RENTABILIDAD (Fila 27, Columna B) 💰
```
Fórmula: IF('Datos de Entrada (On Grid)'!$G$21="Microinversor",
            'Historico costos proyectos'!AB25,
            IF('Datos de Entrada (On Grid)'!$G$21="Inversor",
               'Historico costos proyectos'!AB26,
               'Historico costos proyectos'!AB27))
```
- **Lógica**: Lee la rentabilidad según el tipo de inversor
- **Resultado**: Porcentaje de rentabilidad (ej: 0.31 = 31%)

### 11. CÁLCULO DE PRECIOS CON RENTABILIDAD (Filas 75-93)

**Estructura general:**
```
Costo = VLOOKUP(...) * Cantidad
Precio = Costo / (1 - Rentabilidad)
IVA = Precio * 19%
Total = Precio + IVA
```

**Ejemplo - Paneles (Fila 75):**
```
Costo (B75): VLOOKUP(...)*B23
Precio (C75): B75/(1-$B$27)
IVA (D75): C75*19%
Total (E75): C75+D75
```

### 12. ESTRUCTURA (Fila 77)
```
Fórmula: VLOOKUP('Datos de Entrada (On Grid)'!G19,'Datos Equipos'!B157:C167,2,FALSE)*B23
```
- **Lógica**: Busca precio por panel según tipo de cubierta y multiplica por cantidad
- **Resultado**: Costo total de estructura

### 13. CABLEADO DC (Fila 38, Columna I)
```
Fórmula: 'Datos Equipos'!C105*4*'Datos de Entrada (On Grid)'!G37*VLOOKUP(...)*C26/IF(...)
```
- **Lógica**: Precio por metro * 4 * Metraje * Factor inversor
- **Resultado**: Costo de cableado DC

### 14. CABLEADO AC (Fila 39, Columna I)
```
Fórmula: IF(B30>20000,(130000*LN(B30/1000) - 373064),35000)*'Datos de Entrada (On Grid)'!G38
```
- **Lógica**: 
  - Si potencia > 20kW: Fórmula logarítmica
  - Si no: $35,000 COP
  - Multiplicado por metraje AC
- **Resultado**: Costo de cableado AC

### 15. MANO DE OBRA (Fila 51, Columna F)
```
Fórmula: F49*F48*B28
```
- **Lógica**: Precio ing/kWp * Técnicos * Días
- **Resultado**: Costo de mano de obra técnica

### 16. SALARIO INGENIERO (Fila 52, Columna F)
```
Fórmula: F49*C24*F47
```
- **Lógica**: Precio ing/kWp * Potencia (kW) * Ingenieros
- **Resultado**: Costo de ingeniería

### 17. VIÁTICOS (Fila 57, Columna F)
```
Fórmula: IF('Datos de Entrada (On Grid)'!G13="Ida y regreso",
            F56*B28*(F47+F48),
            (F54+F55+F56)*B28*(F47+F48))
```
- **Lógica**: 
  - Si ida y regreso: Precio viático * Días * (Ingenieros + Técnicos)
  - Si no: Suma de viáticos * Días * Personal
- **Resultado**: Costo de viáticos

### 18. ANDAMIOS (Fila 68)
```
Fórmula: IF(B28<=5,5,B28)*F69*G28
```
- **Lógica**: Días (mínimo 5) * Costo/día/metro * Metraje
- **Resultado**: Costo de andamios

### 19. COMISIÓN (Fila 66)
```
Fórmula: (B58+B45)*G10
```
- **Lógica**: (Mano obra + Instalación) * % comisión
- **Resultado**: Comisión adicional

### 20. TOTAL (Fila 94)
```
Fórmula: SUM(F75:F93)
```
- **Lógica**: Suma de todos los items con rentabilidad e IVA aplicados
- **Resultado**: Precio total del sistema

---

## 🔍 HOJA: "Calculos (Off Grid)"

### 1. CAPACIDAD DE BATERÍA (Fila 4, Columna E)
```
Fórmula: ((A4/(B4*C4))/D4)
```
**Donde:**
- A4 = Carga CA total conectada (Wh/día)
- B4 = Eficiencia del inversor (0.93)
- C4 = Eficiencia Batería (0.95)
- D4 = Voltaje CC del sistema (12V, 24V, 48V)

**Desglosado:**
```
CapacidadAh = (ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / Voltaje
```

### 2. BATERÍAS EN PARALELO (Fila 4, Columna I)
```
Fórmula: E4*F4/G4/H4/L4
```
**Donde:**
- E4 = Capacidad Ah calculada
- F4 = Días de autonomía
- G4 = Límite de descarga (0.9 = 90%)
- H4 = Capacidad Ah de la batería seleccionada
- L4 = Baterías en serie (1, 2, 4)

**Desglosado:**
```
BateriasParalelo = (CapacidadAh * DiasAutonomia) / (ProfundidadDescarga * CapacidadAhBateria * BateriasSerie)
```

### 3. POTENCIA DEL ARREGLO (Fila 9, Columna R)
```
Fórmula: O9/P9/Q9*(1+'Datos de entrada (Off grid)'!O13)
```
**Donde:**
- O9 = Promedio diario [kWh] = A4/(B4*C4)/1000
- P9 = Eficiencia Resto Sistema = 0.9
- Q9 = Horas sol pico/día (HSP)
- O13 = SD en Paneles (factor de seguridad) = 0.5

**Desglosado:**
```
Potencia (kWp) = (ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / (EficienciaRestoSistema * HSP) * (1 + SD)
```

### 4. MÓDULOS EN PARALELO (Fila 4, Columna T)
```
Fórmula: R4/S4
```
**Donde:**
- R4 = Corriente pico del arreglo
- S4 = Corriente pico/modulo

**Desglosado:**
```
ModulosParalelo = CorrientePicoArreglo / CorrientePicoModulo
```

### 5. MÓDULOS EN SERIE (Fila 4, Columna Y)
```
Fórmula: W4/X4
```
**Donde:**
- W4 = Voltaje CC del sistema
- X4 = Voltaje nominal del módulo

**Desglosado:**
```
ModulosSerie = VoltajeSistema / VoltajeModulo
```

### 6. TOTAL DE MÓDULOS (Fila 4, Columna AA)
```
Fórmula: ModulosParalelo * ModulosSerie
```
- **Resultado**: Cantidad total de paneles necesarios

---

## 📋 RESUMEN DE FÓRMULAS CLAVE

### On-Grid - Potencia Necesaria:
```
Potencia (kWp) = ConsumoDiario (kWh/día) / (HSP * 0.97 * 0.82 * 0.97)
```

### On-Grid - Generación Anual:
```
GeneracionAnual (kWh) = PotenciaInstalada (kWp) * HSP * 365 * 0.97 * 0.82 * 0.97
```

### On-Grid - Precio con Rentabilidad:
```
Precio = Costo / (1 - Rentabilidad)
IVA = Precio * 19%
Total = Precio + IVA
```

### Off-Grid - Capacidad Batería:
```
CapacidadAh = (ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / Voltaje
CapacidadTotal = CapacidadAh * DiasAutonomia / ProfundidadDescarga
```

### Off-Grid - Potencia Necesaria:
```
Potencia (kWp) = (ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / (EficienciaRestoSistema * HSP) * (1 + SD)
```

---

## ⚠️ FACTORES IMPORTANTES

### Factores de Eficiencia On-Grid:
1. **Pérdidas adicionales**: 0.97 (desde entrada - "Eficiencia Con Respecto al Óptimo")
2. **Factor de pérdidas**: 0.82 (FIJO)
3. **Eficiencia inversor**: 0.97 (FIJO)
4. **Factor combinado**: 0.97 * 0.82 * 0.97 = **0.771**

### Factores de Eficiencia Off-Grid:
1. **Eficiencia inversor**: 0.93 (variable según entrada)
2. **Eficiencia batería**: 0.95 (variable según tipo)
3. **Eficiencia resto sistema**: 0.9 (FIJO)
4. **SD (factor de seguridad)**: 0.5 (50% adicional)

### Rentabilidad:
- Se aplica **ANTES** del IVA
- Fórmula: `Precio = Costo / (1 - Rentabilidad)`
- Luego se aplica IVA del 19%

---

## 🔄 COMPARACIÓN CON IMPLEMENTACIÓN ACTUAL

### ✅ CORRECTO:
- Cálculo de consumo anual
- Cálculo de cantidad de paneles
- Aplicación de rentabilidad
- Cálculo de estructura

### ⚠️ VERIFICAR:
- Factores de eficiencia en generación anual
- Cálculo de cableado (fórmulas complejas)
- Cálculo de mano de obra (depende de tablas)
- Cálculo de viáticos (depende de condiciones)

