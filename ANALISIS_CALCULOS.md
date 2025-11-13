# 📊 ANÁLISIS DE HOJAS DE CÁLCULOS

## Hoja: "Calculos (On Grid)"

### Fórmulas Principales Identificadas:

#### 1. Consumo Anual
- **Fila 1**: Promedio anual de consumo
  - Fórmula: `(SUM('Datos de Entrada (On Grid)'!D25:D36)/COUNTA('Datos de Entrada (On Grid)'!D25:D36))*12`
  - Calcula el promedio mensual y lo multiplica por 12

#### 2. Consumo Diario
- **Fila 2**: Promedio día
  - Fórmula: `B1/365`
  - Consumo anual dividido entre 365 días

#### 3. Porcentaje de Energía
- **Fila 3**: Porcentaje de energía generada
  - Fórmula: `'Datos de Entrada (On Grid)'!D37`
  - Lee el % del consumo que desea ahorrar (default: 1 = 100%)

#### 4. Consumo a Suplir
- **Fila 4**: Consumo a suplir con el sistema
  - Fórmula: `B3*B2`
  - Multiplica el porcentaje por el consumo diario

#### 5. Horas de Sol Pico (HSP)
- **Fila 5**: Promedio diario de horas de sol pico
  - Fórmula: `VLOOKUP('Datos de Entrada (On Grid)'!G6,'Datos Equipos'!B192:D205,3,FALSE)`
  - Busca el HSP según la estación meteorológica

#### 6. Potencia Necesaria
- **Fila 6**: Potencia necesaria del arreglo
  - Fórmula: `+B4/B5/B7/B8/B9`
  - **Fórmula desglosada**: `ConsumoDiario / HSP / PerdidasAdicionales / FactorPerdidas / EficienciaInversor`
  - Donde:
    - B4 = Consumo a suplir (kWh/día)
    - B5 = HSP (horas de sol pico)
    - B7 = Pérdidas adicionales (0.97 = eficiencia óptimo)
    - B8 = Factor de pérdidas (0.82)
    - B9 = Eficiencia del inversor (0.97)

#### 7. Factores de Eficiencia
- **Fila 7**: Pérdidas adicionales = 0.97 (desde entrada G29)
- **Fila 8**: Factor de pérdidas = 0.82 (fijo)
- **Fila 9**: Eficiencia del inversor = 0.97 (fijo)

#### 8. Número de Paneles
- **Fila 23**: # de Paneles
  - Fórmula: `ROUND(B6*1000/B10,0)`
  - Potencia necesaria (kW) * 1000 / Potencia panel (W)

#### 9. Potencia Instalada
- **Fila 24**: Potencia Max de los paneles
  - Fórmula: `B23*B10` (número paneles * potencia panel)
  - En kW: `B24/1000`

#### 10. Número de Inversores
- **Fila 26**: # de inversores
  - Fórmula compleja que considera:
    - Si es Microinversor: `B23/VLOOKUP(...)`
    - Si no: `IF(B26<0.9,1,ROUNDUP(B26/1.38,0))`
  - B26 = Potencia instalada / Potencia inversor

#### 11. Cálculo de Precios con Rentabilidad
- **Fila 27**: Rentabilidad (margen)
  - Se usa para calcular precios: `Costo/(1-Rentabilidad)`
- **Ejemplo Fila 75 (Paneles)**:
  - Costo: `VLOOKUP(...)*B23`
  - Precio: `B75/(1-$B$27)`
  - IVA: `D75*19%`
  - Total: `D75+E75`

#### 12. Estructura
- **Fila 77**: Precio estructura
  - Fórmula: `VLOOKUP('Datos de Entrada (On Grid)'!G19,'Datos Equipos'!B157:C167,2,FALSE)*B23`
  - Busca precio por panel según tipo de cubierta y multiplica por cantidad

#### 13. Accesorios
- **Fila 78**: Incluye:
  - Cableado DC (Fila 38)
  - Cableado AC (Fila 39)
  - Accesorios Varios (Fila 40)
  - Conducción AC (Fila 41)
  - Fórmula compleja que considera tipo de inversor (Microinversor vs String)

#### 14. Mano de Obra y Viáticos
- **Fila 80**: 
  - Mano de obra: `F49*F48*B28` (precio ing/kWp * técnicos * días)
  - Salario Ing: `F49*C24*F47` (precio ing/kWp * potencia * ingenieros)
  - Viáticos: `IF(G13="Ida y regreso",F56*B28*(F47+F48),...)`
  - Total: `F57+F52+F51`

#### 15. Gasolina y Peajes
- **Fila 81**:
  - Costo peajes: `G14/50*F62` (kms/50 * precio peaje)
  - Costo gasolina: `G14*F61` (kms * precio/km)
  - Total viaje: Considera ida y regreso o solo ida

#### 16. Andamios
- **Fila 68**: Costo de Andamio
  - Fórmula: `IF(B28<=5,5,B28)*F69*G28`
  - Días * Costo/día/metro * Metraje

#### 17. Items Adicionales
- **Fila 79**: RETIE (certificación)
- **Fila 84**: Pólizas (1% del total si aplica)
- **Fila 85**: SST (150000*días + 2000000 si potencia>50kW)
- **Fila 86**: Obras adicionales
- **Fila 87**: Baterías (si aplica)
- **Fila 88**: Estudio de conexión (si aplica)

#### 18. Comisión
- **Fila 66**: Comisión
  - Fórmula: `(B58+B45)*G10`
  - (Mano obra + Instalación) * % comisión

#### 19. Precio Final
- **Fila 94**: TOTAL
  - Suma de todos los items (F75:F93)
  - Incluye IVA en cada item

---

## 🔍 OBSERVACIONES IMPORTANTES:

### Factores de Eficiencia:
1. **Pérdidas adicionales (B7)**: 0.97 (desde entrada, "Eficiencia Con Respecto al Óptimo")
2. **Factor de pérdidas (B8)**: 0.82 (fijo)
3. **Eficiencia inversor (B9)**: 0.97 (fijo)

**Fórmula de potencia necesaria:**
```
Potencia (kWp) = ConsumoDiario (kWh/día) / HSP / 0.97 / 0.82 / 0.97
```

**Simplificando:**
```
Potencia (kWp) = ConsumoDiario (kWh/día) / (HSP * 0.97 * 0.82 * 0.97)
Potencia (kWp) = ConsumoDiario (kWh/día) / (HSP * 0.771)
```

### Comparación con Implementación Actual:

**Implementación actual:**
```javascript
function calcularPotenciaNecesariaOnGrid(consumoAnual, hsp, eficienciaOptimo = 0.97) {
  const factorEficiencia = eficienciaOptimo || FACTOR_EFICIENCIA;
  return consumoAnual / (hsp * 365 * factorEficiencia);
}
```

**Problema identificado:**
- El Excel usa: `ConsumoDiario / (HSP * 0.97 * 0.82 * 0.97)`
- Nuestra implementación usa: `ConsumoAnual / (HSP * 365 * eficienciaOptimo)`
- **Falta el factor de pérdidas (0.82) y la eficiencia del inversor (0.97)**

**Corrección necesaria:**
```javascript
function calcularPotenciaNecesariaOnGrid(consumoAnual, hsp, eficienciaOptimo = 0.97) {
  const consumoDiario = consumoAnual / 365;
  const factorPerdidas = 0.82; // Factor de pérdidas fijo
  const eficienciaInversor = 0.97; // Eficiencia inversor fijo
  const perdidasAdicionales = eficienciaOptimo; // Desde entrada
  
  return consumoDiario / (hsp * perdidasAdicionales * factorPerdidas * eficienciaInversor);
}
```

### Cálculo de Precios:
- El Excel aplica un **margen de rentabilidad** antes del IVA
- Fórmula: `Precio = Costo / (1 - Rentabilidad)`
- Luego aplica IVA: `IVA = Precio * 19%`
- **Nuestra implementación actual no aplica margen de rentabilidad**

---

---

## Hoja: "Calculos (Off Grid)"

### Fórmulas Principales Identificadas:

#### 1. Capacidad de Batería
- **Fila 4, Columna E**: Capacidad Ah de la Batería
  - Fórmula: `((A4/(B4*C4))/D4)`
  - Donde:
    - A4 = Carga CA total conectada (Wh/día) = 44437
    - B4 = Eficiencia del inversor = 0.93
    - C4 = Eficiencia Batería = 0.95
    - D4 = Voltaje CC del sistema = 12V
  - **Fórmula desglosada**: `(ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / Voltaje`

#### 2. Baterías en Paralelo
- **Fila 4, Columna I**: Baterías en paralelo
  - Fórmula: `E4*F4/G4/H4/L4`
  - Donde:
    - E4 = Capacidad Ah calculada
    - F4 = Días de autonomía
    - G4 = Límite de descarga (0.9 = 90%)
    - H4 = Capacidad Ah de la batería seleccionada
    - L4 = Baterías en serie (1)
  - **Fórmula desglosada**: `(CapacidadAh * DiasAutonomia) / (ProfundidadDescarga * CapacidadAhBateria * BateriasSerie)`

#### 3. Potencia del Arreglo
- **Fila 9, Columna O**: Promedio diario [kWh]
  - Fórmula: `A4/(B4*C4)/1000`
  - Consumo diario (Wh) / (EficienciaInversor * EficienciaBateria) / 1000 = kWh

- **Fila 9, Columna R**: Potencia del arreglo [kWp]
  - Fórmula: `O9/P9/Q9*(1+'Datos de entrada (Off grid)'!O13)`
  - Donde:
    - O9 = Promedio diario [kWh]
    - P9 = Eficiencia Resto Sistema = 0.9
    - Q9 = Horas sol pico/día (HSP)
    - O13 = SD en Paneles (factor de seguridad) = 0.5
  - **Fórmula desglosada**: `(ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / (EficienciaRestoSistema * HSP) * (1 + SD)`

#### 4. Módulos en Paralelo
- **Fila 4, Columna T**: Módulos en paralelo
  - Fórmula: `R4/S4`
  - Donde:
    - R4 = Corriente pico del arreglo
    - S4 = Corriente pico/modulo
  - **Fórmula desglosada**: `CorrientePicoArreglo / CorrientePicoModulo`

#### 5. Módulos en Serie
- **Fila 4, Columna Y**: Módulos en serie
  - Fórmula: `W4/X4`
  - Donde:
    - W4 = Voltaje CC del sistema
    - X4 = Voltaje nominal del módulo
  - **Fórmula desglosada**: `VoltajeSistema / VoltajeModulo`

#### 6. Total de Módulos
- **Fila 4, Columna AA**: Total de módulos
  - Fórmula: `MódulosParalelo * MódulosSerie`

---

## 🔍 COMPARACIÓN CON IMPLEMENTACIÓN ACTUAL:

### On-Grid - Potencia Necesaria:

**Excel:**
```
Potencia (kWp) = ConsumoDiario (kWh/día) / (HSP * 0.97 * 0.82 * 0.97)
```

**Implementación Actual:**
```javascript
Potencia (kWp) = ConsumoAnual (kWh) / (HSP * 365 * eficienciaOptimo)
```

**Corrección Necesaria:**
```javascript
const consumoDiario = consumoAnual / 365;
const perdidasAdicionales = eficienciaOptimo; // 0.97
const factorPerdidas = 0.82; // Fijo
const eficienciaInversor = 0.97; // Fijo

return consumoDiario / (hsp * perdidasAdicionales * factorPerdidas * eficienciaInversor);
```

### Off-Grid - Capacidad Batería:

**Excel:**
```
CapacidadAh = ((ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / Voltaje) * DiasAutonomia / ProfundidadDescarga
```

**Implementación Actual:**
```javascript
const capacidadKWh = (consumoDiario * diasAutonomia) / (profundidadDescarga / 100);
```

**Corrección Necesaria:**
```javascript
// Primero calcular considerando eficiencias
const consumoCorregido = consumoDiario / (eficienciaInversor * eficienciaBateria);
// Luego calcular capacidad
const capacidadKWh = (consumoCorregido * diasAutonomia) / (profundidadDescarga / 100);
```

### Off-Grid - Potencia Necesaria:

**Excel:**
```
Potencia (kWp) = (ConsumoDiario / (EficienciaInversor * EficienciaBateria)) / (EficienciaRestoSistema * HSP) * (1 + SD)
```

**Implementación Actual:**
```javascript
return consumoDiario / (hsp * factorEficiencia);
```

**Corrección Necesaria:**
```javascript
const consumoCorregido = consumoDiario / (eficienciaInversor * eficienciaBateria);
const eficienciaRestoSistema = 0.9; // Fijo
const sd = sdPaneles || 0.5; // Factor de seguridad

return (consumoCorregido / (eficienciaRestoSistema * hsp)) * (1 + sd);
```

---

## 📋 PRÓXIMOS PASOS:

1. ✅ Actualizar función `calcularPotenciaNecesariaOnGrid` para incluir todos los factores
2. ✅ Actualizar función `calcularCapacidadBateria` para incluir eficiencias
3. ✅ Actualizar función `calcularPotenciaNecesariaOffGrid` para incluir eficiencias y SD
4. ⏳ Revisar cálculo de precios para incluir margen de rentabilidad
5. ⏳ Verificar cálculos de mano de obra, viáticos, gasolina, peajes
6. ⏳ Revisar cálculo de accesorios (cableado DC/AC, conducción)

